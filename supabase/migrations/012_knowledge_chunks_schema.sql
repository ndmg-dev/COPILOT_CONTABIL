-- Migration: 012_knowledge_chunks_schema.sql
-- Atualiza a tabela knowledge_chunks para aceitar rastreamento individual do documento para debug.

ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE;
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS document_name text;
