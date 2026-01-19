# React useEffect & Keys Best Practices Audit

## Overview
This document identifies components with:
1. **Overusing useEffect** - Using useEffect for simple calculations that could be computed on render
2. **Missing/Improper Keys in Lists** - Lists without proper key props or using index as key when order can change

## Issues Found

### 1. WorkoutSessionScreen.tsx - Using Index as Key ✅ ACCEPTABLE BUT IMPROVABLE
**File**: `src/screens/library/WorkoutSessionScreen.tsx`  
**Line**: ~1227

**Issue**: 
```tsx
{(currentExercise.completedSets || []).map((completed, setIndex) => {
  return (
    <View key={setIndex}>  // ⚠️ Using index as key
```

**Analysis**:
- Sets are displayed in a fixed order and don't reorder
- Index is acceptable here since the array doesn't change order
- However, a more stable key would be better: `key={`${currentExercise.id}-set-${setIndex}`}` or similar

**Priority**: LOW (acceptable but improvable)

**Recommendation**: Use a combination of exercise ID and set index for a more stable key:
```tsx
key={`${currentExercise.id}-set-${setIndex}`}
```

### 2. Derived State Computed On Render ✅ GOOD
**File**: `src/screens/library/WorkoutSessionScreen.tsx`  
**Lines**: ~480-490

**Status**: ✅ **GOOD** - Calculations are done directly on render, not in useEffect:
```tsx
const completedExercisesCount = exercises.filter(ex => ex.completed).length;
const totalExercises = exercises.length;
const progress = totalExercises > 0 ? (completedExercisesCount / totalExercises) * 100 : 0;
```

This is correct! These values are computed directly from props/state on each render, which is the right approach.

### 3. Other Map Functions ✅ GOOD
**Files Checked**:
- `src/components/workout/RestTimerSettings.tsx` - ✅ Uses proper keys (`key={seconds}`)
- `src/screens/library/WorkoutBuilderScreen.tsx` - ✅ Uses proper keys (`key={exercise.id}`, `key={dayNum}`)
- `src/screens/library/ExerciseSelectionScreen.tsx` - ✅ Uses proper keys (`key={category}`)

All other map functions use proper, stable keys.

## Summary

### ✅ Good Practices Found:
- Most map functions use stable, unique keys (IDs, not indices)
- Derived values are computed on render (not in useEffect)
- useEffect is only used for actual side effects (API calls, subscriptions, timers)

### 🔧 Minor Improvements:
- One instance of using index as key (acceptable but could be improved for consistency)

## Recommendations

### Priority 1: Improve Key Stability (Optional)
- Update `WorkoutSessionScreen.tsx` line ~1227 to use `key={`${currentExercise.id}-set-${setIndex}`}` instead of just `key={setIndex}`
- This makes keys more stable and unique across exercises

**Note**: This is a very minor improvement. The current implementation works fine since sets don't reorder.

## Conclusion

The codebase follows React best practices well:
- ✅ No unnecessary useEffect usage for calculations
- ✅ Proper key usage in most places
- ✅ Only one minor improvement opportunity (optional)

