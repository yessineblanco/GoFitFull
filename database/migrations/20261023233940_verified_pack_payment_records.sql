-- Preserve old purchases as unverified; never infer historical payment amounts.
ALTER TABLE public.purchased_packs
  ADD COLUMN paid_amount numeric CHECK (paid_amount >= 0),
  ADD COLUMN paid_currency text CHECK (paid_currency ~ '^[A-Z]{3}$'),
  ADD COLUMN payment_livemode boolean;

CREATE UNIQUE INDEX purchased_packs_stripe_payment_id_unique
  ON public.purchased_packs (stripe_payment_id);

-- Pack credits must come from server-side Stripe verification, not a client insert.
DROP POLICY "System can insert purchased packs" ON public.purchased_packs;
CREATE POLICY "Server can insert verified pack purchases"
  ON public.purchased_packs FOR INSERT TO service_role WITH CHECK (true);
