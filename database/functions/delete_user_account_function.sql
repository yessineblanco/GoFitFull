-- ============================================
-- Delete User Account Function
-- ============================================
-- This function permanently deletes a user's account and all associated data.
-- 
-- WHERE TO RUN THIS:
-- 1. Go to your Supabase Dashboard (https://app.supabase.com)
-- 2. Select your project
-- 3. Go to "SQL Editor" in the left sidebar
-- 4. Click "New Query"
-- 5. Paste this entire file content
-- 6. Click "Run" or press Ctrl+Enter
--
-- IMPORTANT NOTES:
-- - This function uses SECURITY DEFINER, which means it runs with the privileges
--   of the function creator (usually the postgres superuser)
-- - The function will delete the user from auth.users table (requires proper permissions)
-- - Make sure to add DELETE statements for any other tables that store user data
-- - Test this function in a development environment first!
-- ============================================

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get the current authenticated user's ID
  user_id := auth.uid();
  
  -- Check if user is authenticated
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to delete account';
  END IF;

  -- Delete user data from user_profiles table
  DELETE FROM user_profiles WHERE id = user_id;
  
  -- Add other table deletions as needed
  -- Example: DELETE FROM workout_history WHERE user_id = user_id;
  -- Example: DELETE FROM progress_records WHERE user_id = user_id;
  -- Example: DELETE FROM achievements WHERE user_id = user_id;
  
  -- Delete the auth user
  -- Note: This requires the function to have proper permissions
  -- If this fails, you may need to use Supabase Admin API instead
  DELETE FROM auth.users WHERE id = user_id;
  
  -- Log the deletion (optional - if you have an audit table)
  -- INSERT INTO account_deletions (user_id, deleted_at) VALUES (user_id, NOW());
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE EXCEPTION 'Error deleting user account: %', SQLERRM;
END;
$$;

-- ============================================
-- Grant execute permission to authenticated users
-- ============================================
-- This allows authenticated users to call the function
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- ============================================
-- Optional: Create a policy to allow users to delete their own account
-- ============================================
-- If you want to add RLS (Row Level Security) policies, you can do so here
-- For now, the function handles security by checking auth.uid()

-- ============================================
-- Test the function (optional - remove in production)
-- ============================================
-- To test, you can call it like this:
-- SELECT delete_user_account();
-- 
-- WARNING: This will delete the currently authenticated user's account!


