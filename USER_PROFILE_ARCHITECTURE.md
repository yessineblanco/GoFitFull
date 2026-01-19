# User Profile Architecture

## Display Name Storage

**Important:** The `display_name` field is **NOT** stored in `public.user_profiles`!

### Where Display Name is Stored
- Display names are stored in `auth.users.user_metadata.display_name`
- This is a Supabase Auth feature that allows storing custom metadata

### Mobile App Implementation
The mobile app follows this pattern:
```typescript
// Fetching display name
const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';

// Updating display name
await authService.updateUserMetadata({ display_name: 'John Doe' });
```

### Admin Panel Implementation
The admin panel now matches the mobile app architecture:
```typescript
// Fetching users
const { data: authData } = await adminClient.auth.admin.listUsers();

// Get display name from user_metadata
authData.users.map((user) => ({
  display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || "No name"
}));
```

## user_profiles Table Structure

The `public.user_profiles` table contains:
- `id` (uuid) - references auth.users(id)
- `weight` (numeric)
- `weight_unit` (text)
- `height` (numeric)
- `height_unit` (text)
- `goal` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `profile_picture_url` (text)
- `notification_preferences` (jsonb)
- `activity_level` (text)
- `age` (integer)
- `gender` (text)
- `rest_timer_preferences` (jsonb)
- `is_admin` (boolean)

**Note:** No `display_name`, `unit_system`, `height_cm`, or `weight_kg` columns!

## Why This Architecture?

1. **Supabase Best Practice**: User metadata belongs in `auth.users.user_metadata`
2. **Consistency**: Mobile app and admin panel use the same data source
3. **Separation of Concerns**: 
   - Auth-related data (email, password, display_name) → `auth.users`
   - App-specific profile data (weight, height, goals) → `user_profiles`

## Database Type Updates

The `UserProfile` interface has been updated to reflect the actual database schema:
- Removed `display_name` field
- Changed `height_cm`/`weight_kg` to `height`/`weight` with separate unit fields
- Removed `unit_system` field
- Added comment explaining display_name storage location
