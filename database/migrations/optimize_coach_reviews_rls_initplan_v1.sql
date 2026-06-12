-- Preserve review ownership rules while caching auth.uid() once per statement.
-- Public review reads are intentionally unchanged.

DROP POLICY IF EXISTS "Clients can insert own reviews" ON public.coach_reviews;
CREATE POLICY "Clients can insert own reviews"
  ON public.coach_reviews
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = client_id);

DROP POLICY IF EXISTS "Clients can update own reviews" ON public.coach_reviews;
CREATE POLICY "Clients can update own reviews"
  ON public.coach_reviews
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = client_id)
  WITH CHECK ((SELECT auth.uid()) = client_id);

DROP POLICY IF EXISTS "Clients can delete own reviews" ON public.coach_reviews;
CREATE POLICY "Clients can delete own reviews"
  ON public.coach_reviews
  FOR DELETE
  TO public
  USING ((SELECT auth.uid()) = client_id);
