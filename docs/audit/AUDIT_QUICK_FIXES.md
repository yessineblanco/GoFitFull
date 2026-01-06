# Quick Fixes for Critical Audit Issues

## Priority 1: Remove Debug Logs

### Files to Fix:
1. `src/store/workoutsStore.ts` - Remove or wrap 9 debug logs
2. `src/screens/library/WorkoutSessionScreen.tsx` - Remove 3 console.log statements
3. `src/screens/library/LibraryScreen.tsx` - Remove 1 console.log statement

### Action:
Replace all `[DEBUG]` logs with conditional logging:
```typescript
if (__DEV__) {
  logger.debug('Message', data);
}
```

---

## Priority 2: Replace console.log with logger

### Files to Fix:
- `src/screens/library/ExerciseDetailScreen.tsx`
- `src/screens/library/WorkoutBuilderScreen.tsx`
- `src/utils/audioManager.ts`
- `src/screens/profile/TextSizeSettingsScreen.tsx`
- `src/services/workouts.ts`
- `src/store/themeStore.ts`
- `src/store/authStore.ts`
- `src/screens/library/WorkoutSessionScreen.tsx`
- `src/screens/library/WorkoutDetailScreen.tsx`
- `src/screens/library/ExerciseSelectionScreen.tsx`
- `src/screens/library/LibraryScreen.tsx`
- `src/store/sessionsStore.ts`
- `src/screens/workouts/AddWorkout.tsx`
- `App.tsx`

### Action:
```typescript
// Replace:
console.error('Error:', error);
// With:
logger.error('Error:', error);

// Replace:
console.warn('Warning:', warning);
// With:
logger.warn('Warning:', warning);

// Replace:
console.log('Info:', info);
// With:
logger.info('Info:', info);
```

---

## Priority 3: Fix Force Reload Performance Issue

### File: `src/screens/profile/ProfileScreen.tsx`

### Current Issue:
```typescript
loadProfile(true); // Forces reload on every focus
```

### Fix:
```typescript
const lastProfileUpdate = useRef<number>(0);

// When profile is updated, set timestamp
// In EditWeightHeightScreen after update:
lastProfileUpdate.current = Date.now();

// In ProfileScreen useFocusEffect:
useFocusEffect(
  React.useCallback(() => {
    refreshUser();
    // Only force reload if updated within last 30 seconds
    const timeSinceUpdate = Date.now() - lastProfileUpdate.current;
    const shouldForce = timeSinceUpdate < 30000;
    loadProfile(shouldForce);
  }, [refreshUser, loadProfile])
);
```

---

## Priority 4: Improve Type Safety

### Files with `any` types:
1. `src/store/profileStore.ts` - Line 93: `onboardingUpdates: any`
2. `src/services/workouts.ts` - Multiple instances
3. `src/store/workoutsStore.ts` - Line 176: `workout: any`
4. `src/screens/library/WorkoutDetailScreen.tsx` - Error handling

### Action:
Create proper types for these cases or use `unknown` with type guards.

---

## Estimated Time
- Priority 1: 15 minutes
- Priority 2: 30 minutes
- Priority 3: 20 minutes
- Priority 4: 1-2 hours

**Total: ~2-3 hours**

