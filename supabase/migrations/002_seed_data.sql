-- ============================================================================
-- Copiloto Contábil IA — Seed Data (Desenvolvimento)
-- Dados de teste separados do schema estrutural.
-- Execute APENAS em ambientes de desenvolvimento.
-- ============================================================================

-- ── Organização de teste ────────────────────────────────────────────────────
insert into organizations (id, name, cnpj, email, phone, address) values
(
    'a0000000-0000-0000-0000-000000000001',
    'Escritório Contábil Premium LTDA',
    '12.345.678/0001-90',
    'contato@premiumcontabil.com.br',
    '(11) 3456-7890',
    'Av. Paulista, 1234 - 10º andar - São Paulo/SP'
);

-- NOTA: Os profiles de teste devem ser criados APÓS registrar usuários
-- no Supabase Auth. Use o seguinte template após criar os usuários:
--
-- insert into profiles (id, organization_id, full_name, role) values
-- ('<auth_user_uuid>', 'a0000000-0000-0000-0000-000000000001', 'João Silva', 'socio');
-- insert into profiles (id, organization_id, full_name, role) values
-- ('<auth_user_uuid>', 'a0000000-0000-0000-0000-000000000001', 'Maria Oliveira', 'admin');
-- insert into profiles (id, organization_id, full_name, role) values
-- ('<auth_user_uuid>', 'a0000000-0000-0000-0000-000000000001', 'Ana Costa', 'analista');
