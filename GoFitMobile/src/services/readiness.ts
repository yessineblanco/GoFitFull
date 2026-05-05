import { supabase } from '@/config/supabase';
import type { HealthDataRow } from '@/services/healthSync';
import type { DayTotals, NutritionGoals } from '@/services/nutrition';
import type { CheckInResponse } from '@/services/checkIns';
import type { DailyHabit } from '@/services/habits';
import type { StreakMetrics } from '@/store/sessionsStore';
import { logger } from '@/utils/logger';

export type ReadinessLevel = 'low' | 'moderate' | 'high';

export type ReadinessResult = {
  score: number;
  level: ReadinessLevel;
  recommendation: string;
  inputs: Record<string, unknown>;
};

type ReadinessInput = {
  healthToday: HealthDataRow | null;
  nutritionTotals: DayTotals | null;
  nutritionGoals: NutritionGoals | null;
  checkIn: CheckInResponse | null;
  habits: DailyHabit[];
  streakMetrics: StreakMetrics;
};

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  let score = 70;
  const habitCompletion = input.habits.length
    ? input.habits.filter((habit) => habit.completed).length / input.habits.length
    : 0;

  if (input.checkIn) {
    if (input.checkIn.energy <= 2) score -= 14;
    if (input.checkIn.energy >= 4) score += 7;
    if (input.checkIn.sleep_quality <= 2) score -= 14;
    if (input.checkIn.sleep_quality >= 4) score += 6;
    if (input.checkIn.soreness >= 4) score -= 16;
    if (input.checkIn.soreness <= 2) score += 5;
    if (input.checkIn.mood <= 2) score -= 6;
  }

  if (input.healthToday) {
    if (input.healthToday.steps >= 8000) score += 5;
    if (input.healthToday.steps > 0 && input.healthToday.steps < 2500) score -= 4;
    if (input.healthToday.active_calories >= 400) score += 4;
    if ((input.healthToday.sleep_minutes ?? 0) >= 420) score += 6;
    if (input.healthToday.sleep_minutes !== null && input.healthToday.sleep_minutes < 360) score -= 10;
    if (input.healthToday.resting_heart_rate !== null && input.healthToday.resting_heart_rate >= 90) score -= 6;
    if (
      input.healthToday.resting_heart_rate !== null &&
      input.healthToday.resting_heart_rate >= 45 &&
      input.healthToday.resting_heart_rate <= 75
    ) {
      score += 3;
    }
    if (input.healthToday.hrv_rmssd_ms !== null && input.healthToday.hrv_rmssd_ms >= 50) score += 4;
    if (input.healthToday.hrv_rmssd_ms !== null && input.healthToday.hrv_rmssd_ms < 20) score -= 5;
  }

  if (input.nutritionTotals && input.nutritionGoals) {
    const proteinRatio = input.nutritionTotals.protein_g / Math.max(1, input.nutritionGoals.protein_g);
    const calorieRatio = input.nutritionTotals.calories / Math.max(1, input.nutritionGoals.calories_goal);
    if (proteinRatio >= 0.8) score += 4;
    if (calorieRatio > 0.05) score += 3;
  }

  if (habitCompletion >= 0.75) score += 6;
  if (input.streakMetrics.workedOutToday) score += 5;
  if ((input.streakMetrics.daysSinceLastWorkout ?? 0) >= 4) score -= 8;

  const finalScore = clampScore(score);
  const level: ReadinessLevel = finalScore >= 75 ? 'high' : finalScore >= 50 ? 'moderate' : 'low';

  const recommendation =
    level === 'high'
      ? 'You look ready for a strong session. Keep the plan tight and finish with recovery basics.'
      : level === 'moderate'
        ? 'A steady session fits today. Prioritize good form, hydration, and one habit win.'
        : 'Keep it light today. Mobility, walking, or an easier workout will still move you forward.';

  return {
    score: finalScore,
    level,
    recommendation,
    inputs: {
      steps: input.healthToday?.steps ?? null,
      active_calories: input.healthToday?.active_calories ?? null,
      sleep_minutes: input.healthToday?.sleep_minutes ?? null,
      resting_heart_rate: input.healthToday?.resting_heart_rate ?? null,
      hrv_rmssd_ms: input.healthToday?.hrv_rmssd_ms ?? null,
      habit_completion: habitCompletion,
      worked_out_today: input.streakMetrics.workedOutToday,
      days_since_last_workout: input.streakMetrics.daysSinceLastWorkout,
      check_in: input.checkIn
        ? {
            mood: input.checkIn.mood,
            energy: input.checkIn.energy,
            soreness: input.checkIn.soreness,
            sleep_quality: input.checkIn.sleep_quality,
          }
        : null,
    },
  };
}

export async function saveReadinessSnapshot(readiness: ReadinessResult): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('daily_readiness').upsert(
    {
      user_id: user.id,
      date: new Date().toISOString().slice(0, 10),
      score: readiness.score,
      level: readiness.level,
      recommendation: readiness.recommendation,
      inputs: readiness.inputs,
      source: 'deterministic_v1',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date,source' },
  );

  if (error?.code === '42P01' || String(error?.message || '').includes('does not exist')) {
    return;
  }
  if (error) {
    logger.error('saveReadinessSnapshot', error);
  }
}
