-- Allow authenticated users to insert notifications (for in-app notification creation on actions)
CREATE POLICY "Users can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

GRANT INSERT ON public.notifications TO authenticated;
