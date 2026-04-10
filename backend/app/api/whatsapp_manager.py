"""
Copilot Contábil IA — WhatsApp Instance Manager
White-label interface for Evolution API instance provisioning.
All Evolution API credentials stay server-side (never exposed to frontend).
"""
import os
import re
import httpx
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.middleware.auth import get_current_user, UserProfile
from app.supabase_client import get_admin_singleton

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp Manager"])


# ── Schemas ──────────────────────────────────────────────────────────────────
class CreateInstanceRequest(BaseModel):
    instance_name: Optional[str] = None  # Auto-generated if empty


class InstanceResponse(BaseModel):
    status: str
    instance_name: str
    message: str


# ── Helpers ──────────────────────────────────────────────────────────────────
def _get_evolution_config():
    """Load Evolution API credentials from environment."""
    evo_url = os.getenv("EVOLUTION_API_URL", "").rstrip("/")
    evo_key = os.getenv("EVOLUTION_API_KEY", "")
    if not evo_url or not evo_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Evolution API não configurada no servidor."
        )
    return evo_url, evo_key


# ── POST /api/whatsapp/instance — Create Evolution Instance ──────────────────
@router.post("/instance", response_model=InstanceResponse)
async def create_instance(
    payload: CreateInstanceRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Creates a new Evolution API instance tied to the user's organization.
    Automatically configures the webhook to point back to our server.
    """
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="Organização não configurada.")

    evo_url, evo_key = _get_evolution_config()

    # Build a safe, unique instance name
    org_slug = re.sub(r"[^a-zA-Z0-9]", "", str(current_user.organization_id))[:12]
    instance_name = payload.instance_name or f"copilot_{org_slug}"

    # Webhook URL pointing back to our WhatsApp webhook handler
    backend_url = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000")
    webhook_url = f"{backend_url.rstrip('/')}/api/webhook/whatsapp"

    # Evolution API v2 — Create Instance payload
    create_payload = {
        "instanceName": instance_name,
        "integration": "WHATSAPP-BAILEYS",
        "qrcode": True,
        "webhook": {
            "url": webhook_url,
            "byEvents": False,
            "base64": True,
            "events": [
                "MESSAGES_UPSERT",
                "CONNECTION_UPDATE",
                "QRCODE_UPDATED"
            ]
        }
    }

    headers = {"apikey": evo_key, "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{evo_url}/instance/create",
                headers=headers,
                json=create_payload
            )

            if response.status_code not in (200, 201):
                logger.error(f"Evolution create error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Erro ao criar instância: {response.text}"
                )

            result = response.json()
            logger.info(f"Evolution instance created: {instance_name}")

    except httpx.HTTPError as e:
        logger.error(f"Connection to Evolution API failed: {e}")
        raise HTTPException(status_code=502, detail="Falha na conexão com a Evolution API.")

    # Persist instance reference in the organization record (optional enhancement)
    try:
        supabase = get_admin_singleton()
        supabase.table("organizations").update({
            "whatsapp_instance": instance_name
        }).eq("id", current_user.organization_id).execute()
    except Exception as e:
        logger.warning(f"Could not persist instance name to org: {e}")

    return InstanceResponse(
        status="created",
        instance_name=instance_name,
        message="Instância criada. Escaneie o QR Code para conectar."
    )


# ── GET /api/whatsapp/qrcode/{instance_name} — Fetch QR Code ────────────────
@router.get("/qrcode/{instance_name}")
async def get_qrcode(
    instance_name: str,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Fetches the QR Code Base64 string from Evolution API for pairing.
    """
    evo_url, evo_key = _get_evolution_config()
    headers = {"apikey": evo_key}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{evo_url}/instance/connect/{instance_name}",
                headers=headers
            )

            if response.status_code not in (200, 201):
                logger.error(f"Evolution QR error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Erro ao obter QR Code: {response.text}"
                )

            data = response.json()

    except httpx.HTTPError as e:
        logger.error(f"Connection to Evolution API failed: {e}")
        raise HTTPException(status_code=502, detail="Falha na conexão com a Evolution API.")

    # Evolution returns different structures depending on version
    # Common shapes: { "base64": "..." } or { "qrcode": { "base64": "..." } }
    base64_str = None
    if isinstance(data, dict):
        base64_str = data.get("base64") or data.get("qrcode", {}).get("base64")

    return {
        "status": "ok",
        "instance": instance_name,
        "base64": base64_str,
        "raw": data  # Pass full response for debugging flexibility
    }


# ── GET /api/whatsapp/status/{instance_name} — Connection Status ─────────────
@router.get("/status/{instance_name}")
async def get_instance_status(
    instance_name: str,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Checks whether the instance is connected, disconnected, or awaiting QR scan.
    """
    evo_url, evo_key = _get_evolution_config()
    headers = {"apikey": evo_key}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{evo_url}/instance/connectionState/{instance_name}",
                headers=headers
            )

            if response.status_code not in (200, 201):
                return {"status": "disconnected", "instance": instance_name, "connected": False}

            data = response.json()

    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {"status": "error", "instance": instance_name, "connected": False}

    # Common shape: { "instance": { "state": "open" | "close" | "connecting" } }
    state = "unknown"
    if isinstance(data, dict):
        state = data.get("state") or data.get("instance", {}).get("state", "unknown")

    return {
        "status": state,
        "instance": instance_name,
        "connected": state == "open"
    }


# ── GET /api/whatsapp/check — Auto-check org instance status ─────────────────
@router.get("/check")
async def check_org_status(
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Checks the WhatsApp connection status for the current user's organization.
    Looks up the instance name from the organizations table automatically.
    """
    if not current_user.organization_id:
        return {"status": "no_org", "connected": False, "instance": None}

    # 1. Look up instance name from DB
    try:
        supabase = get_admin_singleton()
        org_res = supabase.table("organizations").select("whatsapp_instance").eq(
            "id", current_user.organization_id
        ).single().execute()

        instance_name = org_res.data.get("whatsapp_instance") if org_res.data else None
    except Exception as e:
        logger.warning(f"Could not fetch org whatsapp_instance: {e}")
        instance_name = None

    if not instance_name:
        return {"status": "not_configured", "connected": False, "instance": None}

    # 2. Check Evolution API status
    try:
        evo_url, evo_key = _get_evolution_config()
    except HTTPException:
        return {"status": "evo_not_configured", "connected": False, "instance": instance_name}

    headers = {"apikey": evo_key}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{evo_url}/instance/connectionState/{instance_name}",
                headers=headers
            )

            if response.status_code not in (200, 201):
                return {"status": "disconnected", "connected": False, "instance": instance_name}

            data = response.json()
    except Exception as e:
        logger.error(f"Evolution status check failed: {e}")
        return {"status": "error", "connected": False, "instance": instance_name}

    state = "unknown"
    if isinstance(data, dict):
        state = data.get("state") or data.get("instance", {}).get("state", "unknown")

    return {
        "status": state,
        "connected": state == "open",
        "instance": instance_name
    }

