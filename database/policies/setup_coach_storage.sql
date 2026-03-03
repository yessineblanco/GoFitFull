-- Storage Policies for Coach Marketplace Buckets
-- Run this in your Supabase SQL Editor after creating the buckets
--
-- Required buckets (create via Supabase Dashboard > Storage):
--   1. coach-documents (private) - CVs and certification documents
--   2. chat-media (private) - Chat images, files, voice messages


-- ============================================
-- BUCKET: coach-documents
-- ============================================

DROP POLICY IF EXISTS "Coaches can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Coaches and admins can view coach documents" ON storage.objects;

CREATE POLICY "Coaches can upload own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coach-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Coaches can update own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'coach-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Coaches can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'coach-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Coaches and admins can view coach documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'coach-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
);


-- ============================================
-- BUCKET: chat-media
-- ============================================

DROP POLICY IF EXISTS "Chat participants can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can view media" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can delete own media" ON storage.objects;

CREATE POLICY "Chat participants can upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Chat participants can view media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
);

CREATE POLICY "Chat participants can delete own media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
