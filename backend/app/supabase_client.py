"""
Copiloto Contábil IA — Supabase Client Module
Provides admin and user-scoped Supabase clients.
"""
from supabase import create_client, Client
from app.config import get_settings


def get_admin_client() -> Client:
    """
    Returns a Supabase client using the service_role key.
    This client bypasses RLS — use only for admin operations in the backend.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_user_client(access_token: str) -> Client:
    """
    Returns a Supabase client scoped to a specific user's JWT.
    This client respects RLS policies, ensuring data isolation per organization.
    """
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_key)
    client.auth.set_session(access_token, "")
    return client


# Singleton admin client for general backend operations
_admin_client: Client | None = None


def get_admin_singleton() -> Client:
    """Returns a cached admin client instance."""
    global _admin_client
    if _admin_client is None:
        _admin_client = get_admin_client()
    return _admin_client