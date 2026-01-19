export const isWorkoutStartable = (rawDate?: string | null) => {
  if (!rawDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const workoutDate = new Date(rawDate);
  workoutDate.setHours(0, 0, 0, 0);

  return workoutDate >= today;
};
