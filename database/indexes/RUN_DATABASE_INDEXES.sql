-- Add Database Indexes for GoFit App
-- Copy and paste ONLY the SQL commands below into Supabase SQL Editor

-- Index on created_at for sorting and filtering by creation date
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at 
  ON public.user_profiles(created_at DESC);

-- Index on updated_at for sorting and filtering by last update
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at 
  ON public.user_profiles(updated_at DESC);

-- Composite index on (id, updated_at) for efficient user profile queries with sorting
CREATE INDEX IF NOT EXISTS idx_user_profiles_id_updated_at 
  ON public.user_profiles(id, updated_at DESC);

