-- Upsert do PostgREST exige SELECT na tabela (has_table_privilege).
-- Mantém os tokens fora do SELECT autenticado.
-- Funções SECURITY DEFINER gravam sem depender do cache de grants do PostgREST.

GRANT SELECT ON TABLE public.mercadopago_connections TO authenticated;
REVOKE SELECT (access_token, refresh_token, public_key) ON TABLE public.mercadopago_connections FROM authenticated;

CREATE OR REPLACE FUNCTION public.save_my_mercadopago_connection(
  p_professional_id uuid,
  p_mp_user_id text,
  p_access_token text,
  p_refresh_token text DEFAULT NULL,
  p_public_key text DEFAULT NULL,
  p_live_mode boolean DEFAULT false,
  p_scope text DEFAULT NULL,
  p_token_expires_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.professionals
    WHERE id = p_professional_id
      AND user_id = caller
  ) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.mercadopago_connections (
    professional_id,
    mp_user_id,
    access_token,
    refresh_token,
    public_key,
    live_mode,
    scope,
    connected_at,
    token_expires_at
  )
  VALUES (
    p_professional_id,
    p_mp_user_id,
    p_access_token,
    p_refresh_token,
    p_public_key,
    COALESCE(p_live_mode, false),
    p_scope,
    now(),
    p_token_expires_at
  )
  ON CONFLICT (professional_id) DO UPDATE SET
    mp_user_id = EXCLUDED.mp_user_id,
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    public_key = EXCLUDED.public_key,
    live_mode = EXCLUDED.live_mode,
    scope = EXCLUDED.scope,
    connected_at = EXCLUDED.connected_at,
    token_expires_at = EXCLUDED.token_expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_mercadopago_connection(p_professional_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.professionals
    WHERE id = p_professional_id
      AND user_id = caller
  ) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.mercadopago_connections
  WHERE professional_id = p_professional_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_my_mercadopago_connection(
  uuid, text, text, text, text, boolean, text, timestamptz
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_mercadopago_connection(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_my_mercadopago_connection(
  uuid, text, text, text, text, boolean, text, timestamptz
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_mercadopago_connection(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
