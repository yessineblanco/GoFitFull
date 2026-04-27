-- Canonical daily client-health view for advanced admin BI.
-- This captures per-user workout, nutrition, body-measurement, booking, and
-- pack-purchase facts plus rolling inactivity and adherence inputs.

CREATE OR REPLACE VIEW public.bi_client_health_daily
WITH (security_invoker = true)
AS
WITH user_base AS (
  SELECT
    up.id AS user_id,
    (up.created_at AT TIME ZONE 'UTC')::DATE AS signup_date
  FROM public.user_profiles up
),
date_spine AS (
  SELECT
    ub.user_id,
    ub.signup_date,
    gs::DATE AS metric_date
  FROM user_base ub
  JOIN LATERAL generate_series(
    ub.signup_date,
    CURRENT_DATE,
    INTERVAL '1 day'
  ) AS gs ON true
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
    COUNT(*)::INTEGER AS completed_workouts_count,
    COALESCE(SUM(ws.duration_minutes), 0)::INTEGER AS completed_workout_minutes
  FROM public.workout_sessions ws
  WHERE ws.completed_at IS NOT NULL
  GROUP BY ws.user_id, (ws.completed_at AT TIME ZONE 'UTC')::DATE
),
nutrition_daily AS (
  SELECT
    ml.user_id,
    ml.logged_date AS metric_date,
    COUNT(*)::INTEGER AS meal_logs_count,
    COALESCE(SUM(fi.calories * ml.servings), 0)::NUMERIC(12, 2) AS logged_calories,
    COALESCE(SUM(fi.protein_g * ml.servings), 0)::NUMERIC(12, 2) AS logged_protein_g,
    COALESCE(SUM(fi.carbs_g * ml.servings), 0)::NUMERIC(12, 2) AS logged_carbs_g,
    COALESCE(SUM(fi.fat_g * ml.servings), 0)::NUMERIC(12, 2) AS logged_fat_g
  FROM public.meal_logs ml
  JOIN public.food_items fi ON fi.id = ml.food_item_id
  GROUP BY ml.user_id, ml.logged_date
),
body_measurement_daily AS (
  SELECT
    bm.user_id,
    bm.measurement_date AS metric_date,
    COUNT(*)::INTEGER AS body_measurements_count
  FROM public.body_measurements bm
  GROUP BY bm.user_id, bm.measurement_date
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
pack_purchase_daily AS (
  SELECT
    pp.client_id AS user_id,
    (pp.purchased_at AT TIME ZONE 'UTC')::DATE AS metric_date,
    COUNT(*)::INTEGER AS pack_purchases_count
  FROM public.purchased_packs pp
  GROUP BY pp.client_id, (pp.purchased_at AT TIME ZONE 'UTC')::DATE
),
merged AS (
  SELECT
    ds.metric_date,
    ds.user_id,
    ds.signup_date,
    COALESCE(wsd.workout_sessions_started, 0)::INTEGER AS workout_sessions_started,
    COALESCE(wcd.completed_workouts_count, 0)::INTEGER AS completed_workouts_count,
    COALESCE(wcd.completed_workout_minutes, 0)::INTEGER AS completed_workout_minutes,
    (COALESCE(wsd.workout_sessions_started, 0) > 0) AS had_workout_session,
    (COALESCE(wcd.completed_workouts_count, 0) > 0) AS had_completed_workout,
    COALESCE(nd.meal_logs_count, 0)::INTEGER AS meal_logs_count,
    COALESCE(nd.logged_calories, 0)::NUMERIC(12, 2) AS logged_calories,
    COALESCE(nd.logged_protein_g, 0)::NUMERIC(12, 2) AS logged_protein_g,
    COALESCE(nd.logged_carbs_g, 0)::NUMERIC(12, 2) AS logged_carbs_g,
    COALESCE(nd.logged_fat_g, 0)::NUMERIC(12, 2) AS logged_fat_g,
    (COALESCE(nd.meal_logs_count, 0) > 0) AS had_nutrition_log,
    ng.calories_goal::INTEGER AS calories_goal,
    ng.protein_g::NUMERIC(12, 2) AS protein_goal_g,
    ng.carbs_g::NUMERIC(12, 2) AS carbs_goal_g,
    ng.fat_g::NUMERIC(12, 2) AS fat_goal_g,
    COALESCE(bmd.body_measurements_count, 0)::INTEGER AS body_measurements_count,
    (COALESCE(bmd.body_measurements_count, 0) > 0) AS had_body_measurement,
    COALESCE(cbd.completed_bookings_count, 0)::INTEGER AS completed_bookings_count,
    (COALESCE(cbd.completed_bookings_count, 0) > 0) AS had_completed_booking,
    COALESCE(ppd.pack_purchases_count, 0)::INTEGER AS pack_purchases_count,
    (COALESCE(ppd.pack_purchases_count, 0) > 0) AS had_pack_purchase
  FROM date_spine ds
  LEFT JOIN workout_started_daily wsd
    ON wsd.user_id = ds.user_id
    AND wsd.metric_date = ds.metric_date
  LEFT JOIN workout_completed_daily wcd
    ON wcd.user_id = ds.user_id
    AND wcd.metric_date = ds.metric_date
  LEFT JOIN nutrition_daily nd
    ON nd.user_id = ds.user_id
    AND nd.metric_date = ds.metric_date
  LEFT JOIN nutrition_goals ng
    ON ng.user_id = ds.user_id
  LEFT JOIN body_measurement_daily bmd
    ON bmd.user_id = ds.user_id
    AND bmd.metric_date = ds.metric_date
  LEFT JOIN completed_booking_daily cbd
    ON cbd.user_id = ds.user_id
    AND cbd.metric_date = ds.metric_date
  LEFT JOIN pack_purchase_daily ppd
    ON ppd.user_id = ds.user_id
    AND ppd.metric_date = ds.metric_date
),
signals AS (
  SELECT
    m.*,
    MAX(CASE WHEN m.had_completed_workout THEN m.metric_date END)
      OVER (PARTITION BY m.user_id ORDER BY m.metric_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
      AS last_completed_workout_date,
    SUM(CASE WHEN m.had_completed_workout THEN 1 ELSE 0 END)
      OVER (PARTITION BY m.user_id ORDER BY m.metric_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
      AS completed_workout_days_last_7d,
    SUM(CASE WHEN m.had_completed_workout THEN 1 ELSE 0 END)
      OVER (PARTITION BY m.user_id ORDER BY m.metric_date ROWS BETWEEN 27 PRECEDING AND CURRENT ROW)
      AS completed_workout_days_last_28d,
    MAX(CASE WHEN m.had_nutrition_log THEN m.metric_date END)
      OVER (PARTITION BY m.user_id ORDER BY m.metric_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
      AS last_nutrition_log_date,
    SUM(CASE WHEN m.had_nutrition_log THEN 1 ELSE 0 END)
      OVER (PARTITION BY m.user_id ORDER BY m.metric_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
      AS nutrition_log_days_last_7d,
    MAX(CASE WHEN m.had_body_measurement THEN m.metric_date END)
      OVER (PARTITION BY m.user_id ORDER BY m.metric_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
      AS last_body_measurement_date,
    MAX(CASE WHEN m.had_completed_booking THEN m.metric_date END)
      OVER (PARTITION BY m.user_id ORDER BY m.metric_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
      AS last_completed_booking_date
  FROM merged m
)
SELECT
  s.metric_date,
  s.user_id,
  s.signup_date,
  s.workout_sessions_started,
  s.completed_workouts_count,
  s.completed_workout_minutes,
  s.had_workout_session,
  s.had_completed_workout,
  s.meal_logs_count,
  s.logged_calories,
  s.logged_protein_g,
  s.logged_carbs_g,
  s.logged_fat_g,
  s.had_nutrition_log,
  s.calories_goal,
  s.protein_goal_g,
  s.carbs_goal_g,
  s.fat_goal_g,
  CASE
    WHEN s.had_nutrition_log AND s.calories_goal IS NOT NULL AND s.calories_goal > 0
      THEN ROUND((s.logged_calories / s.calories_goal::NUMERIC), 4)
    ELSE NULL
  END AS calorie_goal_progress,
  CASE
    WHEN s.had_nutrition_log AND s.protein_goal_g IS NOT NULL AND s.protein_goal_g > 0
      THEN ROUND((s.logged_protein_g / s.protein_goal_g), 4)
    ELSE NULL
  END AS protein_goal_progress,
  CASE
    WHEN s.had_nutrition_log AND s.carbs_goal_g IS NOT NULL AND s.carbs_goal_g > 0
      THEN ROUND((s.logged_carbs_g / s.carbs_goal_g), 4)
    ELSE NULL
  END AS carbs_goal_progress,
  CASE
    WHEN s.had_nutrition_log AND s.fat_goal_g IS NOT NULL AND s.fat_goal_g > 0
      THEN ROUND((s.logged_fat_g / s.fat_goal_g), 4)
    ELSE NULL
  END AS fat_goal_progress,
  s.body_measurements_count,
  s.had_body_measurement,
  s.completed_bookings_count,
  s.had_completed_booking,
  s.pack_purchases_count,
  s.had_pack_purchase,
  s.last_completed_workout_date,
  CASE
    WHEN s.last_completed_workout_date IS NOT NULL
      THEN GREATEST((s.metric_date - s.last_completed_workout_date), 0)
    ELSE NULL
  END::INTEGER AS days_since_last_completed_workout,
  s.completed_workout_days_last_7d::INTEGER,
  s.completed_workout_days_last_28d::INTEGER,
  s.last_nutrition_log_date,
  CASE
    WHEN s.last_nutrition_log_date IS NOT NULL
      THEN GREATEST((s.metric_date - s.last_nutrition_log_date), 0)
    ELSE NULL
  END::INTEGER AS days_since_last_nutrition_log,
  s.nutrition_log_days_last_7d::INTEGER,
  s.last_body_measurement_date,
  CASE
    WHEN s.last_body_measurement_date IS NOT NULL
      THEN GREATEST((s.metric_date - s.last_body_measurement_date), 0)
    ELSE NULL
  END::INTEGER AS days_since_last_body_measurement,
  s.last_completed_booking_date,
  CASE
    WHEN s.last_completed_booking_date IS NOT NULL
      THEN GREATEST((s.metric_date - s.last_completed_booking_date), 0)
    ELSE NULL
  END::INTEGER AS days_since_last_completed_booking,
  (
    s.had_workout_session
    OR s.had_nutrition_log
    OR s.had_body_measurement
    OR s.had_completed_booking
    OR s.had_pack_purchase
  ) AS had_any_health_signal
FROM signals s;

GRANT SELECT ON public.bi_client_health_daily TO authenticated;
