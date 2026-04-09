-- ============================================================================
-- DIAGNÓSTICO: Desabilitar RLS temporariamente para testar login
-- Execute no SQL Editor do Supabase
-- ============================================================================

-- ── Desabilitar RLS em todas as tabelas ─────────────────────────────────
alter table public.organizations disable row level security;
alter table public.profiles disable row level security;
alter table public.invitations disable row level security;
alter table public.conversations disable row level security;
alter table public.messages disable row level security;
alter table public.documents disable row level security;

-- ── Verificar se há triggers problemáticos em auth.users ────────────────
select tgname, tgrelid::regclass, tgenabled
from pg_trigger
where tgrelid = 'auth.users'::regclass;

-- ── Recarregar schema ───────────────────────────────────────────────────
notify pgrst, 'reload schema';
notify pgrst, 'reload config';

select '✅ RLS desabilitado. Tente fazer login agora.' as status;
