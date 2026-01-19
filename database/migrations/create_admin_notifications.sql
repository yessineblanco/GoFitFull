-- Create admin_notifications table for admin panel notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    href VARCHAR(255),
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_user_id ON public.admin_notifications(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON public.admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON public.admin_notifications(admin_user_id, read) WHERE read = false;

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can view their own notifications
CREATE POLICY "Admins can view own notifications"
    ON public.admin_notifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_admin = true
            AND admin_notifications.admin_user_id = auth.uid()
        )
    );

-- Service role can insert notifications (for API routes)
CREATE POLICY "Service role can insert notifications"
    ON public.admin_notifications
    FOR INSERT
    WITH CHECK (true);

-- Admins can update their own notifications (mark as read, delete)
CREATE POLICY "Admins can update own notifications"
    ON public.admin_notifications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_admin = true
            AND admin_notifications.admin_user_id = auth.uid()
        )
    );

-- Admins can delete their own notifications
CREATE POLICY "Admins can delete own notifications"
    ON public.admin_notifications
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_admin = true
            AND admin_notifications.admin_user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notifications TO authenticated;

COMMENT ON TABLE public.admin_notifications IS 'Notifications for admin panel users';
COMMENT ON COLUMN public.admin_notifications.type IS 'Type of notification: info, success, warning, or error';
COMMENT ON COLUMN public.admin_notifications.href IS 'Optional link to related page';
