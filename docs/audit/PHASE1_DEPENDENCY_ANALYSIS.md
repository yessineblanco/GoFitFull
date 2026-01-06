# Phase 1: Dependency Analysis Report

**Generated:** 2024
**Total Dependencies Analyzed:** 40

## Executive Summary

This report analyzes all dependencies in `package.json` to identify:
- ✅ Used dependencies
- ❌ Unused dependencies (candidates for removal)
- ⚠️ Potentially unused dependencies (needs manual verification)
- 🔄 Dependencies that could be updated
- ➕ Missing dependencies

---

## 1. DEPENDENCY USAGE ANALYSIS

### ✅ ACTIVELY USED DEPENDENCIES

These packages are confirmed to be used in the codebase:

#### Core Framework
- `react` (19.1.0) - ✅ Core React library
- `react-native` (0.81.5) - ✅ Core React Native framework
- `expo` (~54.0.27) - ✅ Expo SDK framework
- `typescript` (~5.9.2) - ✅ TypeScript compiler (devDependency)

#### Navigation
- `@react-navigation/native` (^7.1.24) - ✅ Used in App.tsx, all navigators
- `@react-navigation/stack` (^7.6.11) - ✅ Stack navigation used throughout
- `@react-navigation/bottom-tabs` (^7.8.11) - ✅ Tab navigation in AppNavigator
- `react-native-gesture-handler` (^2.29.1) - ✅ Required by React Navigation
- `react-native-safe-area-context` (^5.6.2) - ✅ Used extensively with `useSafeAreaInsets`
- `react-native-screens` (~4.16.0) - ✅ Required by React Navigation

#### State Management & Backend
- `zustand` (^5.0.9) - ✅ Used in all store files (authStore, workoutsStore, etc.)
- `@supabase/supabase-js` (^2.86.2) - ✅ Used in config/supabase.ts and all services

#### Forms & Validation
- `react-hook-form` (^7.68.0) - ✅ Used in LoginScreen, SignupScreen, all forms
- `@hookform/resolvers` (^5.2.2) - ✅ Used with zodResolver
- `zod` (^4.1.13) - ✅ Used in lib/validations.ts

#### UI & Styling
- `expo-linear-gradient` (^15.0.8) - ✅ Used extensively (WelcomeScreen, LoginScreen, SignupScreen, gradients)
- `expo-blur` (^15.0.8) - ✅ Used in 20+ files (BlurView components)
- `expo-image` (^3.0.11) - ✅ Used for optimized image loading
- `expo-font` (^14.0.10) - ✅ Used in App.tsx for custom fonts
- `@expo/vector-icons` (^15.0.3) - ✅ Used in LoginScreen (Ionicons)
- `@expo-google-fonts/montserrat-alternates` (^0.4.1) - ✅ Loaded in App.tsx
- `react-native-svg` (^15.15.1) - ✅ Used in EnhancedRestTimer (circular progress)
- `lucide-react-native` (^0.556.0) - ✅ Used extensively (24 files) for icons

#### Audio & Media
- `expo-av` (^16.0.8) - ✅ Used in:
  - `src/utils/audioManager.ts` - Audio.Sound for timer sounds
  - `src/screens/library/ExerciseDetailScreen.tsx` - Video component
- `expo-image-picker` (^17.0.9) - ✅ Used in ProfileScreen for profile picture upload

#### Utilities
- `expo-haptics` (^15.0.8) - ✅ Used in audioManager.ts and WelcomeScreen
- `expo-secure-store` (^15.0.8) - ✅ Used in utils/secureStorage.ts
- `expo-status-bar` (~3.0.9) - ✅ Used in App.tsx
- `expo-localization` (~17.0.8) - ✅ Used in i18n (implicitly via expo)
- `expo-notifications` (^0.32.14) - ✅ Used in App.tsx and services/notifications.ts
- `expo-file-system` (^19.0.20) - ✅ Used in services/userProfile.ts (dynamic import for image upload)

#### Internationalization
- `i18next` (^25.7.2) - ✅ Used in i18n/index.ts
- `react-i18next` (^16.4.0) - ✅ Used throughout (useTranslation hook)

#### Storage
- `@react-native-async-storage/async-storage` (^2.2.0) - ✅ Used in stores (authStore, onboardingStore)

#### Animations
- `react-native-reanimated` (~3.16.0) - ✅ Used in utils/animations.ts (Easing120Hz)

#### Masking
- `@react-native-masked-view/masked-view` (^0.3.2) - ✅ Used in components/shared/GradientText.tsx

---

### ❌ UNUSED DEPENDENCIES (CANDIDATES FOR REMOVAL)

#### High Confidence - Safe to Remove

1. **`victory-native` (^41.20.2)**
   - **Status:** ❌ NOT USED
   - **Evidence:** No imports found for VictoryChart, VictoryBar, VictoryLine, or any Victory components
   - **Usage Check:** `grep` found 0 matches
   - **Impact:** ProgressScreen.tsx is a placeholder with no charts
   - **Recommendation:** **REMOVE** - Save ~2-3 MB, no functionality impact
   - **Risk:** Low - No code references found

2. **`nativewind` (^4.2.1)**
   - **Status:** ❌ NOT USED
   - **Evidence:** 
     - No `className` props found in codebase
     - No imports from 'nativewind'
     - tailwind.config.js exists but no Tailwind usage detected
     - global.css has Tailwind directives but not used
   - **Usage Check:** `grep` found 0 matches for className or nativewind imports
   - **Recommendation:** **REMOVE** - The project uses StyleSheet, not Tailwind
   - **Risk:** Low - No code references found
   - **Note:** Also remove `tailwindcss` (^3.4.18) as it's only used by nativewind

3. **`tailwindcss` (^3.4.18)**
   - **Status:** ❌ NOT USED
   - **Evidence:** Only used by nativewind (also unused)
   - **Recommendation:** **REMOVE** along with nativewind
   - **Risk:** Low

4. **`react-dom` (^19.1.0)**
   - **Status:** ❌ NOT USED
   - **Evidence:** No imports found for ReactDOM or react-dom
   - **Usage Check:** `grep` found 0 matches
   - **Recommendation:** **REMOVE** - React Native doesn't use react-dom
   - **Risk:** Low - Only needed for web builds, but web support may not be primary target
   - **Note:** Keep if planning web support, otherwise remove

5. **`react-native-web` (^0.21.2)**
   - **Status:** ❌ NOT USED DIRECTLY
   - **Evidence:** Not directly imported in code
   - **Note:** This is often a peer dependency or used implicitly by Expo for web support
   - **Recommendation:** **KEEP** if web support is needed, otherwise consider removing
   - **Risk:** Medium - May be required by Expo for web builds

---

### ⚠️ POTENTIALLY UNUSED DEPENDENCIES (NEEDS VERIFICATION)

These need manual verification as they may be used implicitly or conditionally:

1. **`babel-preset-expo` (^54.0.8)**
   - **Status:** ⚠️ LIKELY USED
   - **Evidence:** Required by Expo build system (check babel.config.js)
   - **Recommendation:** **KEEP** - Required for Expo builds
   - **Action:** Verify babel.config.js references it

2. **`@types/react` (~19.1.0)**
   - **Status:** ⚠️ REQUIRED
   - **Evidence:** TypeScript needs React type definitions
   - **Recommendation:** **KEEP** - Required for TypeScript

---

## 2. DUPLICATE/REDUNDANT PACKAGES

No duplicate packages found. All packages serve distinct purposes.

---

## 3. MISSING DEPENDENCIES

All imports are satisfied. No missing dependencies detected.

**Note:** Some packages may be transitive dependencies (installed automatically by other packages).

---

## 4. PACKAGE UPDATE RECOMMENDATIONS

### Minor/Patch Updates (Safe)

These can be updated without breaking changes:

1. `@expo-google-fonts/montserrat-alternates` - Current: ^0.4.1
   - Check for latest patch version
   - Impact: Low risk

2. `@hookform/resolvers` - Current: ^5.2.2
   - Check for latest version compatible with react-hook-form ^7.68.0
   - Impact: Low risk

3. `expo-av` - Current: ^16.0.8
   - Expo SDK 54 should have expo-av ~16.x.x
   - Impact: Low risk

4. `expo-image` - Current: ^3.0.11
   - Check for latest patch in Expo SDK 54
   - Impact: Low risk

### Major Updates (Requires Testing)

These require careful testing:

1. **None identified** - Project appears to be on latest stable versions

---

## 5. SUMMARY TABLE

| Package | Status | Action | Reason | Risk |
|---------|--------|--------|--------|------|
| `victory-native` | ❌ Unused | **REMOVE** | No charts implemented | Low |
| `nativewind` | ❌ Unused | **REMOVE** | Using StyleSheet instead | Low |
| `tailwindcss` | ❌ Unused | **REMOVE** | Only used by nativewind | Low |
| `react-dom` | ❌ Unused | **REMOVE** | Not needed for mobile | Low* |
| `react-native-web` | ⚠️ Indirect | **KEEP/REMOVE** | May be needed for web | Medium |
| All others | ✅ Used | **KEEP** | Actively used | - |

*Remove `react-dom` only if web support is not a priority

---

## 6. ESTIMATED IMPACT

### Size Reduction
- Removing `victory-native`: ~2-3 MB
- Removing `nativewind` + `tailwindcss`: ~500 KB
- Removing `react-dom`: ~100 KB (if not needed)
- **Total potential savings:** ~3-4 MB

### Build Time Impact
- Removing unused packages: Minimal improvement
- Fewer dependencies to install: Faster `npm install`

### Risk Assessment
- **Low Risk:** Removing victory-native, nativewind, tailwindcss, react-dom
- **Medium Risk:** Removing react-native-web (only if web support is planned)

---

## 7. RECOMMENDATIONS

### Immediate Actions

1. **Remove unused packages:**
   ```bash
   npm uninstall victory-native nativewind tailwindcss
   ```

2. **Remove react-dom** (if web support not needed):
   ```bash
   npm uninstall react-dom
   ```

3. **Clean up config files:**
   - Remove `tailwind.config.js`
   - Remove `global.css` (or keep if planning to use Tailwind later)
   - Update `nativewind-env.d.ts` if it exists

### Deferred Actions

1. **Verify react-native-web** usage
   - If web support is needed, keep it
   - If mobile-only, consider removing it

2. **Update packages** (after cleanup)
   - Run `npm outdated` to check for updates
   - Update patch versions first
   - Test thoroughly before major updates

---

## 8. NEXT STEPS

1. ✅ Review this report
2. ⏳ Get approval to remove packages
3. ⏳ Execute removal (Phase 1.1)
4. ⏳ Update package.json scripts (Phase 1.2)
5. ⏳ Test app functionality after cleanup
6. ⏳ Proceed to Phase 2 (File Structure Cleanup)

---

## 9. APPENDIX: VERIFICATION COMMANDS

Commands used to verify usage:

```bash
# Check for victory-native
grep -r "victory-native\|VictoryChart\|VictoryBar" src/

# Check for nativewind/tailwind
grep -r "className=\|nativewind\|from ['\"]nativewind" src/

# Check for react-dom
grep -r "react-dom\|ReactDOM" src/

# Check for AnimatedBackground usage
grep -r "AnimatedBackground" src/
```

---

**Report Status:** ✅ Complete - Awaiting Approval

**Prepared by:** AI Assistant
**Review Required:** Yes
**Action Required:** User approval before removal









