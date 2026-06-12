-- Evaluate caller identity once per statement while preserving client/coach
-- participant access and each policy's deployed USING/WITH CHECK structure.
ALTER POLICY "Participants can view own conversations"
  ON public.conversations
  USING (
    (SELECT auth.uid()) = client_id
    OR EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = conversations.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "Participants can create conversations"
  ON public.conversations
  WITH CHECK (
    (SELECT auth.uid()) = client_id
    OR EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = conversations.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "Participants can update conversations"
  ON public.conversations
  USING (
    (SELECT auth.uid()) = client_id
    OR EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = conversations.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );
