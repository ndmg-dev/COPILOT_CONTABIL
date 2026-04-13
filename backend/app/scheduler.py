"""
Copilot Contábil IA — Scheduler Service
Handles automated daily tasks, such as proactively notifying users via WhatsApp 
about upcoming tax deadlines.
"""
import logging
import asyncio
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.supabase_client import get_admin_singleton
from app.api.whatsapp import send_whatsapp_response
from app.services.llm_service import get_llm_service
from app.config import get_settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def check_due_taxes_and_notify():
    """
    CRON JOB: Runs daily to find taxes due in 2 days.
    Generates personalized LLM messages and sends them via WhatsApp.
    """
    logger.info("Executing daily job: check_due_taxes_and_notify")
    supabase = get_admin_singleton()
    settings = get_settings()

    target_date = (datetime.now() + timedelta(days=2)).strftime('%Y-%m-%d')

    try:
        # Find pending taxes for the target date
        res = supabase.table("taxes_due").select(
            "id, organization_id, client_name, tax_name, amount, due_date"
        ).eq("status", "pendente").eq("notified", False).eq("due_date", target_date).execute()

        taxes = res.data or []
        if not taxes:
            logger.info("No taxes due in 2 days to notify.")
            return

        llm = get_llm_service()

        for tax in taxes:
            org_id = tax["organization_id"]

            # Try to find a phone to notify (fetching the principal user of the org)
            profile_res = supabase.table("profiles").select("phone").eq("organization_id", org_id).execute()
            if not profile_res.data or not profile_res.data[0].get("phone"):
                logger.warning(f"No phone found to notify organization {org_id}")
                continue

            phone = profile_res.data[0]["phone"]
            client_name = tax["client_name"]
            tax_name = tax["tax_name"]
            amount = tax["amount"]

            # Use LLM to personalize the message
            prompt = (
                f"Escreva uma DICA rápida e amigável para o cliente de contabilidade avisando "
                f"que a guia '{tax_name}' referente à '{client_name}' vencerá em 2 dias (Valor: R$ {amount:.2f}). "
                "Sem formalidades jurídicas, gere um lembrete caloroso (max 2 parágrafos) com tom de assistente prestativo."
            )
            
            ai_message = await llm.generate_workspace_response(
                message=prompt, 
                document_context="Não aplicável, crie apenas o lembrete de conta a pagar.",
                tone="Didática",
                detail_level="Resumida"
            )

            # Send via Evolution API WhatsApp
            success = await send_whatsapp_response(phone, ai_message)
            if success:
                # Mark as notified
                supabase.table("taxes_due").update({"notified": True}).eq("id", tax["id"]).execute()
                logger.info(f"Notified {phone} about {tax_name} due in 2 days.")

    except Exception as e:
        logger.error(f"Error executing daily taxes notification job: {e}", exc_info=True)


def start_scheduler():
    """Initializes and starts the APScheduler."""
    # Runs every day at 10:00 AM (server time)
    scheduler.add_job(check_due_taxes_and_notify, 'cron', hour=10, minute=0)
    scheduler.start()
    logger.info("✅ APScheduler started.")

def shutdown_scheduler():
    scheduler.shutdown()
    logger.info("🛑 APScheduler stopped.")
