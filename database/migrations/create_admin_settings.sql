-- Create admin_settings table for storing platform settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON public.admin_settings(key);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can view and manage settings
CREATE POLICY "Admins can view all settings"
    ON public.admin_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can insert settings"
    ON public.admin_settings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can update settings"
    ON public.admin_settings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_admin = true
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated;

-- Add comment
COMMENT ON TABLE public.admin_settings IS 'Stores platform configuration and settings';
COMMENT ON COLUMN public.admin_settings.key IS 'Unique key for the setting (e.g., platform_settings)';
COMMENT ON COLUMN public.admin_settings.value IS 'JSON value containing the setting data';
