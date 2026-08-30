# GoFit Fitness Platform

GoFit is a fitness platform with an Expo mobile application, a Next.js administration panel, Supabase services, and n8n automation workflows.

## Current Status

Implemented areas include:

- Authentication, onboarding, profiles, and role-based access
- Workout planning, exercise tracking, progress, body measurements, and health data sync foundations
- Nutrition logging, barcode lookup, saved meals, recipes, and coach review workflows
- Coach marketplace, booking, messaging, and administrative moderation
- AI-assisted workout, nutrition, recovery, and coach workflows
- BI dashboards and KPI reporting in the admin panel

The live remaining-work list is maintained in [docs/ROADMAP.md](docs/ROADMAP.md). Historical status documents are kept under [docs/archive/](docs/archive/) and are not current project truth.

## Applications

### Mobile

- Expo SDK 54
- React Native 0.81
- React Navigation stack and tab navigators
- TypeScript
- React Native `StyleSheet` and shared theme tokens
- Supabase client integration

See [GoFitMobile/docs/README.md](GoFitMobile/docs/README.md).

### Admin Panel

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 3.4
- Supabase server and browser clients

See [admin-panel/README.md](admin-panel/README.md).

### Backend

Supabase provides PostgreSQL, authentication, storage, realtime features, and Edge Functions. Database changes are migration-driven; see [database/README.md](database/README.md).

## Configuration

Use placeholders in documentation and committed examples. Never expose a Supabase service-role key in mobile or browser configuration.

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
```

## Documentation

- [Project context](docs/PROJECT_CONTEXT.md)
- [Live roadmap](docs/ROADMAP.md)
- [Documentation index](docs/README.md)
- [Architecture quick start](docs/architecture/QUICK_START.md)
- [Documentation security review](docs/security/DOCUMENTATION_SECURITY_REVIEW.md)
- [Archived documentation](docs/archive/README.md)

## Verification

The mobile TypeScript check is the primary repository-wide static verification command for the mobile app. The admin panel has known lint debt tracked in the roadmap; do not describe it as fully verified until those checks pass.
