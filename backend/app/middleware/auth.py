"""
Copilot Contábil IA — Auth Middleware
JWT validation via Supabase for protected routes.
Domain restriction: @mendoncagalvao.com.br (Google Workspace SSO)
"""
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.supabase_client import get_admin_singleton
from app.models.schemas import UserProfile, RoleEnum

logger = logging.getLogger(__name__)

security = HTTPBearer()

ALLOWED_DOMAIN = "mendoncagalvao.com.br"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserProfile:
    """
    Validates the Supabase JWT and returns the authenticated user's profile.
    Also enforces domain restriction for Google Workspace SSO.
    Use as a FastAPI dependency on protected routes.
    """
    token = credentials.credentials

    try:
        supabase = get_admin_singleton()

        # Verify the JWT with Supabase Auth
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido ou expirado",
            )

        user = user_response.user
        email = user.email or ""

        # ── Domain restriction ───────────────────────────────────────
        if not email.endswith(f"@{ALLOWED_DOMAIN}"):
            logger.warning(f"Tentativa de acesso de domínio não autorizado: {email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso restrito ao domínio @{ALLOWED_DOMAIN}",
            )

        # Fetch the user's profile from the profiles table
        profile_data = None
        try:
            profile_response = (
                supabase.table("profiles")
                .select("*, organizations(name)")
                .eq("id", str(user.id))
                .maybe_single()
                .execute()
            )
            profile_data = getattr(profile_response, 'data', None)
        except Exception:
            profile_data = None

        if not profile_data:
            # ── Auto-provision profile for first-time Google SSO users ──
            logger.info(f"Auto-provisioning profile for: {email}")
            profile_data = await _auto_provision_profile(supabase, user)

        org_name = None
        if isinstance(profile_data, dict) and profile_data.get("organizations"):
            org_name = profile_data["organizations"].get("name")

        return UserProfile(
            id=str(user.id),
            email=email,
            full_name=profile_data.get("full_name", "") if isinstance(profile_data, dict) else "",
            role=RoleEnum(profile_data.get("role", "analista") if isinstance(profile_data, dict) else "analista"),
            organization_id=profile_data.get("organization_id") if isinstance(profile_data, dict) else None,
            organization_name=org_name,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Erro de autenticação: {str(e)}",
        )


async def _auto_provision_profile(supabase, user) -> dict:
    """
    Automatically creates an organization and profile for a first-time
    Google Workspace user. This enables zero-friction onboarding.
    """
    email = user.email or ""
    user_meta = getattr(user, 'user_metadata', {}) or {}
    full_name = (
        user_meta.get("full_name")
        or user_meta.get("name")
        or user_meta.get("full_name")
        or email.split("@")[0].replace(".", " ").title()
    )

    # Check if org already exists for this domain
    domain = email.split("@")[1] if "@" in email else ""
    org_id = None

    try:
        org_response = (
            supabase.table("organizations")
            .select("*")
            .eq("email", f"contato@{domain}")
            .maybe_single()
            .execute()
        )
        org_data = getattr(org_response, 'data', None)
        if org_data:
            org_id = org_data["id"]
    except Exception:
        org_data = None

    if not org_id:
        # Create org for the domain
        org_insert = (
            supabase.table("organizations")
            .insert({
                "name": "Mendonça Galvão Contadores",
                "email": f"contato@{domain}",
            })
            .execute()
        )
        org_id = org_insert.data[0]["id"]

    # Create the profile
    profile_insert = (
        supabase.table("profiles")
        .insert({
            "id": str(user.id),
            "organization_id": org_id,
            "full_name": full_name,
            "role": "analista",  # Default role; admin upgrades later
        })
        .execute()
    )

    profile_data = profile_insert.data[0]

    # Re-fetch with organization join
    try:
        refetch = (
            supabase.table("profiles")
            .select("*, organizations(name)")
            .eq("id", str(user.id))
            .maybe_single()
            .execute()
        )
        return getattr(refetch, 'data', None) or profile_data
    except Exception:
        return profile_data


async def require_admin_or_socio(
    current_user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    """
    Dependency that ensures the user is an admin or sócio.
    Use for management endpoints (invitations, member management).
    """
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.SOCIO]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente. Apenas sócios e administradores podem realizar esta ação.",
        )
    return current_user
