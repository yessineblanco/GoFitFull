# Security Audit Report
**Date:** December 23, 2025
**Auditor:** Antigravity

## 1. Executive Summary
The "GoFit" project demonstrates a strong security posture for a React Native/Expo application using Supabase. 
- **Dependencies**: No known vulnerabilities found (`npm audit` clean).
- **Configuration**: Environment variables are used correctly for secrets.
- **Data Access**: Row Level Security (RLS) is actively implemented in database migrations.
- **Rate Limiting**: Exists on the client-side for authentication flows.

## 2. Rate Limiting Analysis
The user specifically requested a check for rate limiting.

### Client-Side Implementation via `src/utils/rateLimiter.ts`
**Status:** ✅ Implemented
- The application implements a `AsyncStorage`-based rate limiter.
- **Protection Scope:** `login`, `signup`, `forgotPassword`.
- **Mechanism:** Tracks attempts within a time window (e.g., locking out after 5 failed attempts).
- **Effectiveness:** strictly prevents *accidental* spamming or basic UI-level brute force attempts. 
- **Limitation:** This is a client-side check. A knowledgeable attacker can bypass this by calling the Supabase API directly (using the Anon Key).

### Server-Side Implementation
**Status:** ⚠️ Relying on Platform Defaults
- There are no custom Edge Functions or API Gateway configurations visible in the repository that enforce stricter server-side rate limiting.
- **Protection:** The application relies on Supabase's default API rate limits and abuse protection mechanisms.
- **Recommendation:** usage of Supabase Auth CAPTCHA for signup/login flows if bot traffic becomes a concern.

## 3. Vulnerability Audit

### Dependencies
- **Tool**: `npm audit`
- **Result**: 0 Vulnerabilities.
- **Status**: ✅ Clean

### Secret Management
- **File**: `src/config/supabase.ts`
- **Findings**: 
    - Supabase URL and Anon Key are loaded via `process.env.EXPO_PUBLIC_*`.
    - No hardcoded secrets found in source code.
    - `SecureStorageAdapter` is correctly configured to use `expo-secure-store` for persisting auth tokens (preventing access from other apps/jailbroken filesystem scans).
- **Status**: ✅ Secure

### Database Security (RLS)
- **Files**: `database/migrations/*.sql`, `database/policies/*.sql`
- **Findings**:
    - `ENABLE ROW LEVEL SECURITY` is explicitly called for:
        - `public.workouts`
        - `public.workout_exercises`
        - `public.native_workouts`
        - `storage.objects` (Storage buckets)
    - **Policies**: secure policies are defined to ensure users can only CRUD their own data or public native workouts.
- **Status**: ✅ Secure (Verified for core workout tables)

### Concerns / Action Items
- **`user_profiles` Table**: While migrations reference a `user_profiles` table, I could not find the specific migration file that enables RLS for it in the `database/migrations` folder (only one adding a column). 
    - **Action**: Verify on the Supabase Dashboard that RLS is enabled for `user_profiles`.

## 4. Extended Audit Findings (Deep Dive)

### Input Validation (Runtime)
- **Status**: ⚠️ Weak
- **Findings**: `zod` is installed but rarely used (found only in `src/lib/validations.ts`).
- **Risk**: Relying purely on TypeScript interfaces does not protect against malformed runtime data from API responses or user input in forms not using `react-hook-form` + `zod`.
- **Recommendation**: Expand Zod usage to validate API responses and complex form inputs.

### State Management Security
- **Store**: `src/store/authStore.ts`
- **Findings**:
    - **Session Timeout**: ✅ Excellent. Implements a strict 30-minute inactivity timeout (`INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000`).
    - **Auto-Logout**: ✅ Correctly clears sensitive user state and session tokens on logout/timeout.
    - **Token Refresh**: ✅ Proactively checks and refreshes tokens before expiry.

### Deep Linking
- **Config**: `app.json`
- **Findings**:
    - **Scheme**: Uses custom scheme `gofit://`. 
    - **Risk**: Custom schemes can be claimed by other malicious apps on a user's device to intercept auth tokens (though Supabase PKCE flow mitigates this).
    - **Recommendation**: Configure **Universal Links** (iOS) and **App Links** (Android) for stronger security ownership of the deep link domain.

## 5. Final Recommendations
1.  **Verify `user_profiles` RLS**: Log into the Supabase dashboard and ensure Row Level Security is enabled for the `user_profiles` table.
2.  **Enable CAPTCHA**: To bolster the rate limiting, enable hCaptcha or Turnstile in the Supabase Auth project settings.
3.  **Upgrade Deep Links**: Move from custom schemes (`gofit://`) to Universal Links to prevent link hijacking.
4.  **Runtime Validation**: Adopt Zod schemas for all API responses to prevent app crashes or logic errors from malformed data.
