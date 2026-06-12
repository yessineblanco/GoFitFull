-- Consolidate overlapping permissive policies without changing access rules.
-- Existing behavior is preserved:
-- - everyone may read native/global workouts and their own workouts;
-- - authenticated users may manage native/global workouts;
-- - users may manage workouts they own;
-- - workout exercise access follows the parent workout.

DROP POLICY IF EXISTS "Authenticated users can create native workouts" ON public.workouts;
DROP POLICY IF EXISTS "Authenticated users can update native workouts" ON public.workouts;
DROP POLICY IF EXISTS "Authenticated users can delete native workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can create own custom workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update own custom workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete own custom workouts" ON public.workouts;
DROP POLICY IF EXISTS "Insert workouts for logged-in user" ON public.workouts;
DROP POLICY IF EXISTS "Select own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can view workouts" ON public.workouts;

CREATE POLICY "Users can view workouts"
  ON public.workouts
  FOR SELECT
  TO public
  USING (
    user_id IS NULL
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "Users can insert workouts"
  ON public.workouts
  FOR INSERT
  TO public
  WITH CHECK (
    (
      workout_type = 'native'
      AND user_id IS NULL
      AND (SELECT auth.role()) = 'authenticated'
    )
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "Users can update workouts"
  ON public.workouts
  FOR UPDATE
  TO public
  USING (
    (
      workout_type = 'native'
      AND user_id IS NULL
      AND (SELECT auth.role()) = 'authenticated'
    )
    OR user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    (
      workout_type = 'native'
      AND user_id IS NULL
      AND (SELECT auth.role()) = 'authenticated'
    )
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "Users can delete workouts"
  ON public.workouts
  FOR DELETE
  TO public
  USING (
    (
      workout_type = 'native'
      AND user_id IS NULL
      AND (SELECT auth.role()) = 'authenticated'
    )
    OR user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can manage native workout exercises"
  ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can manage own custom workout exercises"
  ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can view workout exercises"
  ON public.workout_exercises;

CREATE POLICY "Users can view workout exercises"
  ON public.workout_exercises
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.workouts w
      WHERE w.id = workout_exercises.workout_id
        AND (
          w.user_id IS NULL
          OR w.user_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY "Users can insert workout exercises"
  ON public.workout_exercises
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workouts w
      WHERE w.id = workout_exercises.workout_id
        AND (
          (
            w.workout_type = 'native'
            AND w.user_id IS NULL
            AND (SELECT auth.role()) = 'authenticated'
          )
          OR w.user_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY "Users can update workout exercises"
  ON public.workout_exercises
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.workouts w
      WHERE w.id = workout_exercises.workout_id
        AND (
          (
            w.workout_type = 'native'
            AND w.user_id IS NULL
            AND (SELECT auth.role()) = 'authenticated'
          )
          OR w.user_id = (SELECT auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workouts w
      WHERE w.id = workout_exercises.workout_id
        AND (
          (
            w.workout_type = 'native'
            AND w.user_id IS NULL
            AND (SELECT auth.role()) = 'authenticated'
          )
          OR w.user_id = (SELECT auth.uid())
        )
    )
  );

CREATE POLICY "Users can delete workout exercises"
  ON public.workout_exercises
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.workouts w
      WHERE w.id = workout_exercises.workout_id
        AND (
          (
            w.workout_type = 'native'
            AND w.user_id IS NULL
            AND (SELECT auth.role()) = 'authenticated'
          )
          OR w.user_id = (SELECT auth.uid())
        )
    )
  );
