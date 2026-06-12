-- Cache auth.uid() once per statement instead of re-evaluating it per row.
-- Policy behavior is otherwise unchanged.

DROP POLICY IF EXISTS "Users can view own workout sessions"
  ON public.workout_sessions;
CREATE POLICY "Users can view own workout sessions"
  ON public.workout_sessions
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own workout sessions"
  ON public.workout_sessions;
CREATE POLICY "Users can insert own workout sessions"
  ON public.workout_sessions
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own workout sessions"
  ON public.workout_sessions;
CREATE POLICY "Users can update own workout sessions"
  ON public.workout_sessions
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own workout sessions"
  ON public.workout_sessions;
CREATE POLICY "Users can delete own workout sessions"
  ON public.workout_sessions
  FOR DELETE
  TO public
  USING ((SELECT auth.uid()) = user_id);
