-- Token e campos para confirmação de agendamento pelo paciente (link no e-mail)

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmation_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meet_link TEXT,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Renomear meeting_link legado
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'meeting_link'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'meet_link'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN meeting_link TO meet_link;
  END IF;
END $$;

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

COMMENT ON COLUMN public.appointments.confirmation_token IS
  'Token público único para página /confirm/[token]';
