import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildBIClientHealthDailySeries,
  summarizeBIClientHealthSnapshots,
} from "./bi-client-health.ts";

const baseDailyRow = {
  metricDate: "2026-06-01",
  userId: "user-a",
  signupDate: "2026-05-01",
  workoutSessionsStarted: 0,
  completedWorkoutsCount: 0,
  completedWorkoutMinutes: 0,
  hadWorkoutSession: false,
  hadCompletedWorkout: false,
  mealLogsCount: 0,
  loggedCalories: 0,
  loggedProteinG: 0,
  loggedCarbsG: 0,
  loggedFatG: 0,
  hadNutritionLog: false,
  caloriesGoal: 0,
  proteinGoalG: 0,
  carbsGoalG: 0,
  fatGoalG: 0,
  calorieGoalProgress: null,
  proteinGoalProgress: null,
  carbsGoalProgress: null,
  fatGoalProgress: null,
  bodyMeasurementsCount: 0,
  hadBodyMeasurement: false,
  completedBookingsCount: 0,
  hadCompletedBooking: false,
  packPurchasesCount: 0,
  hadPackPurchase: false,
  lastCompletedWorkoutDate: null,
  daysSinceLastCompletedWorkout: null,
  completedWorkoutDaysLast7d: 0,
  completedWorkoutDaysLast28d: 0,
  lastNutritionLogDate: null,
  daysSinceLastNutritionLog: null,
  nutritionLogDaysLast7d: 0,
  lastBodyMeasurementDate: null,
  daysSinceLastBodyMeasurement: null,
  lastCompletedBookingDate: null,
  daysSinceLastCompletedBooking: null,
  hadAnyHealthSignal: false,
};

const baseSnapshot = {
  userId: "user-a",
  userName: "User A",
  signupDate: "2026-05-01",
  lastCompletedWorkoutDate: null,
  daysSinceLastCompletedWorkout: null,
  completedWorkoutDaysLast7d: 0,
  completedWorkoutDaysLast28d: 0,
  lastNutritionLogDate: null,
  daysSinceLastNutritionLog: null,
  nutritionLogDaysLast7d: 0,
  lastBodyMeasurementDate: null,
  daysSinceLastBodyMeasurement: null,
  lastCompletedBookingDate: null,
  daysSinceLastCompletedBooking: null,
  currentActivePackCount: 0,
  currentExpiringPackCount7d: 0,
  currentExpiringPackCount14d: 0,
  currentRemainingSessions: 0,
  workoutInactive7d: true,
  workoutInactive14d: true,
  nutritionInactive7d: true,
  hasRecentBodyMeasurement30d: false,
  atRiskSignalsCount: 0,
};

function dailyRow(overrides) {
  return {
    ...baseDailyRow,
    ...overrides,
  };
}

function snapshot(overrides) {
  return {
    ...baseSnapshot,
    ...overrides,
  };
}

describe("BI client health aggregation", () => {
  it("builds a complete daily activity series with inclusive calorie-goal counts", () => {
    const series = buildBIClientHealthDailySeries(
      [
        dailyRow({
          hadWorkoutSession: true,
          hadNutritionLog: true,
          hadBodyMeasurement: true,
          hadCompletedBooking: true,
          hadPackPurchase: true,
          calorieGoalProgress: 0.8,
        }),
        dailyRow({
          userId: "user-b",
          hadWorkoutSession: true,
          calorieGoalProgress: 1.21,
        }),
        dailyRow({
          metricDate: "2026-06-03",
          userId: "user-c",
          hadNutritionLog: true,
          calorieGoalProgress: 1.2,
        }),
      ],
      new Date("2026-06-01"),
      new Date("2026-06-03")
    );

    assert.deepEqual(series, [
      {
        date: "2026-06-01",
        workoutActiveUsers: 2,
        nutritionLoggingUsers: 1,
        bodyMeasurementUsers: 1,
        bookingUsers: 1,
        packPurchasers: 1,
        calorieGoalUsers: 1,
      },
      {
        date: "2026-06-02",
        workoutActiveUsers: 0,
        nutritionLoggingUsers: 0,
        bodyMeasurementUsers: 0,
        bookingUsers: 0,
        packPurchasers: 0,
        calorieGoalUsers: 0,
      },
      {
        date: "2026-06-03",
        workoutActiveUsers: 0,
        nutritionLoggingUsers: 1,
        bodyMeasurementUsers: 0,
        bookingUsers: 0,
        packPurchasers: 0,
        calorieGoalUsers: 1,
      },
    ]);
  });

  it("summarizes snapshot risk counters from server-derived snapshot fields", () => {
    const summary = summarizeBIClientHealthSnapshots([
      snapshot({
        workoutInactive7d: false,
        workoutInactive14d: false,
        nutritionInactive7d: false,
        hasRecentBodyMeasurement30d: true,
        currentExpiringPackCount7d: 1,
        atRiskSignalsCount: 2,
      }),
      snapshot({
        userId: "user-b",
        userName: "User B",
        workoutInactive7d: true,
        workoutInactive14d: true,
        nutritionInactive7d: true,
        hasRecentBodyMeasurement30d: false,
        currentExpiringPackCount7d: 0,
        atRiskSignalsCount: 3,
      }),
      snapshot({
        userId: "user-c",
        userName: "User C",
        workoutInactive7d: false,
        workoutInactive14d: false,
        nutritionInactive7d: true,
        hasRecentBodyMeasurement30d: true,
        currentExpiringPackCount7d: 2,
        atRiskSignalsCount: 4,
      }),
    ]);

    assert.deepEqual(summary, {
      usersWithWorkoutLast7d: 2,
      usersInactive14d: 1,
      usersWithNutritionLast7d: 1,
      usersWithRecentBodyMeasurement30d: 2,
      usersWithExpiringPack7d: 2,
      usersWithThreePlusRiskSignals: 2,
    });
  });
});
