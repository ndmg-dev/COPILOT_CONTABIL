"""
Copiloto Contábil IA — Upload API Router
File upload handling with Supabase Storage integration.
"""
import uuid
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from app.models.schemas import FileUploadResponse, UserProfile
from app.middleware.auth import get_current_user
from app.supabase_client import get_admin_singleton

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/upload", tags=["Upload"])

# Allowed file types
ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "text/csv": ".csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Upload de arquivos para análise.
    Suporta PDF, imagens (PNG/JPG), CSV e XLSX.
    Armazena no Supabase Storage com isolamento por organização.
    """
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de arquivo não suportado: {file.content_type}. "
                   f"Tipos aceitos: {', '.join(ALLOWED_TYPES.values())}",
        )

    # Read and validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Arquivo muito grande. Tamanho máximo: {MAX_FILE_SIZE // (1024*1024)}MB",
        )

    supabase = get_admin_singleton()

    try:
        # Generate unique storage path with org isolation
        file_ext = ALLOWED_TYPES[file.content_type]
        file_id = str(uuid.uuid4())
        org_id = current_user.organization_id or "no-org"
        storage_path = f"{org_id}/{file_id}{file_ext}"

        # Upload to Supabase Storage
        bucket_name = "documents"
        supabase.storage.from_(bucket_name).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type},
        )

        # Record in database
        doc_data = {
            "organization_id": current_user.organization_id,
            "uploaded_by": current_user.id,
            "file_name": file.filename or f"upload{file_ext}",
            "file_type": file.content_type,
            "file_size": len(content),
            "storage_path": storage_path,
        }
        db_response = supabase.table("documents").insert(doc_data).execute()

        doc_id = db_response.data[0]["id"] if db_response.data else file_id

        return FileUploadResponse(
            id=doc_id,
            file_name=file.filename or f"upload{file_ext}",
            file_type=file.content_type,
            file_size=len(content),
            storage_path=storage_path,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao fazer upload: {str(e)}",
        )
