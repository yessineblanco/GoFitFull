-- RLS: Coaches can SELECT workout_sessions for clients with active relationship
CREATE POLICY "Coaches can view client workout sessions"
  ON public.workout_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.user_id = auth.uid()
      AND (
        EXISTS (
          SELECT 1 FROM public.bookings b
          WHERE b.coach_id = cp.id AND b.client_id = workout_sessions.user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.purchased_packs pp
          WHERE pp.coach_id = cp.id AND pp.client_id = workout_sessions.user_id
        )
      )
    )
  );

-- RPC: get_client_progress - returns workout stats for a client (coach view only)
CREATE OR REPLACE FUNCTION public.get_client_progress(p_client_id UUID, p_coach_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_relationship BOOLEAN;
  v_sessions JSONB;
  v_total_workouts INT;
  v_streak INT := 0;
  v_consistency NUMERIC;
  v_result JSONB;
BEGIN
  -- Verify coaching relationship
  SELECT EXISTS (
    SELECT 1 FROM bookings b WHERE b.coach_id = p_coach_id AND b.client_id = p_client_id
    UNION
    SELECT 1 FROM purchased_packs pp WHERE pp.coach_id = p_coach_id AND pp.client_id = p_client_id
  ) INTO v_has_relationship;

  IF NOT v_has_relationship THEN
    RETURN jsonb_build_object('error', 'No coaching relationship');
  END IF;

  -- Get recent sessions (last 30)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ws.id,
      'workout_name', ws.workout_name,
      'started_at', ws.started_at,
      'completed_at', ws.completed_at,
      'duration_minutes', ws.duration_minutes
    ) ORDER BY ws.started_at DESC
  )
  INTO v_sessions
  FROM (
    SELECT id, workout_name, started_at, completed_at, duration_minutes
    FROM workout_sessions
    WHERE user_id = p_client_id
      AND completed_at IS NOT NULL
    ORDER BY started_at DESC
    LIMIT 30
  ) ws;

  -- Total completed workouts
  SELECT COUNT(*)::INT INTO v_total_workouts
  FROM workout_sessions
  WHERE user_id = p_client_id AND completed_at IS NOT NULL;

  -- Streak: consecutive days with workouts (from most recent backwards)
  WITH RECURSIVE workout_dates AS (
    SELECT DISTINCT DATE(completed_at AT TIME ZONE 'UTC') AS d
    FROM workout_sessions
    WHERE user_id = p_client_id AND completed_at IS NOT NULL
  ),
  latest AS (
    SELECT d FROM workout_dates ORDER BY d DESC LIMIT 1
  ),
  streak_calc AS (
    SELECT l.d, 1 AS cnt FROM latest l
    UNION ALL
    SELECT wd.d, sc.cnt + 1
    FROM workout_dates wd
    JOIN streak_calc sc ON wd.d = sc.d - 1
  )
  SELECT COALESCE(MAX(cnt), 0)::INT INTO v_streak FROM streak_calc;

  -- Weekly consistency: avg workout days per week over last 4 weeks
  SELECT COALESCE(
    ROUND(
      (SELECT COUNT(DISTINCT DATE(completed_at AT TIME ZONE 'UTC'))::NUMERIC / 4
       FROM workout_sessions
       WHERE user_id = p_client_id
         AND completed_at IS NOT NULL
         AND completed_at >= NOW() - INTERVAL '28 days'),
      1
    ),
    0
  ) INTO v_consistency;

  v_result := jsonb_build_object(
    'sessions', COALESCE(v_sessions, '[]'::jsonb),
    'total_workouts', v_total_workouts,
    'streak', v_streak,
    'weekly_consistency', v_consistency
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_progress(UUID, UUID) TO authenticated;
