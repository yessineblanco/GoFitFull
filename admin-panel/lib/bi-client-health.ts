import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns";
import { createAdminClient } from "./supabase/admin";

interface RawBIClientHealthDailyRow {
  metric_date: string;
  user_id: string;
  signup_date: string;
  workout_sessions_started: number | null;
  completed_workouts_count: number | null;
  completed_workout_minutes: number | null;
  had_workout_session: boolean | null;
  had_completed_workout: boolean | null;
  meal_logs_count: number | null;
  logged_calories: number | string | null;
  logged_protein_g: number | string | null;
  logged_carbs_g: number | string | null;
  logged_fat_g: number | string | null;
  had_nutrition_log: boolean | null;
  calories_goal: number | null;
  protein_goal_g: number | string | null;
  carbs_goal_g: number | string | null;
  fat_goal_g: number | string | null;
  calorie_goal_progress: number | string | null;
  protein_goal_progress: number | string | null;
  carbs_goal_progress: number | string | null;
  fat_goal_progress: number | string | null;
  body_measurements_count: number | null;
  had_body_measurement: boolean | null;
  completed_bookings_count: number | null;
  had_completed_booking: boolean | null;
  pack_purchases_count: number | null;
  had_pack_purchase: boolean | null;
  last_completed_workout_date: string | null;
  days_since_last_completed_workout: number | null;
  completed_workout_days_last_7d: number | null;
  completed_workout_days_last_28d: number | null;
  last_nutrition_log_date: string | null;
  days_since_last_nutrition_log: number | null;
  nutrition_log_days_last_7d: number | null;
  last_body_measurement_date: string | null;
  days_since_last_body_measurement: number | null;
  last_completed_booking_date: string | null;
  days_since_last_completed_booking: number | null;
  had_any_health_signal: boolean | null;
}

interface RawActivePackSnapshot {
  client_id: string;
  expires_at: string | null;
  sessions_remaining: number | null;
}

export interface BIClientHealthDailyRow {
  metricDate: string;
  userId: string;
  signupDate: string;
  workoutSessionsStarted: number;
  completedWorkoutsCount: number;
  completedWorkoutMinutes: number;
  hadWorkoutSession: boolean;
  hadCompletedWorkout: boolean;
  mealLogsCount: number;
  loggedCalories: number;
  loggedProteinG: number;
  loggedCarbsG: number;
  loggedFatG: number;
  hadNutritionLog: boolean;
  caloriesGoal: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
  calorieGoalProgress: number | null;
  proteinGoalProgress: number | null;
  carbsGoalProgress: number | null;
  fatGoalProgress: number | null;
  bodyMeasurementsCount: number;
  hadBodyMeasurement: boolean;
  completedBookingsCount: number;
  hadCompletedBooking: boolean;
  packPurchasesCount: number;
  hadPackPurchase: boolean;
  lastCompletedWorkoutDate: string | null;
  daysSinceLastCompletedWorkout: number | null;
  completedWorkoutDaysLast7d: number;
  completedWorkoutDaysLast28d: number;
  lastNutritionLogDate: string | null;
  daysSinceLastNutritionLog: number | null;
  nutritionLogDaysLast7d: number;
  lastBodyMeasurementDate: string | null;
  daysSinceLastBodyMeasurement: number | null;
  lastCompletedBookingDate: string | null;
  daysSinceLastCompletedBooking: number | null;
  hadAnyHealthSignal: boolean;
}

export interface BIClientHealthSeriesPoint {
  date: string;
  workoutActiveUsers: number;
  nutritionLoggingUsers: number;
  bodyMeasurementUsers: number;
  bookingUsers: number;
  packPurchasers: number;
  calorieGoalUsers: number;
}

export interface BIClientHealthSnapshotRow {
  userId: string;
  userName: string;
  signupDate: string;
  lastCompletedWorkoutDate: string | null;
  daysSinceLastCompletedWorkout: number | null;
  completedWorkoutDaysLast7d: number;
  completedWorkoutDaysLast28d: number;
  lastNutritionLogDate: string | null;
  daysSinceLastNutritionLog: number | null;
  nutritionLogDaysLast7d: number;
  lastBodyMeasurementDate: string | null;
  daysSinceLastBodyMeasurement: number | null;
  lastCompletedBookingDate: string | null;
  daysSinceLastCompletedBooking: number | null;
  currentActivePackCount: number;
  currentExpiringPackCount7d: number;
  currentExpiringPackCount14d: number;
  currentRemainingSessions: number;
  workoutInactive7d: boolean;
  workoutInactive14d: boolean;
  nutritionInactive7d: boolean;
  hasRecentBodyMeasurement30d: boolean;
  atRiskSignalsCount: number;
}

export interface BIClientHealthOverview {
  dailyRows: BIClientHealthDailyRow[];
  dailySeries: BIClientHealthSeriesPoint[];
  snapshots: BIClientHealthSnapshotRow[];
  summary: {
    usersWithWorkoutLast7d: number;
    usersInactive14d: number;
    usersWithNutritionLast7d: number;
    usersWithRecentBodyMeasurement30d: number;
    usersWithExpiringPack7d: number;
    usersWithThreePlusRiskSignals: number;
  };
}

export interface BIClientHealthFilters {
  endDate?: Date | string;
  startDate?: Date | string;
  userId?: string;
}

function toDateKey(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value: boolean | null | undefined) {
  return value === true;
}

function getAuthDisplayName(
  authUser:
    | {
        email?: string | null;
        user_metadata?: {
          display_name?: string | null;
          full_name?: string | null;
        } | null;
      }
    | undefined,
  fallback: string
) {
  return (
    authUser?.user_metadata?.display_name ||
    authUser?.user_metadata?.full_name ||
    authUser?.email?.split("@")[0] ||
    fallback
  );
}

function mapDailyRow(row: RawBIClientHealthDailyRow): BIClientHealthDailyRow {
  return {
    metricDate: row.metric_date,
    userId: row.user_id,
    signupDate: row.signup_date,
    workoutSessionsStarted: toNumber(row.workout_sessions_started),
    completedWorkoutsCount: toNumber(row.completed_workouts_count),
    completedWorkoutMinutes: toNumber(row.completed_workout_minutes),
    hadWorkoutSession: toBoolean(row.had_workout_session),
    hadCompletedWorkout: toBoolean(row.had_completed_workout),
    mealLogsCount: toNumber(row.meal_logs_count),
    loggedCalories: toNumber(row.logged_calories),
    loggedProteinG: toNumber(row.logged_protein_g),
    loggedCarbsG: toNumber(row.logged_carbs_g),
    loggedFatG: toNumber(row.logged_fat_g),
    hadNutritionLog: toBoolean(row.had_nutrition_log),
    caloriesGoal: toNumber(row.calories_goal),
    proteinGoalG: toNumber(row.protein_goal_g),
    carbsGoalG: toNumber(row.carbs_goal_g),
    fatGoalG: toNumber(row.fat_goal_g),
    calorieGoalProgress: toNullableNumber(row.calorie_goal_progress),
    proteinGoalProgress: toNullableNumber(row.protein_goal_progress),
    carbsGoalProgress: toNullableNumber(row.carbs_goal_progress),
    fatGoalProgress: toNullableNumber(row.fat_goal_progress),
    bodyMeasurementsCount: toNumber(row.body_measurements_count),
    hadBodyMeasurement: toBoolean(row.had_body_measurement),
    completedBookingsCount: toNumber(row.completed_bookings_count),
    hadCompletedBooking: toBoolean(row.had_completed_booking),
    packPurchasesCount: toNumber(row.pack_purchases_count),
    hadPackPurchase: toBoolean(row.had_pack_purchase),
    lastCompletedWorkoutDate: row.last_completed_workout_date,
    daysSinceLastCompletedWorkout: row.days_since_last_completed_workout,
    completedWorkoutDaysLast7d: toNumber(row.completed_workout_days_last_7d),
    completedWorkoutDaysLast28d: toNumber(row.completed_workout_days_last_28d),
    lastNutritionLogDate: row.last_nutrition_log_date,
    daysSinceLastNutritionLog: row.days_since_last_nutrition_log,
    nutritionLogDaysLast7d: toNumber(row.nutrition_log_days_last_7d),
    lastBodyMeasurementDate: row.last_body_measurement_date,
    daysSinceLastBodyMeasurement: row.days_since_last_body_measurement,
    lastCompletedBookingDate: row.last_completed_booking_date,
    daysSinceLastCompletedBooking: row.days_since_last_completed_booking,
    hadAnyHealthSignal: toBoolean(row.had_any_health_signal),
  };
}

function buildDailySeries(
  rows: BIClientHealthDailyRow[],
  startDate: Date,
  endDate: Date
) {
  const grouped = new Map<string, BIClientHealthSeriesPoint>();

  rows.forEach((row) => {
    const existing = grouped.get(row.metricDate) || {
      date: row.metricDate,
      workoutActiveUsers: 0,
      nutritionLoggingUsers: 0,
      bodyMeasurementUsers: 0,
      bookingUsers: 0,
      packPurchasers: 0,
      calorieGoalUsers: 0,
    };

    if (row.hadWorkoutSession) {
      existing.workoutActiveUsers += 1;
    }

    if (row.hadNutritionLog) {
      existing.nutritionLoggingUsers += 1;
    }

    if (row.hadBodyMeasurement) {
      existing.bodyMeasurementUsers += 1;
    }

    if (row.hadCompletedBooking) {
      existing.bookingUsers += 1;
    }

    if (row.hadPackPurchase) {
      existing.packPurchasers += 1;
    }

    if (
      row.calorieGoalProgress !== null &&
      row.calorieGoalProgress >= 0.8 &&
      row.calorieGoalProgress <= 1.2
    ) {
      existing.calorieGoalUsers += 1;
    }

    grouped.set(row.metricDate, existing);
  });

  return eachDayOfInterval({ start: startDate, end: endDate }).map((date) => {
    const key = format(date, "yyyy-MM-dd");

    return (
      grouped.get(key) || {
        date: key,
        workoutActiveUsers: 0,
        nutritionLoggingUsers: 0,
        bodyMeasurementUsers: 0,
        bookingUsers: 0,
        packPurchasers: 0,
        calorieGoalUsers: 0,
      }
    );
  });
}

export async function getBIClientHealthDailyRows(
  filters: BIClientHealthFilters = {}
): Promise<BIClientHealthDailyRow[]> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from("bi_client_health_daily")
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
    throw new Error(`Failed to fetch BI client health rows: ${error.message}`);
  }

  return ((data || []) as RawBIClientHealthDailyRow[]).map(mapDailyRow);
}

export async function getCurrentBIClientHealthSnapshots(
  userId?: string,
  referenceDate: Date = new Date()
): Promise<BIClientHealthSnapshotRow[]> {
  const adminClient = createAdminClient();
  const referenceDateKey = toDateKey(referenceDate);
  let currentRowsQuery = adminClient
    .from("bi_client_health_daily")
    .select("*")
    .eq("metric_date", referenceDateKey);
  let activePacksQuery = adminClient
    .from("purchased_packs")
    .select("client_id, expires_at, sessions_remaining")
    .eq("status", "active");

  if (userId) {
    currentRowsQuery = currentRowsQuery.eq("user_id", userId);
    activePacksQuery = activePacksQuery.eq("client_id", userId);
  }

  const [currentRowsResult, activePacksResult, authUsersResult] = await Promise.all([
    currentRowsQuery,
    activePacksQuery,
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (currentRowsResult.error) {
    throw new Error(
      `Failed to fetch current BI client health rows: ${currentRowsResult.error.message}`
    );
  }

  if (activePacksResult.error) {
    throw new Error(
      `Failed to fetch current active packs for BI client health: ${activePacksResult.error.message}`
    );
  }

  const authMap = new Map(
    (authUsersResult.data?.users || []).map((user) => [user.id, user])
  );
  const activePacksByUser = new Map<
    string,
    {
      activePackCount: number;
      expiringPackCount7d: number;
      expiringPackCount14d: number;
      remainingSessions: number;
    }
  >();
  const today = startOfDay(referenceDate);
  const in7Days = startOfDay(subDays(today, -7));
  const in14Days = startOfDay(subDays(today, -14));

  ((activePacksResult.data || []) as RawActivePackSnapshot[]).forEach((pack) => {
    const existing = activePacksByUser.get(pack.client_id) || {
      activePackCount: 0,
      expiringPackCount7d: 0,
      expiringPackCount14d: 0,
      remainingSessions: 0,
    };

    existing.activePackCount += 1;
    existing.remainingSessions += toNumber(pack.sessions_remaining);

    if (pack.expires_at) {
      const expiresAt = startOfDay(new Date(pack.expires_at));

      if (expiresAt >= today && expiresAt <= in7Days) {
        existing.expiringPackCount7d += 1;
      }

      if (expiresAt >= today && expiresAt <= in14Days) {
        existing.expiringPackCount14d += 1;
      }
    }

    activePacksByUser.set(pack.client_id, existing);
  });

  return ((currentRowsResult.data || []) as RawBIClientHealthDailyRow[])
    .map(mapDailyRow)
    .map((row) => {
      const packSnapshot = activePacksByUser.get(row.userId) || {
        activePackCount: 0,
        expiringPackCount7d: 0,
        expiringPackCount14d: 0,
        remainingSessions: 0,
      };
      const workoutInactive7d =
        row.daysSinceLastCompletedWorkout === null || row.daysSinceLastCompletedWorkout > 6;
      const workoutInactive14d =
        row.daysSinceLastCompletedWorkout === null || row.daysSinceLastCompletedWorkout > 13;
      const nutritionInactive7d =
        row.daysSinceLastNutritionLog === null || row.daysSinceLastNutritionLog > 6;
      const hasRecentBodyMeasurement30d =
        row.daysSinceLastBodyMeasurement !== null && row.daysSinceLastBodyMeasurement <= 30;
      const atRiskSignalsCount = [
        workoutInactive7d,
        nutritionInactive7d,
        packSnapshot.expiringPackCount7d > 0,
        !hasRecentBodyMeasurement30d,
      ].filter(Boolean).length;

      return {
        userId: row.userId,
        userName: getAuthDisplayName(authMap.get(row.userId), "Client"),
        signupDate: row.signupDate,
        lastCompletedWorkoutDate: row.lastCompletedWorkoutDate,
        daysSinceLastCompletedWorkout: row.daysSinceLastCompletedWorkout,
        completedWorkoutDaysLast7d: row.completedWorkoutDaysLast7d,
        completedWorkoutDaysLast28d: row.completedWorkoutDaysLast28d,
        lastNutritionLogDate: row.lastNutritionLogDate,
        daysSinceLastNutritionLog: row.daysSinceLastNutritionLog,
        nutritionLogDaysLast7d: row.nutritionLogDaysLast7d,
        lastBodyMeasurementDate: row.lastBodyMeasurementDate,
        daysSinceLastBodyMeasurement: row.daysSinceLastBodyMeasurement,
        lastCompletedBookingDate: row.lastCompletedBookingDate,
        daysSinceLastCompletedBooking: row.daysSinceLastCompletedBooking,
        currentActivePackCount: packSnapshot.activePackCount,
        currentExpiringPackCount7d: packSnapshot.expiringPackCount7d,
        currentExpiringPackCount14d: packSnapshot.expiringPackCount14d,
        currentRemainingSessions: packSnapshot.remainingSessions,
        workoutInactive7d,
        workoutInactive14d,
        nutritionInactive7d,
        hasRecentBodyMeasurement30d,
        atRiskSignalsCount,
      };
    })
    .sort((a, b) => {
      if (b.atRiskSignalsCount !== a.atRiskSignalsCount) {
        return b.atRiskSignalsCount - a.atRiskSignalsCount;
      }

      if (b.currentExpiringPackCount7d !== a.currentExpiringPackCount7d) {
        return b.currentExpiringPackCount7d - a.currentExpiringPackCount7d;
      }

      if (
        (b.daysSinceLastCompletedWorkout ?? -1) !==
        (a.daysSinceLastCompletedWorkout ?? -1)
      ) {
        return (b.daysSinceLastCompletedWorkout ?? -1) - (a.daysSinceLastCompletedWorkout ?? -1);
      }

      return a.userName.localeCompare(b.userName);
    });
}

export async function getBIClientHealthOverview(
  filters: BIClientHealthFilters = {}
): Promise<BIClientHealthOverview> {
  const resolvedEndDate = filters.endDate
    ? startOfDay(new Date(toDateKey(filters.endDate)))
    : startOfDay(new Date());
  const resolvedStartDate = filters.startDate
    ? startOfDay(new Date(toDateKey(filters.startDate)))
    : startOfDay(subDays(resolvedEndDate, 29));

  const dailyRows = await getBIClientHealthDailyRows({
    ...filters,
    startDate: resolvedStartDate,
    endDate: resolvedEndDate,
  });

  const snapshots = await getCurrentBIClientHealthSnapshots(
    filters.userId,
    resolvedEndDate
  );

  return {
    dailyRows,
    dailySeries: buildDailySeries(dailyRows, resolvedStartDate, resolvedEndDate),
    snapshots,
    summary: {
      usersWithWorkoutLast7d: snapshots.filter((row) => !row.workoutInactive7d).length,
      usersInactive14d: snapshots.filter((row) => row.workoutInactive14d).length,
      usersWithNutritionLast7d: snapshots.filter((row) => !row.nutritionInactive7d).length,
      usersWithRecentBodyMeasurement30d: snapshots.filter(
        (row) => row.hasRecentBodyMeasurement30d
      ).length,
      usersWithExpiringPack7d: snapshots.filter(
        (row) => row.currentExpiringPackCount7d > 0
      ).length,
      usersWithThreePlusRiskSignals: snapshots.filter(
        (row) => row.atRiskSignalsCount >= 3
      ).length,
    },
  };
}
