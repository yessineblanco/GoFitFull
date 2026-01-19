# Admin Role Setup Guide

This guide explains how to set up admin roles for the GoFit admin panel.

## Overview

The admin role system allows designated users to access the admin panel with elevated privileges to manage:
- Users and their profiles
- Exercise library
- Native workouts
- System settings

## Step 1: Run the Migration

1. Open your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `database/migrations/add_admin_role.sql`
5. Click **Run** to execute the migration

## Step 2: Verify the Migration

Run this query to verify the `is_admin` column was added:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'is_admin';
```

Expected result:
```
column_name | data_type | column_default
is_admin    | boolean   | false
```

## Step 3: Create Your First Admin User

### Option A: By User ID

If you know your user ID:

```sql
UPDATE public.user_profiles 
SET is_admin = true 
WHERE id = 'your-user-id-here';
```

### Option B: By Email

If you know your email:

```sql
UPDATE public.user_profiles 
SET is_admin = true 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com'
);
```

### Option C: Find Your User ID First

1. Log into the mobile app with your account
2. Run this query to find your user ID:

```sql
SELECT u.id, u.email, up.display_name, up.is_admin
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
ORDER BY u.created_at DESC
LIMIT 10;
```

3. Copy your user ID and use Option A above

## Step 4: Verify Admin Status

Check that your user is now an admin:

```sql
SELECT u.email, up.is_admin, up.created_at
FROM public.user_profiles up
JOIN auth.users u ON up.id = u.id
WHERE up.is_admin = true;
```

## What Was Created

### 1. Database Column
- `user_profiles.is_admin` - Boolean flag (default: false)

### 2. Helper Functions
- `is_admin()` - Returns true if current user is admin
- `get_admin_user_ids()` - Returns list of all admin user IDs

### 3. RLS Policies
- Admins can view all user profiles
- Admins can update any user profile
- Regular users can still only see/update their own

### 4. Audit Log Table
- `admin_audit_log` - Tracks all admin actions
- Includes: action, resource, details, timestamp, IP address

### 5. Indexes
- `idx_user_profiles_is_admin` - Fast admin lookups
- Audit log indexes for performance

## Security Considerations

### ⚠️ Important Security Notes

1. **Protect Service Role Key**: Never commit the service role key to git
2. **Limit Admin Users**: Only grant admin to trusted users
3. **Monitor Audit Logs**: Regularly review admin actions
4. **Use HTTPS**: Always access admin panel over HTTPS
5. **Enable MFA**: Require 2FA for admin users (planned feature)

### Admin Capabilities

Admins can:
- ✅ View all user profiles and workout data
- ✅ Create, edit, and delete exercises
- ✅ Create, edit, and delete native workouts
- ✅ Promote other users to admin
- ✅ Delete user accounts
- ✅ View audit logs

Admins cannot:
- ❌ Access user passwords (encrypted by Supabase Auth)
- ❌ Bypass RLS for critical operations (enforced at database level)

## Adding More Admins

Once you have access to the admin panel, you can promote other users through the UI. Alternatively, run:

```sql
-- Promote user to admin
UPDATE public.user_profiles 
SET is_admin = true 
WHERE id = 'user-id-to-promote';

-- Demote admin to regular user
UPDATE public.user_profiles 
SET is_admin = false 
WHERE id = 'user-id-to-demote';
```

## Troubleshooting

### Issue: "Column is_admin does not exist"
**Solution**: Run the migration again. Ensure you're connected to the correct Supabase project.

### Issue: "Function is_admin does not exist"
**Solution**: The function creation failed. Check the SQL Editor for error messages and re-run the migration.

### Issue: Admin user can't access certain data
**Solution**: Check RLS policies are properly set. Run:
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('user_profiles', 'exercises', 'workouts');
```

### Issue: Can't log into admin panel
**Solution**: 
1. Verify `is_admin = true` for your user
2. Check browser console for errors
3. Ensure environment variables are set correctly in `.env.local`
4. Clear cookies and try again

## Next Steps

After completing this setup:

1. ✅ Test logging into the admin panel
2. ✅ Verify you can view users list
3. ✅ Test creating an exercise
4. ✅ Test creating a native workout
5. ✅ Review audit logs

## Rolling Back (Emergency Only)

If you need to remove admin functionality:

```sql
-- Remove admin column
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS is_admin;

-- Drop functions
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.get_admin_user_ids();

-- Drop audit log
DROP TABLE IF EXISTS public.admin_audit_log;

-- Remove policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.user_profiles;
```

⚠️ **Warning**: This will permanently remove all admin functionality and audit logs!

## Support

For issues or questions:
1. Check the [Admin Panel Documentation](../Admin-panel/README.md)
2. Review [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
3. Check audit logs for error details
