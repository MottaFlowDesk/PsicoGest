-- =============================================================================
-- PsicoGest — Recriação completa do banco de dados
-- =============================================================================
-- ONDE EXECUTAR: Supabase Dashboard → SQL Editor → New query → Run
-- QUANDO USAR: Projeto Supabase NOVO ou banco vazio (sem tabelas public.*)
--
-- Este script consolida todas as migrações em supabase/migrations/ e inclui
-- colunas/políticas necessárias para o código atual do Next.js.
--
-- SE DER ERRO "relation professionals already exists":
--   Execute PRIMEIRO: 00_drop_database_before_rebuild.sql
--   Depois execute este arquivo novamente.
--
-- APÓS EXECUTAR:
--   1. Confirme Storage → buckets "patient-documents" e "avatars"
--   2. Authentication → URL Configuration (redirect URLs do app)
--   3. Configure SUPABASE_SERVICE_ROLE_KEY no .env (webhooks, cron, notificações)
--   4. (Opcional) Re-deploy Edge Functions de automação se as usava antes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensões
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Funções utilitárias
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_default_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.settings (professional_id)
  VALUES (NEW.id)
  ON CONFLICT (professional_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.professionals (user_id, email, full_name, subscription_plan, subscription_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    'free',
    'free'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_seq INTEGER;
  year INTEGER;
BEGIN
  year := EXTRACT(YEAR FROM NEW.issue_date);
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_seq
  FROM invoices
  WHERE professional_id = NEW.professional_id AND fiscal_year = year;

  NEW.fiscal_year := year;
  NEW.sequence_number := next_seq;
  NEW.invoice_number := 'INV-' || year || '-' || LPAD(next_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.get_subscription_limits(prof_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_name TEXT;
  limits JSONB;
BEGIN
  SELECT subscription_plan INTO plan_name
  FROM professionals
  WHERE id = prof_id;

  limits := jsonb_build_object(
    'max_patients', 0,
    'max_ai_hours_per_month', 0,
    'whatsapp_reminders', false,
    'ai_transcription', false,
    'priority_support', false,
    'unlimited_patients', false,
    'unlimited_ai', false
  );

  CASE plan_name
    WHEN 'essencial' THEN
      limits := jsonb_build_object(
        'max_patients', 60,
        'max_ai_hours_per_month', 0,
        'whatsapp_reminders', false,
        'ai_transcription', false,
        'priority_support', false,
        'unlimited_patients', false,
        'unlimited_ai', false
      );
    WHEN 'profissional' THEN
      limits := jsonb_build_object(
        'max_patients', 120,
        'max_ai_hours_per_month', 10,
        'whatsapp_reminders', true,
        'ai_transcription', true,
        'priority_support', true,
        'unlimited_patients', false,
        'unlimited_ai', false
      );
    WHEN 'premium' THEN
      limits := jsonb_build_object(
        'max_patients', 999999,
        'max_ai_hours_per_month', 999999,
        'whatsapp_reminders', true,
        'ai_transcription', true,
        'priority_support', true,
        'unlimited_patients', true,
        'unlimited_ai', true
      );
    ELSE
      limits := jsonb_build_object(
        'max_patients', 5,
        'max_ai_hours_per_month', 0,
        'whatsapp_reminders', false,
        'ai_transcription', false,
        'priority_support', false,
        'unlimited_patients', false,
        'unlimited_ai', false
      );
  END CASE;

  RETURN limits;
END;
$$;

CREATE OR REPLACE FUNCTION public.clean_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND read = TRUE;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.appointments_needing_confirmation()
RETURNS TABLE (
  appointment_id UUID,
  professional_id UUID,
  patient_id UUID,
  scheduled_at TIMESTAMPTZ,
  patient_name TEXT,
  patient_whatsapp TEXT,
  patient_email TEXT,
  professional_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.professional_id,
    a.patient_id,
    a.scheduled_at,
    p.full_name,
    p.phone,
    p.email,
    pr.full_name
  FROM appointments a
  INNER JOIN patients p ON a.patient_id = p.id
  INNER JOIN professionals pr ON a.professional_id = pr.id
  WHERE
    a.status = 'pending'
    AND a.scheduled_at > NOW()
    AND (
      a.confirmation_sent_at IS NULL
      OR a.confirmation_sent_at < NOW() - INTERVAL '24 hours'
    )
  ORDER BY a.scheduled_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.appointments_needing_reminder()
RETURNS TABLE (
  appointment_id UUID,
  professional_id UUID,
  patient_id UUID,
  scheduled_at TIMESTAMPTZ,
  meeting_link TEXT,
  patient_name TEXT,
  patient_whatsapp TEXT,
  professional_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.professional_id,
    a.patient_id,
    a.scheduled_at,
    a.meeting_link,
    p.full_name,
    p.phone,
    pr.full_name
  FROM appointments a
  INNER JOIN patients p ON a.patient_id = p.id
  INNER JOIN professionals pr ON a.professional_id = pr.id
  WHERE
    a.status = 'confirmed'
    AND a.meeting_link IS NOT NULL
    AND a.reminder_sent_at IS NULL
    AND a.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '15 minutes'
  ORDER BY a.scheduled_at ASC;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. Tabela: professionals
-- -----------------------------------------------------------------------------
CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  specialty TEXT,
  registration_number TEXT,
  bio TEXT,
  avatar_url TEXT,
  custom_url_slug TEXT UNIQUE,
  cpf TEXT UNIQUE,
  target_audience TEXT[],
  address_zip TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  stripe_account_id TEXT,
  stripe_connected_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  subscription_plan TEXT CHECK (subscription_plan IN ('essencial', 'profissional', 'premium', 'free')),
  subscription_status TEXT,
  subscription_trial_ends_at TIMESTAMPTZ,
  subscription_current_period_end TIMESTAMPTZ,
  google_calendar_connected BOOLEAN DEFAULT FALSE,
  google_refresh_token TEXT,
  zoom_connected BOOLEAN DEFAULT FALSE,
  zoom_refresh_token TEXT,
  whatsapp_connected_at TIMESTAMPTZ,
  whatsapp_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_custom_url CHECK (
    custom_url_slug IS NULL OR custom_url_slug ~* '^[a-z0-9-]+$'
  )
);

CREATE INDEX idx_professionals_user_id ON public.professionals(user_id);
CREATE INDEX idx_professionals_custom_url ON public.professionals(custom_url_slug);
CREATE INDEX idx_professionals_email ON public.professionals(email);
CREATE INDEX idx_professionals_subscription ON public.professionals(subscription_plan, subscription_status);

CREATE TRIGGER update_professionals_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER create_settings_on_professional_insert
  AFTER INSERT ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.create_default_settings();

-- -----------------------------------------------------------------------------
-- 3. Tabela: patients
-- -----------------------------------------------------------------------------
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  cpf TEXT,
  address JSONB,
  occupation TEXT,
  emergency_contact JSONB,
  avatar_url TEXT,
  notes TEXT,
  archived BOOLEAN DEFAULT FALSE,
  archived_reason TEXT,
  archived_at TIMESTAMPTZ,
  consent_lgpd_signed_at TIMESTAMPTZ,
  consent_lgpd_version TEXT,
  consent_lgpd_ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_phone CHECK (phone ~ '^\+?[1-9]\d{10,14}$'),
  CONSTRAINT valid_email CHECK (
    email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
  ),
  CONSTRAINT valid_cpf CHECK (cpf IS NULL OR cpf ~ '^\d{11}$'),
  CONSTRAINT adult_patient CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years')
);

CREATE INDEX idx_patients_professional ON public.patients(professional_id);
CREATE INDEX idx_patients_active ON public.patients(professional_id, archived) WHERE archived = FALSE;
CREATE INDEX idx_patients_name ON public.patients(professional_id, full_name);
CREATE INDEX idx_patients_phone ON public.patients(phone);

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4. Recorrência e agendamentos
-- -----------------------------------------------------------------------------
CREATE TABLE public.appointment_recurrence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time_of_day TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  start_date DATE NOT NULL,
  end_date DATE,
  max_occurrences INTEGER,
  occurrences_created INTEGER DEFAULT 0,
  type TEXT NOT NULL,
  telehealth_provider TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_frequency_config CHECK (
    (frequency = 'monthly' AND day_of_month IS NOT NULL AND day_of_week IS NULL) OR
    (frequency IN ('weekly', 'biweekly') AND day_of_week IS NOT NULL AND day_of_month IS NULL)
  )
);

CREATE INDEX idx_recurrence_professional ON public.appointment_recurrence(professional_id);
CREATE INDEX idx_recurrence_active ON public.appointment_recurrence(professional_id, active);

CREATE TRIGGER update_recurrence_updated_at
  BEFORE UPDATE ON public.appointment_recurrence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 50,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  type TEXT NOT NULL CHECK (type IN ('in_person', 'telehealth')),
  telehealth_provider TEXT CHECK (telehealth_provider IN ('native', 'zoom', 'google_meet')),
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
  )),
  confirmation_token TEXT UNIQUE,
  confirmation_sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  meeting_link TEXT,
  meet_created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT CHECK (cancelled_by IN ('professional', 'patient')),
  cancellation_reason TEXT,
  notes TEXT,
  recurrence_id UUID REFERENCES public.appointment_recurrence(id),
  google_calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_duration CHECK (duration_minutes IN (30, 45, 50, 60, 90)),
  CONSTRAINT scheduled_in_future CHECK (scheduled_at > created_at),
  CONSTRAINT telehealth_requires_provider CHECK (
    type = 'in_person' OR (type = 'telehealth' AND telehealth_provider IS NOT NULL)
  )
);

CREATE INDEX idx_appointments_professional ON public.appointments(professional_id);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_scheduled ON public.appointments(professional_id, scheduled_at);
CREATE INDEX idx_appointments_status ON public.appointments(professional_id, status);
CREATE INDEX idx_appointments_recurrence ON public.appointments(recurrence_id);
CREATE INDEX idx_appointments_confirmation_token ON public.appointments(confirmation_token);
CREATE INDEX idx_appointments_confirmation_sent
  ON public.appointments(professional_id, status, confirmation_sent_at)
  WHERE status = 'pending' AND confirmation_sent_at IS NULL;
CREATE INDEX idx_appointments_reminder_sent
  ON public.appointments(professional_id, status, reminder_sent_at, scheduled_at)
  WHERE status = 'confirmed' AND reminder_sent_at IS NULL;
CREATE INDEX idx_appointments_meeting_link
  ON public.appointments(professional_id, meeting_link, meet_created_at)
  WHERE meeting_link IS NOT NULL;
CREATE INDEX idx_appointments_scheduled_at_status ON public.appointments(scheduled_at, status);

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_appointment_confirmation_token_trigger
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_appointment_confirmation_token();

-- -----------------------------------------------------------------------------
-- 5. Prontuários
-- -----------------------------------------------------------------------------
CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  current_version INTEGER NOT NULL DEFAULT 1,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_records_professional ON public.medical_records(professional_id);
CREATE INDEX idx_records_patient ON public.medical_records(patient_id);
CREATE INDEX idx_records_appointment ON public.medical_records(appointment_id);

CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.medical_record_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  edited_by UUID REFERENCES public.professionals(id) NOT NULL,
  edit_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(medical_record_id, version)
);

CREATE INDEX idx_versions_record ON public.medical_record_versions(medical_record_id, version DESC);

-- -----------------------------------------------------------------------------
-- 6. Documentos de pacientes
-- -----------------------------------------------------------------------------
CREATE TABLE public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'jpg', 'jpeg', 'png', 'docx')),
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN (
    'exam', 'photo', 'consent', 'prescription', 'report', 'other'
  )),
  description TEXT,
  uploaded_by UUID REFERENCES public.professionals(id) NOT NULL,
  accessed_at TIMESTAMPTZ[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_storage_path CHECK (storage_path ~ '^professionals/[^/]+/patients/[^/]+/')
);

CREATE INDEX idx_documents_patient ON public.patient_documents(patient_id);
CREATE INDEX idx_documents_type ON public.patient_documents(patient_id, document_type);

-- -----------------------------------------------------------------------------
-- 7. Financeiro
-- -----------------------------------------------------------------------------
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id),
  invoice_number TEXT NOT NULL UNIQUE,
  fiscal_year INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT DEFAULT 'BRL',
  description TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'paid', 'overdue', 'cancelled'
  )),
  payment_method TEXT CHECK (payment_method IN ('credit_card', 'pix', 'boleto', 'cash', 'other')),
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT due_after_issue CHECK (due_date >= issue_date),
  UNIQUE(fiscal_year, sequence_number)
);

CREATE INDEX idx_invoices_professional ON public.invoices(professional_id);
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_status ON public.invoices(professional_id, status);

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER generate_invoice_number_trigger
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION public.generate_invoice_number();

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'BRL',
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_payout_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'
  )),
  payment_method TEXT NOT NULL,
  payment_method_details JSONB,
  stripe_fee_cents INTEGER,
  net_amount_cents INTEGER,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount_cents INTEGER,
  refund_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_stripe_intent ON public.payments(stripe_payment_intent_id);

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 8. IA, auditoria, LGPD, settings
-- -----------------------------------------------------------------------------
CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL CHECK (feature IN ('transcription', 'summary', 'sentiment', 'suggestions')),
  appointment_id UUID REFERENCES public.appointments(id),
  medical_record_id UUID REFERENCES public.medical_records(id),
  input_tokens INTEGER,
  output_tokens INTEGER,
  duration_seconds INTEGER,
  cost_cents INTEGER NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ai_usage_professional ON public.ai_usage_logs(professional_id);

CREATE TABLE public.ai_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  transcript_text TEXT NOT NULL,
  transcript_json JSONB,
  duration_seconds INTEGER,
  language TEXT DEFAULT 'pt-BR',
  confidence_score FLOAT,
  provider TEXT NOT NULL,
  model TEXT,
  patient_consent BOOLEAN NOT NULL,
  consent_signed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_transcriptions_appointment ON public.ai_transcriptions(appointment_id);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  professional_id UUID REFERENCES public.professionals(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_professional ON public.audit_logs(professional_id);
CREATE INDEX idx_audit_resource ON public.audit_logs(resource_type, resource_id);

CREATE TABLE public.lgpd_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.professionals(id),
  result_data JSONB,
  rejection_reason TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_lgpd_professional ON public.lgpd_requests(professional_id);

CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  default_session_duration INTEGER DEFAULT 50 CHECK (default_session_duration IN (30, 45, 50, 60, 90)),
  default_session_interval INTEGER DEFAULT 10 CHECK (default_session_interval IN (0, 10, 15, 30)),
  notification_email BOOLEAN DEFAULT TRUE,
  notification_sms BOOLEAN DEFAULT FALSE,
  notification_whatsapp BOOLEAN DEFAULT FALSE,
  notification_push BOOLEAN DEFAULT TRUE,
  reminder_timing JSONB DEFAULT '["24h", "2h"]'::JSONB,
  reminder_24h BOOLEAN DEFAULT TRUE,
  reminder_2h BOOLEAN DEFAULT FALSE,
  reminder_channel TEXT DEFAULT 'whatsapp_email'
    CHECK (reminder_channel IN ('whatsapp_email', 'email_only', 'whatsapp_only')),
  auto_generate_invoice BOOLEAN DEFAULT FALSE,
  default_invoice_due_days INTEGER DEFAULT 7,
  google_calendar_sync BOOLEAN DEFAULT FALSE,
  google_calendar_sync_direction TEXT DEFAULT 'bidirectional',
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'pt-BR',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 9. Disponibilidade
-- -----------------------------------------------------------------------------
CREATE TABLE public.professional_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  default_session_duration INTEGER DEFAULT 50,
  interval_between_sessions INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT no_overnight CHECK (
    EXTRACT(HOUR FROM end_time) - EXTRACT(HOUR FROM start_time) <= 14
  )
);

CREATE INDEX idx_availability_professional ON public.professional_availability(professional_id);
CREATE INDEX idx_availability_day ON public.professional_availability(professional_id, day_of_week);

CREATE TABLE public.availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  all_day BOOLEAN DEFAULT TRUE,
  start_time TIME,
  end_time TIME,
  reason TEXT NOT NULL CHECK (reason IN ('vacation', 'holiday', 'personal', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT time_required_if_not_all_day CHECK (
    all_day = TRUE OR (start_time IS NOT NULL AND end_time IS NOT NULL)
  )
);

CREATE INDEX idx_overrides_professional ON public.availability_overrides(professional_id);
CREATE INDEX idx_overrides_date ON public.availability_overrides(professional_id, date);

-- -----------------------------------------------------------------------------
-- 10. Assinaturas
-- -----------------------------------------------------------------------------
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  plan_name TEXT NOT NULL CHECK (plan_name IN ('essencial', 'profissional', 'premium')),
  status TEXT NOT NULL CHECK (status IN (
    'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired'
  )),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_subscriptions_professional ON public.subscriptions(professional_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 11. Integrações (automação)
-- -----------------------------------------------------------------------------
CREATE TABLE public.whatsapp_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  evolution_api_url TEXT NOT NULL,
  evolution_api_key TEXT NOT NULL,
  instance_id TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_evolution_url CHECK (evolution_api_url ~* '^https?://')
);

CREATE INDEX idx_whatsapp_integrations_professional ON public.whatsapp_integrations(professional_id);
CREATE INDEX idx_whatsapp_integrations_status ON public.whatsapp_integrations(status);

CREATE TRIGGER update_whatsapp_integrations_updated_at
  BEFORE UPDATE ON public.whatsapp_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.email_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  google_refresh_token TEXT NOT NULL,
  google_access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  email_from TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_email_from CHECK (email_from ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_email_integrations_professional ON public.email_integrations(professional_id);
CREATE INDEX idx_email_integrations_expires ON public.email_integrations(token_expires_at);

CREATE TRIGGER update_email_integrations_updated_at
  BEFORE UPDATE ON public.email_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 12. Notificações
-- -----------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('appointment', 'payment', 'patient', 'system', 'subscription')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::JSONB,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_professional_read ON public.notifications(professional_id, read, created_at DESC);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- 13. Trigger: novo usuário Auth → professional
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 14. Row Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_recurrence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_record_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- professionals
CREATE POLICY "Users can view own profile"
  ON public.professionals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.professionals FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.professionals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon can view professional for invoice payment"
  ON public.professionals FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT professional_id FROM public.invoices
      WHERE status IN ('pending', 'overdue')
    )
  );

CREATE POLICY "Anon can view professional for appointment confirmation"
  ON public.professionals FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT professional_id FROM public.appointments
      WHERE confirmation_token IS NOT NULL
        AND scheduled_at >= NOW() - INTERVAL '1 day'
    )
  );

-- patients
CREATE POLICY "Professionals manage own patients"
  ON public.patients FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

CREATE POLICY "Anon can view patient for invoice payment"
  ON public.patients FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT patient_id FROM public.invoices
      WHERE status IN ('pending', 'overdue')
    )
  );

CREATE POLICY "Anon can view patient for appointment confirmation"
  ON public.patients FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT patient_id FROM public.appointments
      WHERE confirmation_token IS NOT NULL
        AND scheduled_at >= NOW() - INTERVAL '1 day'
    )
  );

-- appointment_recurrence
CREATE POLICY "Professionals manage own recurrence"
  ON public.appointment_recurrence FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- appointments
CREATE POLICY "Professionals manage own appointments"
  ON public.appointments FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

CREATE POLICY "Anon can read appointments for public confirmation"
  ON public.appointments FOR SELECT
  TO anon
  USING (
    confirmation_token IS NOT NULL
    AND scheduled_at >= NOW() - INTERVAL '1 day'
  );

CREATE POLICY "Anon can confirm appointments via token"
  ON public.appointments FOR UPDATE
  TO anon
  USING (
    confirmation_token IS NOT NULL
    AND status IN ('pending', 'scheduled')
    AND scheduled_at > NOW()
  )
  WITH CHECK (
    status IN ('confirmed', 'cancelled', 'scheduled', 'pending')
  );

-- medical_records
CREATE POLICY "Professionals manage own records"
  ON public.medical_records FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- medical_record_versions
CREATE POLICY "View via medical_records"
  ON public.medical_record_versions FOR SELECT
  TO authenticated
  USING (
    medical_record_id IN (
      SELECT id FROM public.medical_records
      WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Insert new versions only"
  ON public.medical_record_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    medical_record_id IN (
      SELECT id FROM public.medical_records
      WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
    )
    AND edited_by IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

CREATE POLICY "Update versions via medical_records"
  ON public.medical_record_versions FOR UPDATE
  TO authenticated
  USING (
    medical_record_id IN (
      SELECT id FROM public.medical_records
      WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Delete versions via medical_records"
  ON public.medical_record_versions FOR DELETE
  TO authenticated
  USING (
    medical_record_id IN (
      SELECT id FROM public.medical_records
      WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
    )
  );

-- patient_documents
CREATE POLICY "Professionals manage patient documents"
  ON public.patient_documents FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- invoices
CREATE POLICY "Professionals manage own invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

CREATE POLICY "Anon can read invoices for payment"
  ON public.invoices FOR SELECT
  TO anon
  USING (status IN ('pending', 'overdue'));

-- payments
CREATE POLICY "Professionals view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- ai_usage_logs
CREATE POLICY "Professionals view own AI usage"
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated insert AI logs"
  ON public.ai_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- ai_transcriptions
CREATE POLICY "Professionals manage own transcriptions"
  ON public.ai_transcriptions FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- audit_logs
CREATE POLICY "Professionals view own audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- lgpd_requests
CREATE POLICY "Professionals manage own lgpd requests"
  ON public.lgpd_requests FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- settings
CREATE POLICY "Professionals manage own settings"
  ON public.settings FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- professional_availability
CREATE POLICY "Professionals manage own availability"
  ON public.professional_availability FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- availability_overrides
CREATE POLICY "Professionals manage own overrides"
  ON public.availability_overrides FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- subscriptions
CREATE POLICY "Professionals view own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

CREATE POLICY "Professionals insert own subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

CREATE POLICY "Professionals update own subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- whatsapp_integrations
CREATE POLICY "Professionals manage own whatsapp integrations"
  ON public.whatsapp_integrations FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- email_integrations
CREATE POLICY "Professionals manage own email integrations"
  ON public.email_integrations FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- notifications
CREATE POLICY "Professionals view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

CREATE POLICY "Professionals update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

CREATE POLICY "Professionals delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 15. Storage (buckets + políticas corrigidas)
-- Path dos documentos: professionals/{professional_id}/patients/{patient_id}/...
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-documents',
  'patient-documents',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Remover políticas antigas se re-executar parcialmente (ignorar erro se não existirem)
DROP POLICY IF EXISTS "Professionals can view own patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can upload patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can delete own patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can update own patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Avatar uploads" ON storage.objects;
DROP POLICY IF EXISTS "Avatar viewing" ON storage.objects;
DROP POLICY IF EXISTS "Avatar updates" ON storage.objects;
DROP POLICY IF EXISTS "Avatar deletes" ON storage.objects;

CREATE POLICY "Professionals can view own patient documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[2] IN (
      SELECT id::text FROM public.professionals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can upload patient documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[2] IN (
      SELECT id::text FROM public.professionals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can update own patient documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[2] IN (
      SELECT id::text FROM public.professionals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can delete own patient documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[2] IN (
      SELECT id::text FROM public.professionals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Avatar uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Avatar viewing"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar updates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Avatar deletes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

-- -----------------------------------------------------------------------------
-- 16. Supabase Realtime (notificações + atualização do calendário)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'appointments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 17. Grants
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 18. Comentários
-- -----------------------------------------------------------------------------
COMMENT ON TABLE public.professionals IS 'Perfis dos profissionais vinculados ao auth.users';
COMMENT ON TABLE public.appointments IS 'Agendamentos de sessões';
COMMENT ON COLUMN public.appointments.confirmation_token IS 'Token público para /confirm/[token]';
COMMENT ON COLUMN public.appointments.meeting_link IS 'Link Google Meet (usado pelo app Next.js)';
COMMENT ON TABLE public.notifications IS 'Notificações in-app com Supabase Realtime';

-- =============================================================================
-- FIM — Verifique: Database → Tables (20 tabelas public) + Storage (2 buckets)
-- =============================================================================
