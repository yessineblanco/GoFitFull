-- Restrict automated check-ins to real coach/client relationships.
--
-- A coach-owned check-in row is only valid when the target client has a
-- booking or purchased pack with that coach, matching get_coach_clients.

DROP POLICY IF EXISTS "Coaches can insert own check_in_schedules" ON public.check_in_schedules;
DROP POLICY IF EXISTS "Coaches can update own check_in_schedules" ON public.check_in_schedules;
DROP POLICY IF EXISTS "Clients can select own check_in_schedules" ON public.check_in_schedules;
DROP POLICY IF EXISTS "Clients can insert own check_in_responses" ON public.check_in_responses;
DROP POLICY IF EXISTS "Clients can update own check_in_responses" ON public.check_in_responses;
DROP POLICY IF EXISTS "Coaches can select client check_in_responses" ON public.check_in_responses;

CREATE POLICY "Coaches can insert own check_in_schedules"
  ON public.check_in_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_schedules.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.coach_id = check_in_schedules.coach_id
          AND bookings.client_id = check_in_schedules.client_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchased_packs
        WHERE purchased_packs.coach_id = check_in_schedules.coach_id
          AND purchased_packs.client_id = check_in_schedules.client_id
      )
    )
  );

CREATE POLICY "Coaches can update own check_in_schedules"
  ON public.check_in_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_schedules.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_schedules.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.coach_id = check_in_schedules.coach_id
          AND bookings.client_id = check_in_schedules.client_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchased_packs
        WHERE purchased_packs.coach_id = check_in_schedules.coach_id
          AND purchased_packs.client_id = check_in_schedules.client_id
      )
    )
  );

CREATE POLICY "Clients can select own check_in_schedules"
  ON public.check_in_schedules FOR SELECT
  USING (
    auth.uid() = client_id
    AND (
      EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.coach_id = check_in_schedules.coach_id
          AND bookings.client_id = check_in_schedules.client_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchased_packs
        WHERE purchased_packs.coach_id = check_in_schedules.coach_id
          AND purchased_packs.client_id = check_in_schedules.client_id
      )
    )
  );

CREATE POLICY "Clients can insert own check_in_responses"
  ON public.check_in_responses FOR INSERT
  WITH CHECK (
    auth.uid() = client_id
    AND (
      EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.coach_id = check_in_responses.coach_id
          AND bookings.client_id = check_in_responses.client_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchased_packs
        WHERE purchased_packs.coach_id = check_in_responses.coach_id
          AND purchased_packs.client_id = check_in_responses.client_id
      )
    )
  );

CREATE POLICY "Clients can update own check_in_responses"
  ON public.check_in_responses FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (
    auth.uid() = client_id
    AND (
      EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.coach_id = check_in_responses.coach_id
          AND bookings.client_id = check_in_responses.client_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchased_packs
        WHERE purchased_packs.coach_id = check_in_responses.coach_id
          AND purchased_packs.client_id = check_in_responses.client_id
      )
    )
  );

CREATE POLICY "Coaches can select client check_in_responses"
  ON public.check_in_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_responses.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.coach_id = check_in_responses.coach_id
          AND bookings.client_id = check_in_responses.client_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchased_packs
        WHERE purchased_packs.coach_id = check_in_responses.coach_id
          AND purchased_packs.client_id = check_in_responses.client_id
      )
    )
  );
