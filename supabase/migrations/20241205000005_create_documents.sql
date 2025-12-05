-- Patient Documents
CREATE TABLE patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'jpg', 'jpeg', 'png', 'docx')),
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN (
    'exam', 'photo', 'consent', 'prescription', 'report', 'other'
  )),
  description TEXT,
  uploaded_by UUID REFERENCES professionals(id) NOT NULL,
  accessed_at TIMESTAMPTZ[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_storage_path CHECK (storage_path ~ '^professionals/[^/]+/patients/[^/]+/')
);

CREATE INDEX idx_documents_patient ON patient_documents(patient_id);
CREATE INDEX idx_documents_type ON patient_documents(patient_id, document_type);

ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals manage patient documents"
  ON patient_documents FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );
