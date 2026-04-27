-- Canonical daily lifecycle view for advanced admin BI.
-- The grain is one row per user per UTC date with signup and activity facts
-- that downstream BI can reuse for activation, cohorts, and churn inputs.

CREATE OR REPLACE VIEW public.bi_user_lifecycle_daily
WITH (security_invoker = true)
AS
WITH signup_base AS (
  SELECT
    up.id AS user_id,
    (up.created_at AT TIME ZONE 'UTC')::DATE AS signup_date,
    DATE_TRUNC('month', up.created_at AT TIME ZONE 'UTC')::DATE AS signup_cohort_month
  FROM public.user_profiles up
),
workout_started_daily AS (
  SELECT
    ws.user_id,
    (ws.started_at AT TIME ZONE 'UTC')::DATE AS metric_date,
    COUNT(*)::INTEGER AS workout_sessions_started
  FROM public.workout_sessions ws
  GROUP BY ws.user_id, (ws.started_at AT TIME ZONE 'UTC')::DATE
),
workout_completed_daily AS (
  SELECT
    ws.user_id,
    (ws.completed_at AT TIME ZONE 'UTC')::DATE AS metric_date,
    COUNT(*)::INTEGER AS completed_workouts_count
  FROM public.workout_sessions ws
  WHERE ws.completed_at IS NOT NULL
  GROUP BY ws.user_id, (ws.completed_at AT TIME ZONE 'UTC')::DATE
),
first_completed_workout AS (
  SELECT
    ws.user_id,
    MIN((ws.completed_at AT TIME ZONE 'UTC')::DATE) AS first_completed_workout_date
  FROM public.workout_sessions ws
  WHERE ws.completed_at IS NOT NULL
  GROUP BY ws.user_id
),
completed_booking_daily AS (
  SELECT
    b.client_id AS user_id,
    (b.scheduled_at AT TIME ZONE 'UTC')::DATE AS metric_date,
    COUNT(*)::INTEGER AS completed_bookings_count
  FROM public.bookings b
  WHERE b.status = 'completed'
  GROUP BY b.client_id, (b.scheduled_at AT TIME ZONE 'UTC')::DATE
),
first_completed_booking AS (
  SELECT
    b.client_id AS user_id,
    MIN((b.scheduled_at AT TIME ZONE 'UTC')::DATE) AS first_completed_booking_date
  FROM public.bookings b
  WHERE b.status = 'completed'
  GROUP BY b.client_id
),
pack_purchase_daily AS (
  SELECT
    pp.client_id AS user_id,
    (pp.purchased_at AT TIME ZONE 'UTC')::DATE AS metric_date,
    COUNT(*)::INTEGER AS pack_purchases_count
  FROM public.purchased_packs pp
  GROUP BY pp.client_id, (pp.purchased_at AT TIME ZONE 'UTC')::DATE
),
activity_keys AS (
  SELECT sb.user_id, sb.signup_date AS metric_date
  FROM signup_base sb

  UNION

  SELECT wsd.user_id, wsd.metric_date
  FROM workout_started_daily wsd

  UNION

  SELECT wcd.user_id, wcd.metric_date
  FROM workout_completed_daily wcd

  UNION

  SELECT cbd.user_id, cbd.metric_date
  FROM completed_booking_daily cbd

  UNION

  SELECT ppd.user_id, ppd.metric_date
  FROM pack_purchase_daily ppd
)
SELECT
  ak.metric_date,
  ak.user_id,
  sb.signup_date,
  sb.signup_cohort_month,
  (ak.metric_date = sb.signup_date) AS did_signup,
  fcw.first_completed_workout_date,
  (ak.metric_date = fcw.first_completed_workout_date) AS did_first_completed_workout,
  fcb.first_completed_booking_date,
  (ak.metric_date = fcb.first_completed_booking_date) AS did_first_completed_booking,
  COALESCE(wsd.workout_sessions_started, 0)::INTEGER AS workout_sessions_started,
  COALESCE(wcd.completed_workouts_count, 0)::INTEGER AS completed_workouts_count,
  COALESCE(cbd.completed_bookings_count, 0)::INTEGER AS completed_bookings_count,
  COALESCE(ppd.pack_purchases_count, 0)::INTEGER AS pack_purchases_count,
  (COALESCE(wsd.workout_sessions_started, 0) > 0) AS had_workout_session,
  (COALESCE(wcd.completed_workouts_count, 0) > 0) AS had_completed_workout,
  (COALESCE(cbd.completed_bookings_count, 0) > 0) AS had_completed_booking,
  (COALESCE(ppd.pack_purchases_count, 0) > 0) AS had_pack_purchase,
  (
    COALESCE(wsd.workout_sessions_started, 0) > 0
    OR COALESCE(wcd.completed_workouts_count, 0) > 0
    OR COALESCE(cbd.completed_bookings_count, 0) > 0
    OR COALESCE(ppd.pack_purchases_count, 0) > 0
  ) AS had_any_activity,
  (
    ak.metric_date = sb.signup_date
    OR COALESCE(wsd.workout_sessions_started, 0) > 0
    OR COALESCE(wcd.completed_workouts_count, 0) > 0
    OR COALESCE(cbd.completed_bookings_count, 0) > 0
    OR COALESCE(ppd.pack_purchases_count, 0) > 0
  ) AS had_any_lifecycle_event,
  GREATEST(ak.metric_date - sb.signup_date, 0) AS days_since_signup
FROM activity_keys ak
JOIN signup_base sb ON sb.user_id = ak.user_id
LEFT JOIN workout_started_daily wsd
  ON wsd.user_id = ak.user_id
  AND wsd.metric_date = ak.metric_date
LEFT JOIN workout_completed_daily wcd
  ON wcd.user_id = ak.user_id
  AND wcd.metric_date = ak.metric_date
LEFT JOIN completed_booking_daily cbd
  ON cbd.user_id = ak.user_id
  AND cbd.metric_date = ak.metric_date
LEFT JOIN pack_purchase_daily ppd
  ON ppd.user_id = ak.user_id
  AND ppd.metric_date = ak.metric_date
LEFT JOIN first_completed_workout fcw
  ON fcw.user_id = ak.user_id
LEFT JOIN first_completed_booking fcb
  ON fcb.user_id = ak.user_id;

GRANT SELECT ON public.bi_user_lifecycle_daily TO authenticated;
