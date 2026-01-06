-- Migration: Add notification_preferences column to user_profiles table
-- This column stores JSON data with user's notification preferences

-- Add notification_preferences column as JSONB (if using PostgreSQL)
-- For SQLite, use TEXT instead
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "workout_reminders": true,
  "achievement_notifications": true,
  "weekly_progress_reports": true,
  "notification_time": "09:00"
}'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN user_profiles.notification_preferences IS 'User notification preferences stored as JSON: {workout_reminders: boolean, achievement_notifications: boolean, weekly_progress_reports: boolean, notification_time: string (HH:MM format)}';



