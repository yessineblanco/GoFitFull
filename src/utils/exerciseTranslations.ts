/**
 * Exercise name translation utility
 * Maps English exercise names to translation keys
 */

const EXERCISE_NAME_MAP: Record<string, string> = {
  // Common exercises
  'Bench Press': 'library.exercises.benchPress',
  'Squat': 'library.exercises.squat',
  'Deadlift': 'library.exercises.deadlift',
  'Shoulder Press': 'library.exercises.shoulderPress',
  'Bicep Curl': 'library.exercises.bicepCurl',
  'Bicep Curls': 'library.exercises.bicepCurl',
  'Tricep Extension': 'library.exercises.tricepExtension',
  'Pull Up': 'library.exercises.pullUp',
  'Pull-ups': 'library.exercises.pullUps',
  'Leg Press': 'library.exercises.legPress',
  'Chest Fly': 'library.exercises.chestFly',
  'Lateral Raise': 'library.exercises.lateralRaise',
  'Incline Dumbbell Press': 'library.exercises.inclineDumbbellPress',
  'Barbell Rows': 'library.exercises.barbellRows',
};

/**
 * Get translated exercise name
 * @param exerciseName - English exercise name from database
 * @param t - Translation function from useTranslation
 * @returns Translated exercise name, or original if translation not found
 */
export const getTranslatedExerciseName = (exerciseName: string, t: (key: string) => string): string => {
  const translationKey = EXERCISE_NAME_MAP[exerciseName];
  if (translationKey) {
    return t(translationKey);
  }
  // Return original name if no translation found
  return exerciseName;
};

