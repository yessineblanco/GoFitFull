# GoFit - Project Structure

## Complete Project Tree

```
GoFit/
├── 📄 Configuration Files
│   ├── app.json                    # Expo app configuration
│   ├── package.json                # Dependencies and scripts
│   ├── tsconfig.json               # TypeScript configuration
│   ├── babel.config.js             # Babel configuration
│   ├── metro.config.js             # Metro bundler configuration
│   ├── tailwind.config.js          # Tailwind CSS configuration
│   ├── global.css                  # Global CSS styles
│   ├── nativewind-env.d.ts         # NativeWind TypeScript definitions
│   └── index.ts                    # App entry point
│
├── 📁 android/                     # Android native code
│   └── app/
│       ├── build.gradle
│       ├── src/
│       └── res/
│
├── 📁 assets/                       # Static assets
│   ├── fonts/
│   │   └── Designer.otf            # Custom font
│   ├── logo.png                    # App logo
│   ├── splash-bg.jpg               # Splash screen background
│   └── ...                         # Other image assets
│
├── 📁 src/                          # Source code
│   │
│   ├── 📁 api/                      # API abstraction layer (NEW)
│   │   └── client.ts               # API client with error handling, retry, timeout
│   │
│   ├── 📁 components/               # Reusable UI components
│   │   ├── AnimatedBackground.tsx  # Animated background ellipses
│   │   ├── Button.tsx               # Reusable button component
│   │   ├── ErrorBoundary.tsx        # Error boundary for crash handling (NEW)
│   │   ├── GradientText.tsx         # Text with gradient effect
│   │   ├── Input.tsx                # Text input component
│   │   ├── KeyboardDismissView.tsx  # Keyboard dismissal wrapper
│   │   ├── Loading.tsx              # Loading spinner component
│   │   ├── Logo.tsx                 # App logo component
│   │   ├── PasswordStrengthIndicator.tsx  # Password strength visual indicator
│   │   ├── ScreenContainer.tsx      # Screen wrapper with safe area
│   │   ├── SplashScreen.tsx         # App splash screen
│   │   ├── Toast.tsx                # Toast notification component
│   │   ├── WeightScale.tsx          # Weight input scale component
│   │   └── onboarding/              # Onboarding-specific components
│   │       ├── OnboardingNavigationButtons.tsx
│   │       └── OnboardingProgressBar.tsx
│   │
│   ├── 📁 config/                   # Configuration files
│   │   └── supabase.ts              # Supabase client configuration (uses SecureStore)
│   │
│   ├── 📁 constants/                # Application constants (NEW)
│   │   └── index.ts                 # Storage keys, API config, validation limits
│   │
│   ├── 📁 lib/                      # Libraries and schemas
│   │   └── validations.ts           # Zod validation schemas
│   │
│   ├── 📁 navigation/               # Navigation setup
│   │   ├── AppNavigator.tsx         # Main app navigation (tabs)
│   │   ├── AuthNavigator.tsx        # Authentication flow navigation
│   │   ├── OnboardingNavigator.tsx # Onboarding flow navigation
│   │   └── types.ts                 # Navigation type definitions
│   │
│   ├── 📁 screens/                  # Screen components
│   │   ├── auth/                    # Authentication screens
│   │   │   ├── WelcomeScreen.tsx    # Welcome/landing screen
│   │   │   ├── LoginScreen.tsx      # Login screen
│   │   │   ├── SignupScreen.tsx     # Signup screen
│   │   │   ├── ForgotPasswordScreen.tsx
│   │   │   ├── VerifyOtpScreen.tsx  # OTP verification
│   │   │   ├── ResetPasswordScreen.tsx
│   │   │   └── PasswordChangedSuccessScreen.tsx
│   │   │
│   │   ├── onboarding/              # Onboarding screens
│   │   │   ├── OnboardingScreen1.tsx  # Welcome screen
│   │   │   ├── OnboardingScreen2.tsx  # Weight input
│   │   │   ├── OnboardingScreen3.tsx  # Height input
│   │   │   └── OnboardingScreen4.tsx  # Goal selection
│   │   │
│   │   ├── home/                    # Main app screens
│   │   │   └── HomeScreen.tsx       # Home/dashboard screen
│   │   │
│   │   ├── workouts/                # Workout-related screens
│   │   │   └── WorkoutsScreen.tsx   # Workout planner screen
│   │   │
│   │   ├── library/                 # Exercise library
│   │   │   └── LibraryScreen.tsx    # Exercise library screen
│   │   │
│   │   ├── progress/                # Progress tracking
│   │   │   └── ProgressScreen.tsx  # Progress/analytics screen
│   │   │
│   │   └── profile/                 # User profile
│   │       └── ProfileScreen.tsx    # Profile and settings screen
│   │
│   ├── 📁 services/                 # API services
│   │   ├── auth.ts                  # Authentication service
│   │   └── userProfile.ts           # User profile service
│   │
│   ├── 📁 store/                     # Zustand state management
│   │   ├── authStore.ts             # Authentication state
│   │   ├── onboardingStore.ts       # Onboarding state
│   │   └── themeStore.ts             # Theme preferences
│   │
│   ├── 📁 theme/                     # Theme configuration
│   │   └── index.ts                 # Colors, spacing, typography
│   │
│   ├── 📁 types/                     # TypeScript type definitions
│   │   └── index.ts                 # Shared types and interfaces
│   │
│   └── 📁 utils/                     # Utility functions
│       ├── animations.ts            # Animation utilities (120Hz optimized)
│       ├── constants.ts             # Utility constants
│       ├── formPersistence.ts       # Form data persistence
│       ├── logger.ts                 # Secure logging utility (NEW)
│       ├── passwordStrength.ts      # Password strength calculation
│       └── responsive.ts            # Responsive design utilities
│
├── 📄 Documentation
│   ├── README.md                     # Main project documentation
│   ├── README_DATABASE_SETUP.md      # Database setup instructions
│   ├── SECURITY_AUDIT_REPORT.md      # Security audit findings
│   ├── AUDIT_ACTION_PLAN.md          # Security fixes action plan
│   ├── ARCHITECTURE_IMPROVEMENTS.md  # Architecture improvements doc
│   ├── 120HZ_OPTIMIZATION.md         # 120Hz display optimization guide
│   ├── RESPONSIVE_OPTIMIZATION.md    # Responsive design guide
│   ├── REANIMATED_SETUP.md           # React Native Reanimated setup
│   └── EMAIL_TEMPLATE_INSTRUCTIONS.md # Supabase email template guide
│
├── 📄 Database & SQL
│   └── create_user_profiles_table.sql  # Database schema script
│
├── 📄 Templates
│   ├── supabase-email-template.html
│   └── supabase-email-template-simple.html
│
└── 📄 Root Files
    ├── App.tsx                      # Root component (wrapped with ErrorBoundary)
    ├── .gitignore                   # Git ignore rules
    └── .env.example                 # Environment variables template (should exist)
```

---

## 📊 Directory Statistics

### Source Code Breakdown

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/api/` | 1 | API abstraction layer |
| `src/components/` | 15 | Reusable UI components |
| `src/config/` | 1 | Configuration files |
| `src/constants/` | 1 | Application constants |
| `src/lib/` | 1 | Validation schemas |
| `src/navigation/` | 4 | Navigation setup |
| `src/screens/` | 18 | Screen components |
| `src/services/` | 2 | API services |
| `src/store/` | 3 | State management |
| `src/theme/` | 1 | Theme configuration |
| `src/types/` | 1 | Type definitions |
| `src/utils/` | 6 | Utility functions |
| **Total** | **54** | **Source files** |

---

## 🏗️ Architecture Overview

### Layer Structure

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│  (Screens, Components, Navigation)  │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         State Management            │
│      (Zustand Stores)              │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         Service Layer               │
│    (auth.ts, userProfile.ts)        │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         API Layer (NEW)             │
│      (client.ts - abstraction)      │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         Backend                     │
│      (Supabase)                     │
└─────────────────────────────────────┘
```

---

## 🔑 Key Files

### Core Application
- **`App.tsx`** - Root component with ErrorBoundary, navigation setup
- **`src/config/supabase.ts`** - Supabase client with SecureStore
- **`src/constants/index.ts`** - Centralized constants (NEW)

### State Management
- **`src/store/authStore.ts`** - Authentication state with subscription cleanup
- **`src/store/onboardingStore.ts`** - Onboarding flow state
- **`src/store/themeStore.ts`** - Theme preferences

### Services
- **`src/services/auth.ts`** - Authentication operations
- **`src/services/userProfile.ts`** - User profile CRUD operations
- **`src/api/client.ts`** - API abstraction with error handling (NEW)

### Utilities
- **`src/utils/logger.ts`** - Production-safe logging (NEW)
- **`src/utils/responsive.ts`** - Responsive design utilities
- **`src/utils/animations.ts`** - 120Hz optimized animations
- **`src/utils/formPersistence.ts`** - Form data persistence

### Validation
- **`src/lib/validations.ts`** - Zod schemas for form validation

---

## 📦 Dependencies Overview

### Core
- `expo` ~54.0.27
- `react` 19.1.0
- `react-native` 0.81.5
- `typescript` ~5.9.2

### Navigation
- `@react-navigation/native` ^7.1.24
- `@react-navigation/stack` ^7.6.11
- `@react-navigation/bottom-tabs` ^7.8.11

### State & Backend
- `zustand` ^5.0.9
- `@supabase/supabase-js` ^2.86.2
- `expo-secure-store` ~15.0.8

### Forms & Validation
- `react-hook-form` ^7.68.0
- `zod` ^4.1.13
- `@hookform/resolvers` ^5.2.2

### UI & Styling
- `nativewind` ^4.2.1
- `tailwindcss` ^3.4.18
- `expo-linear-gradient` ^15.0.8

### Animations
- `react-native-reanimated` ~3.16.0
- `react-native-gesture-handler` ^2.29.1

---

## 🎯 Recent Improvements (From Audit)

### Security
- ✅ SecureStore for token storage
- ✅ Auth subscription cleanup
- ✅ Production-safe logger
- ✅ Error Boundary component
- ✅ Stronger password validation

### Architecture
- ✅ Constants file (centralized config)
- ✅ API client abstraction layer
- ✅ Improved type safety
- ✅ Input validation for goal field
- ✅ Logger integration in services

---

## 📝 Notes

- **NEW** = Files/components added during recent improvements
- All screens are scrollable with keyboard handling
- Error boundaries prevent app crashes
- Secure logging prevents sensitive data exposure
- API client provides retry logic and timeout protection

---

**Last Updated:** December 2024  
**Total Source Files:** 54  
**Documentation Files:** 8


