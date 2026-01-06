-- Verify Database Indexes
-- Run this query to see all indexes on user_profiles table

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
ORDER BY indexname;

