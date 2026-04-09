"""
Copiloto Contábil IA — Pydantic Schemas
Centralized data models for API request/response validation.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


# ─── Enums ───────────────────────────────────────────────────────────────────

class ToneEnum(str, Enum):
    FORMAL = "Formal"
    INFORMAL = "Informal"
    TECNICA = "Técnica"
    DIDATICA = "Didática"

class DetailLevelEnum(str, Enum):
    RESUMIDA = "Resumida"
    PADRAO = "Padrão"
    DETALHADA = "Detalhada"


class RoleEnum(str, Enum):
    SOCIO = "socio"
    ADMIN = "admin"
    ANALISTA = "analista"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


# ─── Chat ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    """Incoming chat message from the user."""
    message: str = Field(..., min_length=1, max_length=4000, description="Mensagem do usuário")
    tone: ToneEnum = Field(default=ToneEnum.FORMAL, description="Tom da resposta da IA")
    detail_level: DetailLevelEnum = Field(default=DetailLevelEnum.PADRAO, description="Nível de detalhamento da resposta")
    conversation_id: Optional[str] = Field(default=None, description="ID da conversa existente")


class ChatResponse(BaseModel):
    """Response from the AI assistant."""
    response: str = Field(..., description="Resposta da IA")
    conversation_id: str = Field(..., description="ID da conversa")
    sources: list[str] = Field(default_factory=list, description="Fontes legais referenciadas")
    tone: ToneEnum = Field(..., description="Tom utilizado na resposta")


# ─── Auth / User ─────────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    """User profile information."""
    id: str
    email: str
    full_name: str
    role: RoleEnum
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None


class LoginRequest(BaseModel):
    """Login credentials."""
    email: str = Field(..., description="Email do usuário")
    password: str = Field(..., min_length=6, description="Senha do usuário")


class SessionResponse(BaseModel):
    """Session validation response."""
    authenticated: bool
    user: Optional[UserProfile] = None


# ─── Organization ────────────────────────────────────────────────────────────

class OrganizationCreate(BaseModel):
    """Data for creating a new organization."""
    name: str = Field(..., min_length=2, max_length=200, description="Nome do escritório")
    cnpj: Optional[str] = Field(default=None, description="CNPJ do escritório")
    email: Optional[str] = Field(default=None, description="Email de contato")
    phone: Optional[str] = Field(default=None, description="Telefone")


class OrganizationResponse(BaseModel):
    """Organization data response."""
    id: str
    name: str
    cnpj: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[str] = None


# ─── Invitation ──────────────────────────────────────────────────────────────

class InvitationCreate(BaseModel):
    """Data for inviting a member to the organization."""
    email: str = Field(..., description="Email do convidado")
    role: RoleEnum = Field(default=RoleEnum.ANALISTA, description="Papel do convidado")


class InvitationResponse(BaseModel):
    """Invitation data response."""
    id: str
    email: str
    role: RoleEnum
    status: str
    created_at: Optional[str] = None


# ─── File Upload ─────────────────────────────────────────────────────────────

class FileUploadResponse(BaseModel):
    """Response after file upload."""
    id: str
    file_name: str
    file_type: str
    file_size: int
    storage_path: str
    message: str = "Arquivo enviado com sucesso"


# ─── PDF Export ──────────────────────────────────────────────────────────────

class PDFExportRequest(BaseModel):
    """Request to export a response as PDF (Parecer Técnico)."""
    content: str = Field(..., description="Resposta técnica da IA")
    query: Optional[str] = Field(default=None, description="Pergunta original do usuário")
    title: str = Field(default="Parecer Técnico", description="Título do parecer")
    include_logo: bool = Field(default=True, description="Incluir logo do escritório")
    isolate_legal: bool = Field(default=True, description="Isolar fundamentação legal em seção separada")
    organization_name: Optional[str] = Field(default=None, description="Nome do escritório para cabeçalho")
    logo_url: Optional[str] = Field(default=None, description="URL do logo do escritório")


class PDFExportResponse(BaseModel):
    """Response with the generated PDF."""
    message: str = "PDF gerado com sucesso"
    download_url: str = Field(..., description="URL para download do PDF")


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    """Dashboard usage statistics."""
    total_messages: int = 0
    today_messages: int = 0
    active_users: int = 0
    top_topics: list[dict] = Field(default_factory=list)
    recent_activity: list[dict] = Field(default_factory=list)


# ─── Health ──────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """API health check response."""
    status: str = "healthy"
    version: str
    supabase_connected: bool
    llm_configured: bool
