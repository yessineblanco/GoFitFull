-- Migration: Add profile_picture_url column to user_profiles table
-- Run this in your Supabase SQL Editor

-- Add profile_picture_url column
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN user_profiles.profile_picture_url IS 'URL of the user profile picture stored in Supabase Storage';


