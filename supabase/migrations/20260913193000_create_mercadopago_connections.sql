-- Tokens OAuth do Mercado Pago. Sem políticas RLS para authenticated/anon:
-- a Data API não lê nem grava esta tabela. Só o service role (createAdminClient).

CREATE TABLE public.mercadopago_connections (
  professional_id uuid PRIMARY KEY REFERENCES public.professionals(id) ON DELETE CASCADE,
  mp_user_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  public_key text,
  live_mode boolean NOT NULL DEFAULT false,
  scope text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  token_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mercadopago_connections_mp_user_id
  ON public.mercadopago_connections (mp_user_id);

COMMENT ON TABLE public.mercadopago_connections IS
  'Credenciais OAuth do vendedor no Mercado Pago. Acesso apenas via service role.';

CREATE TRIGGER update_mercadopago_connections_updated_at
BEFORE UPDATE ON public.mercadopago_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.mercadopago_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mercadopago_connections FROM PUBLIC;
REVOKE ALL ON TABLE public.mercadopago_connections FROM anon;
REVOKE ALL ON TABLE public.mercadopago_connections FROM authenticated;

GRANT ALL ON TABLE public.mercadopago_connections TO postgres;
GRANT ALL ON TABLE public.mercadopago_connections TO service_role;
