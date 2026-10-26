-- Preserve participant status updates after payment without exposing payment fields.
CREATE OR REPLACE FUNCTION public.protect_session_payment_fields() RETURNS trigger
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
        OR (NEW.status IS DISTINCT FROM OLD.status AND NOT (
            (OLD.payment_status = 'paid' AND NEW.status IN ('confirmed','completed','cancelled','no_show'))
            OR (OLD.payment_status IN ('awaiting_payment','cancelled','expired') AND NEW.status = 'cancelled')
        ))) THEN
      RAISE EXCEPTION 'Use the payment service to change a checkout' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
