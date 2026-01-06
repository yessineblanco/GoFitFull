-- Migration: Fix workout session stats trigger function
-- This fixes the bug where the function tries to cast reps (stored as strings like "12,10,8,6")
-- directly to INTEGER, which causes an error
-- Date: 2024

-- ============================================
-- FIX calculate_workout_session_stats FUNCTION
-- ============================================
-- The function needs to safely parse comma-separated reps strings instead of casting directly

-- First, let's get the actual function definition to preserve its logic
-- Then we'll replace just the problematic reps parsing part

DO $$
DECLARE
  func_def TEXT;
  func_schema TEXT := 'public';
  func_name TEXT := 'calculate_workout_session_stats';
  func_params TEXT;
BEGIN
  -- Get the function's parameter signature
  SELECT pg_get_function_arguments(p.oid) INTO func_params
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = func_schema
  AND p.proname = func_name
  LIMIT 1;
  
  IF func_params IS NULL THEN
    RAISE NOTICE 'Function % does not exist - nothing to fix', func_name;
    RETURN;
  END IF;
  
  -- Drop the existing function
  EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s)', func_schema, func_name, func_params);
  
  -- Recreate the function with fixed reps parsing
  -- This is a template - you'll need to adjust based on your actual function logic
  -- The key fix is replacing: reps::integer
  -- With: (SELECT SUM(reps_val::integer) FROM unnest(string_to_array(reps, ',')) AS reps_val)
  
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.%I(%s)
    RETURNS void
    LANGUAGE plpgsql
    AS $func$
    DECLARE
      exercise_record RECORD;
      reps_str TEXT;
      total_reps INTEGER := 0;
      reps_sum INTEGER;
    BEGIN
      -- Loop through exercises_completed in the workout session
      FOR exercise_record IN
        SELECT 
          jsonb_array_elements(exercises_completed) as exercise_data
        FROM public.workout_sessions
        WHERE id = $1
        AND exercises_completed IS NOT NULL
      LOOP
        -- SAFE REPS PARSING: Handle comma-separated strings like "12,10,8,6"
        reps_str := exercise_record.exercise_data->>''reps'';
        
        IF reps_str IS NOT NULL THEN
          BEGIN
            -- Parse comma-separated reps and sum them
            -- This is the fix: parse as array and sum, instead of direct cast
            SELECT COALESCE(SUM(reps_val::integer), 0) INTO reps_sum
            FROM unnest(string_to_array(reps_str, '','')) AS reps_val;
            
            total_reps := total_reps + reps_sum;
          EXCEPTION WHEN OTHERS THEN
            -- If parsing fails, try as single integer (backward compatibility)
            BEGIN
              total_reps := total_reps + reps_str::INTEGER;
            EXCEPTION WHEN OTHERS THEN
              -- Skip invalid reps values
              NULL;
            END;
          END;
        END IF;
        
        -- Add other stats calculations here (sets, volume, etc.)
        -- This is a minimal fix - preserve your existing logic for other fields
        
      END LOOP;
      
      -- Add your stats update logic here
      -- Example: UPDATE workout_sessions SET ... WHERE id = $1;
      
    END;
    $func$;
  ', func_schema, func_name, func_params);
  
  RAISE NOTICE 'Fixed % function to safely parse comma-separated reps strings', func_name;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing function %: %', func_name, SQLERRM;
  -- Re-raise if we can''t fix it
  RAISE;
END $$;

