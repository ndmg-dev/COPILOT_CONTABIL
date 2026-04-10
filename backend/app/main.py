"""
Copiloto Contábil IA — FastAPI Application
Main entry point with modular router architecture.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.models.schemas import HealthResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    settings = get_settings()
    logger.info(f"🚀 {settings.app_name} v{settings.app_version} starting...")
    logger.info(f"📡 Supabase URL: {settings.supabase_url[:40]}...")
    logger.info(f"🤖 LLM Model: {settings.llm_model}")
    logger.info(f"🔧 Debug: {settings.debug}")
    yield
    logger.info("👋 Application shutting down...")


def create_app() -> FastAPI:
    """Factory function to create the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Copilot técnico especializado em contabilidade brasileira. "
                    "Sistema multitenant com RAG para consultas à legislação fiscal.",
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ──────────────────────────────────────────────────────────
    from app.api.chat import router as chat_router
    from app.api.auth import router as auth_router
    from app.api.upload import router as upload_router
    from app.api.export import router as export_router
    from app.api.team import router as team_router
    from app.api.knowledge import router as knowledge_router
    from app.api.whatsapp import router as whatsapp_router
    from app.api.whatsapp_manager import router as wa_manager_router
    from app.api.workspace import router as workspace_router

    app.include_router(chat_router)
    app.include_router(auth_router)
    app.include_router(upload_router)
    app.include_router(export_router)
    app.include_router(team_router)
    app.include_router(knowledge_router)
    app.include_router(whatsapp_router)
    app.include_router(wa_manager_router)
    app.include_router(workspace_router, prefix="/api/workspace", tags=["Workspace"])

    # ── Health Check ─────────────────────────────────────────────────────
    @app.get("/health", response_model=HealthResponse, tags=["System"])
    async def health_check():
        """Endpoint de saúde para monitoramento e Docker healthcheck."""
        from app.supabase_client import get_admin_singleton
        from app.services.llm_service import get_llm_service

        supabase_ok = False
        try:
            client = get_admin_singleton()
            supabase_ok = client is not None
        except Exception:
            pass

        llm = get_llm_service()

        return HealthResponse(
            status="healthy",
            version=settings.app_version,
            supabase_connected=supabase_ok,
            llm_configured=llm.is_configured,
        )

    @app.get("/", tags=["System"])
    async def root():
        """Root endpoint — API information."""
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/health",
        }

    return app


# Create the application instance
app = create_app()