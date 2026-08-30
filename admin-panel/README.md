# GoFit Admin Panel

The GoFit administration panel is a Next.js 16 and React 19 application for operational management, moderation, analytics, and business intelligence.

## Current Capabilities

- Dashboard and BI KPI reporting
- User, coach, and marketplace administration
- Verification and risk-review workflows
- Workout, exercise, recipe, and content management
- Nutrition and operational analytics
- Role-aware server-side access using Supabase
- Central Next.js proxy protection for all admin pages and API routes

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 3.4
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

```bash
npm test
npm run lint
npm run build
```

The built-in Node test suite covers admin-route access classification, BI API
request and CSV boundaries, import parsing, validation, shared API errors, and
the BI KPI contract without requiring live Supabase access. Lint is clean;
remaining quality work is tracked in
[../docs/ROADMAP.md](../docs/ROADMAP.md). Historical completion reports are archived under
[../docs/archive/obsolete-status/admin-panel/](../docs/archive/obsolete-status/admin-panel/).
