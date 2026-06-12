-- Preserve coach availability access while caching auth.uid() once per statement.
-- Public availability reads and the existing implicit ALL check are unchanged.

DROP POLICY IF EXISTS "Coaches can manage own availability" ON public.coach_availability;
CREATE POLICY "Coaches can manage own availability"
  ON public.coach_availability
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = coach_availability.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );
