"""
Copiloto Contábil IA — Obsidian Integration API
Endpoints for syncing Obsidian vaults with the knowledge base.
Restricted to admin/socio roles.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.middleware.auth import get_current_user, require_admin_or_socio
from app.models.schemas import UserProfile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/obsidian", tags=["Obsidian Integration"])


# ── Request / Response Models ────────────────────────────────────────────────

class ObsidianSyncRequest(BaseModel):
    """Request to sync an Obsidian vault."""
    mode: str = Field(
        ...,
        description="Modo de conexão: 'api' (Local REST API) ou 'filesystem' (leitura direta)",
        pattern="^(api|filesystem)$",
    )
    # Mode: api
    api_url: Optional[str] = Field(
        default="https://127.0.0.1:27124",
        description="URL da API REST local do Obsidian",
    )
    api_key: Optional[str] = Field(
        default="",
        description="Chave de API do plugin Local REST API",
    )
    # Mode: filesystem
    vault_path: Optional[str] = Field(
        default="",
        description="Caminho absoluto do vault Obsidian no servidor",
    )
    # Common
    folder_filter: Optional[str] = Field(
        default="",
        description="Filtro de pasta (ex: 'Contabilidade/' para restringir sync)",
    )
    smart_filter: bool = Field(
        default=True,
        description="Priorizar notas com tags/conteúdo contábil",
    )


class ObsidianTestConnectionRequest(BaseModel):
    """Request to test connection to Obsidian vault."""
    mode: str = Field(..., pattern="^(api|filesystem)$")
    api_url: Optional[str] = "https://127.0.0.1:27124"
    api_key: Optional[str] = ""
    vault_path: Optional[str] = ""
    folder_filter: Optional[str] = ""


class ObsidianConfigSave(BaseModel):
    """Persist the vault configuration for scheduled syncs."""
    mode: str = Field(..., pattern="^(api|filesystem)$")
    api_url: Optional[str] = "https://127.0.0.1:27124"
    api_key: Optional[str] = ""
    vault_path: Optional[str] = ""
    folder_filter: Optional[str] = ""
    smart_filter: bool = True
    auto_sync_enabled: bool = False
    auto_sync_interval_hours: int = Field(default=6, ge=1, le=168)


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/test-connection")
async def test_obsidian_connection(
    payload: ObsidianTestConnectionRequest,
    current_user: UserProfile = Depends(require_admin_or_socio),
):
    """
    Test connectivity to an Obsidian vault (API or filesystem).
    Returns vault statistics without ingesting anything.
    """
    from app.services.obsidian_service import get_obsidian_service
    service = get_obsidian_service()

    try:
        if payload.mode == "api":
            if not payload.api_key:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="API Key do plugin Local REST API é obrigatória.",
                )
            notes = await service.fetch_notes_via_api(
                api_url=payload.api_url or "https://127.0.0.1:27124",
                api_key=payload.api_key,
                folder_filter=payload.folder_filter or "",
            )
        else:
            if not payload.vault_path:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Caminho do vault é obrigatório para modo filesystem.",
                )
            notes = service.scan_vault_directory(
                vault_path=payload.vault_path,
                folder_filter=payload.folder_filter or "",
            )

        # Analyze notes without ingesting
        accounting_notes = [n for n in notes if n.is_accounting_relevant]
        total_chars = sum(len(n.body) for n in notes)
        tags_set: set[str] = set()
        for n in notes:
            tags_set.update(n.tags)

        return {
            "status": "connected",
            "total_notes": len(notes),
            "accounting_relevant": len(accounting_notes),
            "total_characters": total_chars,
            "estimated_chunks": total_chars // 800,
            "unique_tags": sorted(tags_set)[:30],
            "sample_titles": [n.title for n in notes[:10]],
            "message": f"✅ Conexão bem-sucedida. {len(notes)} notas encontradas ({len(accounting_notes)} relevantes para contabilidade).",
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Obsidian connection test failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha na conexão com o vault: {str(e)}",
        )


@router.post("/sync")
async def sync_obsidian_vault(
    payload: ObsidianSyncRequest,
    current_user: UserProfile = Depends(require_admin_or_socio),
):
    """
    Sync an Obsidian vault into the knowledge base.
    Parses notes, generates embeddings, and stores in pgvector.
    Unchanged notes (same hash) are automatically skipped.
    """
    from app.services.obsidian_service import get_obsidian_service
    service = get_obsidian_service()

    try:
        # 1. Fetch notes
        if payload.mode == "api":
            if not payload.api_key:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="API Key é obrigatória para modo API.",
                )
            notes = await service.fetch_notes_via_api(
                api_url=payload.api_url or "https://127.0.0.1:27124",
                api_key=payload.api_key,
                folder_filter=payload.folder_filter or "",
            )
        else:
            if not payload.vault_path:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Caminho do vault é obrigatório.",
                )
            notes = service.scan_vault_directory(
                vault_path=payload.vault_path,
                folder_filter=payload.folder_filter or "",
            )

        if not notes:
            return {
                "status": "empty",
                "message": "Nenhuma nota encontrada no vault com os filtros especificados.",
            }

        # 2. Ingest into knowledge base
        result = await service.ingest_notes(
            notes=notes,
            organization_id=current_user.organization_id,
            uploaded_by=current_user.id,
            smart_filter=payload.smart_filter,
        )

        return result

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Obsidian sync failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na sincronização: {str(e)}",
        )


@router.get("/history")
async def get_sync_history(
    current_user: UserProfile = Depends(require_admin_or_socio),
):
    """List all Obsidian sync sessions for the organization."""
    from app.services.obsidian_service import get_obsidian_service
    service = get_obsidian_service()

    syncs = await service.get_sync_history(current_user.organization_id)
    return {"syncs": syncs}


@router.delete("/sync/{sync_id}")
async def delete_sync_session(
    sync_id: str,
    current_user: UserProfile = Depends(require_admin_or_socio),
):
    """Delete a sync session and all its indexed chunks."""
    from app.services.obsidian_service import get_obsidian_service
    service = get_obsidian_service()

    result = await service.delete_sync(sync_id, current_user.organization_id)
    return result


@router.post("/config")
async def save_obsidian_config(
    payload: ObsidianConfigSave,
    current_user: UserProfile = Depends(require_admin_or_socio),
):
    """
    Save Obsidian vault configuration for the organization.
    Enables optional scheduled auto-sync.
    """
    from app.supabase_client import get_admin_singleton
    supabase = get_admin_singleton()
    org_id = current_user.organization_id

    config_data = {
        "organization_id": org_id,
        "config_key": "obsidian_integration",
        "config_value": {
            "mode": payload.mode,
            "api_url": payload.api_url,
            "api_key": payload.api_key,
            "vault_path": payload.vault_path,
            "folder_filter": payload.folder_filter,
            "smart_filter": payload.smart_filter,
            "auto_sync_enabled": payload.auto_sync_enabled,
            "auto_sync_interval_hours": payload.auto_sync_interval_hours,
        },
        "updated_by": current_user.id,
    }

    try:
        # Upsert configuration
        supabase.table("organization_configs") \
            .upsert(config_data, on_conflict="organization_id,config_key") \
            .execute()

        return {
            "status": "saved",
            "message": "Configuração do Obsidian salva com sucesso.",
            "auto_sync": payload.auto_sync_enabled,
        }
    except Exception as e:
        logger.error(f"Failed to save Obsidian config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar configuração: {str(e)}",
        )


@router.get("/config")
async def get_obsidian_config(
    current_user: UserProfile = Depends(require_admin_or_socio),
):
    """Retrieve saved Obsidian configuration for the organization."""
    from app.supabase_client import get_admin_singleton
    supabase = get_admin_singleton()

    try:
        result = supabase.table("organization_configs") \
            .select("config_value, updated_by") \
            .eq("organization_id", current_user.organization_id) \
            .eq("config_key", "obsidian_integration") \
            .single() \
            .execute()

        if result.data:
            return {"status": "found", "config": result.data["config_value"]}
        return {"status": "not_configured", "config": None}
    except Exception:
        return {"status": "not_configured", "config": None}
