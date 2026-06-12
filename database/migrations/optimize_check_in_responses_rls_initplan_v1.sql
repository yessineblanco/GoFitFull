-- Preserve check-in response client and coach access while caching auth.uid().

DROP POLICY IF EXISTS "Clients can select own check_in_responses" ON public.check_in_responses;
CREATE POLICY "Clients can select own check_in_responses"
  ON public.check_in_responses
  FOR SELECT
  USING ((SELECT auth.uid()) = client_id);

DROP POLICY IF EXISTS "Clients can insert own check_in_responses" ON public.check_in_responses;
CREATE POLICY "Clients can insert own check_in_responses"
  ON public.check_in_responses
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = client_id);

DROP POLICY IF EXISTS "Clients can update own check_in_responses" ON public.check_in_responses;
CREATE POLICY "Clients can update own check_in_responses"
  ON public.check_in_responses
  FOR UPDATE
  USING ((SELECT auth.uid()) = client_id)
  WITH CHECK ((SELECT auth.uid()) = client_id);

DROP POLICY IF EXISTS "Coaches can select client check_in_responses" ON public.check_in_responses;
CREATE POLICY "Coaches can select client check_in_responses"
  ON public.check_in_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_responses.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );
