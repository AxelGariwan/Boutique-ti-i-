-- Public vendor profile photos. Existing buckets and storage policies remain untouched.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-avatars',
  'vendor-avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS vendor_avatars_public_read ON storage.objects;
CREATE POLICY vendor_avatars_public_read
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'vendor-avatars');

DROP POLICY IF EXISTS vendor_avatars_insert_own ON storage.objects;
CREATE POLICY vendor_avatars_insert_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vendor-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS vendor_avatars_update_own ON storage.objects;
CREATE POLICY vendor_avatars_update_own
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vendor-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'vendor-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS vendor_avatars_delete_own ON storage.objects;
CREATE POLICY vendor_avatars_delete_own
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'vendor-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);