import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildBICoachOpsOverview } from "./bi-coach-ops.ts";

const baseDailyRow = {
  metricDate: "2026-06-01",
  coachId: "coach-a",
  userId: "user-a",
  coachStatus: "approved",
  averageRatingCurrent: 0,
  totalReviewsCurrent: 0,
  totalSessionsLifetime: 0,
  totalBookings: 0,
  completedBookingsCount: 0,
  cancelledBookingsCount: 0,
  noShowBookingsCount: 0,
  pendingBookingsCount: 0,
  confirmedBookingsCount: 0,
  scheduledBookingMinutes: 0,
  nonCancelledBookingMinutes: 0,
  completedBookingMinutes: 0,
  cancelledBookingMinutes: 0,
  noShowBookingMinutes: 0,
  availabilitySlotsCount: 0,
  availableMinutesPattern: 0,
  hadBookingActivity: false,
  hadCompletedBooking: false,
  hadCancelledBooking: false,
  hadNoShowBooking: false,
  hadAvailabilityPattern: false,
};

const snapshots = [
  {
    coachId: "coach-a",
    userId: "user-a",
    coachName: "Coach A",
    coachStatus: "approved",
    averageRatingCurrent: 4.2,
    totalReviewsCurrent: 12,
    totalSessionsLifetime: 80,
    currentActivePackClients: 1,
    currentCompletedBookingClients: 2,
    currentRelationshipClients: 3,
  },
  {
    coachId: "coach-b",
    userId: "user-b",
    coachName: "Coach B",
    coachStatus: "pending",
    averageRatingCurrent: 4.9,
    totalReviewsCurrent: 20,
    totalSessionsLifetime: 120,
    currentActivePackClients: 3,
    currentCompletedBookingClients: 2,
    currentRelationshipClients: 5,
  },
  {
    coachId: "coach-c",
    userId: "user-c",
    coachName: "Coach C",
    coachStatus: "approved",
    averageRatingCurrent: 5,
    totalReviewsCurrent: 4,
    totalSessionsLifetime: 16,
    currentActivePackClients: 0,
    currentCompletedBookingClients: 0,
    currentRelationshipClients: 0,
  },
];

function dailyRow(overrides) {
  return {
    ...baseDailyRow,
    ...overrides,
  };
}

describe("buildBICoachOpsOverview", () => {
  it("aggregates coach operation metrics with server-derived rates and totals", () => {
    const overview = buildBICoachOpsOverview(
      [
        dailyRow({
          totalBookings: 4,
          completedBookingsCount: 3,
          cancelledBookingsCount: 1,
          noShowBookingsCount: 0,
          scheduledBookingMinutes: 240,
          nonCancelledBookingMinutes: 180,
          completedBookingMinutes: 150,
          availableMinutesPattern: 240,
          hadBookingActivity: true,
        }),
        dailyRow({
          metricDate: "2026-06-02",
          totalBookings: 2,
          completedBookingsCount: 1,
          cancelledBookingsCount: 0,
          noShowBookingsCount: 1,
          scheduledBookingMinutes: 120,
          nonCancelledBookingMinutes: 0,
          completedBookingMinutes: 45,
          availableMinutesPattern: 60,
        }),
        dailyRow({
          coachId: "coach-b",
          userId: "user-b",
          coachStatus: "pending",
          totalBookings: 2,
          completedBookingsCount: 1,
          noShowBookingsCount: 1,
          nonCancelledBookingMinutes: 45,
          hadBookingActivity: true,
        }),
      ],
      snapshots
    );

    assert.deepEqual(overview.summaryByCoach.map((row) => row.coachId), [
      "coach-a",
      "coach-b",
    ]);

    assert.deepEqual(
      overview.summaryByCoach.map((row) => ({
        coachId: row.coachId,
        coachName: row.coachName,
        coachStatus: row.coachStatus,
        totalBookings: row.totalBookings,
        completedBookings: row.completedBookings,
        cancelledBookings: row.cancelledBookings,
        noShows: row.noShows,
        scheduledBookingMinutes: row.scheduledBookingMinutes,
        nonCancelledBookingMinutes: row.nonCancelledBookingMinutes,
        completedBookingMinutes: row.completedBookingMinutes,
        availableMinutesPattern: row.availableMinutesPattern,
        completionRate: row.completionRate,
        cancellationRate: row.cancellationRate,
        noShowRate: row.noShowRate,
        approximateUtilizationRate: row.approximateUtilizationRate,
        currentRelationshipClients: row.currentRelationshipClients,
      })),
      [
        {
          coachId: "coach-a",
          coachName: "Coach A",
          coachStatus: "approved",
          totalBookings: 6,
          completedBookings: 4,
          cancelledBookings: 1,
          noShows: 1,
          scheduledBookingMinutes: 360,
          nonCancelledBookingMinutes: 180,
          completedBookingMinutes: 195,
          availableMinutesPattern: 300,
          completionRate: 66.67,
          cancellationRate: 16.67,
          noShowRate: 16.67,
          approximateUtilizationRate: 60,
          currentRelationshipClients: 3,
        },
        {
          coachId: "coach-b",
          coachName: "Coach B",
          coachStatus: "pending",
          totalBookings: 2,
          completedBookings: 1,
          cancelledBookings: 0,
          noShows: 1,
          scheduledBookingMinutes: 0,
          nonCancelledBookingMinutes: 45,
          completedBookingMinutes: 0,
          availableMinutesPattern: 0,
          completionRate: 50,
          cancellationRate: 0,
          noShowRate: 50,
          approximateUtilizationRate: 0,
          currentRelationshipClients: 5,
        },
      ]
    );

    assert.deepEqual(overview.totals, {
      approvedCoaches: 2,
      coachesWithBookingActivity: 2,
      totalCompletedBookings: 5,
      totalCancelledBookings: 1,
      totalNoShows: 2,
    });
  });
});
