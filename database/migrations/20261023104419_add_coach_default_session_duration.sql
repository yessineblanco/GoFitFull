ALTER TABLE public.coach_profiles
  ADD COLUMN default_session_duration integer NOT NULL DEFAULT 60
  CONSTRAINT coach_profiles_default_session_duration_check
  CHECK (default_session_duration IN (30, 45, 60, 90, 120));

CREATE FUNCTION public.check_booking_session_duration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  expected_duration integer;
BEGIN
  SELECT default_session_duration INTO expected_duration
  FROM public.coach_profiles WHERE id = NEW.coach_id;
  IF expected_duration IS NULL OR NEW.duration_minutes IS DISTINCT FROM expected_duration THEN
    RAISE EXCEPTION 'Session duration changed or coach unavailable; reload booking times'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_booking_session_duration() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER check_booking_session_duration
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_session_duration();
