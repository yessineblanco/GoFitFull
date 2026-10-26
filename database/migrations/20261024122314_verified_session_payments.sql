CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

ALTER TABLE public.bookings
  ADD COLUMN stripe_payment_id text UNIQUE,
  ADD COLUMN quoted_amount numeric CHECK (quoted_amount > 0),
  ADD COLUMN paid_amount numeric CHECK (paid_amount > 0),
  ADD COLUMN paid_currency text CHECK (paid_currency = 'EUR'),
  ADD COLUMN payment_livemode boolean,
  ADD COLUMN paid_at timestamptz,
  ADD COLUMN payment_status text CHECK (payment_status IN ('awaiting_payment','capturing','paid','cancelled','expired')),
  ADD COLUMN checkout_expires_at timestamptz;

-- UTC timestamps without timezone make interval arithmetic immutable for GiST.
-- The constraint covers all booking writers, including pack-based bookings.
ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    coach_id extensions.gist_uuid_ops WITH =,
    tsrange(scheduled_at AT TIME ZONE 'UTC',
      (scheduled_at AT TIME ZONE 'UTC') + duration_minutes * interval '1 minute', '[)') WITH &&
  ) WHERE (status <> 'cancelled');

CREATE FUNCTION public.protect_session_payment_fields() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user IN ('postgres','service_role') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.pack_purchase_id IS NULL OR NEW.payment_status IS NOT NULL OR
       NEW.stripe_payment_id IS NOT NULL OR NEW.quoted_amount IS NOT NULL OR
       NEW.paid_amount IS NOT NULL OR NEW.paid_currency IS NOT NULL OR
       NEW.payment_livemode IS NOT NULL OR NEW.paid_at IS NOT NULL OR NEW.checkout_expires_at IS NOT NULL THEN
      RAISE EXCEPTION 'Use the payment service for standalone bookings' USING ERRCODE='42501';
    END IF;
  ELSE
    IF ROW(NEW.stripe_payment_id,NEW.quoted_amount,NEW.paid_amount,NEW.paid_currency,
           NEW.payment_livemode,NEW.paid_at,NEW.payment_status,NEW.checkout_expires_at)
       IS DISTINCT FROM ROW(OLD.stripe_payment_id,OLD.quoted_amount,OLD.paid_amount,OLD.paid_currency,
           OLD.payment_livemode,OLD.paid_at,OLD.payment_status,OLD.checkout_expires_at) THEN
      RAISE EXCEPTION 'Payment fields are server managed' USING ERRCODE='42501';
    END IF;
    IF OLD.payment_status IS NOT NULL AND
       (ROW(NEW.coach_id,NEW.client_id,NEW.scheduled_at,NEW.duration_minutes,NEW.pack_purchase_id)
         IS DISTINCT FROM ROW(OLD.coach_id,OLD.client_id,OLD.scheduled_at,OLD.duration_minutes,OLD.pack_purchase_id)
        OR (NEW.status IS DISTINCT FROM OLD.status AND
            (NEW.status <> 'cancelled' OR OLD.payment_status = 'capturing'))) THEN
      RAISE EXCEPTION 'Use the payment service to change a checkout' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_session_payment_fields BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_session_payment_fields();
REVOKE ALL ON FUNCTION public.protect_session_payment_fields() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.reserve_paid_session(
  p_client_id uuid, p_coach_id uuid, p_scheduled_at timestamptz,
  p_duration_minutes integer, p_expected_amount numeric
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  coach public.coach_profiles;
  booking public.bookings;
  local_start timestamp := p_scheduled_at AT TIME ZONE 'Europe/Berlin';
  local_end timestamp := (p_scheduled_at + p_duration_minutes * interval '1 minute') AT TIME ZONE 'Europe/Berlin';
  amount numeric;
BEGIN
  SELECT * INTO STRICT coach FROM public.coach_profiles WHERE id=p_coach_id FOR UPDATE;
  IF coach.status <> 'approved' OR coach.hourly_rate IS NULL OR coach.hourly_rate <= 0 OR
     p_duration_minutes IS DISTINCT FROM coach.default_session_duration OR p_scheduled_at <= now() THEN
    RAISE EXCEPTION 'Coach, time or duration unavailable' USING ERRCODE='22023';
  END IF;
  amount := round(coach.hourly_rate * p_duration_minutes / 60, 2);
  IF p_expected_amount IS DISTINCT FROM amount OR amount <= 0 THEN
    RAISE EXCEPTION 'Session price changed; reload the booking' USING ERRCODE='22023';
  END IF;
  IF local_start::date <> local_end::date OR extract(second FROM local_start) <> 0 OR NOT EXISTS (
    SELECT 1 FROM public.coach_availability a WHERE a.coach_id=p_coach_id
      AND a.day_of_week=extract(dow FROM local_start)::integer
      AND local_start::time >= a.start_time AND local_end::time <= a.end_time
      AND mod(extract(epoch FROM (local_start::time-a.start_time))/60,p_duration_minutes)=0
  ) THEN
    RAISE EXCEPTION 'Time is outside coach availability (Europe/Berlin)' USING ERRCODE='22023';
  END IF;
  UPDATE public.bookings SET status='cancelled',payment_status='expired'
    WHERE coach_id=p_coach_id AND payment_status='awaiting_payment'
      AND checkout_expires_at <= now() AND status='pending';
  INSERT INTO public.bookings(coach_id,client_id,scheduled_at,duration_minutes,status,
    quoted_amount,payment_status,checkout_expires_at)
  VALUES(p_coach_id,p_client_id,p_scheduled_at,p_duration_minutes,'pending',amount,
    'awaiting_payment',least(now()+interval '15 minutes',p_scheduled_at)) RETURNING * INTO booking;
  RETURN to_jsonb(booking);
END;
$$;

CREATE FUNCTION public.prepare_paid_session_capture(p_booking_id uuid,p_client_id uuid,p_payment_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE booking public.bookings;
BEGIN
  SELECT * INTO STRICT booking FROM public.bookings WHERE id=p_booking_id AND client_id=p_client_id FOR UPDATE;
  IF booking.stripe_payment_id IS DISTINCT FROM p_payment_id THEN
    RAISE EXCEPTION 'Payment reference mismatch' USING ERRCODE='42501';
  END IF;
  IF booking.payment_status='paid' THEN RETURN to_jsonb(booking); END IF;
  IF booking.status <> 'pending' OR booking.payment_status NOT IN ('awaiting_payment','capturing') OR
     (booking.payment_status='awaiting_payment' AND booking.checkout_expires_at <= now()) THEN
    RAISE EXCEPTION 'Checkout expired or cancelled; payment cannot be captured' USING ERRCODE='22023';
  END IF;
  UPDATE public.bookings SET payment_status='capturing',checkout_expires_at=NULL
    WHERE id=p_booking_id RETURNING * INTO booking;
  RETURN to_jsonb(booking);
END;
$$;

CREATE FUNCTION public.complete_paid_session(
  p_booking_id uuid,p_client_id uuid,p_payment_id text,p_amount numeric,p_livemode boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE booking public.bookings;
BEGIN
  SELECT * INTO STRICT booking FROM public.bookings WHERE id=p_booking_id AND client_id=p_client_id FOR UPDATE;
  IF booking.stripe_payment_id IS DISTINCT FROM p_payment_id OR booking.quoted_amount IS DISTINCT FROM p_amount THEN
    RAISE EXCEPTION 'Payment details mismatch' USING ERRCODE='42501';
  END IF;
  IF booking.payment_status='paid' THEN RETURN to_jsonb(booking); END IF;
  IF booking.payment_status <> 'capturing' OR booking.status <> 'pending' THEN
    RAISE EXCEPTION 'Session was not reserved for capture' USING ERRCODE='22023';
  END IF;
  UPDATE public.bookings SET status='confirmed',payment_status='paid',paid_amount=p_amount,
    paid_currency='EUR',payment_livemode=p_livemode,paid_at=now()
    WHERE id=p_booking_id RETURNING * INTO booking;
  RETURN to_jsonb(booking);
END;
$$;

CREATE FUNCTION public.cancel_paid_session_checkout(p_booking_id uuid,p_client_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE booking public.bookings;
BEGIN
  UPDATE public.bookings SET status='cancelled',payment_status='cancelled'
    WHERE id=p_booking_id AND client_id=p_client_id AND status IN ('pending','cancelled')
      AND payment_status IN ('awaiting_payment','cancelled','expired') RETURNING * INTO booking;
  RETURN to_jsonb(booking);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_paid_session(uuid,uuid,timestamptz,integer,numeric),
  public.prepare_paid_session_capture(uuid,uuid,text),public.complete_paid_session(uuid,uuid,text,numeric,boolean),
  public.cancel_paid_session_checkout(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_paid_session(uuid,uuid,timestamptz,integer,numeric),
  public.prepare_paid_session_capture(uuid,uuid,text),public.complete_paid_session(uuid,uuid,text,numeric,boolean),
  public.cancel_paid_session_checkout(uuid,uuid) TO service_role;
