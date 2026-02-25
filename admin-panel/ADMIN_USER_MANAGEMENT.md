# Enhanced User Management Features

## Overview
This document describes the enhanced user management features implemented in the GoFit Admin Panel.

## ✨ Features Implemented

### 1. **User Detail Page** 👤
**Location**: `/users/[id]`

A comprehensive user profile page that displays:

#### Profile Information
- Avatar with user initials fallback
- Display name, email, and role badge (Admin/User)
- Account creation date
- Last active timestamp

#### Physical Information
- Age
- Gender
- Height (with units)
- Weight (with units)
- Fitness goal
- Activity level

#### Statistics Dashboard
Four key metrics displayed in cards:
- **Total Sessions**: Number of completed workouts
- **Total Duration**: Time spent working out (in hours/minutes)
- **Calories Burned**: Total calories from all sessions
- **Custom Workouts**: Number of workouts created by the user

#### Recent Activity
- List of the 10 most recent workout sessions
- Shows date, duration, calories, and completion status
- Empty state for users with no workout history

---

### 2. **Promote/Demote Admin** 🛡️
**Component**: `ToggleAdminButton`

Toggle admin access for any user with:
- Confirmation dialog before making changes
- Clear messaging about what admin access grants
- Loading states during API calls
- Automatic page refresh after changes

**Security**:
- Uses service role key to bypass RLS
- Direct update to `user_profiles.is_admin` column

---

### 3. **Delete User** 🗑️
**Component**: `DeleteUserButton`

Safely delete user accounts with:
- Strong confirmation dialog
- Clear warning about data loss
- List of what will be deleted:
  - User profile and settings
  - Custom workouts
  - Workout session history
  - All personal data
- Destructive action styling (red button)
- Automatic redirect to users list after deletion

**Database Cascade**:
- Deleting the auth user automatically cascades to:
  - `user_profiles` (ON DELETE CASCADE)
  - `workouts` where `user_id` matches
  - `workout_sessions` where `user_id` matches

---

### 4. **Search & Filter** 🔍
**Component**: `UserSearchFilter`

Advanced search and filtering capabilities:

#### Search
- Real-time search as you type
- Searches across:
  - Email addresses
  - Display names
- Case-insensitive matching

#### Role Filter
Three options:
- **All Roles**: Show everyone
- **Admins Only**: Filter to admin users
- **Users Only**: Filter to non-admin users

#### Sort Options
Three sorting methods:
- **Newest First**: Sort by creation date (descending)
- **Oldest First**: Sort by creation date (ascending)
- **Name (A-Z)**: Alphabetical by display name

#### Features
- Responsive design (mobile-friendly)
- Result count display
- Summary statistics footer showing admin/user counts
- Empty state when no results match filters
- Hover effects on table rows

---

## 🗂️ File Structure

```
admin-panel/
├── app/
│   ├── users/
│   │   ├── page.tsx                          # Users list page
│   │   └── [id]/
│   │       └── page.tsx                      # User detail page
│   └── api/
│       └── users/
│           └── [id]/
│               ├── route.ts                  # DELETE /api/users/:id
│               └── toggle-admin/
│                   └── route.ts              # POST /api/users/:id/toggle-admin
└── components/
    └── users/
        ├── UserSearchFilter.tsx              # Search & filter component
        ├── ToggleAdminButton.tsx             # Admin toggle button
        └── DeleteUserButton.tsx              # Delete user button
```

---

## 🔌 API Routes

### `DELETE /api/users/:id`
Delete a user account.

**Request**: No body required

**Response**:
```json
{
  "message": "User deleted successfully"
}
```

**Errors**:
- `500`: Failed to delete user

---

### `POST /api/users/:id/toggle-admin`
Toggle admin status for a user.

**Request**:
```json
{
  "isAdmin": true  // or false
}
```

**Response**:
```json
{
  "message": "Admin status granted successfully",
  "isAdmin": true
}
```

**Errors**:
- `400`: Invalid request body
- `500`: Failed to update admin status

---

## 🎨 UI Components Used

### Shadcn/UI Components
- `Avatar` / `AvatarImage` / `AvatarFallback`
- `Badge`
- `Button`
- `Card` / `CardHeader` / `CardTitle` / `CardContent`
- `Input`
- `Select` / `SelectTrigger` / `SelectContent` / `SelectItem`
- `AlertDialog` with all subcomponents

### Lucide React Icons
- `Shield` / `ShieldOff` - Role indicators
- `Mail` / `Calendar` / `Activity` - Profile info icons
- `Dumbbell` / `TrendingUp` / `Target` - Stats icons
- `Ruler` / `Weight` / `User` - Physical info icons
- `ArrowLeft` - Back navigation
- `Search` - Search input
- `Trash2` - Delete action
- `Loader2` - Loading states

---

## 🔒 Security Considerations

### Admin Operations
All admin operations use the service role key (`createAdminClient()`):
- Bypasses Row Level Security (RLS)
- Only accessible to authenticated admin users (via middleware)
- Protected routes: `/users/*`, `/api/users/*`

### Middleware Protection
The Next.js middleware checks:
1. User is authenticated
2. User has `is_admin = true` in their profile
3. Redirects non-admin users to `/login`

### Delete Cascade
The database schema handles cascading deletes:
- Deleting a user from `auth.users` automatically removes:
  - Their profile in `user_profiles`
  - Their custom workouts in `workouts`
  - Their workout sessions in `workout_sessions`

---

## 📊 Data Flow

### User Detail Page Load
1. Server component fetches user data using `createAdminClient()`
2. Queries:
   - `auth.admin.getUserById()` - Auth user data
   - `user_profiles` - Profile data including `is_admin`
   - `workout_sessions` - All sessions for stats
   - `workouts` - Count of custom workouts
3. Calculates statistics (totals, averages)
4. Renders page with all data

### Toggle Admin Action
1. User clicks "Make Admin" or "Revoke Admin"
2. Confirmation dialog appears
3. User confirms
4. Client component calls `POST /api/users/:id/toggle-admin`
5. API updates `user_profiles.is_admin`
6. Page refreshes with `router.refresh()`

### Delete User Action
1. User clicks "Delete User"
2. Warning dialog with detailed consequences
3. User confirms
4. Client component calls `DELETE /api/users/:id`
5. API calls `auth.admin.deleteUser()`
6. Cascade deletes profile and related data
7. Redirect to `/users` list

---

## 🎯 Usage Examples

### Viewing User Details
1. Go to `/users`
2. Click "View Details" on any user
3. See comprehensive profile and statistics

### Making Someone an Admin
1. Go to user detail page
2. Click "Make Admin" button
3. Confirm in dialog
4. User can now access admin panel

### Searching for Users
1. Go to `/users`
2. Type in search box (searches email and name)
3. Use role filter dropdown to filter by admin/user
4. Use sort dropdown to change order

### Deleting a User
1. Go to user detail page
2. Click "Delete User" button
3. Read the warning carefully
4. Confirm deletion
5. User and all their data is removed

---

## 🚀 Future Enhancements

Potential features to add:
- Bulk admin operations (delete multiple, bulk admin toggle)
- Export user data to CSV
- Email users directly from admin panel
- User activity timeline/audit log
- Advanced filters (date range, activity level, goal)
- Pagination for large user lists
- User analytics (charts/graphs)
- Impersonate user (for debugging)

---

## 🐛 Troubleshooting

### "Failed to verify admin status"
- Check `.env.local` has correct `SUPABASE_SERVICE_ROLE_KEY`
- Verify user has `is_admin = true` in `user_profiles` table

### "No users found"
- Check Supabase connection
- Verify RLS policies allow service role access
- Check console for error messages

### Delete fails
- Check foreign key constraints
- Verify cascade rules in database schema
- Check service role permissions

---

## 📝 Contact

For questions or issues, contact: yessine.blanco@esprit.tn
