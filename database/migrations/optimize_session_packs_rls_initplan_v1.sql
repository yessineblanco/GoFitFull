-- Optimize only caller identity evaluation. Keep all deployed session-pack
-- policies, overlap, roles, commands, and implicit ALL-policy check unchanged.
ALTER POLICY "Coaches can view own packs"
  ON public.session_packs
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = session_packs.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "Coaches can manage own packs"
  ON public.session_packs
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = session_packs.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );
