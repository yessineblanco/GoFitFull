-- Preserve meal-log owner policies while caching auth.uid() once per query.

DROP POLICY IF EXISTS "meal_logs_select_own" ON public.meal_logs;
CREATE POLICY "meal_logs_select_own"
  ON public.meal_logs
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "meal_logs_insert_own" ON public.meal_logs;
CREATE POLICY "meal_logs_insert_own"
  ON public.meal_logs
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "meal_logs_update_own" ON public.meal_logs;
CREATE POLICY "meal_logs_update_own"
  ON public.meal_logs
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "meal_logs_delete_own" ON public.meal_logs;
CREATE POLICY "meal_logs_delete_own"
  ON public.meal_logs
  FOR DELETE
  TO public
  USING ((SELECT auth.uid()) = user_id);
