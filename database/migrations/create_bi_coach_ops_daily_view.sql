-- Canonical daily coach-operations view for advanced admin BI.
-- This captures daily booking outcomes plus recurring availability-pattern
-- inputs without freezing more speculative metrics like response SLA.

CREATE OR REPLACE VIEW public.bi_coach_ops_daily
WITH (security_invoker = true)
AS
WITH coach_base AS (
  SELECT
    cp.id AS coach_id,
    cp.user_id,
    cp.status AS coach_status,
    COALESCE(cp.average_rating, 0)::NUMERIC(3, 2) AS average_rating_current,
    COALESCE(cp.total_reviews, 0)::INTEGER AS total_reviews_current,
    COALESCE(cp.total_sessions, 0)::INTEGER AS total_sessions_lifetime,
    (cp.created_at AT TIME ZONE 'UTC')::DATE AS coach_created_date
  FROM public.coach_profiles cp
),
date_spine AS (
  SELECT
    cb.coach_id,
    cb.user_id,
    cb.coach_status,
    cb.average_rating_current,
    cb.total_reviews_current,
    cb.total_sessions_lifetime,
    gs::DATE AS metric_date
  FROM coach_base cb
  JOIN LATERAL generate_series(
    cb.coach_created_date,
    CURRENT_DATE,
    INTERVAL '1 day'
  ) AS gs ON true
),
booking_daily AS (
  SELECT
    b.coach_id,
    (b.scheduled_at AT TIME ZONE 'UTC')::DATE AS metric_date,
    COUNT(*)::INTEGER AS total_bookings,
    COUNT(*) FILTER (WHERE b.status = 'completed')::INTEGER AS completed_bookings_count,
    COUNT(*) FILTER (WHERE b.status = 'cancelled')::INTEGER AS cancelled_bookings_count,
    COUNT(*) FILTER (WHERE b.status = 'no_show')::INTEGER AS no_show_bookings_count,
    COUNT(*) FILTER (WHERE b.status = 'pending')::INTEGER AS pending_bookings_count,
    COUNT(*) FILTER (WHERE b.status = 'confirmed')::INTEGER AS confirmed_bookings_count,
    COALESCE(SUM(b.duration_minutes), 0)::INTEGER AS scheduled_booking_minutes,
    COALESCE(
      SUM(CASE WHEN b.status <> 'cancelled' THEN b.duration_minutes ELSE 0 END),
      0
    )::INTEGER AS non_cancelled_booking_minutes,
    COALESCE(
      SUM(CASE WHEN b.status = 'completed' THEN b.duration_minutes ELSE 0 END),
      0
    )::INTEGER AS completed_booking_minutes,
    COALESCE(
      SUM(CASE WHEN b.status = 'cancelled' THEN b.duration_minutes ELSE 0 END),
      0
    )::INTEGER AS cancelled_booking_minutes,
    COALESCE(
      SUM(CASE WHEN b.status = 'no_show' THEN b.duration_minutes ELSE 0 END),
      0
    )::INTEGER AS no_show_booking_minutes
  FROM public.bookings b
  GROUP BY b.coach_id, (b.scheduled_at AT TIME ZONE 'UTC')::DATE
),
availability_pattern_daily AS (
  SELECT
    ds.coach_id,
    ds.metric_date,
    COUNT(ca.id)::INTEGER AS availability_slots_count,
    COALESCE(
      SUM(EXTRACT(EPOCH FROM (ca.end_time - ca.start_time)) / 60),
      0
    )::INTEGER AS available_minutes_pattern
  FROM date_spine ds
  LEFT JOIN public.coach_availability ca
    ON ca.coach_id = ds.coach_id
    AND ca.day_of_week = EXTRACT(DOW FROM ds.metric_date)::INTEGER
  GROUP BY ds.coach_id, ds.metric_date
)
SELECT
  ds.metric_date,
  ds.coach_id,
  ds.user_id,
  ds.coach_status,
  ds.average_rating_current,
  ds.total_reviews_current,
  ds.total_sessions_lifetime,
  COALESCE(bd.total_bookings, 0)::INTEGER AS total_bookings,
  COALESCE(bd.completed_bookings_count, 0)::INTEGER AS completed_bookings_count,
  COALESCE(bd.cancelled_bookings_count, 0)::INTEGER AS cancelled_bookings_count,
  COALESCE(bd.no_show_bookings_count, 0)::INTEGER AS no_show_bookings_count,
  COALESCE(bd.pending_bookings_count, 0)::INTEGER AS pending_bookings_count,
  COALESCE(bd.confirmed_bookings_count, 0)::INTEGER AS confirmed_bookings_count,
  COALESCE(bd.scheduled_booking_minutes, 0)::INTEGER AS scheduled_booking_minutes,
  COALESCE(bd.non_cancelled_booking_minutes, 0)::INTEGER AS non_cancelled_booking_minutes,
  COALESCE(bd.completed_booking_minutes, 0)::INTEGER AS completed_booking_minutes,
  COALESCE(bd.cancelled_booking_minutes, 0)::INTEGER AS cancelled_booking_minutes,
  COALESCE(bd.no_show_booking_minutes, 0)::INTEGER AS no_show_booking_minutes,
  COALESCE(apd.availability_slots_count, 0)::INTEGER AS availability_slots_count,
  COALESCE(apd.available_minutes_pattern, 0)::INTEGER AS available_minutes_pattern,
  (COALESCE(bd.total_bookings, 0) > 0) AS had_booking_activity,
  (COALESCE(bd.completed_bookings_count, 0) > 0) AS had_completed_booking,
  (COALESCE(bd.cancelled_bookings_count, 0) > 0) AS had_cancelled_booking,
  (COALESCE(bd.no_show_bookings_count, 0) > 0) AS had_no_show_booking,
  (COALESCE(apd.available_minutes_pattern, 0) > 0) AS had_availability_pattern
FROM date_spine ds
LEFT JOIN booking_daily bd
  ON bd.coach_id = ds.coach_id
  AND bd.metric_date = ds.metric_date
LEFT JOIN availability_pattern_daily apd
  ON apd.coach_id = ds.coach_id
  AND apd.metric_date = ds.metric_date;

GRANT SELECT ON public.bi_coach_ops_daily TO authenticated;
