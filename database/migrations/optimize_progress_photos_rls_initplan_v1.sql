-- Preserve private owner-only progress-photo metadata access while caching
-- auth.uid() once per statement.

DROP POLICY IF EXISTS "progress_photos_select_own" ON public.progress_photos;
CREATE POLICY "progress_photos_select_own"
  ON public.progress_photos
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "progress_photos_insert_own" ON public.progress_photos;
CREATE POLICY "progress_photos_insert_own"
  ON public.progress_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "progress_photos_update_own" ON public.progress_photos;
CREATE POLICY "progress_photos_update_own"
  ON public.progress_photos
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "progress_photos_delete_own" ON public.progress_photos;
CREATE POLICY "progress_photos_delete_own"
  ON public.progress_photos
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
