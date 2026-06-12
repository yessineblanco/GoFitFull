-- Preserve certification ownership rules while caching auth.uid() once per statement.
-- Admin access and public verified-certification reads are intentionally unchanged.

DROP POLICY IF EXISTS "Coaches can view own certifications" ON public.coach_certifications;
CREATE POLICY "Coaches can view own certifications"
  ON public.coach_certifications
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = coach_certifications.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can insert own certifications" ON public.coach_certifications;
CREATE POLICY "Coaches can insert own certifications"
  ON public.coach_certifications
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = coach_certifications.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can update own certifications" ON public.coach_certifications;
CREATE POLICY "Coaches can update own certifications"
  ON public.coach_certifications
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = coach_certifications.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can delete own certifications" ON public.coach_certifications;
CREATE POLICY "Coaches can delete own certifications"
  ON public.coach_certifications
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = coach_certifications.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );
