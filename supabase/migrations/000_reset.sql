-- ============================================================================
-- RESET TOTAL DO BANCO — Copiloto Contábil IA
-- Execute ANTES de rodar o 001_initial_schema.sql
-- ============================================================================

-- ── 1. Dropar todas as policies de RLS ──────────────────────────────────
do $$
declare
    r record;
begin
    for r in (
        select schemaname, tablename, policyname
        from pg_policies
        where schemaname = 'public'
    ) loop
        execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    end loop;
end $$;

-- ── 2. Dropar todas as tabelas públicas ─────────────────────────────────
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.documents cascade;
drop table if exists public.invitations cascade;
drop table if exists public.profiles cascade;
drop table if exists public.organizations cascade;
drop table if exists public.offices cascade;

-- ── 3. Dropar funções customizadas ──────────────────────────────────────
drop function if exists public.get_user_org_id() cascade;
drop function if exists public.update_updated_at_column() cascade;

-- ── 4. Limpar usuários do Auth ──────────────────────────────────────────
delete from auth.identities;
delete from auth.sessions;
delete from auth.refresh_tokens;
delete from auth.mfa_factors;
delete from auth.users;

-- ── Confirmação ─────────────────────────────────────────────────────────
select '✅ BANCO RESETADO! Agora execute o 001_initial_schema.sql' as status;
