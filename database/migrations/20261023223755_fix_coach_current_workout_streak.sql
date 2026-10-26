CREATE OR REPLACE FUNCTION public.get_client_progress(p_client_id uuid, p_coach_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_has_relationship boolean;
  v_total_workouts integer;
  v_current_streak integer;
  v_recent_sessions jsonb;
  v_weekly_consistency numeric;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.coach_profiles cp
    WHERE cp.id = p_coach_id
      AND cp.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Coach access required' USING ERRCODE = '42501';
  END IF;

  SELECT (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.client_id = p_client_id
        AND b.coach_id = p_coach_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.purchased_packs pp
      WHERE pp.client_id = p_client_id
        AND pp.coach_id = p_coach_id
    )
  )
  INTO v_has_relationship;

  IF NOT v_has_relationship THEN
    RAISE EXCEPTION 'No coaching relationship with this client'
      USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*)
  INTO v_total_workouts
  FROM public.workout_sessions
  WHERE user_id = p_client_id
    AND completed_at IS NOT NULL;

  WITH RECURSIVE workout_days AS (
    SELECT DISTINCT (completed_at AT TIME ZONE 'UTC')::date AS workout_date
    FROM public.workout_sessions
    WHERE user_id = p_client_id
      AND completed_at IS NOT NULL
      AND completed_at <= NOW()
  ),
  latest AS (
    SELECT MAX(workout_date) AS workout_date
    FROM workout_days
    WHERE workout_date >= (NOW() AT TIME ZONE 'UTC')::date - 1
  ),
  streak_days AS (
    SELECT workout_date FROM latest WHERE workout_date IS NOT NULL
    UNION ALL
    SELECT d.workout_date
    FROM workout_days d
    JOIN streak_days s ON d.workout_date = s.workout_date - 1
  )
  SELECT COUNT(*)
  INTO v_current_streak
  FROM streak_days;

  SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
  INTO v_recent_sessions
  FROM (
    SELECT
      ws.id,
      COALESCE(w.name, 'Workout') AS workout_name,
      ws.started_at,
      ws.completed_at,
      ws.duration_minutes,
      ws.exercises_completed
    FROM public.workout_sessions ws
    LEFT JOIN public.workouts w ON ws.workout_id = w.id
    WHERE ws.user_id = p_client_id
      AND ws.completed_at IS NOT NULL
    ORDER BY ws.started_at DESC
    LIMIT 20
  ) s;

  SELECT COALESCE(
    ROUND(
      (
        SELECT COUNT(DISTINCT DATE(completed_at AT TIME ZONE 'UTC'))::numeric / 4
        FROM public.workout_sessions
        WHERE user_id = p_client_id
          AND completed_at IS NOT NULL
          AND completed_at >= NOW() - INTERVAL '28 days'
      ),
      1
    ),
    0
  )
  INTO v_weekly_consistency;

  RETURN jsonb_build_object(
    'total_workouts', v_total_workouts,
    'streak', v_current_streak,
    'sessions', v_recent_sessions,
    'weekly_consistency', v_weekly_consistency
  );
END;
$function$

