"""
Copiloto Contábil IA — Chat API Router
Handles conversational AI interactions with Supabase persistence.
"""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import ChatRequest, ChatResponse, ToneEnum, UserProfile
from app.middleware.auth import get_current_user
from app.services.llm_service import get_llm_service
from app.supabase_client import get_admin_singleton

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Processa a mensagem do usuário, chama o LLM e persiste tudo no Supabase.

    Fluxo:
    1. Gera ou reutiliza a conversation_id
    2. Salva a mensagem do usuário na tabela `messages`
    3. Carrega o histórico da conversa para contexto
    4. Processa com o LLM (tom Técnico ou Didático)
    5. Salva a resposta do assistente na tabela `messages`
    6. Retorna a resposta formatada
    """
    supabase = get_admin_singleton()
    llm = get_llm_service()

    try:
        # ── 1. Get or create conversation ────────────────────────────────
        conversation_id = request.conversation_id

        if not conversation_id:
            # Create a new conversation with the user's org context
            title = request.message[:100].strip()
            if len(request.message) > 100:
                title += "..."

            conv_data = {
                "organization_id": current_user.organization_id,
                "user_id": current_user.id,
                "title": title,
            }
            conv_response = (
                supabase.table("conversations").insert(conv_data).execute()
            )

            if conv_response.data:
                conversation_id = conv_response.data[0]["id"]
                logger.info(
                    f"📝 Nova conversa criada: {conversation_id} "
                    f"(org: {current_user.organization_id})"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Falha ao criar nova conversa.",
                )
        else:
            # Verify the conversation belongs to the user's organization
            conv_check = (
                supabase.table("conversations")
                .select("id, organization_id")
                .eq("id", conversation_id)
                .eq("organization_id", current_user.organization_id)
                .execute()
            )
            if not conv_check.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Conversa não encontrada ou acesso negado.",
                )

        # ── 2. Save user message ─────────────────────────────────────────
        user_msg_data = {
            "conversation_id": conversation_id,
            "content": request.message,
            "role": "user",
            "tone": request.tone.value,
            "detail_level": request.detail_level.value,
        }
        supabase.table("messages").insert(user_msg_data).execute()
        logger.info(f"💬 Mensagem do usuário salva (conv: {conversation_id})")

        # ── 3. Fetch conversation history for context ────────────────────
        history_response = (
            supabase.table("messages")
            .select("content, role")
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=False)
            .limit(20)
            .execute()
        )
        history = history_response.data if history_response.data else []

        # ── 4. Process through LLM ──────────────────────────────────────
        result = await llm.process_message(
            message=request.message,
            tone=request.tone,
            detail_level=request.detail_level,
            conversation_history=history,
        )

        ai_response = result["response"]
        sources = result.get("sources", [])

        # ── 5. Save assistant response ───────────────────────────────────
        assistant_msg_data = {
            "conversation_id": conversation_id,
            "content": ai_response,
            "role": "assistant",
            "tone": request.tone.value,
            "detail_level": request.detail_level.value,
            "sources": sources if sources else None,
        }
        supabase.table("messages").insert(assistant_msg_data).execute()
        logger.info(f"🤖 Resposta da IA salva (conv: {conversation_id})")

        # ── 6. Update conversation timestamp ─────────────────────────────
        supabase.table("conversations").update(
            {"updated_at": "now()"}
        ).eq("id", conversation_id).execute()

        return ChatResponse(
            response=ai_response,
            conversation_id=conversation_id,
            sources=sources,
            tone=request.tone,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"❌ Chat error for user {current_user.id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar mensagem: {str(e)}",
        )


@router.get("/conversations")
async def list_conversations(
    current_user: UserProfile = Depends(get_current_user),
):
    """Lista todas as conversas da organização do usuário."""
    supabase = get_admin_singleton()

    try:
        response = (
            supabase.table("conversations")
            .select("id, title, created_at, updated_at")
            .eq("organization_id", current_user.organization_id)
            .order("updated_at", desc=True)
            .limit(50)
            .execute()
        )
        return {"conversations": response.data or []}

    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    current_user: UserProfile = Depends(get_current_user),
):
    """Busca todas as mensagens de uma conversa."""
    supabase = get_admin_singleton()

    try:
        # Verify the conversation belongs to the user's organization
        conv_check = (
            supabase.table("conversations")
            .select("id")
            .eq("id", conversation_id)
            .eq("organization_id", current_user.organization_id)
            .execute()
        )
        if not conv_check.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Conversa não encontrada ou acesso negado.",
            )

        response = (
            supabase.table("messages")
            .select("id, content, role, tone, sources, created_at")
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=False)
            .execute()
        )
        return {"messages": response.data or []}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: UserProfile = Depends(get_current_user),
):
    """Exclui uma conversa e todas as suas mensagens."""
    supabase = get_admin_singleton()

    try:
        # Verify ownership
        conv_check = (
            supabase.table("conversations")
            .select("id")
            .eq("id", conversation_id)
            .eq("organization_id", current_user.organization_id)
            .execute()
        )
        if not conv_check.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Conversa não encontrada ou acesso negado.",
            )

        # Delete cascades to messages
        supabase.table("conversations").delete().eq(
            "id", conversation_id
        ).execute()

        return {"message": "Conversa excluída com sucesso."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
