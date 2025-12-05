-- AI Usage Logs
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL CHECK (feature IN ('transcription', 'summary', 'sentiment', 'suggestions')),
  appointment_id UUID REFERENCES appointments(id),
  medical_record_id UUID REFERENCES medical_records(id),
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

CREATE INDEX idx_ai_usage_professional ON ai_usage_logs(professional_id);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals view own AI usage"
  ON ai_usage_logs FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System inserts AI logs"
  ON ai_usage_logs FOR INSERT
  WITH CHECK (true);

-- AI Transcriptions
CREATE TABLE ai_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
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

CREATE INDEX idx_transcriptions_appointment ON ai_transcriptions(appointment_id);

ALTER TABLE ai_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own transcriptions"
  ON ai_transcriptions FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  professional_id UUID REFERENCES professionals(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_professional ON audit_logs(professional_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals view own audit logs"
  ON audit_logs FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- LGPD Requests
CREATE TABLE lgpd_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES professionals(id),
  result_data JSONB,
  rejection_reason TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_lgpd_professional ON lgpd_requests(professional_id);

ALTER TABLE lgpd_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own requests"
  ON lgpd_requests FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Settings
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  default_session_duration INTEGER DEFAULT 50 CHECK (default_session_duration IN (30,45,50,60,90)),
  default_session_interval INTEGER DEFAULT 10 CHECK (default_session_interval IN (0,10,15,30)),
  notification_email BOOLEAN DEFAULT TRUE,
  notification_sms BOOLEAN DEFAULT FALSE,
  notification_whatsapp BOOLEAN DEFAULT FALSE,
  notification_push BOOLEAN DEFAULT TRUE,
  reminder_timing JSONB DEFAULT '["24h", "2h"]'::JSONB,
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
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settings (professional_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_settings_on_professional_insert
AFTER INSERT ON professionals
FOR EACH ROW
EXECUTE FUNCTION create_default_settings();

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own settings"
  ON settings FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );
