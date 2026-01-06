# API Client Explanation

## What is the API Client?

The API Client (`src/api/client.ts`) is a **wrapper around Supabase** that provides:

### ✅ Features:
1. **Automatic Timeouts** - Prevents hanging requests (10 second default)
2. **Retry Logic** - Automatically retries failed requests (3 attempts with exponential backoff)
3. **Centralized Error Handling** - Converts Supabase errors to user-friendly messages
4. **Consistent API** - Same interface for all database operations

### 📁 Location:
`src/api/client.ts`

---

## Current Situation

### ❌ Problem:
Your services are using Supabase **directly** instead of the API client:

```typescript
// ❌ Current (in userProfile.ts):
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

### ✅ Should Be:
```typescript
// ✅ Better (using API client):
import { apiClient } from '@/api/client';

const profile = await apiClient.selectOne<UserProfile>(
  'user_profiles',
  (builder) => builder.eq('id', userId)
);
```

---

## Benefits of Using API Client

### 1. **Automatic Timeouts**
```typescript
// Without API client: Request can hang forever
await supabase.from('table').select();

// With API client: Automatically times out after 10 seconds
await apiClient.select('table', (b) => b);
```

### 2. **Automatic Retries**
```typescript
// Without API client: Fails immediately on network error
await supabase.from('table').select();

// With API client: Retries 3 times with exponential backoff
await apiClient.select('table', (b) => b);
// Attempt 1: fails
// Wait 1 second
// Attempt 2: fails  
// Wait 2 seconds
// Attempt 3: succeeds ✅
```

### 3. **Better Error Messages**
```typescript
// Without API client: Raw Supabase error
"PGRST116: No rows found"

// With API client: User-friendly error
"The requested resource was not found."
```

---

## API Client Methods

### 1. `select()` - Get multiple records
```typescript
const profiles = await apiClient.select<UserProfile>(
  'user_profiles',
  (builder) => builder.eq('user_id', userId).order('created_at', { ascending: false })
);
```

### 2. `selectOne()` - Get single record
```typescript
const profile = await apiClient.selectOne<UserProfile>(
  'user_profiles',
  (builder) => builder.eq('id', userId)
);
```

### 3. `upsert()` - Insert or update
```typescript
const profile = await apiClient.upsert<UserProfile>(
  'user_profiles',
  { id: userId, weight: 70, goal: 'Lose weight' },
  { onConflict: 'id' }
);
```

### 4. `update()` - Update existing record
```typescript
const updated = await apiClient.update<UserProfile>(
  'user_profiles',
  { weight: 75 },
  (builder) => builder.eq('id', userId)
);
```

### 5. `delete()` - Delete record
```typescript
await apiClient.delete(
  'user_profiles',
  (builder) => builder.eq('id', userId)
);
```

---

## What Needs to Be Fixed

### Current Direct Supabase Usage:

**File:** `src/services/userProfile.ts`

```typescript
// ❌ Line 64-76: Direct Supabase call
const { error } = await supabase
  .from('user_profiles')
  .upsert({ ... }, { onConflict: 'id' });

// ❌ Line 118-122: Direct Supabase call  
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();

// ❌ Line 174-177: Direct Supabase call
const { error } = await supabase
  .from('user_profiles')
  .update(updateData)
  .eq('id', userId);
```

**Should be migrated to use `apiClient` instead.**

---

## Migration Example

### Before (Direct Supabase):
```typescript
async getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }
  return data;
}
```

### After (Using API Client):
```typescript
import { apiClient } from '@/api/client';

async getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    return await apiClient.selectOne<UserProfile>(
      'user_profiles',
      (builder) => builder.eq('id', userId)
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
}
```

**Benefits:**
- ✅ Automatic timeout (won't hang)
- ✅ Automatic retry (handles network issues)
- ✅ Better error handling
- ✅ Less code (no manual error checking)

---

## Summary

**The API Client exists but isn't being used!**

**Task:** Migrate `userProfile.ts` to use `apiClient` instead of direct Supabase calls.

**Impact:** 
- Better reliability (retries, timeouts)
- Better error handling
- Consistent API across the app

**Time:** ~1 hour to migrate

---

**Would you like me to migrate `userProfile.ts` to use the API client?**

