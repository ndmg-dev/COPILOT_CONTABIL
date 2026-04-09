-- Migration: 010_profiles_phone.sql
-- Adiciona a coluna phone na tabela profiles para viabilizar rastreabilidade via WhatsApp.

-- 1. Adicionamos a coluna `phone` na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- 2. Criamos um index para acelerar a busca de profiles pelo telefone nos webhooks
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Rollback info:
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
-- DROP INDEX IF EXISTS idx_profiles_phone;
