-- Preserve coach transaction visibility while caching auth.uid() once per statement.
-- Admin transaction visibility and the existing wallet join are unchanged.

DROP POLICY IF EXISTS "Coaches can view own transactions" ON public.transactions;
CREATE POLICY "Coaches can view own transactions"
  ON public.transactions
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.wallets AS w
      JOIN public.coach_profiles AS cp ON cp.id = w.coach_id
      WHERE w.id = transactions.wallet_id
        AND cp.user_id = (SELECT auth.uid())
    )
  );
