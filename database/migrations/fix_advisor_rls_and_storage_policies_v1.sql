-- Safe advisor remediations that preserve current client workflows.

-- Workout statistics are generated internally. Authenticated users may read
-- only the rows generated for their own account.
DROP POLICY IF EXISTS "Users can view own workout session stats" ON public.workout_session_stats;
CREATE POLICY "Users can view own workout session stats"
  ON public.workout_session_stats
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Audit logs and admin notifications are inserted with the server-only admin
-- client. The service role bypasses RLS, so permissive insert policies and
-- client insert privileges are unnecessary.
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.admin_notifications;
REVOKE INSERT ON public.admin_audit_logs FROM anon, authenticated;
REVOKE INSERT ON public.admin_notifications FROM anon, authenticated;

-- Public buckets serve public object URLs without a broad storage.objects
-- SELECT policy. Keep owner-only SELECT for upload upsert support.
DROP POLICY IF EXISTS "Public read access to profile pictures" ON storage.objects;

DROP POLICY IF EXISTS "Users can read their own profile picture object" ON storage.objects;
CREATE POLICY "Users can read their own profile picture object"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-pictures'
    AND name = ((SELECT auth.uid())::text || '.jpg')
  );

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
