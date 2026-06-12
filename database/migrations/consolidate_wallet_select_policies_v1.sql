-- Preserve the OR semantics of the two deployed permissive SELECT policies
-- while avoiding duplicate policy evaluation for every wallet row.
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Coaches can view own wallet" ON public.wallets;

CREATE POLICY "Admins and coaches can view allowed wallets"
  ON public.wallets
  FOR SELECT
  TO public
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = wallets.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );
