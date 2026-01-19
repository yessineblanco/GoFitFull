# Profile Pictures Storage Setup

This guide explains how to set up Supabase Storage for profile pictures.

## Step 1: Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Set the following:
   - **Name**: `profile-pictures`
   - **Public bucket**: ✅ Enable (check this box)
   - **File size limit**: `5 MB` (recommended)
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp`
5. Click **Create bucket**

## Step 2: Set Up Storage Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies:

### Policy 1: Allow authenticated users to upload their own profile pictures

```sql
-- Allow users to upload their own profile picture
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 2: Allow authenticated users to update their own profile pictures

```sql
-- Allow users to update their own profile picture
CREATE POLICY "Users can update their own profile picture"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 3: Allow authenticated users to delete their own profile pictures

```sql
-- Allow users to delete their own profile picture
CREATE POLICY "Users can delete their own profile picture"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 4: Allow public read access (since bucket is public)

```sql
-- Allow public read access to profile pictures
CREATE POLICY "Public read access to profile pictures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');
```

## Step 3: Add Database Column

Run the SQL migration file `add_profile_picture_column.sql` in your Supabase SQL Editor:

```bash
# Copy and paste the contents of add_profile_picture_column.sql into the SQL Editor
```

Or manually add the column:

```sql
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
```

## Verification

After setup, you should be able to:
- ✅ Upload profile pictures from the app
- ✅ View profile pictures from the app
- ✅ Delete profile pictures from the app
- ✅ Profile picture URLs are saved in the `user_profiles` table

## Troubleshooting

### "Bucket not found" error
- Make sure the bucket name is exactly `profile-pictures` (case-sensitive)
- Verify the bucket exists in your Supabase Storage dashboard

### "Permission denied" error
- Check that RLS policies are correctly set up
- Verify the user is authenticated
- Check that the file path matches the user ID

### "Failed to get public URL" error
- Ensure the bucket is set to **Public**
- Check that the file was successfully uploaded before getting the URL


