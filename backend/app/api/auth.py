"""
Copiloto Contábil IA — Auth API Router
Authentication endpoints using Supabase Auth.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import (
    LoginRequest,
    SessionResponse,
    UserProfile,
    InvitationCreate,
    InvitationResponse,
    RoleEnum,
)
from app.middleware.auth import get_current_user, require_admin_or_socio
from app.supabase_client import get_admin_singleton

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login")
async def login(request: LoginRequest):
    """
    Autentica o usuário via Supabase Auth.
    Retorna o token de sessão para uso no frontend.
    """
    supabase = get_admin_singleton()

    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })

        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas",
            )

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": {
                "id": str(response.user.id),
                "email": response.user.email,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Erro ao autenticar. Verifique suas credenciais.",
        )


@router.get("/session", response_model=SessionResponse)
async def validate_session(
    current_user: UserProfile = Depends(get_current_user),
):
    """Valida a sessão atual e retorna o perfil do usuário."""
    return SessionResponse(authenticated=True, user=current_user)


@router.get("/profile", response_model=UserProfile)
async def get_profile(
    current_user: UserProfile = Depends(get_current_user),
):
    """Retorna o perfil completo do usuário autenticado."""
    return current_user


@router.get("/members")
async def list_members(
    current_user: UserProfile = Depends(get_current_user),
):
    """Lista todos os membros da organização do usuário."""
    supabase = get_admin_singleton()

    try:
        response = (
            supabase.table("profiles")
            .select("id, full_name, role, created_at")
            .eq("organization_id", current_user.organization_id)
            .execute()
        )
        return {"members": response.data or []}

    except Exception as e:
        logger.error(f"Error listing members: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/invite", response_model=InvitationResponse)
async def invite_member(
    invitation: InvitationCreate,
    current_user: UserProfile = Depends(require_admin_or_socio),
):
    """
    Convida um novo membro para a organização.
    Apenas sócios e administradores podem convidar.
    """
    supabase = get_admin_singleton()

    try:
        invite_data = {
            "organization_id": current_user.organization_id,
            "email": invitation.email,
            "role": invitation.role.value,
            "invited_by": current_user.id,
            "status": "pending",
        }

        response = supabase.table("invitations").insert(invite_data).execute()

        if response.data:
            inv = response.data[0]
            return InvitationResponse(
                id=inv["id"],
                email=inv["email"],
                role=RoleEnum(inv["role"]),
                status=inv["status"],
                created_at=inv.get("created_at"),
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao criar convite",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invitation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
