-- ============================================================================
-- Copiloto Contábil IA — Fix para Google Workspace SSO
-- Restaura RLS, recria função, limpa seeds de email/password
-- Execute no SQL Editor do Supabase
-- ============================================================================

-- ── 1. Limpar o usuário antigo criado via SQL ───────────────────────────
delete from public.profiles where id = 'b0000000-0000-0000-0000-000000000001';
delete from auth.identities where user_id = 'b0000000-0000-0000-0000-000000000001';
delete from auth.users where id = 'b0000000-0000-0000-0000-000000000001';

-- ── 2. Recriar função helper (plpgsql segura) ───────────────────────────
create or replace function get_user_org_id()
returns uuid as $$
declare
  org_id uuid;
begin
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

-- ── 3. Re-habilitar RLS ─────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;

-- ── 4. Recriar policies (foram removidas pelo CASCADE) ──────────────────

-- Organizations
drop policy if exists "org_select_own" on organizations;
create policy "org_select_own"
    on organizations for select
    using (id = get_user_org_id());

drop policy if exists "org_update_admin" on organizations;
create policy "org_update_admin"
    on organizations for update
    using (id = get_user_org_id())
    with check (id = get_user_org_id());

-- Insert policy for auto-provisioning (backend service_role bypasses RLS anyway)
drop policy if exists "org_insert_authenticated" on organizations;
create policy "org_insert_authenticated"
    on organizations for insert
    with check (auth.uid() is not null);

-- Profiles
drop policy if exists "profiles_select_same_org" on profiles;
create policy "profiles_select_same_org"
    on profiles for select
    using (organization_id = get_user_org_id() or id = auth.uid());

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
    on profiles for insert
    with check (id = auth.uid());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
    on profiles for update
    using (id = auth.uid());

-- Invitations
drop policy if exists "invitations_select_own_org" on invitations;
create policy "invitations_select_own_org"
    on invitations for select
    using (organization_id = get_user_org_id());

drop policy if exists "invitations_insert_admin" on invitations;
create policy "invitations_insert_admin"
    on invitations for insert
    with check (
        organization_id = get_user_org_id()
        and exists (
            select 1 from profiles
            where id = auth.uid()
            and role in ('socio', 'admin')
        )
    );

-- Conversations
drop policy if exists "conversations_select_own_org" on conversations;
create policy "conversations_select_own_org"
    on conversations for select
    using (organization_id = get_user_org_id());

drop policy if exists "conversations_insert_own_org" on conversations;
create policy "conversations_insert_own_org"
    on conversations for insert
    with check (organization_id = get_user_org_id());

drop policy if exists "conversations_update_own_org" on conversations;
create policy "conversations_update_own_org"
    on conversations for update
    using (organization_id = get_user_org_id());

drop policy if exists "conversations_delete_own_org" on conversations;
create policy "conversations_delete_own_org"
    on conversations for delete
    using (organization_id = get_user_org_id());

-- Messages
drop policy if exists "messages_select_own_org" on messages;
create policy "messages_select_own_org"
    on messages for select
    using (
        conversation_id in (
            select id from conversations
            where organization_id = get_user_org_id()
        )
    );

drop policy if exists "messages_insert_own_org" on messages;
create policy "messages_insert_own_org"
    on messages for insert
    with check (
        conversation_id in (
            select id from conversations
            where organization_id = get_user_org_id()
        )
    );

-- Documents
drop policy if exists "documents_select_own_org" on documents;
create policy "documents_select_own_org"
    on documents for select
    using (organization_id = get_user_org_id());

drop policy if exists "documents_insert_own_org" on documents;
create policy "documents_insert_own_org"
    on documents for insert
    with check (organization_id = get_user_org_id());

drop policy if exists "documents_delete_admin" on documents;
create policy "documents_delete_admin"
    on documents for delete
    using (
        organization_id = get_user_org_id()
        and exists (
            select 1 from profiles
            where id = auth.uid()
            and role in ('socio', 'admin')
        )
    );

-- ── 5. Recarregar schema ────────────────────────────────────────────────
notify pgrst, 'reload schema';
notify pgrst, 'reload config';

select '✅ Schema restaurado para Google Workspace SSO!' as status;
