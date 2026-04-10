"""
Copilot Contábil IA — Team API (Enterprise)
Endpoints for managing organization members, roles, stats, and invitations.
"""
import logging
import csv
import io
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.middleware.auth import get_current_user
from app.models.schemas import UserProfile
from app.supabase_client import get_admin_singleton
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/team", tags=["Team"])


# ── Request Schemas ──────────────────────────────────────────────────────────
class UpdateRoleRequest(BaseModel):
    role: str  # 'admin' or 'analista' (or 'socio')

class ToggleActiveRequest(BaseModel):
    is_active: bool

class InviteMemberRequest(BaseModel):
    email: str
    role: str = "analista"


# ── GET /members — List all members with enriched stats ──────────────────────
@router.get("/members")
async def list_members(current_user: UserProfile = Depends(get_current_user)):
    """List all members of the current user's organization with query counts."""
    supabase = get_admin_singleton()

    if not current_user.organization_id:
        return {"members": [], "stats": {"total_members": 0, "active_members": 0, "total_queries": 0}}

    org_id = current_user.organization_id

    # Fetch profiles
    profiles_res = (
        supabase.table("profiles")
        .select("id, full_name, email, role, avatar_url, is_active, last_sign_in_at, created_at")
        .eq("organization_id", org_id)
        .order("created_at", desc=False)
        .execute()
    )
    members = profiles_res.data or []

    # Fetch message counts per user (via conversations)
    # We count messages with role='user' grouped by conversation.user_id
    total_queries = 0
    try:
        for member in members:
            # Get conversations for this user
            conv_res = (
                supabase.table("conversations")
                .select("id")
                .eq("user_id", member["id"])
                .eq("organization_id", org_id)
                .execute()
            )
            conv_ids = [c["id"] for c in (conv_res.data or [])]

            if conv_ids:
                # Count user messages across all conversations
                msg_res = (
                    supabase.table("messages")
                    .select("id", count="exact")
                    .in_("conversation_id", conv_ids)
                    .eq("role", "user")
                    .execute()
                )
                member["query_count"] = msg_res.count or 0
            else:
                member["query_count"] = 0

            total_queries += member["query_count"]
    except Exception as e:
        logger.warning(f"Failed to count queries: {e}")
        for member in members:
            member["query_count"] = 0

    active_count = sum(1 for m in members if m.get("is_active", True))

    return {
        "members": members,
        "stats": {
            "total_members": len(members),
            "active_members": active_count,
            "total_queries": total_queries,
            "plan_limit": 10,  # Hardcoded for MVP
        }
    }


# ── PATCH /members/{id}/role — Update a member's role ────────────────────────
@router.patch("/members/{member_id}/role")
async def update_member_role(
    member_id: str,
    payload: UpdateRoleRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """Update the role of a team member. Only admins/socios can do this."""
    if current_user.role not in ("admin", "socio"):
        raise HTTPException(status_code=403, detail="Permissão negada.")

    if payload.role not in ("admin", "analista", "socio"):
        raise HTTPException(status_code=400, detail="Role inválida.")

    supabase = get_admin_singleton()

    # Verify target is in the same org
    target = supabase.table("profiles").select("organization_id").eq("id", member_id).single().execute()
    if not target.data or target.data["organization_id"] != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Membro não encontrado.")

    supabase.table("profiles").update({"role": payload.role}).eq("id", member_id).execute()

    return {"status": "ok", "member_id": member_id, "new_role": payload.role}


# ── PATCH /members/{id}/active — Toggle member active status ─────────────────
@router.patch("/members/{member_id}/active")
async def toggle_member_active(
    member_id: str,
    payload: ToggleActiveRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """Enable or disable a team member. Only admins/socios can do this."""
    if current_user.role not in ("admin", "socio"):
        raise HTTPException(status_code=403, detail="Permissão negada.")

    supabase = get_admin_singleton()

    target = supabase.table("profiles").select("organization_id").eq("id", member_id).single().execute()
    if not target.data or target.data["organization_id"] != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Membro não encontrado.")

    # Prevent self-deactivation
    if member_id == str(current_user.id) and not payload.is_active:
        raise HTTPException(status_code=400, detail="Não é possível desativar sua própria conta.")

    supabase.table("profiles").update({"is_active": payload.is_active}).eq("id", member_id).execute()

    return {"status": "ok", "member_id": member_id, "is_active": payload.is_active}


# ── POST /invite — Invite a new member ───────────────────────────────────────
@router.post("/invite")
async def invite_member(
    payload: InviteMemberRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """Create an invitation for a new team member."""
    if current_user.role not in ("admin", "socio"):
        raise HTTPException(status_code=403, detail="Permissão negada.")

    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="Organização não configurada.")

    supabase = get_admin_singleton()

    # Check if invitation already exists
    existing = (
        supabase.table("invitations")
        .select("id")
        .eq("organization_id", current_user.organization_id)
        .eq("email", payload.email)
        .eq("status", "pending")
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Convite já enviado para este e-mail.")

    # Create invitation
    supabase.table("invitations").insert({
        "organization_id": current_user.organization_id,
        "email": payload.email,
        "role": payload.role,
        "invited_by": str(current_user.id),
    }).execute()

    settings = get_settings()
    # Chave recuperada via ambiente (protegida pelo .gitignore)
    import os
    brevo_key = os.getenv("BREVO_API_KEY", settings.brevo_api_key)

    org_data = supabase.table("organizations").select("name").eq("id", current_user.organization_id).single().execute()
    org_name = org_data.data["name"] if org_data.data else "sua organização"
    url = "https://api.brevo.com/v3/smtp/email"

    html_content = f"""
    <div style="background-color: #0F172A; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1E293B; border-radius: 12px; padding: 30px; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #2DD4BF; margin: 0; font-size: 24px;">Copilot Contábil <span style="color: #818CF8;">IA</span></h1>
            </div>
            <h2 style="color: #F8FAFC; margin-bottom: 20px; font-size: 20px;">Você foi convidado!</h2>
            <p style="color: #CBD5E1; font-size: 15px; line-height: 1.6;">
                Você foi convidado(a) por <strong>{current_user.full_name}</strong> para ingressar na plataforma na organização <strong>{org_name}</strong>.
            </p>
            <div style="margin-top: 35px; text-align: center;">
                <a href="https://copilot.mendoncagalvao.com.br" style="background-color: #2DD4BF; color: #07352d; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">
                    Acessar Plataforma
                </a>
            </div>
        </div>
    </div>
    """

    # Dispatch email via Brevo
    try:
        import httpx
        clean_key = str(brevo_key).strip().strip('""').strip("''") if brevo_key else ""
        
        headers = {
            "api-key": clean_key,
            "accept": "application/json",
            "content-type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                json={
                    "sender": {"name": "Copilot Contábil IA", "email": "nucleodigitalmendoncagalvao@gmail.com"},
                    "replyTo": {"name": "Copilot Contábil IA", "email": "nucleodigitalmendoncagalvao@gmail.com"},
                    "to": [{"email": payload.email}],
                    "subject": f"Convite - Copilot Contábil ({org_name})",
                    "htmlContent": html_content
                }
            )
            
        if response.status_code not in (200, 201, 202):
            logger.error(f"Failed to send Brevo invite: {response.text}")
            # We don't necessarily want to fail the whole request if email fails, 
            # but for debugging we can raise or just log.
            
    except Exception as e:
        logger.error(f"Exception sending Brevo invite: {e}")

    return {"status": "ok", "message": "Convite processado", "email": payload.email, "role": payload.role}


# ── POST /invite/bulk — Invite via CSV ───────────────────────────────────────
@router.post("/invite/bulk")
async def invite_bulk(
    file: UploadFile = File(...),
    current_user: UserProfile = Depends(get_current_user),
):
    """Invite multiple members from a CSV file (one email per line or email,role columns)."""
    if current_user.role not in ("admin", "socio"):
        raise HTTPException(status_code=403, detail="Permissão negada.")

    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.reader(io.StringIO(text))

    supabase = get_admin_singleton()
    invited = []
    errors = []

    for row in reader:
        if not row:
            continue
        email = row[0].strip()
        role = row[1].strip() if len(row) > 1 else "analista"
        if role not in ("admin", "analista", "socio"):
            role = "analista"

        if not email or "@" not in email:
            errors.append(f"E-mail inválido: {email}")
            continue

        try:
            supabase.table("invitations").insert({
                "organization_id": current_user.organization_id,
                "email": email,
                "role": role,
                "invited_by": str(current_user.id),
            }).execute()
            invited.append(email)
        except Exception as e:
            errors.append(f"{email}: {str(e)}")

    return {"status": "ok", "invited": invited, "errors": errors, "total": len(invited)}


# ── GET /export — Export members as CSV ──────────────────────────────────────
@router.get("/export")
async def export_members_csv(current_user: UserProfile = Depends(get_current_user)):
    """Export team members data as downloadable CSV."""
    supabase = get_admin_singleton()

    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="Organização não configurada.")

    profiles_res = (
        supabase.table("profiles")
        .select("full_name, email, role, is_active, last_sign_in_at, created_at")
        .eq("organization_id", current_user.organization_id)
        .order("created_at", desc=False)
        .execute()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Nome", "E-mail", "Perfil", "Ativo", "Último Acesso", "Desde"])

    for m in (profiles_res.data or []):
        writer.writerow([
            m.get("full_name", ""),
            m.get("email", ""),
            m.get("role", ""),
            "Sim" if m.get("is_active", True) else "Não",
            m.get("last_sign_in_at", "—"),
            m.get("created_at", ""),
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=equipe_copilot.csv"},
    )
