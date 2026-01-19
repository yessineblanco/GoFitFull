-- Create admin_audit_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource_type ON public.admin_audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
    ON public.admin_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_admin = true
        )
    );

-- Service role can insert audit logs (for API routes)
CREATE POLICY "Service role can insert audit logs"
    ON public.admin_audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT INSERT ON public.admin_audit_logs TO authenticated;

COMMENT ON TABLE public.admin_audit_logs IS 'Tracks all admin actions for audit and security purposes';
COMMENT ON COLUMN public.admin_audit_logs.action IS 'The action performed (e.g., CREATE_EXERCISE, DELETE_USER, UPDATE_WORKOUT)';
COMMENT ON COLUMN public.admin_audit_logs.resource_type IS 'Type of resource affected (exercise, workout, user, etc.)';
COMMENT ON COLUMN public.admin_audit_logs.details IS 'Additional details about the action in JSON format';
