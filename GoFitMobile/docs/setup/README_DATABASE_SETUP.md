# Database Setup for GoFit

## Overview
The GoFit app requires a `user_profiles` table in Supabase to store user onboarding data (weight, height, goal).

## Quick Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `create_user_profiles_table.sql`
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

### Option 2: Using Supabase CLI

```bash
supabase db push
```

## What the Script Creates

The SQL script creates:

1. **`user_profiles` table** with the following columns:
   - `id` (UUID, primary key, references `auth.users`)
   - `weight` (numeric, stored in kg)
   - `weight_unit` (text: 'kg' or 'lb')
   - `height` (numeric, stored in cm)
   - `height_unit` (text: 'cm' or 'inches')
   - `goal` (text)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

2. **Row Level Security (RLS) policies**:
   - Users can only view their own profile
   - Users can only insert their own profile
   - Users can only update their own profile

3. **Automatic timestamp updates**:
   - `updated_at` is automatically updated when a row is modified

## Verification

After running the script, verify the table was created:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see `user_profiles` in the list of tables
3. Click on it to view the structure

## Troubleshooting

### Error: "Could not find the table 'public.user_profiles'"

This means the table hasn't been created yet. Run the SQL script above.

### Error: "permission denied for table user_profiles"

This means RLS policies are blocking access. Make sure:
1. The user is authenticated
2. The RLS policies were created correctly
3. The user ID matches the profile ID

### App Works Without Database

The app is designed to work even if the database table doesn't exist. Onboarding will complete successfully, but data won't be saved to the database. This is intentional for development/testing purposes.

## Next Steps

Once the table is created:
- Onboarding data will be automatically saved when users complete onboarding
- Data will be stored in standardized units (kg and cm)
- Original units (lb/inches) are preserved for display purposes

