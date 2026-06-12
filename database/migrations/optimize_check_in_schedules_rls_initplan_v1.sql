-- Preserve check-in schedule coach and client access while caching auth.uid().
-- The coach update policy's implicit check remains unchanged.

DROP POLICY IF EXISTS "Coaches can select own check_in_schedules" ON public.check_in_schedules;
CREATE POLICY "Coaches can select own check_in_schedules"
  ON public.check_in_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_schedules.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can insert own check_in_schedules" ON public.check_in_schedules;
CREATE POLICY "Coaches can insert own check_in_schedules"
  ON public.check_in_schedules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_schedules.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can update own check_in_schedules" ON public.check_in_schedules;
CREATE POLICY "Coaches can update own check_in_schedules"
  ON public.check_in_schedules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_schedules.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can delete own check_in_schedules" ON public.check_in_schedules;
CREATE POLICY "Coaches can delete own check_in_schedules"
  ON public.check_in_schedules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_schedules.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients can select own check_in_schedules" ON public.check_in_schedules;
CREATE POLICY "Clients can select own check_in_schedules"
  ON public.check_in_schedules
  FOR SELECT
  USING ((SELECT auth.uid()) = client_id);
