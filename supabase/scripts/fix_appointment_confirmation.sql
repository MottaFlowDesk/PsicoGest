-- Execute no SQL Editor do Supabase se confirmação por link não funcionar

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmation_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meet_link TEXT,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.set_appointment_confirmation_token()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.confirmation_token IS NULL THEN
    NEW.confirmation_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_appointment_confirmation_token_trigger ON public.appointments;

CREATE TRIGGER set_appointment_confirmation_token_trigger
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_appointment_confirmation_token();

CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_token
  ON public.appointments(confirmation_token);

-- Tokens para agendamentos antigos sem token
UPDATE public.appointments
SET confirmation_token = encode(gen_random_bytes(32), 'hex')
WHERE confirmation_token IS NULL;
