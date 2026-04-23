import {
  eachDayOfInterval,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { createAdminClient } from "./supabase/admin";

interface RawBIUserLifecycleDailyRow {
  metric_date: string;
  user_id: string;
  signup_date: string;
  signup_cohort_month: string;
  did_signup: boolean | null;
  first_completed_workout_date: string | null;
  did_first_completed_workout: boolean | null;
  first_completed_booking_date: string | null;
  did_first_completed_booking: boolean | null;
  workout_sessions_started: number | null;
  completed_workouts_count: number | null;
  completed_bookings_count: number | null;
  pack_purchases_count: number | null;
  had_workout_session: boolean | null;
  had_completed_workout: boolean | null;
  had_completed_booking: boolean | null;
  had_pack_purchase: boolean | null;
  had_any_activity: boolean | null;
  had_any_lifecycle_event: boolean | null;
  days_since_signup: number | null;
}

export interface BIUserLifecycleDailyRow {
  metricDate: string;
  userId: string;
  signupDate: string;
  signupCohortMonth: string;
  didSignup: boolean;
  firstCompletedWorkoutDate: string | null;
  didFirstCompletedWorkout: boolean;
  firstCompletedBookingDate: string | null;
  didFirstCompletedBooking: boolean;
  workoutSessionsStarted: number;
  completedWorkoutsCount: number;
  completedBookingsCount: number;
  packPurchasesCount: number;
  hadWorkoutSession: boolean;
  hadCompletedWorkout: boolean;
  hadCompletedBooking: boolean;
  hadPackPurchase: boolean;
  hadAnyActivity: boolean;
  hadAnyLifecycleEvent: boolean;
  daysSinceSignup: number;
}

export interface BIUserLifecycleSeriesPoint {
  date: string;
  signups: number;
  firstWorkoutActivations: number;
  firstBookingActivations: number;
  workoutActiveUsers: number;
  bookingActiveUsers: number;
  anyActiveUsers: number;
  packPurchasers: number;
}

export interface BIUserLifecycleOverview {
  dailySeries: BIUserLifecycleSeriesPoint[];
  snapshots: BIUserLifecycleSnapshotRow[];
  summary: {
    signupsInRange: number;
    firstWorkoutActivationsInRange: number;
    firstBookingActivationsInRange: number;
    workoutActiveUsersInRange: number;
    bookingActiveUsersInRange: number;
    anyActiveUsersInRange: number;
    packPurchasersInRange: number;
    dau: number;
    wau: number;
    mau: number;
    workoutActivatedUsers: number;
    bookingOnlyActivatedUsers: number;
    unactivatedUsers: number;
    workoutActive7d: number;
    workoutInactive8to14d: number;
    workoutInactive15to30d: number;
    workoutInactive31PlusOrNever: number;
  };
}

export interface BIUserLifecycleSnapshotRow {
  userId: string;
  userName: string;
  userType: string;
  isAdmin: boolean;
  signupDate: string;
  latestLifecycleEventDate: string;
  lastAnyActivityDate: string | null;
  firstCompletedWorkoutDate: string | null;
  firstCompletedBookingDate: string | null;
  lastWorkoutDate: string | null;
  lastBookingDate: string | null;
  activationType: "workout" | "booking" | "none";
  daysSinceSignup: number;
  daysSinceLastWorkout: number | null;
  daysSinceLastBooking: number | null;
  daysSinceLastAnyActivity: number | null;
  isWorkoutActive7d: boolean;
  isWorkoutInactive8to14d: boolean;
  isWorkoutInactive15to30d: boolean;
  isWorkoutInactive31PlusOrNever: boolean;
}

export interface BIUserWorkoutCohortRetentionPoint {
  period: number;
  activeUsers: number;
  retentionRate: number;
}

export interface BIUserWorkoutCohortRetentionRow {
  cohortMonth: string;
  cohortSize: number;
  periods: BIUserWorkoutCohortRetentionPoint[];
}

export interface BIUserLifecycleFilters {
  endDate?: Date | string;
  startDate?: Date | string;
  userId?: string;
}

export interface BIUserWorkoutCohortRetentionOptions {
  cohortCount?: number;
  endDate?: Date | string;
  maxPeriod?: number;
}

function toDateKey(value: Date | string) {
  if (value instanceof Date) {
    return format(value, "yyyy-MM-dd");
  }

  return value.slice(0, 10);
}

function toBoolean(value: boolean | null | undefined) {
  return value === true;
}

function toNumber(value: number | null | undefined) {
  return typeof value === "number" ? value : 0;
}

function getAuthDisplayName(
  authUser:
    | {
        email?: string | null;
        user_metadata?: {
          display_name?: string | null;
        } | null;
      }
    | undefined,
  fallback: string
) {
  return (
    authUser?.user_metadata?.display_name ||
    authUser?.email?.split("@")[0] ||
    fallback
  );
}

function diffDays(endDate: Date, startDateKey: string | null) {
  if (!startDateKey) {
    return null;
  }

  const startDate = startOfDay(new Date(startDateKey));
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}

function mapLifecycleRow(row: RawBIUserLifecycleDailyRow): BIUserLifecycleDailyRow {
  return {
    metricDate: row.metric_date,
    userId: row.user_id,
    signupDate: row.signup_date,
    signupCohortMonth: row.signup_cohort_month,
    didSignup: toBoolean(row.did_signup),
    firstCompletedWorkoutDate: row.first_completed_workout_date,
    didFirstCompletedWorkout: toBoolean(row.did_first_completed_workout),
    firstCompletedBookingDate: row.first_completed_booking_date,
    didFirstCompletedBooking: toBoolean(row.did_first_completed_booking),
    workoutSessionsStarted: toNumber(row.workout_sessions_started),
    completedWorkoutsCount: toNumber(row.completed_workouts_count),
    completedBookingsCount: toNumber(row.completed_bookings_count),
    packPurchasesCount: toNumber(row.pack_purchases_count),
    hadWorkoutSession: toBoolean(row.had_workout_session),
    hadCompletedWorkout: toBoolean(row.had_completed_workout),
    hadCompletedBooking: toBoolean(row.had_completed_booking),
    hadPackPurchase: toBoolean(row.had_pack_purchase),
    hadAnyActivity: toBoolean(row.had_any_activity),
    hadAnyLifecycleEvent: toBoolean(row.had_any_lifecycle_event),
    daysSinceSignup: toNumber(row.days_since_signup),
  };
}

function buildDailySeries(
  rows: BIUserLifecycleDailyRow[],
  startDate: Date,
  endDate: Date
) {
  const grouped = new Map<string, BIUserLifecycleSeriesPoint>();

  rows.forEach((row) => {
    const existing = grouped.get(row.metricDate) || {
      date: row.metricDate,
      signups: 0,
      firstWorkoutActivations: 0,
      firstBookingActivations: 0,
      workoutActiveUsers: 0,
      bookingActiveUsers: 0,
      anyActiveUsers: 0,
      packPurchasers: 0,
    };

    if (row.didSignup) {
      existing.signups += 1;
    }

    if (row.didFirstCompletedWorkout) {
      existing.firstWorkoutActivations += 1;
    }

    if (row.didFirstCompletedBooking) {
      existing.firstBookingActivations += 1;
    }

    if (row.hadWorkoutSession) {
      existing.workoutActiveUsers += 1;
    }

    if (row.hadCompletedBooking) {
      existing.bookingActiveUsers += 1;
    }

    if (row.hadAnyActivity) {
      existing.anyActiveUsers += 1;
    }

    if (row.hadPackPurchase) {
      existing.packPurchasers += 1;
    }

    grouped.set(row.metricDate, existing);
  });

  return eachDayOfInterval({ start: startDate, end: endDate }).map((date) => {
    const key = format(date, "yyyy-MM-dd");

    return (
      grouped.get(key) || {
        date: key,
        signups: 0,
        firstWorkoutActivations: 0,
        firstBookingActivations: 0,
        workoutActiveUsers: 0,
        bookingActiveUsers: 0,
        anyActiveUsers: 0,
        packPurchasers: 0,
      }
    );
  });
}

function getDistinctUsers(
  rows: BIUserLifecycleDailyRow[],
  predicate: (row: BIUserLifecycleDailyRow) => boolean
) {
  return new Set(rows.filter(predicate).map((row) => row.userId)).size;
}

async function getCurrentBIUserLifecycleSnapshots(
  endDate: Date
): Promise<BIUserLifecycleSnapshotRow[]> {
  const adminClient = createAdminClient();
  const [rows, userProfilesResult, authUsersResult] = await Promise.all([
    getBIUserLifecycleDailyRows({ endDate }),
    adminClient.from("user_profiles").select("id, user_type, is_admin"),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (userProfilesResult.error) {
    throw new Error(
      `Failed to fetch user profiles for BI lifecycle snapshots: ${userProfilesResult.error.message}`
    );
  }

  const profileMap = new Map(
    (userProfilesResult.data || []).map((profile) => [profile.id, profile])
  );
  const authMap = new Map(
    (authUsersResult.data?.users || []).map((user) => [user.id, user])
  );
  const snapshotMap = new Map<string, BIUserLifecycleSnapshotRow>();

  rows.forEach((row) => {
    const existing = snapshotMap.get(row.userId);

    if (!existing) {
      const profile = profileMap.get(row.userId);
      snapshotMap.set(row.userId, {
        userId: row.userId,
        userName: getAuthDisplayName(authMap.get(row.userId), "User"),
        userType: profile?.user_type || "client",
        isAdmin: profile?.is_admin === true,
        signupDate: row.signupDate,
        latestLifecycleEventDate: row.metricDate,
        lastAnyActivityDate: row.hadAnyActivity ? row.metricDate : null,
        firstCompletedWorkoutDate: row.firstCompletedWorkoutDate,
        firstCompletedBookingDate: row.firstCompletedBookingDate,
        lastWorkoutDate:
          row.hadWorkoutSession || row.hadCompletedWorkout ? row.metricDate : null,
        lastBookingDate: row.hadCompletedBooking ? row.metricDate : null,
        activationType: "none",
        daysSinceSignup: diffDays(endDate, row.signupDate) || 0,
        daysSinceLastWorkout: null,
        daysSinceLastBooking: null,
        daysSinceLastAnyActivity: null,
        isWorkoutActive7d: false,
        isWorkoutInactive8to14d: false,
        isWorkoutInactive15to30d: false,
        isWorkoutInactive31PlusOrNever: false,
      });
      return;
    }

    if (row.metricDate > existing.latestLifecycleEventDate) {
      existing.latestLifecycleEventDate = row.metricDate;
    }

    if (row.hadAnyActivity && (!existing.lastAnyActivityDate || row.metricDate > existing.lastAnyActivityDate)) {
      existing.lastAnyActivityDate = row.metricDate;
    }

    if (
      (row.hadWorkoutSession || row.hadCompletedWorkout) &&
      (!existing.lastWorkoutDate || row.metricDate > existing.lastWorkoutDate)
    ) {
      existing.lastWorkoutDate = row.metricDate;
    }

    if (
      row.hadCompletedBooking &&
      (!existing.lastBookingDate || row.metricDate > existing.lastBookingDate)
    ) {
      existing.lastBookingDate = row.metricDate;
    }

    if (!existing.firstCompletedWorkoutDate && row.firstCompletedWorkoutDate) {
      existing.firstCompletedWorkoutDate = row.firstCompletedWorkoutDate;
    }

    if (!existing.firstCompletedBookingDate && row.firstCompletedBookingDate) {
      existing.firstCompletedBookingDate = row.firstCompletedBookingDate;
    }
  });

  return Array.from(snapshotMap.values())
    .map((snapshot) => {
      const activationType = snapshot.firstCompletedWorkoutDate
        ? "workout"
        : snapshot.firstCompletedBookingDate
          ? "booking"
          : "none";
      const daysSinceLastWorkout = diffDays(endDate, snapshot.lastWorkoutDate);
      const daysSinceLastBooking = diffDays(endDate, snapshot.lastBookingDate);
      const daysSinceLastAnyActivity = diffDays(endDate, snapshot.lastAnyActivityDate);

      return {
        ...snapshot,
        activationType,
        daysSinceLastWorkout,
        daysSinceLastBooking,
        daysSinceLastAnyActivity,
        isWorkoutActive7d:
          daysSinceLastWorkout !== null && daysSinceLastWorkout <= 7,
        isWorkoutInactive8to14d:
          daysSinceLastWorkout !== null &&
          daysSinceLastWorkout >= 8 &&
          daysSinceLastWorkout <= 14,
        isWorkoutInactive15to30d:
          daysSinceLastWorkout !== null &&
          daysSinceLastWorkout >= 15 &&
          daysSinceLastWorkout <= 30,
        isWorkoutInactive31PlusOrNever:
          daysSinceLastWorkout === null || daysSinceLastWorkout >= 31,
      };
    })
    .sort((a, b) => {
      const aPriority =
        a.activationType === "none"
          ? 0
          : a.activationType === "booking"
            ? 1
            : a.isWorkoutInactive31PlusOrNever
              ? 2
              : a.isWorkoutInactive15to30d
                ? 3
                : a.isWorkoutInactive8to14d
                  ? 4
                  : 5;
      const bPriority =
        b.activationType === "none"
          ? 0
          : b.activationType === "booking"
            ? 1
            : b.isWorkoutInactive31PlusOrNever
              ? 2
              : b.isWorkoutInactive15to30d
                ? 3
                : b.isWorkoutInactive8to14d
                  ? 4
                  : 5;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      const aDays = a.daysSinceLastWorkout ?? Number.POSITIVE_INFINITY;
      const bDays = b.daysSinceLastWorkout ?? Number.POSITIVE_INFINITY;

      if (aDays !== bDays) {
        return bDays - aDays;
      }

      return a.userName.localeCompare(b.userName);
    });
}

function monthDiff(startDate: string, endDate: string) {
  const [startYear, startMonth] = startDate.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = endDate.slice(0, 7).split("-").map(Number);

  return (endYear - startYear) * 12 + (endMonth - startMonth);
}

export async function getBIUserLifecycleDailyRows(
  filters: BIUserLifecycleFilters = {}
): Promise<BIUserLifecycleDailyRow[]> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from("bi_user_lifecycle_daily")
    .select("*")
    .order("metric_date", { ascending: true })
    .order("user_id", { ascending: true });

  if (filters.startDate) {
    query = query.gte("metric_date", toDateKey(filters.startDate));
  }

  if (filters.endDate) {
    query = query.lte("metric_date", toDateKey(filters.endDate));
  }

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch BI user lifecycle rows: ${error.message}`);
  }

  return ((data || []) as RawBIUserLifecycleDailyRow[]).map(mapLifecycleRow);
}

export async function getBIUserLifecycleOverview(
  filters: BIUserLifecycleFilters = {}
): Promise<BIUserLifecycleOverview> {
  const resolvedEndDate = filters.endDate
    ? startOfDay(new Date(toDateKey(filters.endDate)))
    : startOfDay(new Date());
  const resolvedStartDate = filters.startDate
    ? startOfDay(new Date(toDateKey(filters.startDate)))
    : startOfDay(subDays(resolvedEndDate, 29));
  const rollingStartDate = startOfDay(subDays(resolvedEndDate, 29));
  const queryStartDate =
    rollingStartDate < resolvedStartDate ? rollingStartDate : resolvedStartDate;

  const [rows, snapshots] = await Promise.all([
    getBIUserLifecycleDailyRows({
      ...filters,
      startDate: queryStartDate,
      endDate: resolvedEndDate,
    }),
    getCurrentBIUserLifecycleSnapshots(resolvedEndDate),
  ]);

  const rangeStartKey = toDateKey(resolvedStartDate);
  const rangeEndKey = toDateKey(resolvedEndDate);
  const rangeRows = rows.filter(
    (row) => row.metricDate >= rangeStartKey && row.metricDate <= rangeEndKey
  );
  const dailySeries = buildDailySeries(rangeRows, resolvedStartDate, resolvedEndDate);
  const dauStart = toDateKey(resolvedEndDate);
  const wauStart = toDateKey(startOfDay(subDays(resolvedEndDate, 6)));
  const mauStart = toDateKey(rollingStartDate);

  return {
    dailySeries,
    snapshots,
    summary: {
      signupsInRange: rangeRows.filter((row) => row.didSignup).length,
      firstWorkoutActivationsInRange: rangeRows.filter(
        (row) => row.didFirstCompletedWorkout
      ).length,
      firstBookingActivationsInRange: rangeRows.filter(
        (row) => row.didFirstCompletedBooking
      ).length,
      workoutActiveUsersInRange: getDistinctUsers(rangeRows, (row) => row.hadWorkoutSession),
      bookingActiveUsersInRange: getDistinctUsers(
        rangeRows,
        (row) => row.hadCompletedBooking
      ),
      anyActiveUsersInRange: getDistinctUsers(rangeRows, (row) => row.hadAnyActivity),
      packPurchasersInRange: getDistinctUsers(rangeRows, (row) => row.hadPackPurchase),
      dau: getDistinctUsers(
        rows,
        (row) => row.hadWorkoutSession && row.metricDate >= dauStart
      ),
      wau: getDistinctUsers(
        rows,
        (row) => row.hadWorkoutSession && row.metricDate >= wauStart
      ),
      mau: getDistinctUsers(
        rows,
        (row) => row.hadWorkoutSession && row.metricDate >= mauStart
      ),
      workoutActivatedUsers: snapshots.filter(
        (snapshot) => snapshot.activationType === "workout"
      ).length,
      bookingOnlyActivatedUsers: snapshots.filter(
        (snapshot) => snapshot.activationType === "booking"
      ).length,
      unactivatedUsers: snapshots.filter(
        (snapshot) => snapshot.activationType === "none"
      ).length,
      workoutActive7d: snapshots.filter((snapshot) => snapshot.isWorkoutActive7d).length,
      workoutInactive8to14d: snapshots.filter(
        (snapshot) => snapshot.isWorkoutInactive8to14d
      ).length,
      workoutInactive15to30d: snapshots.filter(
        (snapshot) => snapshot.isWorkoutInactive15to30d
      ).length,
      workoutInactive31PlusOrNever: snapshots.filter(
        (snapshot) => snapshot.isWorkoutInactive31PlusOrNever
      ).length,
    },
  };
}

export async function getBIUserWorkoutCohortRetention(
  options: BIUserWorkoutCohortRetentionOptions = {}
): Promise<BIUserWorkoutCohortRetentionRow[]> {
  const resolvedEndDate = options.endDate
    ? startOfDay(new Date(toDateKey(options.endDate)))
    : startOfDay(new Date());
  const cohortCount = options.cohortCount || 6;
  const maxPeriod = options.maxPeriod || 6;
  const cohortStartDate = startOfMonth(subMonths(resolvedEndDate, cohortCount - 1));
  const rows = await getBIUserLifecycleDailyRows({
    startDate: cohortStartDate,
    endDate: resolvedEndDate,
  });

  const grouped = new Map<
    string,
    {
      cohortUsers: Set<string>;
      activeUsersByPeriod: Map<number, Set<string>>;
    }
  >();

  rows.forEach((row) => {
    const cohort = grouped.get(row.signupCohortMonth) || {
      cohortUsers: new Set<string>(),
      activeUsersByPeriod: new Map<number, Set<string>>(),
    };

    if (row.didSignup) {
      cohort.cohortUsers.add(row.userId);
    }

    if (row.hadWorkoutSession) {
      const period = monthDiff(row.signupCohortMonth, row.metricDate);

      if (period >= 0 && period <= maxPeriod) {
        const activeUsers = cohort.activeUsersByPeriod.get(period) || new Set<string>();
        activeUsers.add(row.userId);
        cohort.activeUsersByPeriod.set(period, activeUsers);
      }
    }

    grouped.set(row.signupCohortMonth, cohort);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cohortMonth, data]) => {
      const cohortSize = data.cohortUsers.size;
      const periods: BIUserWorkoutCohortRetentionPoint[] = [];

      for (let period = 0; period <= maxPeriod; period += 1) {
        const activeUsers =
          period === 0
            ? cohortSize
            : data.activeUsersByPeriod.get(period)?.size || 0;

        periods.push({
          period,
          activeUsers,
          retentionRate:
            cohortSize > 0 ? Number(((activeUsers / cohortSize) * 100).toFixed(2)) : 0,
        });
      }

      return {
        cohortMonth,
        cohortSize,
        periods,
      };
    });
}
