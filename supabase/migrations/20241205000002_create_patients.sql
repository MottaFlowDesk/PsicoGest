-- Create Patients Table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
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
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_cpf CHECK (cpf IS NULL OR cpf ~ '^\d{11}$'),
  CONSTRAINT adult_patient CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years')
);

CREATE INDEX idx_patients_professional ON patients(professional_id);
CREATE INDEX idx_patients_active ON patients(professional_id, archived) WHERE archived = FALSE;
CREATE INDEX idx_patients_name ON patients(professional_id, full_name);
CREATE INDEX idx_patients_phone ON patients(phone);

CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own patients"
  ON patients FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );
