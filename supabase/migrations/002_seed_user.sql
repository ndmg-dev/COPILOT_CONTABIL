-- ============================================================================
-- Copiloto Contábil IA — Seed: Criar usuário para login
-- Execute este script no SQL Editor do Supabase Dashboard
-- (https://supabase.com/dashboard → seu projeto → SQL Editor)
-- ============================================================================

-- ── Habilitar extensão pgcrypto (necessária para hash de senha) ─────────
create extension if not exists "pgcrypto";

-- ── Variáveis do usuário (altere conforme necessário) ───────────────────
-- Email:  admin@copiloto.com
-- Senha:  CopilotoIA@2026
-- Role:   socio (sócio do escritório)

-- ── 1. Criar a organização (escritório contábil) ────────────────────────
insert into public.organizations (id, name, cnpj, email)
values (
    'a0000000-0000-0000-0000-000000000001',
    'Escritório Modelo Ltda',
    '12.345.678/0001-90',
    'contato@escritoriomodelo.com.br'
)
on conflict (id) do nothing;

-- ── 2. Criar o usuário no Supabase Auth ─────────────────────────────────
insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
)
values (
    'b0000000-0000-0000-0000-000000000001',                          -- id (UUID fixo para referência)
    '00000000-0000-0000-0000-000000000000',                          -- instance_id
    'authenticated',                                                  -- aud
    'authenticated',                                                  -- role
    'admin@copiloto.com',                                             -- email
    crypt('CopilotoIA@2026', gen_salt('bf')),                        -- senha com hash bcrypt
    now(),                                                            -- email_confirmed_at (auto-confirma)
    '{"provider": "email", "providers": ["email"]}'::jsonb,          -- app metadata
    '{"full_name": "Administrador"}'::jsonb,                         -- user metadata
    now(),                                                            -- created_at
    now(),                                                            -- updated_at
    '',                                                               -- confirmation_token
    ''                                                                -- recovery_token
)
on conflict (id) do nothing;

-- ── 3. Criar identidade do usuário (necessário para login) ──────────────
insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
values (
    'b0000000-0000-0000-0000-000000000001',                          -- id
    'b0000000-0000-0000-0000-000000000001',                          -- user_id (mesmo do auth.users)
    jsonb_build_object(
        'sub', 'b0000000-0000-0000-0000-000000000001',
        'email', 'admin@copiloto.com',
        'email_verified', true
    ),                                                                -- identity_data
    'email',                                                          -- provider
    'b0000000-0000-0000-0000-000000000001',                          -- provider_id
    now(),                                                            -- last_sign_in_at
    now(),                                                            -- created_at
    now()                                                             -- updated_at
)
on conflict (provider_id, provider) do nothing;

-- ── 4. Criar o perfil vinculado à organização ───────────────────────────
insert into public.profiles (id, organization_id, full_name, role)
values (
    'b0000000-0000-0000-0000-000000000001',                          -- id (mesmo do auth.users)
    'a0000000-0000-0000-0000-000000000001',                          -- organization_id
    'Administrador',                                                  -- full_name
    'socio'                                                           -- role (socio/admin/analista)
)
on conflict (id) do nothing;

-- ── Verificação ─────────────────────────────────────────────────────────
select
    '✅ Usuário criado com sucesso!' as status,
    u.email,
    p.full_name,
    p.role,
    o.name as organization
from auth.users u
join public.profiles p on p.id = u.id
join public.organizations o on o.id = p.organization_id
where u.id = 'b0000000-0000-0000-0000-000000000001';

-- ============================================================================
-- CREDENCIAIS PARA LOGIN:
--   Email: admin@copiloto.com
--   Senha: CopilotoIA@2026
-- ============================================================================
