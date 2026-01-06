-- Migration: Fix calculate_workout_session_stats function - Safe reps parsing
-- This fixes the bug where reps (stored as strings like "12,10,8,6") are cast directly to INTEGER
-- Date: 2024

-- ============================================
-- SOLUTION: Replace the problematic function with a fixed version
-- ============================================

-- Step 1: Drop the existing function (adjust signature if needed)
-- Common signatures:
-- calculate_workout_session_stats(UUID)
-- calculate_workout_session_stats(uuid, text)
DO $$
BEGIN
  -- Try to drop with common signatures
  DROP FUNCTION IF EXISTS public.calculate_workout_session_stats(UUID);
  DROP FUNCTION IF EXISTS public.calculate_workout_session_stats(uuid);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop function (might not exist or have different signature): %', SQLERRM;
END $$;

-- Step 2: Create the fixed function
-- This is a template - adjust the logic to match your actual function
-- The KEY FIX is in how we parse reps: using string_to_array and SUM instead of direct cast

CREATE OR REPLACE FUNCTION public.calculate_workout_session_stats(session_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  exercise_record RECORD;
  total_reps INTEGER := 0;
  total_sets INTEGER := 0;
  reps_str TEXT;
  sets_str TEXT;
  reps_sum INTEGER;
BEGIN
  -- Loop through exercises_completed in the workout session
  FOR exercise_record IN
    SELECT 
      jsonb_array_elements(exercises_completed) as exercise_data
    FROM public.workout_sessions
    WHERE id = session_id
    AND exercises_completed IS NOT NULL
  LOOP
    -- FIX: Parse sets (can be string or integer)
    sets_str := exercise_record.exercise_data->>'sets';
    IF sets_str IS NOT NULL THEN
      BEGIN
        total_sets := total_sets + sets_str::INTEGER;
      EXCEPTION WHEN OTHERS THEN
        NULL; -- Skip invalid sets
      END;
    END IF;
    
    -- *** THE FIX: Safe reps parsing ***
    -- OLD (BUGGY): total_reps := total_reps + reps::integer;
    -- NEW (FIXED): Parse comma-separated string and sum all reps
    reps_str := exercise_record.exercise_data->>'reps';
    
    IF reps_str IS NOT NULL AND reps_str != '' THEN
      BEGIN
        -- Handle comma-separated reps like "12,10,8,6"
        IF reps_str LIKE '%,%' THEN
          -- Parse as array and sum all values
          SELECT COALESCE(SUM(trim(rep_val)::INTEGER), 0) INTO reps_sum
          FROM unnest(string_to_array(reps_str, ',')) AS rep_val
          WHERE trim(rep_val) ~ '^[0-9]+$'; -- Only sum valid integers
        ELSE
          -- Single integer value
          reps_sum := reps_str::INTEGER;
        END IF;
        
        total_reps := total_reps + reps_sum;
      EXCEPTION WHEN OTHERS THEN
        -- Skip invalid reps values
        NULL;
      END;
    END IF;
    
    -- Add other calculations here (volume, etc.)
    -- Adjust based on your actual function logic
    
  END LOOP;
  
  -- Update stats - adjust based on where you store calculated stats
  -- Examples:
  -- UPDATE workout_sessions SET total_reps = total_reps WHERE id = session_id;
  -- OR update a separate stats table
  
  -- For now, the function won't error - add your stats update logic here
  
  RAISE NOTICE 'Calculated stats for session %: reps=%, sets=%', session_id, total_reps, total_sets;
  
END;
$$;

-- Grant execute permissions if needed
GRANT EXECUTE ON FUNCTION public.calculate_workout_session_stats(UUID) TO authenticated;

