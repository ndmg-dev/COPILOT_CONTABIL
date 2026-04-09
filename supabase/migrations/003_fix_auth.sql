-- ============================================================================
-- FIX: Resolver "Database error querying schema"
-- O problema é que get_user_org_id() causa erro durante autenticação.
-- Este script recria a função com tratamento de erro.
-- Execute no SQL Editor do Supabase.
-- ============================================================================

-- ── 1. Recriar a função com proteção contra NULL ────────────────────────
create or replace function get_user_org_id()
returns uuid as $$
declare
  org_id uuid;
begin
  -- auth.uid() pode ser NULL durante operações internas do Supabase
  if auth.uid() is null then
    return null;
  end if;

  select organization_id into org_id
  from public.profiles
  where id = auth.uid();

  return org_id;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer stable;

-- ── 2. Recarregar schema do PostgREST ───────────────────────────────────
notify pgrst, 'reload schema';

-- ── Verificação ─────────────────────────────────────────────────────────
select '✅ Função corrigida e schema recarregado!' as status;
