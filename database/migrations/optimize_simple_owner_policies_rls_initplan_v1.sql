-- Preserve simple owner policies while caching auth.uid() once per statement.
-- Existing implicit and explicit WITH CHECK behavior is retained per policy.

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage own push tokens" ON public.push_tokens;
CREATE POLICY "Users can manage own push tokens"
  ON public.push_tokens
  FOR ALL
  TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage their workout plans" ON public.workout_plans;
CREATE POLICY "Users manage their workout plans"
  ON public.workout_plans
  FOR ALL
  TO public
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
