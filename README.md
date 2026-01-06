# GoFit - Mobile Fitness App

A React Native Expo mobile application for fitness tracking, workout planning, and progress monitoring.

## Tech Stack

- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **UI**: NativeWind (Tailwind CSS for React Native)
- **Navigation**: React Navigation
- **State Management**: Zustand
- **Backend**: Supabase
- **Forms**: react-hook-form + zod
- **Media**: expo-image, expo-av
- **Notifications**: expo-notifications
- **Charts**: victory-native

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Supabase account

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd GoFit
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Then, edit `.env` and add your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the App

Start the Expo development server:

```bash
npm start
```

Or run on a specific platform:

```bash
npm run ios     # iOS (requires macOS)
npm run android # Android
npm run web     # Web
```

## Project Structure

```
GoFit/
├── src/
│   ├── config/          # Configuration files (Supabase)
│   ├── navigation/      # Navigation setup
│   ├── screens/         # Screen components
│   ├── components/      # Reusable UI components
│   ├── store/           # Zustand stores
│   ├── services/        # API services
│   ├── lib/             # Utilities (validations)
│   ├── types/           # TypeScript types
│   └── utils/           # Helper functions
├── App.tsx              # Root component
└── package.json
```

## Development Workflow

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## Features

### Phase 01: Setup ✅
- Project initialization
- Environment setup
- Navigation structure
- Authentication flow

### Phase 02: Core App (In Progress)
- **Authentication**: Login, Signup, Password Reset ✅
- **Profile & Settings**: User profile, preferences, units ✅
- **Workout Planner**: Sessions, calendar, exercises, timer ✅
- **Library**: Exercise database with images/animations ✅
  - ✅ Unified workouts system (native + custom)
  - ✅ Normalized database structure
  - ✅ Exercise snapshots for data integrity
  - ✅ Workout session tracking
- **Progress Tracking**: Charts and analytics (In Progress)

### Phase 03: Infrastructure (Planned)
- Backend/API
- Admin Panel
- Notifications & Reminders

## Contributing

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Follow NativeWind styling patterns
4. Write clear commit messages
5. Test on both iOS and Android when possible

## License

Private project - All rights reserved



