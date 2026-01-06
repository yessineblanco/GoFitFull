# Social Login Setup Guide

This guide explains how to set up Facebook, Google, and Apple authentication for GoFit.

## Prerequisites

1. Supabase project with authentication enabled
2. Developer accounts for the providers you want to use:
   - Google Cloud Console (for Google)
   - Facebook Developers (for Facebook)
   - Apple Developer (for Apple - iOS only)

## Step 1: Configure Supabase

### 1.1 Enable OAuth Providers in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Providers**
3. Enable the providers you want to use (Google, Facebook, Apple)

### 1.2 Configure Redirect URLs

In Supabase Dashboard > **Authentication** > **URL Configuration**, add:

- **Redirect URLs**: `gofit://auth/callback`
- **Site URL**: `gofit://`

## Step 2: Provider-Specific Setupanyl

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google+ API**
4. Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure:
   - **Application type**: Web application
   - **Name**: GoFit
   - **Authorized redirect URIs**: 
     - `https://[your-project-ref].supabase.co/auth/v1/callback`
     - `gofit://auth/callback`
6. Copy the **Client ID** and **Client Secret**
7. In Supabase Dashboard > **Authentication** > **Providers** > **Google**:
   - Paste the **Client ID**
   - Paste the **Client Secret**
   - Save

### Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select an existing one
3. Add **Facebook Login** product
4. Go to **Settings** > **Basic**
5. Add **Valid OAuth Redirect URIs**:
   - `https://[your-project-ref].supabase.co/auth/v1/callback`
   - `gofit://auth/callback`
6. Copy the **App ID** and **App Secret**
7. In Supabase Dashboard > **Authentication** > **Providers** > **Facebook**:
   - Paste the **App ID**
   - Paste the **App Secret**
   - Save

### Apple OAuth Setup (iOS only)

1. Go to [Apple Developer](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Create a **Services ID**:
   - Identifier: `com.anonymous.GoFit`
   - Enable **Sign in with Apple**
   - Add **Return URLs**:
     - `https://[your-project-ref].supabase.co/auth/v1/callback`
     - `gofit://auth/callback`
4. Create a **Key** for Sign in with Apple
5. Download the key file (`.p8`)
6. In Supabase Dashboard > **Authentication** > **Providers** > **Apple**:
   - Paste the **Services ID**
   - Upload the **Key file** (`.p8`)
   - Enter the **Key ID**
   - Enter the **Team ID** (found in Apple Developer account)
   - Save

## Step 3: Deep Linking Configuration

The app is already configured with deep linking in `app.json`:

```json
{
  "scheme": "gofit",
  "ios": {
    "bundleIdentifier": "com.anonymous.GoFit"
  },
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "data": [{ "scheme": "gofit" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}
```

## Step 4: Testing

1. Run the app: `npm start`
2. Navigate to the Login screen
3. Tap on a social login button (Facebook, Google, or Apple)
4. You should be redirected to the provider's login page
5. After authentication, you'll be redirected back to the app
6. The app should automatically sign you in

## Troubleshooting

### OAuth flow doesn't start
- Check that the provider is enabled in Supabase
- Verify Client ID/Secret are correct
- Check browser console for errors

### Redirect doesn't work
- Verify redirect URLs are configured correctly in both Supabase and provider settings
- Check that the deep link scheme matches: `gofit://auth/callback`
- For iOS, ensure the bundle identifier matches

### "Provider not enabled" error
- Go to Supabase Dashboard > Authentication > Providers
- Ensure the provider is toggled ON
- Save changes

### Session not created after OAuth
- Check Supabase logs for authentication errors
- Verify the redirect URL is exactly: `gofit://auth/callback`
- Ensure the app is listening for deep link events

## Notes

- **Apple Sign In** is only available on iOS devices
- **Facebook** and **Google** work on both iOS and Android
- The OAuth flow uses Supabase's built-in OAuth handling
- Sessions are automatically managed by Supabase Auth
- User data is stored in Supabase's `auth.users` table

## Additional Resources

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Setup](https://developers.facebook.com/docs/facebook-login/)
- [Apple Sign In Setup](https://developer.apple.com/sign-in-with-apple/)





