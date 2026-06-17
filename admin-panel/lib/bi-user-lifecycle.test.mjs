import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildBIUserLifecycleOverviewFromRows,
  buildBIUserWorkoutCohortRetentionRows,
} from "./bi-user-lifecycle.ts";

const baseDailyRow = {
  metricDate: "2026-06-01",
  userId: "user-a",
  signupDate: "2026-06-01",
  signupCohortMonth: "2026-06-01",
  didSignup: false,
  firstCompletedWorkoutDate: null,
  didFirstCompletedWorkout: false,
  firstCompletedBookingDate: null,
  didFirstCompletedBooking: false,
  workoutSessionsStarted: 0,
  completedWorkoutsCount: 0,
  completedBookingsCount: 0,
  packPurchasesCount: 0,
  hadWorkoutSession: false,
  hadCompletedWorkout: false,
  hadCompletedBooking: false,
  hadPackPurchase: false,
  hadAnyActivity: false,
  hadAnyLifecycleEvent: false,
  daysSinceSignup: 0,
};

const baseSnapshot = {
  userId: "user-a",
  userName: "User A",
  userType: "client",
  isAdmin: false,
  signupDate: "2026-06-01",
  latestLifecycleEventDate: "2026-06-03",
  lastAnyActivityDate: null,
  firstCompletedWorkoutDate: null,
  firstCompletedBookingDate: null,
  lastWorkoutDate: null,
  lastBookingDate: null,
  activationType: "none",
  daysSinceSignup: 0,
  daysSinceLastWorkout: null,
  daysSinceLastBooking: null,
  daysSinceLastAnyActivity: null,
  isWorkoutActive7d: false,
  isWorkoutInactive8to14d: false,
  isWorkoutInactive15to30d: false,
  isWorkoutInactive31PlusOrNever: true,
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

describe("BI user lifecycle aggregation", () => {
  it("builds lifecycle series and summary from range and rolling activity rows", () => {
    const overview = buildBIUserLifecycleOverviewFromRows(
      [
        dailyRow({
          didSignup: true,
          firstCompletedWorkoutDate: "2026-06-01",
          didFirstCompletedWorkout: true,
          workoutSessionsStarted: 1,
          completedWorkoutsCount: 1,
          hadWorkoutSession: true,
          hadCompletedWorkout: true,
          hadPackPurchase: true,
          hadAnyActivity: true,
          hadAnyLifecycleEvent: true,
        }),
        dailyRow({
          metricDate: "2026-06-02",
          userId: "user-b",
          signupDate: "2026-05-20",
          signupCohortMonth: "2026-05-01",
          firstCompletedBookingDate: "2026-06-02",
          didFirstCompletedBooking: true,
          completedBookingsCount: 1,
          hadCompletedBooking: true,
          hadAnyActivity: true,
          hadAnyLifecycleEvent: true,
        }),
        dailyRow({
          metricDate: "2026-06-03",
          userId: "user-c",
          signupDate: "2026-05-25",
          signupCohortMonth: "2026-05-01",
          workoutSessionsStarted: 1,
          hadWorkoutSession: true,
          hadPackPurchase: true,
          hadAnyActivity: true,
        }),
        dailyRow({
          metricDate: "2026-05-25",
          userId: "user-d",
          signupDate: "2026-05-01",
          signupCohortMonth: "2026-05-01",
          workoutSessionsStarted: 1,
          hadWorkoutSession: true,
          hadAnyActivity: true,
        }),
      ],
      [
        snapshot({
          activationType: "workout",
          firstCompletedWorkoutDate: "2026-06-01",
          lastWorkoutDate: "2026-06-01",
          daysSinceLastWorkout: 2,
          isWorkoutActive7d: true,
          isWorkoutInactive31PlusOrNever: false,
        }),
        snapshot({
          userId: "user-b",
          userName: "User B",
          activationType: "booking",
          firstCompletedBookingDate: "2026-06-02",
          daysSinceLastWorkout: 10,
          isWorkoutInactive8to14d: true,
          isWorkoutInactive31PlusOrNever: false,
        }),
        snapshot({
          userId: "user-c",
          userName: "User C",
          activationType: "none",
        }),
      ],
      new Date("2026-06-01"),
      new Date("2026-06-03")
    );

    assert.deepEqual(overview.dailySeries, [
      {
        date: "2026-06-01",
        signups: 1,
        firstWorkoutActivations: 1,
        firstBookingActivations: 0,
        workoutActiveUsers: 1,
        bookingActiveUsers: 0,
        anyActiveUsers: 1,
        packPurchasers: 1,
      },
      {
        date: "2026-06-02",
        signups: 0,
        firstWorkoutActivations: 0,
        firstBookingActivations: 1,
        workoutActiveUsers: 0,
        bookingActiveUsers: 1,
        anyActiveUsers: 1,
        packPurchasers: 0,
      },
      {
        date: "2026-06-03",
        signups: 0,
        firstWorkoutActivations: 0,
        firstBookingActivations: 0,
        workoutActiveUsers: 1,
        bookingActiveUsers: 0,
        anyActiveUsers: 1,
        packPurchasers: 1,
      },
    ]);

    assert.deepEqual(overview.summary, {
      signupsInRange: 1,
      firstWorkoutActivationsInRange: 1,
      firstBookingActivationsInRange: 1,
      workoutActiveUsersInRange: 2,
      bookingActiveUsersInRange: 1,
      anyActiveUsersInRange: 3,
      packPurchasersInRange: 2,
      dau: 1,
      wau: 2,
      mau: 3,
      workoutActivatedUsers: 1,
      bookingOnlyActivatedUsers: 1,
      unactivatedUsers: 1,
      workoutActive7d: 1,
      workoutInactive8to14d: 1,
      workoutInactive15to30d: 0,
      workoutInactive31PlusOrNever: 1,
    });
  });

  it("builds workout cohort retention rows with rounded retention rates", () => {
    const rows = buildBIUserWorkoutCohortRetentionRows(
      [
        dailyRow({
          metricDate: "2026-05-01",
          userId: "user-a",
          signupDate: "2026-05-01",
          signupCohortMonth: "2026-05-01",
          didSignup: true,
        }),
        dailyRow({
          metricDate: "2026-05-02",
          userId: "user-b",
          signupDate: "2026-05-02",
          signupCohortMonth: "2026-05-01",
          didSignup: true,
        }),
        dailyRow({
          metricDate: "2026-06-01",
          userId: "user-a",
          signupDate: "2026-05-01",
          signupCohortMonth: "2026-05-01",
          hadWorkoutSession: true,
        }),
        dailyRow({
          metricDate: "2026-06-10",
          userId: "user-c",
          signupDate: "2026-06-10",
          signupCohortMonth: "2026-06-01",
          didSignup: true,
          hadWorkoutSession: true,
        }),
      ],
      2
    );

    assert.deepEqual(rows, [
      {
        cohortMonth: "2026-05-01",
        cohortSize: 2,
        periods: [
          { period: 0, activeUsers: 2, retentionRate: 100 },
          { period: 1, activeUsers: 1, retentionRate: 50 },
          { period: 2, activeUsers: 0, retentionRate: 0 },
        ],
      },
      {
        cohortMonth: "2026-06-01",
        cohortSize: 1,
        periods: [
          { period: 0, activeUsers: 1, retentionRate: 100 },
          { period: 1, activeUsers: 0, retentionRate: 0 },
          { period: 2, activeUsers: 0, retentionRate: 0 },
        ],
      },
    ]);
  });
});
