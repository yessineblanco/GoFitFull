# GoFit Admin Panel

The GoFit administration panel is a Next.js 16 and React 19 application for operational management, moderation, analytics, and business intelligence.

## Current Capabilities

- Dashboard and BI KPI reporting
- User, coach, and marketplace administration
- Verification and risk-review workflows
- Workout, exercise, recipe, and content management
- Nutrition and operational analytics
- Role-aware server-side access using Supabase

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase browser and server clients

## Local Setup

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` must remain server-only. Never place it in a `NEXT_PUBLIC_*` variable or client component.

```bash
npm install
npm run dev
```

## Verification

Use the scripts declared in `package.json`. Existing lint and test debt is tracked in [../docs/ROADMAP.md](../docs/ROADMAP.md); historical completion reports are archived under [../docs/archive/obsolete-status/admin-panel/](../docs/archive/obsolete-status/admin-panel/).
