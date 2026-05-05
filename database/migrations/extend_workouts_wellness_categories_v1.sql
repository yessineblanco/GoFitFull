-- Migration: Extend workouts with wellness program categories
-- Date: 2026-05-05
-- Purpose: Support filterable wellness program categories in the workout library.

ALTER TABLE public.workouts
ADD COLUMN IF NOT EXISTS wellness_category TEXT NOT NULL DEFAULT 'strength';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workouts_wellness_category_check'
      AND conrelid = 'public.workouts'::regclass
  ) THEN
    ALTER TABLE public.workouts
    ADD CONSTRAINT workouts_wellness_category_check
    CHECK (
      wellness_category IN (
        'strength',
        'mobility',
        'balance_core',
        'beginner_strength',
        'older_adult',
        'functional_fitness',
        'recovery',
        'stress_reduction'
      )
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workouts_type_wellness_category
ON public.workouts (workout_type, wellness_category);

UPDATE public.workouts
SET wellness_category = CASE
  WHEN difficulty = 'Beginner' THEN 'beginner_strength'
  WHEN name ILIKE '%full body%' THEN 'functional_fitness'
  WHEN name ILIKE '%core%' THEN 'balance_core'
  WHEN name ILIKE '%mobility%' THEN 'mobility'
  WHEN name ILIKE '%recovery%' THEN 'recovery'
  ELSE 'strength'
END
WHERE wellness_category = 'strength';
