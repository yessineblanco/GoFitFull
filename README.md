# GoFit - Fitness Platform

A comprehensive fitness platform consisting of a mobile app and admin panel, built with React Native (Expo) and Next.js, powered by Supabase.

## Current Focus: Body Measurement AI

The active mobile-app work is the body measurement feature in `GoFitMobile`.

Current status:

- The saved measurement flow still uses guarded draft estimates with manual review before saving.
- Android now prefers MediaPipe Pose Landmarker Full as the primary pose source in the measurement service, with MoveNet kept as a fallback/comparison path.
- The selfie segmentation model still remains part of the debug/measurement stack because pose landmarks alone do not produce chest, waist, or hip circumference.
- Android phone testing confirms MediaPipe is working in the dev client on both mirror and direct captures: front and side photos returned `33 pts | 1 pose`, `9/9` visible core points, and native inference around `38 ms` to `130 ms`.
- Android measurements now use MediaPipe-derived pose landmarks through the existing 17-keypoint pipeline, but the formulas, confidence rules, save gating, and manual review flow are otherwise unchanged.
- iOS still needs the matching native bridge before MediaPipe can be considered for production replacement.

Important body-measurement docs:

- [Body Measurement Fix Plan](docs/troubleshooting/BODY_MEASUREMENT_FIX_PLAN.md)
- [MediaPipe Pose Landmarker Spike](docs/troubleshooting/BODY_MEASUREMENT_MEDIAPIPE_POSE_LANDMARKER_SPIKE.md)
- [Statistical Model Plan](docs/troubleshooting/BODY_MEASUREMENT_STATISTICAL_MODEL_PLAN.md)

## Project Structure

This is a monorepo containing two main applications:

```
GoFit/
├── GoFitMobile/          # React Native mobile app
│   ├── src/
│   ├── assets/
│   ├── App.tsx
│   └── package.json
├── Admin-panel/          # Next.js admin dashboard
│   ├── src/
│   └── package.json
├── database/             # Shared database migrations and schemas
├── docs/                 # Shared documentation
└── templates/            # Email templates
```

## Applications

### 📱 Mobile App (GoFitMobile)

A React Native Expo mobile application for fitness tracking, workout planning, and progress monitoring.

**Tech Stack:**
- Framework: Expo (React Native)
- Language: TypeScript
- UI: NativeWind (Tailwind CSS for React Native)
- Navigation: React Navigation
- State Management: Zustand
- Backend: Supabase

**Getting Started:**
```bash
cd GoFitMobile
npm install
npm start
```

See [GoFitMobile/PROJECT_GUIDE.md](GoFitMobile/PROJECT_GUIDE.md) for detailed documentation.

**Body measurement native module:**

```text
GoFitMobile/modules/mediapipe-pose-landmarker/
```

The MediaPipe module currently exposes `analyzePoseFromImage(uri)`. Android now uses it as the primary pose source in the measurement service, and the debug overlay reuses the raw 33-landmark output from that same scan. Keep local native module files tracked before EAS builds so the native binary and JS wrapper stay in sync.

### 💻 Admin Panel (Admin-panel)

A Next.js web application for managing users, exercises, and native workouts.

**Tech Stack:**
- Framework: Next.js 15 (App Router)
- Language: TypeScript
- UI: shadcn/ui + Tailwind CSS
- Backend: Supabase

**Getting Started:**
```bash
cd Admin-panel
npm install
npm run dev
```

## Shared Resources

### Database

All database migrations, schemas, and documentation are stored in the `database/` folder at the root level and are shared between both applications.

**Run migrations:**
Execute SQL files in the Supabase SQL Editor in order:
1. Schema files from `database/schema/`
2. Migration files from `database/migrations/`

See [database/README.md](database/README.md) for details.

### Documentation

Shared technical documentation is in the `docs/` folder, including:
- Architecture decisions
- API documentation
- Security guidelines
- Setup guides

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Expo CLI (for mobile app)

## Environment Setup

Both applications require Supabase credentials. Create `.env` files in each app directory:

**GoFitMobile/.env:**
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Admin-panel/.env.local:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Features

### Mobile App
✅ User authentication (Login, Signup, Password Reset)
✅ Profile & settings management
✅ Workout planning and tracking
✅ Exercise library with images
✅ Rest timer with audio/haptic feedback
✅ Progress tracking
✅ Multi-language support (EN/FR)

### Admin Panel
🚧 User management
🚧 Exercise library CRUD
🚧 Native workouts management
🚧 Analytics dashboard (planned)

## Development Workflow

1. Create a new branch for your feature
2. Make changes in the appropriate app folder
3. Test thoroughly
4. Update shared resources (database, docs) if needed
5. Submit a pull request

## Contributing

1. Follow the existing code structure in each app
2. Use TypeScript for type safety
3. Write clear commit messages
4. Test on both iOS and Android for mobile changes
5. Ensure admin panel works in all modern browsers

## License

Private project - All rights reserved
