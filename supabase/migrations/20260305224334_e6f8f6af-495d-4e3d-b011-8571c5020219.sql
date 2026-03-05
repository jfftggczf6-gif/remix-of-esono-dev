
-- Create storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documents', 'documents', false, 20971520);

-- RLS: users can upload to their enterprise folder
CREATE POLICY "Users can upload documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM enterprises e
    WHERE e.id::text = (storage.foldername(name))[1]
    AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())
  )
);

-- RLS: users can read their enterprise documents
CREATE POLICY "Users can read own documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM enterprises e
    WHERE e.id::text = (storage.foldername(name))[1]
    AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())
  )
);

-- RLS: users can delete their enterprise documents
CREATE POLICY "Users can delete own documents" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM enterprises e
    WHERE e.id::text = (storage.foldername(name))[1]
    AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())
  )
);

-- Add uploaded_files column to enterprises to track uploads
ALTER TABLE enterprises ADD COLUMN IF NOT EXISTS uploaded_files jsonb DEFAULT '[]'::jsonb;
