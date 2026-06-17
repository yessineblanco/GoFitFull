jest.mock('@/config/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn() },
}));

import { computeReadiness } from '@/services/readiness';

const baseInput = {
  healthToday: null,
  nutritionTotals: null,
  nutritionGoals: null,
  checkIn: null,
  habits: [],
  streakMetrics: {
    currentStreak: 0,
    longestStreak: 0,
    workedOutToday: false,
    daysSinceLastWorkout: null,
  },
};

describe('computeReadiness', () => {
  test('returns a moderate baseline when no signals are available', () => {
    const readiness = computeReadiness(baseInput as any);

    expect(readiness).toMatchObject({
      score: 70,
      level: 'moderate',
    });
    expect(readiness.inputs).toMatchObject({
      steps: null,
      active_calories: null,
      habit_completion: 0,
      worked_out_today: false,
      days_since_last_workout: null,
      check_in: null,
    });
  });

  test('rewards strong recovery, nutrition, habits, and workout consistency', () => {
    const readiness = computeReadiness({
      ...baseInput,
      healthToday: {
        steps: 10000,
        active_calories: 450,
        sleep_minutes: 480,
        resting_heart_rate: 60,
        hrv_rmssd_ms: 65,
      },
      nutritionTotals: {
        calories: 1800,
        protein_g: 120,
        carbs_g: 200,
        fat_g: 60,
        water_ml: 1800,
      },
      nutritionGoals: {
        user_id: 'user-1',
        calories_goal: 2200,
        protein_g: 130,
        carbs_g: 240,
        fat_g: 70,
        water_ml: 2000,
      },
      checkIn: {
        id: 'check-in-1',
        user_id: 'user-1',
        date: '2026-06-13',
        mood: 5,
        energy: 5,
        soreness: 1,
        sleep_quality: 5,
        notes: null,
        created_at: '2026-06-13T08:00:00.000Z',
      },
      habits: [
        { completed: true },
        { completed: true },
        { completed: true },
        { completed: false },
      ],
      streakMetrics: {
        currentStreak: 4,
        longestStreak: 8,
        workedOutToday: true,
        daysSinceLastWorkout: 0,
      },
    } as any);

    expect(readiness.score).toBe(100);
    expect(readiness.level).toBe('high');
    expect(readiness.inputs).toMatchObject({
      steps: 10000,
      active_calories: 450,
      sleep_minutes: 480,
      resting_heart_rate: 60,
      hrv_rmssd_ms: 65,
      habit_completion: 0.75,
      worked_out_today: true,
      days_since_last_workout: 0,
      check_in: {
        mood: 5,
        energy: 5,
        soreness: 1,
        sleep_quality: 5,
      },
    });
  });

  test('clamps very poor recovery and inactivity to a low readiness score', () => {
    const readiness = computeReadiness({
      ...baseInput,
      healthToday: {
        steps: 1200,
        active_calories: 50,
        sleep_minutes: 300,
        resting_heart_rate: 95,
        hrv_rmssd_ms: 15,
      },
      checkIn: {
        id: 'check-in-2',
        user_id: 'user-1',
        date: '2026-06-13',
        mood: 1,
        energy: 1,
        soreness: 5,
        sleep_quality: 1,
        notes: null,
        created_at: '2026-06-13T08:00:00.000Z',
      },
      streakMetrics: {
        currentStreak: 0,
        longestStreak: 8,
        workedOutToday: false,
        daysSinceLastWorkout: 7,
      },
    } as any);

    expect(readiness.score).toBe(0);
    expect(readiness.level).toBe('low');
    expect(readiness.recommendation).toContain('Keep it light');
  });
});
