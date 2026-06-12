-- Preserve coach wallet visibility while caching auth.uid() once per statement.
-- Admin wallet visibility is intentionally unchanged.

DROP POLICY IF EXISTS "Coaches can view own wallet" ON public.wallets;
CREATE POLICY "Coaches can view own wallet"
  ON public.wallets
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = wallets.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );
