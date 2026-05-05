import type { WeeklyNutritionSummary } from '@/services/nutrition';
import type { DailyHabit } from '@/services/habits';
import type { StreakMetrics } from '@/store/sessionsStore';

export type Milestone = {
  id: string;
  title: string;
  detail: string;
  progress: number;
  target: number;
  achieved: boolean;
};

export function buildMilestones({
  totalWorkouts,
  streakMetrics,
  habits,
  weeklyNutrition,
}: {
  totalWorkouts: number;
  streakMetrics: StreakMetrics;
  habits: DailyHabit[];
  weeklyNutrition: WeeklyNutritionSummary | null;
}): Milestone[] {
  const completedHabits = habits.filter((habit) => habit.completed).length;
  const activeHabits = Math.max(1, habits.length);
  const nutritionScore = weeklyNutrition
    ? weeklyNutrition.protein_days_hit + weeklyNutrition.water_days_hit + weeklyNutrition.fiber_days_hit
    : 0;

  return [
    {
      id: 'first_workout',
      title: 'First workout',
      detail: totalWorkouts > 0 ? 'Workout logged' : 'Log your first workout',
      progress: Math.min(totalWorkouts, 1),
      target: 1,
      achieved: totalWorkouts >= 1,
    },
    {
      id: 'three_day_streak',
      title: '3-day training streak',
      detail: `${Math.min(streakMetrics.currentStreak, 3)} of 3 days`,
      progress: Math.min(streakMetrics.currentStreak, 3),
      target: 3,
      achieved: streakMetrics.currentStreak >= 3,
    },
    {
      id: 'daily_habits',
      title: 'Daily habits',
      detail: `${completedHabits} of ${habits.length || 0} done today`,
      progress: Math.min(completedHabits, activeHabits),
      target: activeHabits,
      achieved: habits.length > 0 && completedHabits === habits.length,
    },
    {
      id: 'nutrition_consistency',
      title: 'Nutrition consistency',
      detail: weeklyNutrition ? `${nutritionScore} of 21 weekly targets` : 'Track nutrition to start',
      progress: Math.min(nutritionScore, 21),
      target: 21,
      achieved: nutritionScore >= 14,
    },
  ];
}
