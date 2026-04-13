from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import logging
import io
import uuid
from typing import Optional
from pydantic import BaseModel
import pandas as pd
from pypdf import PdfReader
from docx import Document

from app.middleware.auth import get_current_user, UserProfile
from app.supabase_client import get_admin_singleton

logger = logging.getLogger(__name__)

router = APIRouter()

class WorkspaceChatRequest(BaseModel):
    message: str
    document_context: str
    tone: Optional[str] = "Formal"
    detail_level: Optional[str] = "Padrão"


@router.post("/upload")
async def upload_workspace_document(
    files: list[UploadFile] = File(...),
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Receives documents, extracts text using Pandas/PyPDF/Docx/Vision, and saves securely.
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="Organização não configurada.")

    results = []
    supabase = get_admin_singleton()

    for idx, file in enumerate(files):
        content_bytes = await file.read()
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        extracted_text = ""

        try:
            if ext == "pdf":
                reader = PdfReader(io.BytesIO(content_bytes))
                texts = [page.extract_text() for page in reader.pages if page.extract_text()]
                extracted_text = "\n".join(texts)
                
            elif ext in ["csv"]:
                df = pd.read_csv(io.BytesIO(content_bytes))
                extracted_text = df.to_markdown(index=False)
                
            elif ext in ["xlsx", "xls"]:
                df = pd.read_excel(io.BytesIO(content_bytes))
                extracted_text = df.to_markdown(index=False)
                
            elif ext in ["docx"]:
                doc = Document(io.BytesIO(content_bytes))
                extracted_text = "\n".join([para.text for para in doc.paragraphs])
            
            elif ext in ["jpg", "jpeg", "png"]:
                from app.services.vision_service import extract_data_via_vision
                import base64
                base64_img = base64.b64encode(content_bytes).decode("utf-8")
                extracted_text = await extract_data_via_vision(base64_img, ext)
                
            else:
                extracted_text = "[Formato não suportado: conteúdo omitido]"
                
            MAX_CHARS = 200000
            if len(extracted_text) > MAX_CHARS:
                extracted_text = extracted_text[:MAX_CHARS] + "\n... [CORTE: DOCUMENTO MUITO GRANDE PARA APRESENTAÇÃO INTEGRAL]"
            
            # Wrap in tag to clearly isolate cross-doc data
            final_text = f"<doc_{idx+1}>\n{extracted_text}\n</doc_{idx+1}>"

        except Exception as e:
            logger.error(f"Erro ao processar {file.filename}: {e}")
            final_text = f"<doc_{idx+1}>\nErro de processamento: {str(e)}\n</doc_{idx+1}>"

        try:
            file_id = str(uuid.uuid4())
            file_path = f"{current_user.organization_id}/{file_id}_{file.filename}"
            supabase.storage.from_("client_documents").upload(
                file_path,
                content_bytes,
                {"content-type": file.content_type}
            )
        except Exception as e:
            logger.warning(f"Erro ao salvar arquivo temporário no bucket: {e}")

        results.append({
            "id": file_id,
            "file_name": file.filename,
            "extracted_content": final_text
        })

    return {"status": "ok", "documents": results}


@router.post("/chat")
async def chat_workspace(
    payload: WorkspaceChatRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Dedicated endpoint for the Workspace Chat, injecting the document context directly.
    """
    from app.services.llm_service import generate_response_with_context
    
    try:
        response_text = await generate_response_with_context(
            message=payload.message,
            context=payload.document_context,
            tone=payload.tone,
            detail_level=payload.detail_level
        )
        return {"response": response_text}
    except Exception as e:
        logger.error(f"Workspace chat failed: {e}")
        raise HTTPException(status_code=500, detail="Erro interno no servidor do LLM.")
