-- =============================================================================
-- PsicoGest — LIMPAR banco antes de recriar (execute ANTES do rebuild)
-- =============================================================================
-- Use quando aparecer: ERROR 42P07: relation "professionals" already exists
-- Ordem: 1) Este script  2) rebuild_database_complete.sql
-- =============================================================================

-- 1. Trigger no Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Realtime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Realtime: %', SQLERRM;
END $$;

-- 3. Storage — objetos e buckets do app
DELETE FROM storage.objects WHERE bucket_id IN ('patient-documents', 'avatars');

DROP POLICY IF EXISTS "Professionals can view own patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can upload patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can update own patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can delete own patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Avatar uploads" ON storage.objects;
DROP POLICY IF EXISTS "Avatar viewing" ON storage.objects;
DROP POLICY IF EXISTS "Avatar updates" ON storage.objects;
DROP POLICY IF EXISTS "Avatar deletes" ON storage.objects;

DELETE FROM storage.buckets WHERE id IN ('patient-documents', 'avatars');

-- 4. Apagar TODO o schema public (tabelas, funções, tipos, políticas RLS)
DROP SCHEMA IF EXISTS public CASCADE;

-- 5. Recriar schema public (padrão Supabase)
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

COMMENT ON SCHEMA public IS 'standard public schema';

-- =============================================================================
-- Pronto. Agora execute: rebuild_database_complete.sql
-- =============================================================================
