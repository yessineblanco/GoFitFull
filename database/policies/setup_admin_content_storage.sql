-- Storage Setup for Admin Content (Exercise/Workout Images)
-- Run this in your Supabase SQL Editor

-- =============================================
-- STEP 1: Create Storage Bucket
-- =============================================
-- Go to: Storage > Create a new bucket
-- Name: "workout-content"
-- Public bucket: YES (so images can be viewed without authentication)
-- Or run this INSERT if you have the permission:

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('workout-content', 'workout-content', true)
-- ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STEP 2: Set up RLS Policies
-- =============================================

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can upload workout content" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can update workout content" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete workout content" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to workout content" ON storage.objects;

-- Policy 1: Allow admin users to upload to workout-content bucket
CREATE POLICY "Admin users can upload workout content"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workout-content' 
  AND EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- Policy 2: Allow admin users to update files
CREATE POLICY "Admin users can update workout content"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workout-content'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- Policy 3: Allow admin users to delete files
CREATE POLICY "Admin users can delete workout content"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workout-content'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- Policy 4: Allow public read access (so mobile app can view images)
CREATE POLICY "Public read access to workout content"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'workout-content');

-- =============================================
-- STEP 3: Create Helper Function to Get File URL
-- =============================================

CREATE OR REPLACE FUNCTION get_storage_url(bucket TEXT, path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  url TEXT;
BEGIN
  -- Get the Supabase project URL from current_setting
  -- This will return something like: https://your-project.supabase.co/storage/v1/object/public/bucket/path
  SELECT format(
    '%s/storage/v1/object/public/%s/%s',
    current_setting('app.settings.supabase_url', true),
    bucket,
    path
  ) INTO url;
  
  RETURN url;
END;
$$;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check if bucket exists
-- SELECT * FROM storage.buckets WHERE id = 'workout-content';

-- Check policies
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%workout content%';

-- Test upload (will fail if policies not working)
-- Try uploading a file through the admin panel after setting this up
