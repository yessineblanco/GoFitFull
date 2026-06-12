-- Preserve booking participant access while caching auth.uid() once per statement.
-- Admin management and the update policy's implicit check remain unchanged.

DROP POLICY IF EXISTS "Clients can create bookings" ON public.bookings;
CREATE POLICY "Clients can create bookings"
  ON public.bookings
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = client_id);

DROP POLICY IF EXISTS "Clients can view own bookings" ON public.bookings;
CREATE POLICY "Clients can view own bookings"
  ON public.bookings
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = client_id);

DROP POLICY IF EXISTS "Coaches can view their bookings" ON public.bookings;
CREATE POLICY "Coaches can view their bookings"
  ON public.bookings
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = bookings.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can update bookings" ON public.bookings;
CREATE POLICY "Participants can update bookings"
  ON public.bookings
  FOR UPDATE
  TO public
  USING (
    (SELECT auth.uid()) = client_id
    OR EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = bookings.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );
