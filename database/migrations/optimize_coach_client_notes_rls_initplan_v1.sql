-- Preserve coach-owned client-note access while caching auth.uid().
-- The existing FOR ALL policy and its implicit check remain unchanged.

DROP POLICY IF EXISTS "Coaches can manage own client notes" ON public.coach_client_notes;
CREATE POLICY "Coaches can manage own client notes"
  ON public.coach_client_notes
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = coach_client_notes.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );
