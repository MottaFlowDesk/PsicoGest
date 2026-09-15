-- A conexão OAuth do Mercado Pago precisa ser gravada no callback mesmo quando
-- SUPABASE_SERVICE_ROLE_KEY está errada na Vercel (Invalid API key).
-- O profissional autenticado pode escrever a própria linha, mas não lê os tokens.

CREATE OR REPLACE FUNCTION public.mercadopago_connection_is_own(target_professional_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.professionals
    WHERE id = target_professional_id
      AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.mercadopago_connection_is_own(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mercadopago_connection_is_own(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mercadopago_connection_is_own(uuid) TO service_role;

GRANT SELECT (
  professional_id,
  mp_user_id,
  live_mode,
  connected_at,
  token_expires_at,
  updated_at
) ON TABLE public.mercadopago_connections TO authenticated;

GRANT INSERT (
  professional_id,
  mp_user_id,
  access_token,
  refresh_token,
  public_key,
  live_mode,
  scope,
  connected_at,
  token_expires_at,
  updated_at
) ON TABLE public.mercadopago_connections TO authenticated;

GRANT UPDATE (
  mp_user_id,
  access_token,
  refresh_token,
  public_key,
  live_mode,
  scope,
  connected_at,
  token_expires_at,
  updated_at
) ON TABLE public.mercadopago_connections TO authenticated;

GRANT DELETE ON TABLE public.mercadopago_connections TO authenticated;

CREATE POLICY "Professionals view own Mercado Pago status"
  ON public.mercadopago_connections
  FOR SELECT
  TO authenticated
  USING (public.mercadopago_connection_is_own(professional_id));

CREATE POLICY "Professionals insert own Mercado Pago connection"
  ON public.mercadopago_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (public.mercadopago_connection_is_own(professional_id));

CREATE POLICY "Professionals update own Mercado Pago connection"
  ON public.mercadopago_connections
  FOR UPDATE
  TO authenticated
  USING (public.mercadopago_connection_is_own(professional_id))
  WITH CHECK (public.mercadopago_connection_is_own(professional_id));

CREATE POLICY "Professionals delete own Mercado Pago connection"
  ON public.mercadopago_connections
  FOR DELETE
  TO authenticated
  USING (public.mercadopago_connection_is_own(professional_id));

COMMENT ON TABLE public.mercadopago_connections IS
  'Credenciais OAuth do vendedor no Mercado Pago. O profissional autenticado grava a própria linha, mas não lê access_token nem refresh_token.';
