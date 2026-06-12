-- Preserve owner-only health data access while caching auth.uid() once per
-- statement instead of evaluating it for every row.

DROP POLICY IF EXISTS "health_data_select_own" ON public.health_data;
CREATE POLICY "health_data_select_own"
  ON public.health_data
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "health_data_insert_own" ON public.health_data;
CREATE POLICY "health_data_insert_own"
  ON public.health_data
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "health_data_update_own" ON public.health_data;
CREATE POLICY "health_data_update_own"
  ON public.health_data
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "health_data_delete_own" ON public.health_data;
CREATE POLICY "health_data_delete_own"
  ON public.health_data
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
