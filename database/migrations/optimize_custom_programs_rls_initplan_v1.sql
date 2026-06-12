-- Preserve custom-program ownership and assignment rules while caching auth.uid().

DROP POLICY IF EXISTS "Coaches can insert programs and templates" ON public.custom_programs;
CREATE POLICY "Coaches can insert programs and templates"
  ON public.custom_programs
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = custom_programs.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Clients can view assigned programs only" ON public.custom_programs;
CREATE POLICY "Clients can view assigned programs only"
  ON public.custom_programs
  FOR SELECT
  TO public
  USING (
    (SELECT auth.uid()) = client_id
    AND NOT (is_template AND client_id IS NULL)
  );

DROP POLICY IF EXISTS "Coaches can view own programs and templates" ON public.custom_programs;
CREATE POLICY "Coaches can view own programs and templates"
  ON public.custom_programs
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = custom_programs.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can update own programs and templates" ON public.custom_programs;
CREATE POLICY "Coaches can update own programs and templates"
  ON public.custom_programs
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = custom_programs.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can delete own programs and templates" ON public.custom_programs;
CREATE POLICY "Coaches can delete own programs and templates"
  ON public.custom_programs
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = custom_programs.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );
