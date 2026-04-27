-- GoFit Progress Photos v1: table, RLS, private bucket, storage policies, indexes, updated_at trigger

-- 1. Table
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  photo_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'front' CHECK (category IN ('front', 'side', 'back', 'other')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.progress_photos IS 'User progress photos; storage_path is key inside bucket progress-photos (e.g. userId/filename).';

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_photo_date
  ON public.progress_photos (user_id, photo_date DESC);

CREATE INDEX IF NOT EXISTS idx_progress_photos_user_created_at
  ON public.progress_photos (user_id, created_at DESC);

-- 2. RLS
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_photos_select_own" ON public.progress_photos;
CREATE POLICY "progress_photos_select_own"
  ON public.progress_photos
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "progress_photos_insert_own" ON public.progress_photos;
CREATE POLICY "progress_photos_insert_own"
  ON public.progress_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "progress_photos_update_own" ON public.progress_photos;
CREATE POLICY "progress_photos_update_own"
  ON public.progress_photos
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "progress_photos_delete_own" ON public.progress_photos;
CREATE POLICY "progress_photos_delete_own"
  ON public.progress_photos
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_photos TO authenticated;

-- 7. updated_at trigger (requires public.handle_updated_at)
DROP TRIGGER IF EXISTS set_progress_photos_updated_at ON public.progress_photos;
CREATE TRIGGER set_progress_photos_updated_at
  BEFORE UPDATE ON public.progress_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage object policies (first path segment = auth.uid())
DROP POLICY IF EXISTS "progress_photos_storage_select_own" ON storage.objects;
CREATE POLICY "progress_photos_storage_select_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "progress_photos_storage_insert_own" ON storage.objects;
CREATE POLICY "progress_photos_storage_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "progress_photos_storage_update_own" ON storage.objects;
CREATE POLICY "progress_photos_storage_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "progress_photos_storage_delete_own" ON storage.objects;
CREATE POLICY "progress_photos_storage_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
