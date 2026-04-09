-- ============================================================================
-- Copiloto Contábil IA — Schema Multitenant (v2.1)
-- Sistema SaaS com isolamento de dados por organização via RLS.
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Trigger function for updated_at ─────────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;


-- ============================================================================
-- TABLES (criadas ANTES das funções que as referenciam)
-- ============================================================================

-- ── Organizations (Escritórios Contábeis) ───────────────────────────────────
create table if not exists organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    cnpj text unique,
    email text,
    phone text,
    address text,
    logo_url text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

drop trigger if exists organizations_updated_at on organizations;
create trigger organizations_updated_at
    before update on organizations
    for each row execute function update_updated_at_column();

-- ── Profiles (Usuários vinculados a Organizações) ───────────────────────────
create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    organization_id uuid references organizations(id) on delete set null,
    full_name text not null,
    role text not null check (role in ('socio', 'admin', 'analista')),
    avatar_url text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
    before update on profiles
    for each row execute function update_updated_at_column();

-- ── Invitations (Convites para novos membros) ───────────────────────────────
create table if not exists invitations (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references organizations(id) on delete cascade not null,
    email text not null,
    role text not null check (role in ('socio', 'admin', 'analista')),
    invited_by uuid references auth.users(id) on delete set null,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    unique(organization_id, email)
);

drop trigger if exists invitations_updated_at on invitations;
create trigger invitations_updated_at
    before update on invitations
    for each row execute function update_updated_at_column();

-- ── Conversations (Sessões de chat) ─────────────────────────────────────────
create table if not exists conversations (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references organizations(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete set null,
    title text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

drop trigger if exists conversations_updated_at on conversations;
create trigger conversations_updated_at
    before update on conversations
    for each row execute function update_updated_at_column();

-- ── Messages (Mensagens do chat) ────────────────────────────────────────────
create table if not exists messages (
    id uuid primary key default uuid_generate_v4(),
    conversation_id uuid references conversations(id) on delete cascade not null,
    content text not null,
    role text not null check (role in ('user', 'assistant')),
    tone text check (tone in ('Técnica', 'Didática')),
    sources text[],
    created_at timestamptz default now() not null
);

-- ── Documents (Uploads de arquivos) ─────────────────────────────────────────
create table if not exists documents (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references organizations(id) on delete cascade not null,
    uploaded_by uuid references auth.users(id) on delete set null,
    file_name text not null,
    file_type text not null,
    file_size integer not null,
    storage_path text not null,
    analysis_status text default 'pending' check (analysis_status in ('pending', 'processing', 'completed', 'failed')),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

drop trigger if exists documents_updated_at on documents;
create trigger documents_updated_at
    before update on documents
    for each row execute function update_updated_at_column();


-- ============================================================================
-- HELPER FUNCTION (criada DEPOIS das tabelas que referencia)
-- ============================================================================

-- Returns the organization_id of the currently authenticated user.
-- Used by all RLS policies to enforce data isolation.
create or replace function get_user_org_id()
returns uuid as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
$$ language sql security definer stable;


-- ============================================================================
-- INDEXES (Performance)
-- ============================================================================

create index if not exists idx_profiles_org on profiles(organization_id);
create index if not exists idx_conversations_org on conversations(organization_id);
create index if not exists idx_conversations_user on conversations(user_id);
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_messages_created on messages(created_at);
create index if not exists idx_documents_org on documents(organization_id);
create index if not exists idx_invitations_org on invitations(organization_id);
create index if not exists idx_invitations_email on invitations(email);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table invitations enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table documents enable row level security;

-- ── Organizations ───────────────────────────────────────────────────────────

drop policy if exists "org_select_own" on organizations;
create policy "org_select_own"
    on organizations for select
    using (id = get_user_org_id());

drop policy if exists "org_update_admin" on organizations;
create policy "org_update_admin"
    on organizations for update
    using (id = get_user_org_id())
    with check (id = get_user_org_id());

-- ── Profiles ────────────────────────────────────────────────────────────────

drop policy if exists "profiles_select_same_org" on profiles;
create policy "profiles_select_same_org"
    on profiles for select
    using (organization_id = get_user_org_id());

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
    on profiles for insert
    with check (id = auth.uid());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
    on profiles for update
    using (id = auth.uid());

-- ── Invitations ─────────────────────────────────────────────────────────────

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

drop policy if exists "invitations_update_admin" on invitations;
create policy "invitations_update_admin"
    on invitations for update
    using (
        organization_id = get_user_org_id()
        and exists (
            select 1 from profiles
            where id = auth.uid()
            and role in ('socio', 'admin')
        )
    );

-- ── Conversations ───────────────────────────────────────────────────────────

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

-- ── Messages ────────────────────────────────────────────────────────────────

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

-- ── Documents ───────────────────────────────────────────────────────────────

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


-- ============================================================================
-- Supabase Storage Bucket
-- ============================================================================

-- Create the documents storage bucket (run manually in Supabase Dashboard if needed)
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);