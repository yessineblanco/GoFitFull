-- Add rest timer preferences to user_profiles table
-- This allows users to customize their rest timer behavior

DO $$ 
BEGIN
  -- Add rest_timer_preferences column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'rest_timer_preferences'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN rest_timer_preferences JSONB DEFAULT '{
      "audio_enabled": true,
      "haptics_enabled": true,
      "auto_advance": false,
      "warnings": [30, 10, 5],
      "default_rest_seconds": 60
    }'::jsonb;
    
    -- Add comment
    COMMENT ON COLUMN public.user_profiles.rest_timer_preferences IS 
    'User preferences for rest timer: audio, haptics, auto-advance, warning intervals, default rest time';
  END IF;
END $$;












