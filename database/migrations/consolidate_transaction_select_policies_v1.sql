-- Preserve the OR semantics of the two deployed permissive SELECT policies
-- while avoiding duplicate policy evaluation for every transaction row.
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Coaches can view own transactions" ON public.transactions;

CREATE POLICY "Admins and coaches can view allowed transactions"
  ON public.transactions
  FOR SELECT
  TO public
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.wallets AS w
      JOIN public.coach_profiles AS cp ON cp.id = w.coach_id
      WHERE w.id = transactions.wallet_id
        AND cp.user_id = (SELECT auth.uid())
    )
  );
