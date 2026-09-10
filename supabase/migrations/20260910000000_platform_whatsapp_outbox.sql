-- =============================================================================
-- WhatsApp centralizado (Meta Cloud API) — fila de mensagens da plataforma
-- =============================================================================
-- Substitui o envio direto via Evolution API por profissional por uma outbox
-- idempotente processada por um worker que fala com a WABA da plataforma.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Consentimento e telefone E.164 no paciente
-- -----------------------------------------------------------------------------
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT;

COMMENT ON COLUMN public.patients.whatsapp_opt_in_at IS
  'Consentimento do paciente para receber mensagens transacionais no WhatsApp';
COMMENT ON COLUMN public.patients.phone_e164 IS
  'Telefone em E.164 (+5511999998888) usado pela Meta Cloud API';

-- Backfill: phone já é normalizado como 55DDNNNNNNNNN
UPDATE public.patients
SET phone_e164 = '+' || regexp_replace(phone, '\D', '', 'g')
WHERE phone_e164 IS NULL
  AND phone IS NOT NULL
  AND regexp_replace(phone, '\D', '', 'g') <> '';

CREATE INDEX IF NOT EXISTS idx_patients_phone_e164
  ON public.patients(phone_e164)
  WHERE phone_e164 IS NOT NULL;

-- Mantém phone_e164 alinhado com phone em insert/update
CREATE OR REPLACE FUNCTION public.sync_patient_phone_e164()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF NEW.phone IS NULL THEN
    NEW.phone_e164 := NULL;
    RETURN NEW;
  END IF;

  digits := regexp_replace(NEW.phone, '\D', '', 'g');

  IF digits = '' THEN
    NEW.phone_e164 := NULL;
  ELSE
    NEW.phone_e164 := '+' || digits;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_patient_phone_e164_trigger ON public.patients;
CREATE TRIGGER sync_patient_phone_e164_trigger
  BEFORE INSERT OR UPDATE OF phone ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.sync_patient_phone_e164();

-- -----------------------------------------------------------------------------
-- 2. Fila de mensagens (outbox)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  kind TEXT NOT NULL CHECK (kind IN (
    'confirmation', 'reminder_24h', 'reminder_2h', 'meet_link'
  )),
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'sending', 'sent', 'failed', 'skipped'
  )),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider TEXT,
  provider_message_id TEXT,
  provider_status TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Idempotência: uma mensagem por (agendamento, canal, tipo).
  -- Constraint em vez de índice parcial porque ON CONFLICT não infere partial index.
  CONSTRAINT message_outbox_appointment_channel_kind_key
    UNIQUE (appointment_id, channel, kind)
);

COMMENT ON TABLE public.message_outbox IS
  'Fila idempotente de mensagens transacionais (WhatsApp plataforma + e-mail fallback)';

CREATE INDEX IF NOT EXISTS idx_message_outbox_pending
  ON public.message_outbox(status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_message_outbox_professional
  ON public.message_outbox(professional_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_outbox_provider_message
  ON public.message_outbox(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_message_outbox_updated_at ON public.message_outbox;
CREATE TRIGGER update_message_outbox_updated_at
  BEFORE UPDATE ON public.message_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.message_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals view own outbox" ON public.message_outbox;
CREATE POLICY "Professionals view own outbox"
  ON public.message_outbox FOR SELECT
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- Worker roda com service_role; anon nunca lê a fila
REVOKE ALL ON TABLE public.message_outbox FROM anon;
GRANT SELECT ON TABLE public.message_outbox TO authenticated;
GRANT ALL ON TABLE public.message_outbox TO service_role, postgres;

-- -----------------------------------------------------------------------------
-- 3. Claim atômico do lote (evita envio duplicado com workers concorrentes)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_outbox_batch(batch_size INTEGER DEFAULT 25)
RETURNS SETOF public.message_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.message_outbox o
  SET status = 'sending',
      attempts = o.attempts + 1,
      updated_at = NOW()
  WHERE o.id IN (
    SELECT id
    FROM public.message_outbox
    WHERE status = 'queued'
      AND next_attempt_at <= NOW()
    ORDER BY next_attempt_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING o.*;
END;
$$;

-- Reenfileira jobs presos em 'sending' (worker morreu no meio)
CREATE OR REPLACE FUNCTION public.requeue_stale_outbox(stale_minutes INTEGER DEFAULT 10)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE public.message_outbox
  SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'queued' END,
      error = COALESCE(error, 'Worker interrompido durante o envio'),
      next_attempt_at = NOW(),
      updated_at = NOW()
  WHERE status = 'sending'
    AND updated_at < NOW() - (stale_minutes || ' minutes')::INTERVAL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_outbox_batch(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.requeue_stale_outbox(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outbox_batch(INTEGER) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.requeue_stale_outbox(INTEGER) TO service_role, postgres;

-- -----------------------------------------------------------------------------
-- 4. Origem da confirmação (link público, WhatsApp, painel)
-- -----------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmed_via TEXT;

COMMENT ON COLUMN public.appointments.confirmed_via IS
  'Origem da confirmação: link, whatsapp, professional';
