-- Migration: 011_update_messages_schema.sql
-- Atualiza a tabela messages removendo a constraint estrita de tom e incluindo o level_detail

-- 1. Remove a check constraint que valida os Tons fixos (Formal, Informal, etc)
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_tone_check;

-- 2. Adiciona a coluna para armazenar o detail_level escolhido (Resumida, Padrão, Detalhada)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS detail_level text;
