-- Preserve body-measurement owner access while caching auth.uid() once per
-- statement. No update policy is added because none exists today.

DROP POLICY IF EXISTS "Users can view own measurements" ON public.body_measurements;
CREATE POLICY "Users can view own measurements"
  ON public.body_measurements
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own measurements" ON public.body_measurements;
CREATE POLICY "Users can insert own measurements"
  ON public.body_measurements
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own measurements" ON public.body_measurements;
CREATE POLICY "Users can delete own measurements"
  ON public.body_measurements
  FOR DELETE
  TO public
  USING ((SELECT auth.uid()) = user_id);
