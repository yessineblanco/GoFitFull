-- Fix get_client_progress: allow progress view for clients with ANY booking OR purchased_pack
-- (matches get_coach_clients logic - previously only allowed active purchased_packs)
-- Also returns sessions, streak, weekly_consistency keys expected by the mobile client

CREATE OR REPLACE FUNCTION public.get_client_progress(p_client_id UUID, p_coach_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_has_relationship BOOLEAN;
  v_total_workouts INTEGER;
  v_current_streak INTEGER;
  v_recent_sessions JSONB;
  v_weekly_consistency NUMERIC;
BEGIN
  -- Match get_coach_clients: allow if client has ANY booking OR purchased_pack with this coach
  SELECT (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.client_id = p_client_id AND b.coach_id = p_coach_id)
    OR EXISTS (SELECT 1 FROM public.purchased_packs pp WHERE pp.client_id = p_client_id AND pp.coach_id = p_coach_id)
  ) INTO v_has_relationship;

  IF NOT v_has_relationship THEN
    RAISE EXCEPTION 'No active coaching relationship with this client';
  END IF;

  SELECT COUNT(*) INTO v_total_workouts
  FROM public.workout_sessions
  WHERE user_id = p_client_id AND completed_at IS NOT NULL;

  WITH consecutive_days AS (
    SELECT DISTINCT DATE(started_at) as workout_date
    FROM public.workout_sessions
    WHERE user_id = p_client_id AND completed_at IS NOT NULL
    ORDER BY workout_date DESC
  ),
  streaks AS (
    SELECT 
      workout_date,
      workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::INTEGER * INTERVAL '1 day' as grp
    FROM consecutive_days
  )
  SELECT COUNT(*) INTO v_current_streak
  FROM streaks
  WHERE grp = (SELECT grp FROM streaks LIMIT 1);

  -- workout_name was removed from workout_sessions; get name from workouts via workout_id
  SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
  INTO v_recent_sessions
  FROM (
    SELECT ws.id, COALESCE(w.name, 'Workout') AS workout_name, ws.started_at, ws.completed_at, ws.duration_minutes, ws.exercises_completed
    FROM public.workout_sessions ws
    LEFT JOIN public.workouts w ON ws.workout_id = w.id
    WHERE ws.user_id = p_client_id AND ws.completed_at IS NOT NULL
    ORDER BY ws.started_at DESC
    LIMIT 20
  ) s;

  -- Weekly consistency: avg workout days per week over last 4 weeks
  SELECT COALESCE(
    ROUND(
      (SELECT COUNT(DISTINCT DATE(completed_at AT TIME ZONE 'UTC'))::NUMERIC / 4
       FROM public.workout_sessions
       WHERE user_id = p_client_id
         AND completed_at IS NOT NULL
         AND completed_at >= NOW() - INTERVAL '28 days'),
      1
    ),
    0
  ) INTO v_weekly_consistency;

  -- Use keys expected by client: sessions, streak, weekly_consistency
  result := jsonb_build_object(
    'total_workouts', v_total_workouts,
    'streak', v_current_streak,
    'sessions', v_recent_sessions,
    'weekly_consistency', v_weekly_consistency
  );

  RETURN result;
END;
$$;
