"""
Copilot Contábil IA — WhatsApp Omnichannel Router
Handles incoming webhooks from WhatsApp (Official Cloud API or custom providers).
Integrates with the same RAG/LLM backend as the web chat.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Request, HTTPException, Query, status
from app.services.llm_service import LLMService
from app.supabase_client import get_admin_singleton
from app.models.schemas import ToneEnum

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webhook/whatsapp", tags=["Omnichannel"])

# Verify Token for Webhook setup (set in environment)
VERIFY_TOKEN = "COPILOT_WA_TOKEN_2024"

@router.get("")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    """Verificação de Webhook para API do WhatsApp Cloud."""
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        logger.info("WhatsApp webhook verified successfully.")
        return int(hub_challenge)
    
    logger.warning("WhatsApp webhook verification failed.")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid verify token")


@router.post("")
async def handle_whatsapp_message(request: Request):
    """
    Recebe mensagens do WhatsApp e processa através da IA.
    Pipeline: Webhook -> Identificação de Org -> RAG -> LLM -> Resposta.
    """
    payload = await request.json()
    logger.info(f"WhatsApp webhook received: {payload}")

    try:
        # 1. Extract message and sender info
        # This structure follows the standard WhatsApp Cloud API payload
        entry = payload.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])

        if not messages:
            return {"status": "no_messages"}

        message = messages[0]
        from_phone = message.get("from")
        message_body = message.get("text", {}).get("body", "")
        
        if not message_body:
            return {"status": "skipped_non_text"}

        # 2. Identify Organization via User Profiles
        supabase = get_admin_singleton()
        
        # Check if phone belongs to an active user/office in profiles
        profile_res = supabase.table("profiles").select("id, organization_id").eq("phone", from_phone).execute()
        
        if not profile_res.data:
            logger.warning(f"Message from unauthorized phone blocked: {from_phone}")
            return {
                "status": "unauthorized", 
                "message": "Acesso não autorizado ou Trial expirado",
                "phone": from_phone
            }

        profile = profile_res.data[0]
        org_id = profile["organization_id"]

        # 2b. Attempt to load a persistent conversation session
        session_res = supabase.table("whatsapp_sessions").select("*").eq("phone_number", from_phone).execute()
        conversation_id = session_res.data[0].get("conversation_id") if session_res.data else None

        # 3. Load Conversation Context (optional)
        history = []
        if conversation_id:
            history_res = supabase.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at", desc=True).limit(5).execute()
            history = history_res.data[::-1] if history_res.data else []

        # 4. Process with LLM Service (RAG enabled)
        llm = LLMService()
        ai_response = await llm.process_message(
            message=message_body,
            tone=ToneEnum.TECNICA,
            conversation_history=history
        )

        # 5. Save messages to DB (maintain transparency with web interface if desired)
        if conversation_id:
            supabase.table("messages").insert([
                {"conversation_id": conversation_id, "role": "user", "content": message_body},
                {"conversation_id": conversation_id, "role": "assistant", "content": ai_response["response"], "sources": ai_response.get("sources", [])}
            ]).execute()

        # 6. Send response back to WhatsApp
        # This would call the WhatsApp Send API
        # await send_whatsapp_response(from_phone, ai_response["response"])
        
        logger.info(f"AI response generated for {from_phone}: {ai_response['response'][:50]}...")

        return {
            "status": "success",
            "phone": from_phone,
            "response_preview": ai_response["response"][:100]
        }

    except Exception as e:
        logger.error(f"WhatsApp processing error: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}

async def send_whatsapp_response(to_phone: str, text: str):
    """
    Placeholder para envio de mensagem via API do WhatsApp.
    Implementar integração com Meta Graph API ou Evolution API.
    """
    pass
