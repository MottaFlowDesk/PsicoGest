-- Medical Records
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  current_version INTEGER NOT NULL DEFAULT 1,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_records_professional ON medical_records(professional_id);
CREATE INDEX idx_records_patient ON medical_records(patient_id);
CREATE INDEX idx_records_appointment ON medical_records(appointment_id);

CREATE TRIGGER update_records_updated_at
BEFORE UPDATE ON medical_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage own records"
  ON medical_records FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Medical Record Versions
CREATE TABLE medical_record_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  edited_by UUID REFERENCES professionals(id) NOT NULL,
  edit_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(medical_record_id, version)
);

CREATE INDEX idx_versions_record ON medical_record_versions(medical_record_id, version DESC);

ALTER TABLE medical_record_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View via medical_records"
  ON medical_record_versions FOR SELECT
  USING (
    medical_record_id IN (
      SELECT id FROM medical_records WHERE professional_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Insert new versions only"
  ON medical_record_versions FOR INSERT
  WITH CHECK (
    medical_record_id IN (
      SELECT id FROM medical_records WHERE professional_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      )
    )
    AND edited_by IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );
