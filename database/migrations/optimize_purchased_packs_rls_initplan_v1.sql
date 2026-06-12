-- Preserve purchased-pack client and coach access while caching auth.uid().

DROP POLICY IF EXISTS "System can insert purchased packs" ON public.purchased_packs;
CREATE POLICY "System can insert purchased packs"
  ON public.purchased_packs
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = client_id);

DROP POLICY IF EXISTS "Clients can view own purchased packs" ON public.purchased_packs;
CREATE POLICY "Clients can view own purchased packs"
  ON public.purchased_packs
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = client_id);

DROP POLICY IF EXISTS "Coaches can view packs sold to their clients" ON public.purchased_packs;
CREATE POLICY "Coaches can view packs sold to their clients"
  ON public.purchased_packs
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = purchased_packs.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );
