# Troubleshooting: Users Page Error

## Issue: "Error fetching profiles"

This error occurs when the admin panel can't access the `user_profiles` table. Here are the solutions:

---

## Solution 1: Run the RLS Policy Fix (RECOMMENDED)

I've created a migration to fix the Row Level Security policies.

### Steps:

1. **Open Supabase Dashboard** → SQL Editor

2. **Copy and run this file:**
   `database/migrations/fix_admin_rls_policies.sql`

3. **Restart your dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   cd admin-panel
   npm run dev
   ```

4. **Refresh the Users page**

This should fix the RLS policies to allow the service role key to access user_profiles.

---

## Solution 2: Check Environment Variables

The service role key might not be set correctly.

### Check your `.env.local` file:

```bash
cd admin-panel
# Open .env.local and verify:
```

**Required variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Get your service role key:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (⚠️ secret)
5. Paste it in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

### After updating `.env.local`:

```bash
# Restart the dev server
npm run dev
```

---

## Solution 3: Check Browser Console

The new code will output helpful debug information.

### View the console:

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Refresh the Users page
4. Look for messages:

**Expected output:**
```
Environment variables check: { SUPABASE_URL: true, SUPABASE_ANON_KEY: true, SERVICE_ROLE_KEY: true }
Found X auth users
Found Y profiles
```

**If you see:**
```
❌ SUPABASE_SERVICE_ROLE_KEY is not set
```

→ Go to Solution 2 above

**If you see:**
```
Error fetching profiles: { message: "...", code: "..." }
```

→ The error details will show what's wrong

---

## Solution 4: Temporarily Disable RLS (DEBUGGING ONLY)

**⚠️ WARNING: This removes all security! Only for testing!**

### In Supabase SQL Editor:

```sql
-- Temporarily disable RLS
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
```

### Test the Users page

If it works now, the issue is RLS policies. Run Solution 1 to fix them properly.

### Re-enable RLS:

```sql
-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
```

---

## Solution 5: Check if user_profiles Table Exists

### In Supabase SQL Editor:

```sql
-- Check if table exists
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid)
- `display_name` (text)
- `is_admin` (boolean)
- `created_at` (timestamp)
- ...other columns

**If you get no results:**

The `user_profiles` table doesn't exist. You need to run:
`database/schema/create_user_profiles_table.sql`

---

## What the Code Now Does

The users page will now:

1. ✅ Check environment variables are set
2. ✅ Show detailed error messages
3. ✅ Fall back to showing auth users even if profiles fail
4. ✅ Log helpful debug information
5. ✅ Display "No profile" for users without profile records

### Even if profiles fail, you'll see:

- ✅ Email addresses from auth.users
- ✅ "No profile" as display name
- ✅ Admin status as false (default)
- ✅ Creation dates

---

## Quick Diagnosis

### Check the browser console and look for:

**1. Environment Check:**
```
Environment variables check: { ... }
```
- All should be `true`
- If `SERVICE_ROLE_KEY: false` → Fix .env.local

**2. User Count:**
```
Found X auth users
```
- If 0 → No users registered yet
- If > 0 → Auth users exist ✅

**3. Profile Count:**
```
Found Y profiles
```
- If 0 → Profiles table empty or RLS blocking
- If > 0 → Everything working ✅

**4. Error Details:**
```
Error fetching profiles: { message: "...", code: "...", hint: "..." }
```
- Read the message for specific issue
- Common codes:
  - `42P01` → Table doesn't exist
  - `42501` → Permission denied (RLS issue)
  - `PGRST` → PostgREST/API error

---

## Most Common Fix

**90% of the time, it's one of these:**

1. ✅ **Missing service role key in .env.local**
   - Solution: Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

2. ✅ **RLS policies blocking service role**
   - Solution: Run `database/migrations/fix_admin_rls_policies.sql`

3. ✅ **Dev server needs restart**
   - Solution: Stop and restart `npm run dev`

---

## Still Having Issues?

If none of these work, check the console output and share:

1. Environment variables check result
2. Full error message with code
3. Number of auth users found
4. Any other error messages

The detailed logging will help pinpoint the exact issue!

---

## ✅ Success Indicators

You'll know it's working when:

- ✅ No errors in browser console
- ✅ Users page loads successfully
- ✅ See list of users with emails
- ✅ Admin badges show correctly
- ✅ All environment checks pass

---

**Try Solution 1 (RLS fix) first - it solves most issues!**
