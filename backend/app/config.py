"""
Copiloto Contábil IA — Configuration Module
Centralizes all environment variables with validation via pydantic-settings.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str = Field(..., alias="SUPABASE_URL")
    supabase_key: str = Field(..., alias="SUPABASE_KEY")  # service_role key (backend only)

    # OpenAI / LLM
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    llm_model: str = Field(default="gpt-4o-mini", alias="LLM_MODEL")
    llm_temperature: float = Field(default=0.3, alias="LLM_TEMPERATURE")

    # Brevo Mail Integration
    brevo_api_key: str = Field(default="", alias="BREVO_API_KEY")

    # Evolution API (WhatsApp)
    evolution_api_url: str = Field(default="", alias="EVOLUTION_API_URL")
    evolution_api_key: str = Field(default="", alias="EVOLUTION_API_KEY")
    evolution_instance_name: str = Field(default="", alias="EVOLUTION_INSTANCE_NAME")
    backend_public_url: str = Field(default="http://localhost:8000", alias="BACKEND_PUBLIC_URL")

    # Application
    debug: bool = Field(default=False, alias="DEBUG")
    app_name: str = "Copilot Contábil IA"
    app_version: str = "0.1.0"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        populate_by_name = True


@lru_cache()
def get_settings() -> Settings:
    """Returns a cached singleton of the application settings."""
    return Settings()
