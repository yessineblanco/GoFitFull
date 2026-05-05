-- Migration: Seed starter native workouts for wellness categories
-- Date: 2026-05-05
-- Purpose: Ensure each wellness filter has usable starter content.

DO $$
DECLARE
  plan RECORD;
  target_workout_id UUID;
  exercise_index INTEGER;
  exercise_record RECORD;
BEGIN
  CREATE TEMP TABLE tmp_wellness_native_workouts (
    name TEXT,
    difficulty TEXT,
    wellness_category TEXT,
    image_url TEXT,
    exercise_names TEXT[],
    sets INTEGER[],
    reps TEXT[],
    rest_times INTEGER[]
  ) ON COMMIT DROP;

  INSERT INTO tmp_wellness_native_workouts
    (name, difficulty, wellness_category, image_url, exercise_names, sets, reps, rest_times)
  VALUES
    (
      'Mobility Reset',
      'Beginner',
      'mobility',
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
      ARRAY['Lateral Raise', 'Chest Fly', 'Squat'],
      ARRAY[2, 2, 2],
      ARRAY['12', '12', '10'],
      ARRAY[45, 45, 60]
    ),
    (
      'Balance and Core Basics',
      'Beginner',
      'balance_core',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800',
      ARRAY['Squat', 'Leg Press', 'Shoulder Press'],
      ARRAY[3, 3, 2],
      ARRAY['10', '12', '10'],
      ARRAY[60, 60, 60]
    ),
    (
      'Older Adult Strength Start',
      'Beginner',
      'older_adult',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      ARRAY['Leg Press', 'Chest Fly', 'Bicep Curl', 'Lateral Raise'],
      ARRAY[2, 2, 2, 2],
      ARRAY['10', '10', '12', '12'],
      ARRAY[75, 60, 45, 45]
    ),
    (
      'Functional Fitness Starter',
      'Intermediate',
      'functional_fitness',
      'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800',
      ARRAY['Squat', 'Bench Press', 'Pull Up', 'Deadlift'],
      ARRAY[3, 3, 3, 3],
      ARRAY['8', '8', '8', '6'],
      ARRAY[90, 90, 90, 120]
    ),
    (
      'Recovery Strength Flow',
      'Beginner',
      'recovery',
      'https://images.unsplash.com/photo-1540206276207-3af25c08abc4?w=800',
      ARRAY['Chest Fly', 'Lateral Raise', 'Bicep Curl', 'Leg Press'],
      ARRAY[2, 2, 2, 2],
      ARRAY['12', '12', '12', '10'],
      ARRAY[60, 45, 45, 75]
    ),
    (
      'Stress Reduction Circuit',
      'Beginner',
      'stress_reduction',
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
      ARRAY['Squat', 'Chest Fly', 'Lateral Raise', 'Tricep Extension'],
      ARRAY[2, 2, 2, 2],
      ARRAY['10', '12', '12', '12'],
      ARRAY[60, 45, 45, 45]
    );

  FOR plan IN SELECT * FROM tmp_wellness_native_workouts LOOP
    SELECT id INTO target_workout_id
    FROM public.workouts
    WHERE user_id IS NULL
      AND workout_type = 'native'
      AND name = plan.name
    LIMIT 1;

    IF target_workout_id IS NULL THEN
      INSERT INTO public.workouts (
        id,
        user_id,
        name,
        difficulty,
        image_url,
        workout_type,
        wellness_category,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        NULL,
        plan.name,
        plan.difficulty,
        plan.image_url,
        'native',
        plan.wellness_category,
        NOW(),
        NOW()
      )
      RETURNING id INTO target_workout_id;
    ELSE
      UPDATE public.workouts
      SET wellness_category = plan.wellness_category,
          updated_at = NOW()
      WHERE id = target_workout_id;
    END IF;

    FOR exercise_index IN 1..array_length(plan.exercise_names, 1) LOOP
      SELECT *
      INTO exercise_record
      FROM public.exercises
      WHERE name = plan.exercise_names[exercise_index]
      LIMIT 1;

      IF exercise_record.id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.workout_exercises
        WHERE workout_id = target_workout_id
          AND exercise_id = exercise_record.id
          AND exercise_order = exercise_index - 1
      ) THEN
        INSERT INTO public.workout_exercises (
          workout_id,
          exercise_id,
          sets,
          reps,
          rest_time,
          exercise_order,
          day,
          exercise_name,
          exercise_image_url,
          exercise_equipment,
          exercise_difficulty
        )
        VALUES (
          target_workout_id,
          exercise_record.id,
          plan.sets[exercise_index],
          plan.reps[exercise_index],
          plan.rest_times[exercise_index],
          exercise_index - 1,
          1,
          exercise_record.name,
          exercise_record.image_url,
          COALESCE(exercise_record.equipment, ARRAY[]::TEXT[]),
          COALESCE(exercise_record.difficulty, plan.difficulty)
        );
      END IF;
    END LOOP;

    target_workout_id := NULL;
  END LOOP;
END $$;
