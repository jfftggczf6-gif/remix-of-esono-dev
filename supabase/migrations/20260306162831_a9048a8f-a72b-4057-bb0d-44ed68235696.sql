
-- Service role insert policy on templates bucket (bucket already exists from previous migration)
CREATE POLICY "Service role insert on templates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'templates');
