-- Checkout público da fatura: o paciente lê dados não-sensíveis;
-- o profissional autenticado lê o próprio token OAuth para criar a preferência.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS mp_checkout_url text;

CREATE OR REPLACE FUNCTION public.get_public_pay_invoice(p_invoice_id uuid)
RETURNS TABLE (
  id uuid,
  invoice_number text,
  amount_cents integer,
  status text,
  due_date date,
  description text,
  professional_name text,
  patient_name text,
  professional_id uuid,
  mp_preference_id text,
  mp_checkout_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.invoice_number,
    i.amount_cents,
    i.status,
    i.due_date,
    i.description,
    p.full_name,
    pt.full_name,
    i.professional_id,
    i.mp_preference_id,
    i.mp_checkout_url
  FROM public.invoices i
  JOIN public.professionals p ON p.id = i.professional_id
  JOIN public.patients pt ON pt.id = i.patient_id
  WHERE i.id = p_invoice_id;
$$;

CREATE OR REPLACE FUNCTION public.get_my_mercadopago_secrets()
RETURNS TABLE (
  professional_id uuid,
  mp_user_id text,
  access_token text,
  refresh_token text,
  public_key text,
  live_mode boolean,
  token_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  SELECT id INTO pid
  FROM public.professionals
  WHERE user_id = auth.uid();

  IF pid IS NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.professional_id,
    c.mp_user_id,
    c.access_token,
    c.refresh_token,
    c.public_key,
    c.live_mode,
    c.token_expires_at
  FROM public.mercadopago_connections c
  WHERE c.professional_id = pid;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_invoice_mp_preference(
  p_invoice_id uuid,
  p_preference_id text,
  p_checkout_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invoices
  SET
    mp_preference_id = p_preference_id,
    mp_checkout_url = COALESCE(p_checkout_url, mp_checkout_url)
  WHERE id = p_invoice_id
    AND status IN ('pending', 'overdue');
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_pay_invoice(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_mercadopago_secrets() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_invoice_mp_preference(uuid, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_pay_invoice(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_pay_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_mercadopago_secrets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_invoice_mp_preference(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_invoice_mp_preference(uuid, text, text) TO anon;

NOTIFY pgrst, 'reload schema';
