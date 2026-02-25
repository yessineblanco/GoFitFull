# Database Migration Fix - Column Name Correction

## ❌ Issue Found

The migration script was using `user_id` as the column name, but the actual `user_profiles` table uses `id` as the primary key column.

**Error:**
```
ERROR: 42703: column "user_id" does not exist
```

## ✅ What Was Fixed

Changed all references from `user_id` to `id` in:

### 1. Database Migration (`database/migrations/add_admin_role.sql`)
- ✅ `is_admin()` function - now uses `WHERE id = auth.uid()`
- ✅ `get_admin_user_ids()` function - now returns `up.id as user_id`
- ✅ RLS policy "Admins can view all profiles" - now uses `auth.uid() = id`
- ✅ Comments about creating first admin user

### 2. Setup Documentation (`database/ADMIN_ROLE_SETUP.md`)
- ✅ All `UPDATE` statements to set admin status
- ✅ All `SELECT` queries for verification
- ✅ JOIN clauses in example queries

### 3. Admin Panel Code
- ✅ `admin-panel/types/database.ts` - UserProfile interface now uses `id`
- ✅ `admin-panel/lib/supabase/admin.ts` - isUserAdmin function
- ✅ `admin-panel/middleware.ts` - All profile queries
- ✅ `admin-panel/app/login/page.tsx` - Admin check query

### 4. Quick Start Guide (`QUICK_START.md`)
- ✅ Admin user creation command
- ✅ Verification query

## 📊 Correct Table Structure

```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- other columns...
  is_admin BOOLEAN DEFAULT false NOT NULL
);
```

**Key point:** The primary key is `id`, not `user_id`.

## 🚀 Ready to Run

The migration is now fixed and ready to use! Run it in your Supabase SQL Editor:

```sql
-- Copy and paste: database/migrations/add_admin_role.sql
-- Click "Run"
```

## 📝 To Create Your First Admin

```sql
-- Replace with your email
UPDATE public.user_profiles 
SET is_admin = true 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

## ✅ Verify It Worked

```sql
SELECT u.email, up.is_admin 
FROM user_profiles up 
JOIN auth.users u ON up.id = u.id 
WHERE up.is_admin = true;
```

You should see your email with `is_admin = true`.

## 🎯 Next Steps

1. Run the fixed migration
2. Create your admin user
3. Start the admin panel: `cd admin-panel && npm run dev`
4. Login at http://localhost:3000

Everything should work now! ✨
