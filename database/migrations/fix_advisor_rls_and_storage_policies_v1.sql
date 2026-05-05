-- Fix Supabase advisor warnings that can be remediated without changing the
-- intended client workflows.

-- 1) Give workout_session_stats at least an owner-read policy. Writes remain
-- internal/service-side unless separately granted later.
DROP POLICY IF EXISTS "Users can view own workout session stats" ON public.workout_session_stats;
CREATE POLICY "Users can view own workout session stats"
  ON public.workout_session_stats
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 2) Replace broad service-role insert policies with explicit role checks.
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Service role can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.admin_notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.admin_notifications
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 3) Remove public listing from the public profile-pictures bucket. Public URL
-- reads still work for public buckets; object listing no longer does.
DROP POLICY IF EXISTS "Public read access to profile pictures" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload their own profile picture" ON storage.objects;
CREATE POLICY "Users can upload their own profile picture"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND name = ((SELECT auth.uid())::text || '.jpg')
  );

DROP POLICY IF EXISTS "Users can update their own profile picture" ON storage.objects;
CREATE POLICY "Users can update their own profile picture"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures'
    AND name = ((SELECT auth.uid())::text || '.jpg')
  )
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND name = ((SELECT auth.uid())::text || '.jpg')
  );

DROP POLICY IF EXISTS "Users can delete their own profile picture" ON storage.objects;
CREATE POLICY "Users can delete their own profile picture"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures'
    AND name = ((SELECT auth.uid())::text || '.jpg')
  );

-- 4) Wrap auth.uid()/auth.role() calls to avoid per-row re-evaluation.
DROP POLICY IF EXISTS "Only authenticated users can manage exercises" ON public.exercises;
CREATE POLICY "Only authenticated users can manage exercises"
  ON public.exercises
  FOR ALL
  TO public
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Users can view own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can view own workout sessions"
  ON public.workout_sessions
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can insert own workout sessions"
  ON public.workout_sessions
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can update own workout sessions"
  ON public.workout_sessions
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can delete own workout sessions"
  ON public.workout_sessions
  FOR DELETE
  TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Coaches can view own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can view own profile"
  ON public.coach_profiles
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Coaches can insert own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can insert own profile"
  ON public.coach_profiles
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Coaches can update own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can update own profile"
  ON public.coach_profiles
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Coaches can view own certifications" ON public.coach_certifications;
CREATE POLICY "Coaches can view own certifications"
  ON public.coach_certifications
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_profiles
      WHERE coach_profiles.id = coach_certifications.coach_id
        AND coach_profiles.user_id = (SELECT auth.uid())
    )
  );

-- 5) Consolidate duplicate workout policies while preserving native/global and
-- custom/owner behavior.
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
  USING (user_id IS NULL OR user_id = (SELECT auth.uid()));

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

DROP POLICY IF EXISTS "Authenticated users can manage native workout exercises" ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can manage own custom workout exercises" ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can view workout exercises" ON public.workout_exercises;

CREATE POLICY "Users can view workout exercises"
  ON public.workout_exercises
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND (workouts.user_id IS NULL OR workouts.user_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "Users can insert workout exercises"
  ON public.workout_exercises
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND (
          (
            workouts.workout_type = 'native'
            AND workouts.user_id IS NULL
            AND (SELECT auth.role()) = 'authenticated'
          )
          OR (
            workouts.workout_type = 'custom'
            AND workouts.user_id = (SELECT auth.uid())
          )
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
      FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND (
          (
            workouts.workout_type = 'native'
            AND workouts.user_id IS NULL
            AND (SELECT auth.role()) = 'authenticated'
          )
          OR (
            workouts.workout_type = 'custom'
            AND workouts.user_id = (SELECT auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND (
          (
            workouts.workout_type = 'native'
            AND workouts.user_id IS NULL
            AND (SELECT auth.role()) = 'authenticated'
          )
          OR (
            workouts.workout_type = 'custom'
            AND workouts.user_id = (SELECT auth.uid())
          )
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
      FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND (
          (
            workouts.workout_type = 'native'
            AND workouts.user_id IS NULL
            AND (SELECT auth.role()) = 'authenticated'
          )
          OR (
            workouts.workout_type = 'custom'
            AND workouts.user_id = (SELECT auth.uid())
          )
        )
    )
  );
