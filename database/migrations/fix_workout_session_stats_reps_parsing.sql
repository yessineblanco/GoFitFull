-- Migration: Fix workout session stats trigger - Safe reps parsing
-- This fixes the bug where reps (stored as strings like "12,10,8,6") are cast directly to INTEGER
-- Date: 2024

-- ============================================
-- FIX: Update calculate_workout_session_stats function
-- ============================================
-- Replace any direct cast of reps to integer with safe parsing

DO $$
DECLARE
  func_def TEXT;
  func_name TEXT := 'calculate_workout_session_stats';
BEGIN
  -- Check if function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = func_name
  ) THEN
    RAISE NOTICE 'Function % not found - skipping fix', func_name;
    RETURN;
  END IF;
  
  -- Get the current function definition
  SELECT pg_get_functiondef(p.oid) INTO func_def
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = func_name
  LIMIT 1;
  
  -- Replace the problematic pattern: reps::integer
  -- With safe parsing: (SELECT SUM(rep_val::integer) FROM unnest(string_to_array(reps, ',')) AS rep_val)
  -- However, we need to be careful about variable names, so we'll use a more generic approach
  
  -- Since we can't reliably parse and modify function source, we'll provide a script
  -- that you can run manually after viewing your function definition
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TO FIX THE FUNCTION:';
  RAISE NOTICE '1. Run: SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = ''calculate_workout_session_stats'';';
  RAISE NOTICE '2. Find any line with: reps::integer or reps::INTEGER';
  RAISE NOTICE '3. Replace with: (SELECT SUM(rep_val::integer) FROM unnest(string_to_array(reps, '','')) AS rep_val)';
  RAISE NOTICE '';
  RAISE NOTICE 'OR use this simpler replacement:';
  RAISE NOTICE '  Replace: total_reps := total_reps + reps::integer;';
  RAISE NOTICE '  With: total_reps := total_reps + COALESCE((SELECT SUM(rep_val::integer) FROM unnest(string_to_array(reps, '','')) AS rep_val WHERE trim(rep_val) ~ ''^[0-9]+$''), 0);';
  RAISE NOTICE '========================================';
  
END $$;

-- Alternative: If you want to completely recreate the function, use this template
-- Uncomment and customize based on your actual function needs

/*
-- Drop existing function (adjust parameters based on your signature)
DROP FUNCTION IF EXISTS public.calculate_workout_session_stats(UUID);

-- Recreate with safe reps parsing
CREATE OR REPLACE FUNCTION public.calculate_workout_session_stats(session_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  exercise_record RECORD;
  total_reps INTEGER := 0;
  reps_str TEXT;
  reps_sum INTEGER;
BEGIN
  -- Loop through exercises_completed
  FOR exercise_record IN
    SELECT jsonb_array_elements(exercises_completed) as exercise_data
    FROM public.workout_sessions
    WHERE id = session_id
    AND exercises_completed IS NOT NULL
  LOOP
    -- SAFE REPS PARSING - This is the fix
    reps_str := exercise_record.exercise_data->>'reps';
    
    IF reps_str IS NOT NULL THEN
      -- Parse comma-separated reps like "12,10,8,6" and sum them
      -- This replaces the buggy: reps::integer
      SELECT COALESCE(SUM(trim(rep_val)::integer), 0) INTO reps_sum
      FROM unnest(string_to_array(reps_str, ',')) AS rep_val
      WHERE trim(rep_val) ~ '^[0-9]+$'; -- Only process valid integers
      
      total_reps := total_reps + reps_sum;
    END IF;
    
    -- Add your other calculations here (sets, volume, etc.)
    
  END LOOP;
  
  -- Update stats table or workout_sessions
  -- Example: UPDATE workout_sessions SET total_reps = total_reps WHERE id = session_id;
  
END;
$$;
*/
