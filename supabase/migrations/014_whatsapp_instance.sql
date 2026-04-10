-- Add WhatsApp instance tracking column to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS whatsapp_instance TEXT DEFAULT NULL;

COMMENT ON COLUMN organizations.whatsapp_instance IS 'Evolution API instance name linked to this organization';
