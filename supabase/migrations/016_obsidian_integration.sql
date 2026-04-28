-- ============================================================================
-- Copilot Contábil IA — Obsidian Integration Support
-- Migration: 016_obsidian_integration.sql
-- 
-- Creates the organization_configs table for persisting integration
-- settings (Obsidian vault config, auto-sync preferences, etc.)
-- ============================================================================

-- ── 1. Tabela de configurações por organização ──────────────────────────────
-- Tabela genérica key-value para guardar configurações de integrações.
-- Usada inicialmente pela integração Obsidian, mas extensível para futuras.
CREATE TABLE IF NOT EXISTS organization_configs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    config_key text NOT NULL,
    config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(organization_id, config_key)
);

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS organization_configs_updated_at ON organization_configs;
CREATE TRIGGER organization_configs_updated_at
    BEFORE UPDATE ON organization_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_org_configs_org ON organization_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_configs_key ON organization_configs(config_key);

-- ── 2. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE organization_configs ENABLE ROW LEVEL SECURITY;

-- SELECT: membros da mesma organização podem ler configs
DROP POLICY IF EXISTS "org_configs_select_own" ON organization_configs;
CREATE POLICY "org_configs_select_own"
    ON organization_configs FOR SELECT
    USING (organization_id = get_user_org_id());

-- INSERT: apenas admin/socio podem inserir
DROP POLICY IF EXISTS "org_configs_insert_admin" ON organization_configs;
CREATE POLICY "org_configs_insert_admin"
    ON organization_configs FOR INSERT
    WITH CHECK (
        organization_id = get_user_org_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('socio', 'admin')
        )
    );

-- UPDATE: apenas admin/socio podem atualizar
DROP POLICY IF EXISTS "org_configs_update_admin" ON organization_configs;
CREATE POLICY "org_configs_update_admin"
    ON organization_configs FOR UPDATE
    USING (
        organization_id = get_user_org_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('socio', 'admin')
        )
    );

-- DELETE: apenas admin/socio podem deletar
DROP POLICY IF EXISTS "org_configs_delete_admin" ON organization_configs;
CREATE POLICY "org_configs_delete_admin"
    ON organization_configs FOR DELETE
    USING (
        organization_id = get_user_org_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('socio', 'admin')
        )
    );

-- ── 3. Índice GIN no metadata de knowledge_chunks para filtro por source_type ─
-- Otimiza queries como: metadata->>'source_type' = 'obsidian'
CREATE INDEX IF NOT EXISTS idx_knowledge_metadata_gin 
    ON knowledge_chunks USING gin (metadata);

-- ── 4. Recarregar schema do PostgREST ───────────────────────────────────────
NOTIFY pgrst, 'reload schema';

SELECT 'organization_configs criada + índice GIN em knowledge_chunks.metadata' AS status;
