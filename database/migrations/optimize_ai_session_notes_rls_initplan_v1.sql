-- Preserve coach-only AI note access while caching auth.uid() once per statement.

DROP POLICY IF EXISTS "Coaches can select own ai session notes" ON public.ai_session_notes;
CREATE POLICY "Coaches can select own ai session notes"
  ON public.ai_session_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = ai_session_notes.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can insert own ai session notes" ON public.ai_session_notes;
CREATE POLICY "Coaches can insert own ai session notes"
  ON public.ai_session_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = ai_session_notes.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can update own ai session notes" ON public.ai_session_notes;
CREATE POLICY "Coaches can update own ai session notes"
  ON public.ai_session_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = ai_session_notes.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Coaches can delete own ai session notes" ON public.ai_session_notes;
CREATE POLICY "Coaches can delete own ai session notes"
  ON public.ai_session_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = ai_session_notes.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );
