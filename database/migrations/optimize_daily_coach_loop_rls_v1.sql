-- Daily Coach Loop v1: optimize RLS auth checks to avoid per-row auth.uid() evaluation

DROP POLICY IF EXISTS "daily_habits_select_own" ON public.daily_habits;
CREATE POLICY "daily_habits_select_own"
  ON public.daily_habits
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "daily_habits_insert_own" ON public.daily_habits;
CREATE POLICY "daily_habits_insert_own"
  ON public.daily_habits
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "daily_habits_update_own" ON public.daily_habits;
CREATE POLICY "daily_habits_update_own"
  ON public.daily_habits
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "daily_habits_delete_own" ON public.daily_habits;
CREATE POLICY "daily_habits_delete_own"
  ON public.daily_habits
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "habit_logs_select_own" ON public.habit_logs;
CREATE POLICY "habit_logs_select_own"
  ON public.habit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "habit_logs_insert_own" ON public.habit_logs;
CREATE POLICY "habit_logs_insert_own"
  ON public.habit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "habit_logs_update_own" ON public.habit_logs;
CREATE POLICY "habit_logs_update_own"
  ON public.habit_logs
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "habit_logs_delete_own" ON public.habit_logs;
CREATE POLICY "habit_logs_delete_own"
  ON public.habit_logs
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "daily_readiness_select_own" ON public.daily_readiness;
CREATE POLICY "daily_readiness_select_own"
  ON public.daily_readiness
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "daily_readiness_insert_own" ON public.daily_readiness;
CREATE POLICY "daily_readiness_insert_own"
  ON public.daily_readiness
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "daily_readiness_update_own" ON public.daily_readiness;
CREATE POLICY "daily_readiness_update_own"
  ON public.daily_readiness
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
