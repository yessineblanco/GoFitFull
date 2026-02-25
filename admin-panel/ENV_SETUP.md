# Environment Variables Setup

Create a `.env.local` file in the root of the admin-panel directory with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Service Role Key - KEEP THIS SECRET! Never commit to git
# This key bypasses Row Level Security and should only be used server-side
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cloudflare R2 (optional - for exercise image/video uploads)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=gofit-exercise-media
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

Copy `.env.example` to `.env.local` and fill in values. R2 vars are only needed if you use the exercise media upload feature.

## Getting Your Supabase Keys

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`

## Getting Your R2 Keys (for exercise media uploads)

1. Cloudflare Dashboard → **R2 Object Storage** → Create bucket (e.g. `gofit-exercise-media`).
2. Bucket → **Settings** → **Public access**: enable R2.dev subdomain or add a custom domain; note the public base URL for `R2_PUBLIC_URL`.
3. **R2** → **Manage R2 API Tokens** → Create API token (Object Read & Write, scope to your bucket). Copy Access Key ID and Secret Access Key.
4. Copy **Account ID** from R2 overview.

⚠️ **Security Warning**: 
- Never commit `.env.local` to version control
- Never expose the service role key or R2 secret key to the client
- Only use the service role key in server-side code (API routes, Server Components, Server Actions)
