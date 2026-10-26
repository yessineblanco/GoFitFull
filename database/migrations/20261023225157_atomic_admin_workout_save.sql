-- Native workout saves must not commit a parent update or deleted exercises
-- when a replacement prescription fails. Called only by the admin server.
CREATE OR REPLACE FUNCTION public.admin_save_native_workout(
  p_workout_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_workout public.workouts;
BEGIN
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
     OR nullif(btrim(p_payload->>'name'), '') IS NULL
     OR jsonb_typeof(p_payload->'exercises') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Workout name and exercises are required' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_payload->'exercises') = 0 THEN
    RAISE EXCEPTION 'At least one exercise is required' USING ERRCODE = '22023';
  END IF;
  IF p_payload ? 'workout_type' AND p_payload->>'workout_type' IS DISTINCT FROM 'native' THEN
    RAISE EXCEPTION 'Only native workouts are supported' USING ERRCODE = '22023';
  END IF;

  IF p_workout_id IS NULL THEN
    INSERT INTO public.workouts (name, difficulty, image_url, workout_type, user_id)
    VALUES (btrim(p_payload->>'name'), coalesce(p_payload->>'difficulty', 'Beginner'),
            p_payload->>'image_url', 'native', NULL)
    RETURNING * INTO v_workout;
  ELSE
    -- The parent row lock serializes saves of this workout until the entire
    -- replacement succeeds. Custom/client-owned workouts are outside this API.
    UPDATE public.workouts
    SET name = btrim(p_payload->>'name'),
        difficulty = CASE WHEN p_payload ? 'difficulty' THEN p_payload->>'difficulty' ELSE difficulty END,
        image_url = CASE WHEN p_payload ? 'image_url' THEN p_payload->>'image_url' ELSE image_url END,
        updated_at = now()
    WHERE id = p_workout_id AND workout_type = 'native'
    RETURNING * INTO v_workout;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Native workout not found' USING ERRCODE = 'P0002';
    END IF;

    DELETE FROM public.workout_exercises WHERE workout_id = p_workout_id;
  END IF;

  INSERT INTO public.workout_exercises
    (workout_id, exercise_id, sets, reps, rest_time, day, exercise_order)
  SELECT v_workout.id,
         (item->>'exercise_id')::uuid,
         coalesce((item->>'sets')::integer, 3),
         coalesce(item->>'reps', '10'),
         coalesce((item->>'rest_time')::integer, 60),
         coalesce((item->>'day')::integer, 1),
         coalesce((item->>'exercise_order')::integer, (position - 1)::integer)
  FROM jsonb_array_elements(p_payload->'exercises') WITH ORDINALITY AS entries(item, position);

  -- Do not catch insertion errors here: PostgreSQL must roll back the parent
  -- change and all exercise deletions/insertions in this function call.
  RETURN to_jsonb(v_workout);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_save_native_workout(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_native_workout(uuid, jsonb) TO service_role;
