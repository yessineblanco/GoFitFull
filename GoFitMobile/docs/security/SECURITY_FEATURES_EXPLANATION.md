# Security Features Explanation

## 1. Rate Limiting

### What is it?
Rate limiting prevents attackers from making too many requests in a short period. It's like a bouncer at a club - after a certain number of attempts, you have to wait before trying again.

### Why do we need it?
**Current Problem:**
- An attacker could try 1000 different passwords per second on your login screen
- They could create thousands of fake accounts (spam)
- This overloads your Supabase backend and costs money
- Legitimate users might get locked out if an attacker targets their account

**Example Attack:**
```
Attacker tries to guess password for user@example.com:
- Attempt 1: password123 ❌
- Attempt 2: password456 ❌
- Attempt 3: 12345678 ❌
- ... (continues 1000s of times)
```

### How it works:
1. **Track attempts** - Store how many login/signup attempts were made
2. **Time window** - Count attempts within a specific time period (e.g., last 15 minutes)
3. **Block if exceeded** - If attempts exceed the limit, block further attempts
4. **Reset after timeout** - After the time window passes, attempts reset

### Implementation Plan:
```typescript
// When user tries to login:
1. Check: "How many login attempts in last 15 minutes?"
2. If < 5 attempts: Allow login, increment counter
3. If >= 5 attempts: Block with message "Too many attempts. Try again in X minutes"
4. Store attempts in AsyncStorage with timestamp
```

### Your Current Constants:
```typescript
RATE_LIMIT_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,        // Max 5 login tries
  LOGIN_WINDOW_MS: 15 minutes,  // Within 15 minutes
  MAX_SIGNUP_ATTEMPTS: 3,       // Max 3 signups
  SIGNUP_WINDOW_MS: 1 hour,     // Within 1 hour
}
```

### What we'll create:
- `src/utils/rateLimiter.ts` - Functions to check/record attempts
- Integration in `authStore.signIn()` and `authStore.signUp()`
- User-friendly error messages showing time remaining

---

## 2. Session Timeout Handling

### What is it?
Automatically log out users after a period of inactivity, or refresh their session before it expires.

### Why do we need it?
**Current Problem:**
- User logs in, then closes the app
- Their session token might still be valid for days/weeks
- If someone gets their phone, they have full access
- Sessions don't automatically refresh before expiring
- User might lose work if session expires mid-use

**Example Scenario:**
```
User logs in at 9:00 AM
- Session expires at 11:00 AM (2 hours)
- User uses app until 10:55 AM
- User doesn't know session is about to expire
- At 10:56 AM, session expires
- User tries to save data → ERROR: "Session expired"
- User loses work and has to login again
```

### How it works:
1. **Track activity** - Record when user last interacted with the app
2. **Monitor session expiry** - Check when the session token expires
3. **Auto-refresh** - Refresh token before it expires (e.g., 5 minutes before)
4. **Auto-logout** - Log out if inactive for too long (e.g., 30 minutes)
5. **Handle failures** - If refresh fails, logout gracefully

### Implementation Plan:
```typescript
// In authStore:
1. Track lastActivity timestamp
2. Check session expiry time
3. If expires in < 5 minutes: Auto-refresh token
4. If inactive > 30 minutes: Auto-logout
5. Listen for app state changes (foreground/background)
```

### Your Current Constants:
```typescript
SESSION_CONFIG = {
  REFRESH_THRESHOLD_MS: 5 minutes,  // Refresh if expires in < 5 min
}
```

### What we'll add:
- Activity tracking (update timestamp on user actions)
- Auto-refresh logic in `authStore`
- Inactivity timeout (e.g., 30 minutes)
- App state listener (detect when app goes to background)
- Graceful session expiry handling

---

## 3. Input Sanitization

### What is it?
Cleaning user input to remove potentially dangerous content like HTML tags, scripts, or special characters that could be used for attacks.

### Why do we need it?
**Current Problem:**
- User enters text in a form field
- That text gets saved to the database
- Later, that text is displayed on screen
- If text contains HTML/JavaScript, it could execute malicious code

**Example Attack (XSS - Cross-Site Scripting):**
```
User enters in "goal" field:
"<script>alert('Hacked!')</script>"

Without sanitization:
- Text saved to database as-is
- When displayed, browser executes the script
- Attacker could steal user data, redirect to malicious site, etc.
```

**Another Example:**
```
User enters in profile name:
"John'; DROP TABLE users; --"

Without sanitization:
- If this gets into a SQL query (even though we use Supabase which prevents this)
- Could potentially cause issues
```

### How it works:
1. **Strip HTML tags** - Remove `<script>`, `<img>`, etc.
2. **Escape special characters** - Convert `<` to `&lt;`, `>` to `&gt;`
3. **Remove dangerous patterns** - Remove JavaScript event handlers
4. **Validate length** - Ensure input isn't too long
5. **Whitelist approach** - Only allow safe characters

### Implementation Plan:
```typescript
// Before saving user input:
1. Take raw input: "<script>alert('xss')</script>Hello"
2. Sanitize: "Hello" (removed script tags)
3. Save sanitized version to database
4. Display safely
```

### What we'll create:
- `src/utils/sanitize.ts` - Functions to clean text input
- Integration in:
  - `userProfileService.saveOnboardingData()` - Sanitize "goal" field
  - Form submissions - Sanitize before validation
  - Any user-generated content

### Note:
- **Validation** (Zod) checks if input is correct format ✅ (You have this)
- **Sanitization** removes dangerous content ❌ (You need this)
- Both are needed! Validation ensures format, sanitization ensures safety.

---

## Summary Comparison

| Feature | Current State | After Implementation |
|---------|--------------|---------------------|
| **Rate Limiting** | ❌ No protection | ✅ Max 5 login attempts per 15 min |
| **Session Timeout** | ❌ Sessions never expire/refresh | ✅ Auto-refresh before expiry, logout on inactivity |
| **Input Sanitization** | ❌ Raw user input saved | ✅ Dangerous content removed before saving |

---

## Security Impact

### Without These Features:
- 🔴 **Vulnerable to brute force attacks** (rate limiting)
- 🔴 **Sessions stay active indefinitely** (session timeout)
- 🔴 **XSS attacks possible** (input sanitization)

### With These Features:
- 🟢 **Protected against brute force** (rate limiting)
- 🟢 **Sessions auto-refresh and expire** (session timeout)
- 🟢 **Safe from XSS attacks** (input sanitization)

---

## User Experience Impact

### Rate Limiting:
- **Positive:** Protects user accounts from attacks
- **Negative:** Legitimate users might get temporarily blocked (but we'll show clear messages)

### Session Timeout:
- **Positive:** Better security, auto-refresh prevents unexpected logouts
- **Negative:** Users inactive for 30+ minutes will need to login again

### Input Sanitization:
- **Positive:** No visible impact (happens behind the scenes)
- **Negative:** None (users can still type normally, we just clean it)

---

## Questions?

If anything is unclear, ask before we implement! These are important security features that will make your app much more secure.

