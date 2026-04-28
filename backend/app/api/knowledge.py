"""
Copilot Contábil IA — Knowledge Base API
RAG document ingestion, listing, and deletion.
Restricted to admin/socio roles.
"""
import io
import uuid
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from app.middleware.auth import get_current_user, require_admin_or_socio
from app.models.schemas import UserProfile
from app.supabase_client import get_admin_singleton
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/knowledge", tags=["Knowledge Base"])


SUPPORTED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/markdown": "md",
}
# Fallback detection by extension
EXT_MAP = {".pdf": "pdf", ".docx": "docx", ".txt": "txt", ".md": "md"}


def _detect_file_type(filename: str, content_type: str | None) -> str | None:
    """Detect file type from content-type header or file extension."""
    if content_type and content_type in SUPPORTED_TYPES:
        return SUPPORTED_TYPES[content_type]
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    return EXT_MAP.get(ext)


def _extract_text(content: bytes, file_type: str, filename: str) -> tuple[str, list[dict]]:
    """
    Extract text from supported file formats.
    Returns (full_text, page_map) where page_map is a list of {start, end, page}.
    """
    page_map = []

    if file_type == "pdf":
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        full_text = ""
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                start = len(full_text)
                full_text += text + "\n\n"
                page_map.append({"start": start, "end": len(full_text), "page": i + 1})
        return full_text, page_map

    elif file_type == "docx":
        from docx import Document as DocxDocument
        doc = DocxDocument(io.BytesIO(content))
        paragraphs = []
        for para in doc.paragraphs:
            if para.text.strip():
                if para.style and para.style.name.startswith("Heading"):
                    level = para.style.name.replace("Heading ", "")
                    try:
                        level = int(level)
                    except ValueError:
                        level = 2
                    paragraphs.append(f"{'#' * level} {para.text.strip()}")
                else:
                    paragraphs.append(para.text.strip())
        full_text = "\n\n".join(paragraphs)
        page_map = [{"start": 0, "end": len(full_text), "page": 1}]
        return full_text, page_map

    else:  # txt, md
        full_text = content.decode("utf-8", errors="replace")
        page_map = [{"start": 0, "end": len(full_text), "page": 1}]
        return full_text, page_map


@router.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    current_user: UserProfile = Depends(require_admin_or_socio),
):
    """
    Ingest a document into the knowledge base.
    Supports PDF, DOCX, TXT, and Markdown files.
    Extracts text, splits into chunks, generates embeddings,
    and stores in pgvector for semantic search.
    """
    filename = file.filename or "document"
    file_type = _detect_file_type(filename, file.content_type)

    if not file_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato não suportado. Aceitos: PDF, DOCX, TXT, MD.",
        )

    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API key do OpenAI não configurada. Embeddings indisponíveis.",
        )

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Arquivo muito grande. Limite: 50MB.",
        )

    supabase = get_admin_singleton()
    org_id = current_user.organization_id

    try:
        # 1. Register document in DB
        doc_id = str(uuid.uuid4())
        supabase.table("documents").insert({
            "id": doc_id,
            "organization_id": org_id,
            "uploaded_by": current_user.id,
            "file_name": filename,
            "file_type": file.content_type or file_type,
            "file_size": len(content),
            "storage_path": f"knowledge/{org_id}/{doc_id}.{file_type}",
            "analysis_status": "processing",
        }).execute()

        # 2. Extract text (multi-format)
        full_text, page_map = _extract_text(content, file_type, filename)

        if not full_text.strip():
            supabase.table("documents").update(
                {"analysis_status": "failed"}
            ).eq("id", doc_id).execute()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Não foi possível extrair texto do arquivo. Verifique o conteúdo.",
            )

        # 3. Split into chunks
        from langchain_core.documents import Document
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        docs = splitter.create_documents(
            [full_text],
            metadatas=[{"source": filename, "document_id": doc_id}],
        )

        # 4. Generate embeddings
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)

        chunks_to_insert = []
        batch_size = 20

        for batch_start in range(0, len(docs), batch_size):
            batch = docs[batch_start:batch_start + batch_size]
            texts = [doc.page_content for doc in batch]

            embedding_response = client.embeddings.create(
                model="text-embedding-3-small",
                input=texts,
            )

            for j, emb_data in enumerate(embedding_response.data):
                doc = batch[j]
                # Find page number
                doc_start = full_text.find(doc.page_content[:100])
                page_num = 1
                for pm in page_map:
                    if pm["start"] <= doc_start < pm["end"]:
                        page_num = pm["page"]
                        break

                chunks_to_insert.append({
                    "organization_id": org_id,
                    "document_id": doc_id,
                    "document_name": file.filename,
                    "content": doc.page_content,
                    "embedding": emb_data.embedding,
                    "metadata": {
                        "source": file.filename,
                        "page": page_num,
                        "chunk_index": batch_start + j,
                    },
                })

        # 5. Insert chunks into pgvector
        if chunks_to_insert:
            supabase.table("knowledge_chunks").insert(chunks_to_insert).execute()

        # 6. Update document status
        supabase.table("documents").update(
            {"analysis_status": "completed"}
        ).eq("id", doc_id).execute()

        logger.info(
            f"Ingested '{file.filename}': {len(chunks_to_insert)} chunks, "
            f"{len(reader.pages)} pages"
        )

        return {
            "status": "success",
            "document_id": doc_id,
            "file_name": file.filename,
            "pages_processed": len(reader.pages),
            "chunks_created": len(chunks_to_insert),
            "message": f"Documento ingerido com sucesso: {len(chunks_to_insert)} fragmentos indexados.",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ingestion error: {e}", exc_info=True)
        # Mark as failed
        try:
            supabase.table("documents").update(
                {"analysis_status": "failed"}
            ).eq("id", doc_id).execute()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na ingestão do documento: {str(e)}",
        )


@router.get("")
async def list_knowledge_documents(
    current_user: UserProfile = Depends(require_admin_or_socio),
):
    """List all knowledge base documents for the organization."""
    supabase = get_admin_singleton()

    docs = (
        supabase.table("documents")
        .select("id, file_name, file_size, analysis_status, created_at")
        .eq("organization_id", current_user.organization_id)
        .like("storage_path", f"knowledge/{current_user.organization_id}/%")
        .order("created_at", desc=True)
        .execute()
    )

    # Count chunks per document
    chunks = (
        supabase.table("knowledge_chunks")
        .select("document_id")
        .eq("organization_id", current_user.organization_id)
        .execute()
    )

    chunk_counts = {}
    for c in (chunks.data or []):
        did = c.get("document_id")
        chunk_counts[did] = chunk_counts.get(did, 0) + 1

    documents = []
    for doc in (docs.data or []):
        doc["chunks_count"] = chunk_counts.get(doc["id"], 0)
        documents.append(doc)

    total_chunks = sum(chunk_counts.values())

    return {
        "documents": documents,
        "total_documents": len(documents),
        "total_chunks": total_chunks,
    }


@router.delete("/{document_id}")
async def delete_knowledge_document(
    document_id: str,
    current_user: UserProfile = Depends(require_admin_or_socio),
):
    """Delete a knowledge document and all its chunks."""
    supabase = get_admin_singleton()

    # Delete chunks (cascade would handle this, but explicit is better)
    supabase.table("knowledge_chunks").delete().eq(
        "document_id", document_id
    ).eq("organization_id", current_user.organization_id).execute()

    # Delete document
    supabase.table("documents").delete().eq(
        "id", document_id
    ).eq("organization_id", current_user.organization_id).execute()

    return {"status": "deleted", "document_id": document_id}
