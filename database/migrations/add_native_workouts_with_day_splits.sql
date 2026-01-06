-- Migration: Add native workouts with day splits
-- This migration adds well-structured native workouts with proper day splits
-- and removes single-day workouts
-- Date: 2024

-- ============================================
-- 1. REMOVE SINGLE-DAY WORKOUTS
-- ============================================
-- Remove workouts that only have exercises on day 1 (these are likely old/unstructured)
-- Only remove if they're native workouts (user_id IS NULL) and have all exercises on day 1

-- NOTE: There's a trigger on workout_sessions that tries to parse reps as integers,
-- but reps are stored as strings like "12,10,8,6". This trigger will fire when
-- workout_id is set to NULL (via FK ON DELETE SET NULL). We need to disable it first.

-- Disable the trigger if it exists (outside of DO block for persistence)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_calculate_workout_stats'
    AND tgrelid = 'public.workout_sessions'::regclass
  ) THEN
    ALTER TABLE public.workout_sessions DISABLE TRIGGER trigger_calculate_workout_stats;
  END IF;
END $$;

DO $$
DECLARE
  workout_record RECORD;
  day_count INTEGER;
  workout_ids_to_delete UUID[] := ARRAY[]::UUID[];
BEGIN
  -- First, collect all workout IDs that should be deleted
  FOR workout_record IN 
    SELECT DISTINCT w.id 
    FROM public.workouts w
    WHERE w.user_id IS NULL  -- Native workouts only
  LOOP
    -- Count distinct days for this workout
    SELECT COUNT(DISTINCT day) INTO day_count
    FROM public.workout_exercises
    WHERE workout_id = workout_record.id;
    
    -- If only one day or all exercises are on day 1, mark for deletion
    IF day_count <= 1 THEN
      workout_ids_to_delete := array_append(workout_ids_to_delete, workout_record.id);
    END IF;
  END LOOP;
  
  -- If there are workouts to delete
  IF array_length(workout_ids_to_delete, 1) > 0 THEN
    -- Delete workout exercises first
    DELETE FROM public.workout_exercises 
    WHERE workout_id = ANY(workout_ids_to_delete);
    
    -- Delete the workouts
    -- The FK constraint will automatically set workout_id = NULL in workout_sessions
    -- The trigger is disabled, so this won't cause the stats calculation error
    DELETE FROM public.workouts 
    WHERE id = ANY(workout_ids_to_delete);
  END IF;
END $$;

-- Re-enable the trigger after deletion is complete
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_calculate_workout_stats'
    AND tgrelid = 'public.workout_sessions'::regclass
  ) THEN
    ALTER TABLE public.workout_sessions ENABLE TRIGGER trigger_calculate_workout_stats;
  END IF;
END $$;

-- ============================================
-- 2. INSERT NEW NATIVE WORKOUTS WITH DAY SPLITS
-- ============================================
-- These workouts use exercise names that should exist in the exercises table
-- The app will match them by name

DO $$
DECLARE
  workout_id_push_pull_legs UUID;
  workout_id_upper_lower UUID;
  workout_id_bro_split UUID;
  workout_id_full_body_split UUID;
  exercise_record RECORD;
BEGIN
  -- ============================================
  -- Push/Pull/Legs Split (Intermediate)
  -- ============================================
  INSERT INTO public.workouts (id, user_id, name, difficulty, image_url, workout_type, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    NULL, -- Native workout
    'Push/Pull/Legs Split',
    'Intermediate',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    'native',
    NOW(),
    NOW()
  )
  RETURNING id INTO workout_id_push_pull_legs;

  -- Day 1: Push Day (Chest, Shoulders, Triceps)
  -- Find exercises by name and insert into workout_exercises
  FOR exercise_record IN 
    SELECT id FROM public.exercises 
    WHERE name IN ('Bench Press', 'Incline Dumbbell Press', 'Shoulder Press', 'Lateral Raise', 'Tricep Extension')
    LIMIT 5
  LOOP
    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, sets, reps, rest_time, exercise_order, day,
      exercise_name, exercise_image_url, exercise_equipment, exercise_difficulty
    )
    SELECT 
      workout_id_push_pull_legs,
      exercise_record.id,
      CASE 
        WHEN e.name = 'Bench Press' THEN 4
        WHEN e.name = 'Incline Dumbbell Press' THEN 3
        WHEN e.name = 'Shoulder Press' THEN 4
        WHEN e.name = 'Lateral Raise' THEN 3
        WHEN e.name = 'Tricep Extension' THEN 3
        ELSE 3
      END,
      CASE 
        WHEN e.name = 'Bench Press' THEN '10,8,6,6'
        WHEN e.name = 'Incline Dumbbell Press' THEN '12,10,8'
        WHEN e.name = 'Shoulder Press' THEN '10,8,6,6'
        WHEN e.name = 'Lateral Raise' THEN '12,10,10'
        WHEN e.name = 'Tricep Extension' THEN '12,10,8'
        ELSE '10'
      END,
      CASE 
        WHEN e.name IN ('Bench Press', 'Shoulder Press') THEN 90
        ELSE 60
      END,
      CASE 
        WHEN e.name = 'Bench Press' THEN 0
        WHEN e.name = 'Incline Dumbbell Press' THEN 1
        WHEN e.name = 'Shoulder Press' THEN 2
        WHEN e.name = 'Lateral Raise' THEN 3
        WHEN e.name = 'Tricep Extension' THEN 4
        ELSE 0
      END,
      1, -- Day 1
      e.name,
      e.image_url,
      COALESCE(e.equipment, ARRAY[]::TEXT[]),
      COALESCE(e.difficulty, 'Intermediate')
    FROM public.exercises e
    WHERE e.id = exercise_record.id;
  END LOOP;

  -- Day 2: Pull Day (Back, Biceps)
  FOR exercise_record IN 
    SELECT id FROM public.exercises 
    WHERE name IN ('Pull Up', 'Barbell Rows', 'Bicep Curl', 'Chest Fly')
    LIMIT 4
  LOOP
    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, sets, reps, rest_time, exercise_order, day,
      exercise_name, exercise_image_url, exercise_equipment, exercise_difficulty
    )
    SELECT 
      workout_id_push_pull_legs,
      exercise_record.id,
      CASE 
        WHEN e.name = 'Pull Up' THEN 4
        WHEN e.name = 'Barbell Rows' THEN 4
        WHEN e.name = 'Bicep Curl' THEN 3
        WHEN e.name = 'Chest Fly' THEN 3
        ELSE 3
      END,
      CASE 
        WHEN e.name = 'Pull Up' THEN '10,8,6,6'
        WHEN e.name = 'Barbell Rows' THEN '10,8,8,6'
        WHEN e.name = 'Bicep Curl' THEN '12,10,8'
        WHEN e.name = 'Chest Fly' THEN '12,10,10'
        ELSE '10'
      END,
      CASE 
        WHEN e.name IN ('Pull Up', 'Barbell Rows') THEN 90
        ELSE 60
      END,
      CASE 
        WHEN e.name = 'Pull Up' THEN 0
        WHEN e.name = 'Barbell Rows' THEN 1
        WHEN e.name = 'Bicep Curl' THEN 2
        WHEN e.name = 'Chest Fly' THEN 3
        ELSE 0
      END,
      2, -- Day 2
      e.name,
      e.image_url,
      COALESCE(e.equipment, ARRAY[]::TEXT[]),
      COALESCE(e.difficulty, 'Intermediate')
    FROM public.exercises e
    WHERE e.id = exercise_record.id;
  END LOOP;

  -- Day 3: Legs Day
  FOR exercise_record IN 
    SELECT id FROM public.exercises 
    WHERE name IN ('Squat', 'Deadlift', 'Leg Press')
    LIMIT 3
  LOOP
    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, sets, reps, rest_time, exercise_order, day,
      exercise_name, exercise_image_url, exercise_equipment, exercise_difficulty
    )
    SELECT 
      workout_id_push_pull_legs,
      exercise_record.id,
      CASE 
        WHEN e.name = 'Squat' THEN 5
        WHEN e.name = 'Deadlift' THEN 3
        WHEN e.name = 'Leg Press' THEN 4
        ELSE 3
      END,
      CASE 
        WHEN e.name = 'Squat' THEN '8,6,5,5,5'
        WHEN e.name = 'Deadlift' THEN '5,5,5'
        WHEN e.name = 'Leg Press' THEN '12,10,8,8'
        ELSE '10'
      END,
      CASE 
        WHEN e.name = 'Squat' THEN 180
        WHEN e.name = 'Deadlift' THEN 240
        WHEN e.name = 'Leg Press' THEN 90
        ELSE 60
      END,
      CASE 
        WHEN e.name = 'Squat' THEN 0
        WHEN e.name = 'Deadlift' THEN 1
        WHEN e.name = 'Leg Press' THEN 2
        ELSE 0
      END,
      3, -- Day 3
      e.name,
      e.image_url,
      COALESCE(e.equipment, ARRAY[]::TEXT[]),
      COALESCE(e.difficulty, 'Intermediate')
    FROM public.exercises e
    WHERE e.id = exercise_record.id;
  END LOOP;

  -- ============================================
  -- Upper/Lower Split (Beginner)
  -- ============================================
  INSERT INTO public.workouts (id, user_id, name, difficulty, image_url, workout_type, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    NULL,
    'Upper/Lower Split',
    'Beginner',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    'native',
    NOW(),
    NOW()
  )
  RETURNING id INTO workout_id_upper_lower;

  -- Day 1: Upper Body
  FOR exercise_record IN 
    SELECT id FROM public.exercises 
    WHERE name IN ('Bench Press', 'Barbell Rows', 'Shoulder Press', 'Pull Up', 'Bicep Curl')
    LIMIT 5
  LOOP
    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, sets, reps, rest_time, exercise_order, day,
      exercise_name, exercise_image_url, exercise_equipment, exercise_difficulty
    )
    SELECT 
      workout_id_upper_lower,
      exercise_record.id,
      3,
      '12,10,8',
      60,
      CASE 
        WHEN e.name = 'Bench Press' THEN 0
        WHEN e.name = 'Barbell Rows' THEN 1
        WHEN e.name = 'Shoulder Press' THEN 2
        WHEN e.name = 'Pull Up' THEN 3
        WHEN e.name = 'Bicep Curl' THEN 4
        ELSE 0
      END,
      1, -- Day 1
      e.name,
      e.image_url,
      COALESCE(e.equipment, ARRAY[]::TEXT[]),
      COALESCE(e.difficulty, 'Beginner')
    FROM public.exercises e
    WHERE e.id = exercise_record.id;
  END LOOP;

  -- Day 2: Lower Body
  FOR exercise_record IN 
    SELECT id FROM public.exercises 
    WHERE name IN ('Squat', 'Leg Press', 'Deadlift')
    LIMIT 3
  LOOP
    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, sets, reps, rest_time, exercise_order, day,
      exercise_name, exercise_image_url, exercise_equipment, exercise_difficulty
    )
    SELECT 
      workout_id_upper_lower,
      exercise_record.id,
      CASE 
        WHEN e.name = 'Squat' THEN 4
        WHEN e.name = 'Leg Press' THEN 3
        WHEN e.name = 'Deadlift' THEN 3
        ELSE 3
      END,
      CASE 
        WHEN e.name = 'Squat' THEN '10,8,6,6'
        WHEN e.name = 'Leg Press' THEN '12,10,8'
        WHEN e.name = 'Deadlift' THEN '8,6,5'
        ELSE '10'
      END,
      CASE 
        WHEN e.name = 'Squat' THEN 120
        WHEN e.name = 'Deadlift' THEN 180
        WHEN e.name = 'Leg Press' THEN 90
        ELSE 60
      END,
      CASE 
        WHEN e.name = 'Squat' THEN 0
        WHEN e.name = 'Leg Press' THEN 1
        WHEN e.name = 'Deadlift' THEN 2
        ELSE 0
      END,
      2, -- Day 2
      e.name,
      e.image_url,
      COALESCE(e.equipment, ARRAY[]::TEXT[]),
      COALESCE(e.difficulty, 'Beginner')
    FROM public.exercises e
    WHERE e.id = exercise_record.id;
  END LOOP;

  -- ============================================
  -- Bro Split (Advanced) - 5 Days
  -- ============================================
  INSERT INTO public.workouts (id, user_id, name, difficulty, image_url, workout_type, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    NULL,
    'Bro Split (5-Day)',
    'Advanced',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
    'native',
    NOW(),
    NOW()
  )
  RETURNING id INTO workout_id_bro_split;

  -- Day 1: Chest
  FOR exercise_record IN 
    SELECT id FROM public.exercises 
    WHERE name IN ('Bench Press', 'Incline Dumbbell Press', 'Chest Fly')
    LIMIT 3
  LOOP
    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, sets, reps, rest_time, exercise_order, day,
      exercise_name, exercise_image_url, exercise_equipment, exercise_difficulty
    )
    SELECT 
      workout_id_bro_split,
      exercise_record.id,
      CASE 
        WHEN e.name = 'Bench Press' THEN 5
        WHEN e.name = 'Incline Dumbbell Press' THEN 4
        WHEN e.name = 'Chest Fly' THEN 3
        ELSE 3
      END,
      CASE 
        WHEN e.name = 'Bench Press' THEN '8,6,5,5,4'
        WHEN e.name = 'Incline Dumbbell Press' THEN '10,8,6,6'
        WHEN e.name = 'Chest Fly' THEN '12,10,8'
        ELSE '10'
      END,
      90,
      CASE 
        WHEN e.name = 'Bench Press' THEN 0
        WHEN e.name = 'Incline Dumbbell Press' THEN 1
        WHEN e.name = 'Chest Fly' THEN 2
        ELSE 0
      END,
      1, -- Day 1: Chest
      e.name,
      e.image_url,
      COALESCE(e.equipment, ARRAY[]::TEXT[]),
      COALESCE(e.difficulty, 'Advanced')
    FROM public.exercises e
    WHERE e.id = exercise_record.id;
  END LOOP;

  -- Day 2: Back
  FOR exercise_record IN 
    SELECT id FROM public.exercises 
    WHERE name IN ('Deadlift', 'Barbell Rows', 'Pull Up')
    LIMIT 3
  LOOP
    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, sets, reps, rest_time, exercise_order, day,
      exercise_name, exercise_image_url, exercise_equipment, exercise_difficulty
    )
    SELECT 
      workout_id_bro_split,
      exercise_record.id,
      CASE 
        WHEN e.name = 'Deadlift' THEN 4
        WHEN e.name = 'Barbell Rows' THEN 5
        WHEN e.name = 'Pull Up' THEN 4
        ELSE 3
      END,
      CASE 
        WHEN e.name = 'Deadlift' THEN '5,5,4,3'
        WHEN e.name = 'Barbell Rows' THEN '8,6,6,5,4'
        WHEN e.name = 'Pull Up' THEN '10,8,6,6'
        ELSE '10'
      END,
      CASE 
        WHEN e.name = 'Deadlift' THEN 240
        ELSE 90
      END,
      CASE 
        WHEN e.name = 'Deadlift' THEN 0
        WHEN e.name = 'Barbell Rows' THEN 1
        WHEN e.name = 'Pull Up' THEN 2
        ELSE 0
      END,
      2, -- Day 2: Back
      e.name,
      e.image_url,
      COALESCE(e.equipment, ARRAY[]::TEXT[]),
      COALESCE(e.difficulty, 'Advanced')
    FROM public.exercises e
    WHERE e.id = exercise_record.id;
  END LOOP;

  -- Day 3: Shoulders
  FOR exercise_record IN 
    SELECT id FROM public.exercises 
    WHERE name IN ('Shoulder Press', 'Lateral Raise')
    LIMIT 2
  LOOP
    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, sets, reps, rest_time, exercise_order, day,
      exercise_name, exercise_image_url, exercise_equipment, exercise_difficulty
    )
    SELECT 
      workout_id_bro_split,
      exercise_record.id,
      CASE 
        WHEN e.name = 'Shoulder Press' THEN 5
        WHEN e.name = 'Lateral Raise' THEN 4
        ELSE 3
      END,
      CASE 
        WHEN e.name = 'Shoulder Press' THEN '8,6,6,5,4'
        WHEN e.name = 'Lateral Raise' THEN '12,10,10,8'
        ELSE '10'
      END,
      75,
      CASE 
        WHEN e.name = 'Shoulder Press' THEN 0
        WHEN e.name = 'Lateral Raise' THEN 1
        ELSE 0
      END,
      3, -- Day 3: Shoulders
      e.name,
      e.image_url,
      COALESCE(e.equipment, ARRAY[]::TEXT[]),
      COALESCE(e.difficulty, 'Advanced')
    FROM public.exercises e
    WHERE e.id = exercise_record.id;
  END LOOP;

  -- Day 4: Arms
  FOR exercise_record IN 
    SELECT id FROM public.exercises 
    WHERE name IN ('Bicep Curl', 'Tricep Extension')
    LIMIT 2
  LOOP
    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, sets, reps, rest_time, exercise_order, day,
      exercise_name, exercise_image_url, exercise_equipment, exercise_difficulty
    )
    SELECT 
      workout_id_bro_split,
      exercise_record.id,
      4,
      CASE 
        WHEN e.name = 'Bicep Curl' THEN '12,10,8,6'
        WHEN e.name = 'Tricep Extension' THEN '12,10,8,6'
        ELSE '10'
      END,
      60,
      CASE 
        WHEN e.name = 'Bicep Curl' THEN 0
        WHEN e.name = 'Tricep Extension' THEN 1
        ELSE 0
      END,
      4, -- Day 4: Arms
      e.name,
      e.image_url,
      COALESCE(e.equipment, ARRAY[]::TEXT[]),
      COALESCE(e.difficulty, 'Advanced')
    FROM public.exercises e
    WHERE e.id = exercise_record.id;
  END LOOP;

  -- Day 5: Legs
  FOR exercise_record IN 
    SELECT id FROM public.exercises 
    WHERE name IN ('Squat', 'Leg Press')
    LIMIT 2
  LOOP
    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, sets, reps, rest_time, exercise_order, day,
      exercise_name, exercise_image_url, exercise_equipment, exercise_difficulty
    )
    SELECT 
      workout_id_bro_split,
      exercise_record.id,
      CASE 
        WHEN e.name = 'Squat' THEN 5
        WHEN e.name = 'Leg Press' THEN 4
        ELSE 3
      END,
      CASE 
        WHEN e.name = 'Squat' THEN '8,6,5,5,4'
        WHEN e.name = 'Leg Press' THEN '12,10,8,8'
        ELSE '10'
      END,
      CASE 
        WHEN e.name = 'Squat' THEN 180
        WHEN e.name = 'Leg Press' THEN 90
        ELSE 60
      END,
      CASE 
        WHEN e.name = 'Squat' THEN 0
        WHEN e.name = 'Leg Press' THEN 1
        ELSE 0
      END,
      5, -- Day 5: Legs
      e.name,
      e.image_url,
      COALESCE(e.equipment, ARRAY[]::TEXT[]),
      COALESCE(e.difficulty, 'Advanced')
    FROM public.exercises e
    WHERE e.id = exercise_record.id;
  END LOOP;

END $$;

