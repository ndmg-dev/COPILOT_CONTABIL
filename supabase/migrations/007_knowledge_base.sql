-- ============================================================================
-- Copilot Contábil IA — Knowledge Base (pgvector) + WhatsApp Sessions
-- Execute no SQL Editor do Supabase APÓS habilitar a extensão 'vector'
-- em Database > Extensions > vector > Enable
-- ============================================================================

-- ── 1. Habilitar pgvector ───────────────────────────────────────────────────
create extension if not exists vector;

-- ── 2. Tabela de chunks de conhecimento ─────────────────────────────────────
create table if not exists knowledge_chunks (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references organizations(id) on delete cascade not null,
    document_id uuid references documents(id) on delete cascade,
    content text not null,
    embedding vector(1536),
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now() not null
);

-- Índice para busca vetorial rápida (cosine similarity)
create index if not exists idx_knowledge_embedding
  on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists idx_knowledge_org
  on knowledge_chunks(organization_id);

create index if not exists idx_knowledge_doc
  on knowledge_chunks(document_id);

-- ── 3. Função de busca semântica ────────────────────────────────────────────
create or replace function match_knowledge_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5,
  p_organization_id uuid default null
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
    select
      kc.id,
      kc.content,
      kc.metadata,
      1 - (kc.embedding <=> query_embedding) as similarity
    from knowledge_chunks kc
    where
      (p_organization_id is null or kc.organization_id = p_organization_id)
      and 1 - (kc.embedding <=> query_embedding) > match_threshold
    order by kc.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- ── 4. RLS para knowledge_chunks ────────────────────────────────────────────
alter table knowledge_chunks enable row level security;

drop policy if exists "knowledge_select_own_org" on knowledge_chunks;
create policy "knowledge_select_own_org"
  on knowledge_chunks for select
  using (organization_id = get_user_org_id());

drop policy if exists "knowledge_insert_admin" on knowledge_chunks;
create policy "knowledge_insert_admin"
  on knowledge_chunks for insert
  with check (organization_id = get_user_org_id());

drop policy if exists "knowledge_delete_admin" on knowledge_chunks;
create policy "knowledge_delete_admin"
  on knowledge_chunks for delete
  using (organization_id = get_user_org_id());

-- ── 5. Tabela de sessões WhatsApp ───────────────────────────────────────────
create table if not exists whatsapp_sessions (
    id uuid primary key default uuid_generate_v4(),
    phone_number text not null unique,
    organization_id uuid references organizations(id) on delete cascade,
    conversation_id uuid references conversations(id) on delete set null,
    contact_name text,
    last_message_at timestamptz default now(),
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now() not null
);

create index if not exists idx_whatsapp_phone on whatsapp_sessions(phone_number);
create index if not exists idx_whatsapp_org on whatsapp_sessions(organization_id);

-- ── 6. Recarregar schema ────────────────────────────────────────────────────
notify pgrst, 'reload schema';

select 'Knowledge base (pgvector) e WhatsApp sessions criados com sucesso.' as status;
