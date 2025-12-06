-- Enable storage if not already enabled (usually enabled by default in Supabase projects)
-- We insert into the storage.buckets table to create a new bucket

INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated professionals to view files they uploaded or related to their patients
-- This is a bit complex because storage.objects doesn't directly link to patients table.
-- We'll enforce path convention: professionals/{professional_id}/patients/{patient_id}/{filename}

-- ALLOW SELECT (Download/View)
CREATE POLICY "Professionals can view own patient documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-documents' AND
  (auth.uid()::text = (storage.foldername(name))[2]) -- Verify professional_id in path match auth.uid
);

-- ALLOW INSERT (Upload)
CREATE POLICY "Professionals can upload patient documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-documents' AND
  (auth.uid()::text = (storage.foldername(name))[2])
);

-- ALLOW DELETE
CREATE POLICY "Professionals can delete own patient documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'patient-documents' AND
  (auth.uid()::text = (storage.foldername(name))[2])
);
