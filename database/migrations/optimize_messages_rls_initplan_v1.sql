-- Evaluate caller identity once per statement while preserving message
-- participant, sender, recipient, and implicit update-check behavior.
ALTER POLICY "Conversation participants can view messages"
  ON public.messages
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.client_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.coach_profiles cp
            WHERE cp.id = c.coach_id
              AND cp.user_id = (SELECT auth.uid())
          )
        )
    )
  );

ALTER POLICY "Conversation participants can send messages"
  ON public.messages
  WITH CHECK (
    (SELECT auth.uid()) = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.client_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.coach_profiles cp
            WHERE cp.id = c.coach_id
              AND cp.user_id = (SELECT auth.uid())
          )
        )
    )
  );

ALTER POLICY "Recipients can mark messages as read"
  ON public.messages
  USING (
    (SELECT auth.uid()) <> sender_id
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.client_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.coach_profiles cp
            WHERE cp.id = c.coach_id
              AND cp.user_id = (SELECT auth.uid())
          )
        )
    )
  );
