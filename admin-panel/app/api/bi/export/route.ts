import { format, startOfDay, subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { getBIClientHealthOverview } from "@/lib/bi-client-health";
import { getBICoachOpsOverview } from "@/lib/bi-coach-ops";
import { getBIFinanceOverview } from "@/lib/bi-finance";
import {
  getBIUserLifecycleOverview,
  getBIUserWorkoutCohortRetention,
} from "@/lib/bi-user-lifecycle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RANGE_OPTIONS = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
] as const;

const EXPORT_SLICES = [
  "finance",
  "lifecycle",
  "cohorts",
  "coach-ops",
  "client-health",
] as const;

type BIExportSlice = (typeof EXPORT_SLICES)[number];
type BIExportRange = (typeof RANGE_OPTIONS)[number];
type CSVValue = boolean | number | string | null | undefined;

interface CSVDataSet {
  columns: string[];
  filename: string;
  rows: Record<string, CSVValue>[];
}

function normalizeParam(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function resolveRange(rangeKey: string | undefined): BIExportRange {
  return RANGE_OPTIONS.find((option) => option.key === rangeKey) || RANGE_OPTIONS[1];
}

function resolveSlice(sliceKey: string | undefined): BIExportSlice | null {
  return EXPORT_SLICES.find((slice) => slice === sliceKey) || null;
}

function getDateWindow(range: BIExportRange) {
  const endDate = startOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, range.days - 1));

  return { startDate, endDate };
}

function buildFilename(
  slice: BIExportSlice,
  rangeKey: BIExportRange["key"],
  endDate: Date
) {
  return `gofit-${slice}-${rangeKey}-${format(endDate, "yyyy-MM-dd")}.csv`;
}

function escapeCSVValue(value: CSVValue) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue =
    typeof value === "boolean" ? (value ? "true" : "false") : String(value);

  if (!/[",\r\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}

function serializeCSV(columns: string[], rows: Record<string, CSVValue>[]) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escapeCSVValue(row[column])).join(",")),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}

async function buildFinanceExportDataSet(
  range: BIExportRange,
  coachId?: string,
  packId?: string
): Promise<CSVDataSet> {
  const { startDate, endDate } = getDateWindow(range);
  const finance = await getBIFinanceOverview({
    startDate,
    endDate,
    coachId,
    packId,
  });
  const summaryRows = [...finance.summaryByCurrency].sort(
    (a, b) => b.grossPackSales - a.grossPackSales
  );

  if (packId) {
    return {
      columns: [
        "currency",
        "gross_pack_sales",
        "pack_sales_count",
        "average_order_value",
      ],
      filename: buildFilename("finance", range.key, endDate),
      rows: summaryRows.map((row) => ({
        currency: row.currency,
        gross_pack_sales: row.grossPackSales,
        pack_sales_count: row.packSalesCount,
        average_order_value: row.averageOrderValue,
      })),
    };
  }

  return {
    columns: [
      "currency",
      "gross_pack_sales",
      "pack_sales_count",
      "average_order_value",
      "wallet_earnings_amount",
      "platform_fee_amount",
      "platform_fee_count",
      "refund_ledger_amount",
      "refund_ledger_count",
      "payout_amount",
      "payout_count",
      "current_payout_liability",
      "coaches_with_liability",
    ],
    filename: buildFilename("finance", range.key, endDate),
    rows: summaryRows.map((row) => ({
      currency: row.currency,
      gross_pack_sales: row.grossPackSales,
      pack_sales_count: row.packSalesCount,
      average_order_value: row.averageOrderValue,
      wallet_earnings_amount: row.walletEarningsAmount,
      platform_fee_amount: row.platformFeeAmount,
      platform_fee_count: row.platformFeeCount,
      refund_ledger_amount: row.refundLedgerAmount,
      refund_ledger_count: row.refundLedgerCount,
      payout_amount: row.payoutAmount,
      payout_count: row.payoutCount,
      current_payout_liability: row.currentPayoutLiability,
      coaches_with_liability: row.coachesWithLiability,
    })),
  };
}

async function buildLifecycleExportDataSet(
  range: BIExportRange
): Promise<CSVDataSet> {
  const { startDate, endDate } = getDateWindow(range);
  const lifecycle = await getBIUserLifecycleOverview({ startDate, endDate });

  return {
    columns: [
      "user_id",
      "user_name",
      "user_type",
      "is_admin",
      "signup_date",
      "activation_type",
      "first_completed_workout_date",
      "first_completed_booking_date",
      "last_workout_date",
      "last_booking_date",
      "last_any_activity_date",
      "days_since_signup",
      "days_since_last_workout",
      "days_since_last_booking",
      "days_since_last_any_activity",
      "is_workout_active_7d",
      "is_workout_inactive_8_to_14d",
      "is_workout_inactive_15_to_30d",
      "is_workout_inactive_31_plus_or_never",
    ],
    filename: buildFilename("lifecycle", range.key, endDate),
    rows: lifecycle.snapshots.map((row) => ({
      user_id: row.userId,
      user_name: row.userName,
      user_type: row.userType,
      is_admin: row.isAdmin,
      signup_date: row.signupDate,
      activation_type: row.activationType,
      first_completed_workout_date: row.firstCompletedWorkoutDate,
      first_completed_booking_date: row.firstCompletedBookingDate,
      last_workout_date: row.lastWorkoutDate,
      last_booking_date: row.lastBookingDate,
      last_any_activity_date: row.lastAnyActivityDate,
      days_since_signup: row.daysSinceSignup,
      days_since_last_workout: row.daysSinceLastWorkout,
      days_since_last_booking: row.daysSinceLastBooking,
      days_since_last_any_activity: row.daysSinceLastAnyActivity,
      is_workout_active_7d: row.isWorkoutActive7d,
      is_workout_inactive_8_to_14d: row.isWorkoutInactive8to14d,
      is_workout_inactive_15_to_30d: row.isWorkoutInactive15to30d,
      is_workout_inactive_31_plus_or_never: row.isWorkoutInactive31PlusOrNever,
    })),
  };
}

async function buildCohortExportDataSet(range: BIExportRange): Promise<CSVDataSet> {
  const { endDate } = getDateWindow(range);
  const cohorts = await getBIUserWorkoutCohortRetention({
    endDate,
    cohortCount: range.days >= 90 ? 6 : 4,
    maxPeriod: 4,
  });

  return {
    columns: [
      "cohort_month",
      "cohort_size",
      "period",
      "active_users",
      "retention_rate",
    ],
    filename: buildFilename("cohorts", range.key, endDate),
    rows: cohorts.flatMap((cohort) =>
      cohort.periods.map((period) => ({
        cohort_month: cohort.cohortMonth,
        cohort_size: cohort.cohortSize,
        period: period.period,
        active_users: period.activeUsers,
        retention_rate: period.retentionRate,
      }))
    ),
  };
}

async function buildCoachOpsExportDataSet(
  range: BIExportRange,
  coachId?: string
): Promise<CSVDataSet> {
  const { startDate, endDate } = getDateWindow(range);
  const coachOps = await getBICoachOpsOverview({ startDate, endDate, coachId });

  return {
    columns: [
      "coach_id",
      "coach_name",
      "coach_status",
      "completed_bookings",
      "total_bookings",
      "completion_rate",
      "cancellation_rate",
      "no_show_rate",
      "completed_booking_minutes",
      "non_cancelled_booking_minutes",
      "available_minutes_pattern",
      "approximate_utilization_rate",
      "current_relationship_clients",
      "current_active_pack_clients",
      "current_completed_booking_clients",
      "average_rating_current",
      "total_reviews_current",
      "total_sessions_lifetime",
    ],
    filename: buildFilename("coach-ops", range.key, endDate),
    rows: coachOps.summaryByCoach.map((row) => ({
      coach_id: row.coachId,
      coach_name: row.coachName,
      coach_status: row.coachStatus,
      completed_bookings: row.completedBookings,
      total_bookings: row.totalBookings,
      completion_rate: row.completionRate,
      cancellation_rate: row.cancellationRate,
      no_show_rate: row.noShowRate,
      completed_booking_minutes: row.completedBookingMinutes,
      non_cancelled_booking_minutes: row.nonCancelledBookingMinutes,
      available_minutes_pattern: row.availableMinutesPattern,
      approximate_utilization_rate: row.approximateUtilizationRate,
      current_relationship_clients: row.currentRelationshipClients,
      current_active_pack_clients: row.currentActivePackClients,
      current_completed_booking_clients: row.currentCompletedBookingClients,
      average_rating_current: row.averageRatingCurrent,
      total_reviews_current: row.totalReviewsCurrent,
      total_sessions_lifetime: row.totalSessionsLifetime,
    })),
  };
}

async function buildClientHealthExportDataSet(
  range: BIExportRange
): Promise<CSVDataSet> {
  const { startDate, endDate } = getDateWindow(range);
  const clientHealth = await getBIClientHealthOverview({ startDate, endDate });

  return {
    columns: [
      "user_id",
      "user_name",
      "signup_date",
      "at_risk_signals_count",
      "workout_inactive_7d",
      "workout_inactive_14d",
      "days_since_last_completed_workout",
      "completed_workout_days_last_7d",
      "completed_workout_days_last_28d",
      "nutrition_inactive_7d",
      "days_since_last_nutrition_log",
      "nutrition_log_days_last_7d",
      "has_recent_body_measurement_30d",
      "days_since_last_body_measurement",
      "last_completed_booking_date",
      "days_since_last_completed_booking",
      "current_active_pack_count",
      "current_expiring_pack_count_7d",
      "current_expiring_pack_count_14d",
      "current_remaining_sessions",
    ],
    filename: buildFilename("client-health", range.key, endDate),
    rows: clientHealth.snapshots.map((row) => ({
      user_id: row.userId,
      user_name: row.userName,
      signup_date: row.signupDate,
      at_risk_signals_count: row.atRiskSignalsCount,
      workout_inactive_7d: row.workoutInactive7d,
      workout_inactive_14d: row.workoutInactive14d,
      days_since_last_completed_workout: row.daysSinceLastCompletedWorkout,
      completed_workout_days_last_7d: row.completedWorkoutDaysLast7d,
      completed_workout_days_last_28d: row.completedWorkoutDaysLast28d,
      nutrition_inactive_7d: row.nutritionInactive7d,
      days_since_last_nutrition_log: row.daysSinceLastNutritionLog,
      nutrition_log_days_last_7d: row.nutritionLogDaysLast7d,
      has_recent_body_measurement_30d: row.hasRecentBodyMeasurement30d,
      days_since_last_body_measurement: row.daysSinceLastBodyMeasurement,
      last_completed_booking_date: row.lastCompletedBookingDate,
      days_since_last_completed_booking: row.daysSinceLastCompletedBooking,
      current_active_pack_count: row.currentActivePackCount,
      current_expiring_pack_count_7d: row.currentExpiringPackCount7d,
      current_expiring_pack_count_14d: row.currentExpiringPackCount14d,
      current_remaining_sessions: row.currentRemainingSessions,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const slice = resolveSlice(normalizeParam(request.nextUrl.searchParams.get("slice")));

    if (!slice) {
      return NextResponse.json(
        { error: "Invalid BI export slice." },
        { status: 400 }
      );
    }

    const range = resolveRange(normalizeParam(request.nextUrl.searchParams.get("range")));
    const coachId = normalizeParam(request.nextUrl.searchParams.get("coach"));
    const packId = normalizeParam(request.nextUrl.searchParams.get("pack"));

    const dataSet =
      slice === "finance"
        ? await buildFinanceExportDataSet(range, coachId, packId)
        : slice === "lifecycle"
          ? await buildLifecycleExportDataSet(range)
          : slice === "cohorts"
            ? await buildCohortExportDataSet(range)
            : slice === "coach-ops"
              ? await buildCoachOpsExportDataSet(range, coachId)
              : await buildClientHealthExportDataSet(range);

    return new NextResponse(serializeCSV(dataSet.columns, dataSet.rows), {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${dataSet.filename}"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error exporting BI CSV:", error);

    return NextResponse.json(
      { error: "Failed to export BI CSV." },
      { status: 500 }
    );
  }
}
