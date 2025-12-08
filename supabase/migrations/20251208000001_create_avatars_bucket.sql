-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated uploads to avatars
CREATE POLICY "Avatar uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Policy to allow public viewing of avatars
CREATE POLICY "Avatar viewing"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy to allow users to update their own avatars
CREATE POLICY "Avatar updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid())
WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());
