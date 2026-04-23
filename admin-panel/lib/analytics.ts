import { createAdminClient } from "./supabase/admin";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";

export interface UserGrowthData {
  date: string;
  users: number;
  cumulative: number;
}

export interface PopularExercise {
  id: string;
  name: string;
  category: string;
  usageCount: number;
}

export interface WorkoutCompletionRate {
  workout_id: string;
  workout_name: string;
  total_sessions: number;
  completed_sessions: number;
  completion_rate: number;
}

export interface EngagementMetrics {
  dau: number;
  wau: number;
  mau: number;
  totalUsers: number;
}

export interface ActivityHeatmapData {
  hour: number;
  day: string;
  count: number;
}

export interface RecentActivity {
  id: string;
  type: "workout_completed" | "user_joined" | "workout_created";
  user_name: string;
  user_email: string;
  description: string;
  timestamp: string;
}

interface AuthUserSummary {
  email?: string | null;
  user_metadata?: {
    display_name?: string | null;
  } | null;
}

interface WorkoutExerciseRow {
  exercise: {
    id: string;
    name: string;
    category: string;
  } | null;
}

interface WorkoutSessionRow {
  workout_id: string | null;
  completed_at: string | null;
  workouts: {
    name: string;
    workout_type: string;
  } | null;
}

export interface SessionActivityPoint {
  date: string;
  workoutSessions: number;
  completedWorkouts: number;
  completedBookings: number;
}

export interface SessionActivitySummary {
  totalWorkoutSessions: number;
  completedWorkouts: number;
  workoutCompletionRate: number;
  completedBookings: number;
  activeUsers: number;
  activeCoaches: number;
}

export interface SessionActivityData {
  points: SessionActivityPoint[];
  summary: SessionActivitySummary;
}

export interface CoachPerformanceRow {
  id: string;
  name: string;
  averageRating: number;
  totalReviews: number;
  completedBookings: number;
  activeClients: number;
  totalSessions: number;
}

export interface CoachPerformanceData {
  rows: CoachPerformanceRow[];
  summary: {
    approvedCoaches: number;
    activeCoaches: number;
    totalCompletedBookings: number;
  };
}

function getIntervalKey(
  date: Date,
  granularity: "daily" | "weekly" | "monthly"
) {
  if (granularity === "weekly") {
    return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }

  if (granularity === "monthly") {
    return format(startOfMonth(date), "yyyy-MM-dd");
  }

  return format(date, "yyyy-MM-dd");
}

function formatIntervalLabel(
  date: Date,
  granularity: "daily" | "weekly" | "monthly"
) {
  if (granularity === "monthly") {
    return format(date, "MMM yyyy");
  }

  return format(date, "MMM dd");
}

function getAuthDisplayName(user: AuthUserSummary | undefined, fallback: string) {
  return user?.user_metadata?.display_name || user?.email?.split("@")[0] || fallback;
}

async function getDistinctWorkoutUsersSince(
  adminClient: ReturnType<typeof createAdminClient>,
  since: Date
) {
  const { data: sessions } = await adminClient
    .from("workout_sessions")
    .select("user_id")
    .gte("started_at", since.toISOString());

  if (!sessions) {
    return 0;
  }

  return new Set(sessions.map((session) => session.user_id)).size;
}

export async function getUserGrowthData(
  days: number = 30,
  granularity: "daily" | "weekly" | "monthly" = "daily"
): Promise<UserGrowthData[]> {
  const adminClient = createAdminClient();
  const endDate = new Date();
  const startDate =
    granularity === "monthly"
      ? startOfMonth(subMonths(endDate, Math.max(0, Math.ceil(days / 30) - 1)))
      : granularity === "weekly"
        ? startOfWeek(subDays(endDate, Math.max(days - 1, 0)), { weekStartsOn: 1 })
        : startOfDay(subDays(endDate, Math.max(days - 1, 0)));

  const [{ data: users }, baselineResult] = await Promise.all([
    adminClient
      .from("user_profiles")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true }),
    adminClient
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .lt("created_at", startDate.toISOString()),
  ]);

  const intervals =
    granularity === "daily"
      ? eachDayOfInterval({ start: startDate, end: endDate })
      : granularity === "weekly"
        ? eachWeekOfInterval(
            { start: startDate, end: endDate },
            { weekStartsOn: 1 }
          )
        : eachMonthOfInterval({ start: startDate, end: endDate });

  const baselineCount = baselineResult.count || 0;

  if (!users || intervals.length === 0) {
    return intervals.map((date) => ({
      date: formatIntervalLabel(date, granularity),
      users: 0,
      cumulative: baselineCount,
    }));
  }

  const usersByInterval = new Map<string, number>();
  users.forEach((user) => {
    const key = getIntervalKey(parseISO(user.created_at), granularity);
    usersByInterval.set(key, (usersByInterval.get(key) || 0) + 1);
  });

  let cumulative = baselineCount;

  return intervals.map((date) => {
    const usersInPeriod = usersByInterval.get(getIntervalKey(date, granularity)) || 0;
    cumulative += usersInPeriod;

    return {
      date: formatIntervalLabel(date, granularity),
      users: usersInPeriod,
      cumulative,
    };
  });
}

export async function getPopularExercises(
  limit: number = 10
): Promise<PopularExercise[]> {
  const adminClient = createAdminClient();

  const { data: workoutExercises } = await adminClient
    .from("workout_exercises")
    .select("exercise_id, exercise:exercises(id, name, category)");

  if (!workoutExercises) {
    return [];
  }

  const exerciseUsage = new Map<
    string,
    { name: string; category: string; count: number }
  >();

  (workoutExercises as WorkoutExerciseRow[]).forEach((workoutExercise) => {
    if (!workoutExercise.exercise) {
      return;
    }

    const existing = exerciseUsage.get(workoutExercise.exercise.id) || {
      name: workoutExercise.exercise.name,
      category: workoutExercise.exercise.category,
      count: 0,
    };

    existing.count += 1;
    exerciseUsage.set(workoutExercise.exercise.id, existing);
  });

  return Array.from(exerciseUsage.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      category: data.category,
      usageCount: data.count,
    }))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}

export async function getWorkoutCompletionRates(
  limit: number = 10
): Promise<WorkoutCompletionRate[]> {
  const adminClient = createAdminClient();

  const { data: sessions } = await adminClient
    .from("workout_sessions")
    .select("workout_id, completed_at, workouts!inner(name, workout_type)")
    .not("workout_id", "is", null)
    .eq("workouts.workout_type", "native");

  if (!sessions) {
    return [];
  }

  const workoutStats = new Map<
    string,
    { name: string; total: number; completed: number }
  >();

  (sessions as WorkoutSessionRow[]).forEach((session) => {
    if (!session.workout_id || !session.workouts) {
      return;
    }

    const existing = workoutStats.get(session.workout_id) || {
      name: session.workouts.name,
      total: 0,
      completed: 0,
    };

    existing.total += 1;

    if (session.completed_at) {
      existing.completed += 1;
    }

    workoutStats.set(session.workout_id, existing);
  });

  return Array.from(workoutStats.entries())
    .map(([id, data]) => ({
      workout_id: id,
      workout_name: data.name,
      total_sessions: data.total,
      completed_sessions: data.completed,
      completion_rate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
    }))
    .sort((a, b) => b.total_sessions - a.total_sessions)
    .slice(0, limit);
}

export async function getEngagementMetrics(): Promise<EngagementMetrics> {
  const adminClient = createAdminClient();
  const now = new Date();

  const [dau, wau, mau, totalResult] = await Promise.all([
    getDistinctWorkoutUsersSince(adminClient, startOfDay(now)),
    getDistinctWorkoutUsersSince(adminClient, startOfDay(subDays(now, 6))),
    getDistinctWorkoutUsersSince(adminClient, startOfDay(subDays(now, 29))),
    adminClient.from("user_profiles").select("id", { count: "exact", head: true }),
  ]);

  return {
    dau,
    wau,
    mau,
    totalUsers: totalResult.count || 0,
  };
}

export async function getSessionActivityData(
  days: number = 30
): Promise<SessionActivityData> {
  const adminClient = createAdminClient();
  const endDate = new Date();
  const startDate = startOfDay(subDays(endDate, Math.max(days - 1, 0)));
  const intervalDays = eachDayOfInterval({ start: startDate, end: endDate });

  const [sessionsResult, bookingsResult] = await Promise.all([
    adminClient
      .from("workout_sessions")
      .select("user_id, started_at, completed_at")
      .gte("started_at", startDate.toISOString())
      .lte("started_at", endDate.toISOString()),
    adminClient
      .from("bookings")
      .select("coach_id, scheduled_at, status")
      .gte("scheduled_at", startDate.toISOString())
      .lte("scheduled_at", endDate.toISOString()),
  ]);

  const points = intervalDays.map((date) => ({
    date: format(date, "MMM dd"),
    workoutSessions: 0,
    completedWorkouts: 0,
    completedBookings: 0,
  }));

  const pointsByDate = new Map(
    intervalDays.map((date, index) => [format(date, "yyyy-MM-dd"), points[index]])
  );

  const activeUsers = new Set<string>();
  const activeCoaches = new Set<string>();
  let totalWorkoutSessions = 0;
  let completedWorkouts = 0;
  let completedBookings = 0;

  (sessionsResult.data || []).forEach((session) => {
    const point = pointsByDate.get(format(parseISO(session.started_at), "yyyy-MM-dd"));

    if (!point) {
      return;
    }

    point.workoutSessions += 1;
    totalWorkoutSessions += 1;
    activeUsers.add(session.user_id);

    if (session.completed_at) {
      point.completedWorkouts += 1;
      completedWorkouts += 1;
    }
  });

  (bookingsResult.data || []).forEach((booking) => {
    if (booking.status !== "completed") {
      return;
    }

    const point = pointsByDate.get(format(parseISO(booking.scheduled_at), "yyyy-MM-dd"));

    if (!point) {
      return;
    }

    point.completedBookings += 1;
    completedBookings += 1;
    activeCoaches.add(booking.coach_id);
  });

  return {
    points,
    summary: {
      totalWorkoutSessions,
      completedWorkouts,
      workoutCompletionRate:
        totalWorkoutSessions > 0 ? (completedWorkouts / totalWorkoutSessions) * 100 : 0,
      completedBookings,
      activeUsers: activeUsers.size,
      activeCoaches: activeCoaches.size,
    },
  };
}

export async function getCoachPerformanceData(
  days: number = 30,
  limit: number = 5
): Promise<CoachPerformanceData> {
  const adminClient = createAdminClient();
  const endDate = new Date();
  const startDate = startOfDay(subDays(endDate, Math.max(days - 1, 0)));

  const [coachProfilesResult, bookingsResult, packsResult, authUsersResult] =
    await Promise.all([
      adminClient
        .from("coach_profiles")
        .select("id, user_id, average_rating, total_reviews, total_sessions, status"),
      adminClient
        .from("bookings")
        .select("coach_id, status")
        .gte("scheduled_at", startDate.toISOString())
        .lte("scheduled_at", endDate.toISOString()),
      adminClient
        .from("purchased_packs")
        .select("coach_id, client_id")
        .eq("status", "active"),
      adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  const coachProfiles = coachProfilesResult.data || [];
  const approvedProfiles = coachProfiles.filter((coach) => coach.status === "approved");
  const sourceProfiles = approvedProfiles.length > 0 ? approvedProfiles : coachProfiles;

  const completedBookingsByCoach = new Map<string, number>();
  (bookingsResult.data || []).forEach((booking) => {
    if (booking.status !== "completed") {
      return;
    }

    completedBookingsByCoach.set(
      booking.coach_id,
      (completedBookingsByCoach.get(booking.coach_id) || 0) + 1
    );
  });

  const activeClientsByCoach = new Map<string, Set<string>>();
  (packsResult.data || []).forEach((pack) => {
    const clients = activeClientsByCoach.get(pack.coach_id) || new Set<string>();
    clients.add(pack.client_id);
    activeClientsByCoach.set(pack.coach_id, clients);
  });

  const authMap = new Map(
    (authUsersResult.data?.users || []).map((user) => [user.id, user])
  );

  const rows = sourceProfiles
    .map((coach) => ({
      id: coach.id,
      name: getAuthDisplayName(authMap.get(coach.user_id), "Coach"),
      averageRating: Number(coach.average_rating || 0),
      totalReviews: coach.total_reviews || 0,
      completedBookings: completedBookingsByCoach.get(coach.id) || 0,
      activeClients: activeClientsByCoach.get(coach.id)?.size || 0,
      totalSessions: coach.total_sessions || 0,
    }))
    .filter(
      (coach) =>
        coach.completedBookings > 0 ||
        coach.activeClients > 0 ||
        coach.totalReviews > 0 ||
        coach.totalSessions > 0
    )
    .sort((a, b) => {
      if (b.completedBookings !== a.completedBookings) {
        return b.completedBookings - a.completedBookings;
      }

      if (b.activeClients !== a.activeClients) {
        return b.activeClients - a.activeClients;
      }

      return b.averageRating - a.averageRating;
    })
    .slice(0, limit);

  return {
    rows,
    summary: {
      approvedCoaches: approvedProfiles.length,
      activeCoaches: sourceProfiles.filter(
        (coach) =>
          (completedBookingsByCoach.get(coach.id) || 0) > 0 ||
          (activeClientsByCoach.get(coach.id)?.size || 0) > 0
      ).length,
      totalCompletedBookings: Array.from(completedBookingsByCoach.values()).reduce(
        (sum, count) => sum + count,
        0
      ),
    },
  };
}

export async function getActivityHeatmap(): Promise<ActivityHeatmapData[]> {
  const adminClient = createAdminClient();
  const weekAgo = subDays(new Date(), 7);

  const { data: sessions } = await adminClient
    .from("workout_sessions")
    .select("started_at")
    .gte("started_at", weekAgo.toISOString());

  if (!sessions) {
    return [];
  }

  const heatmapData: ActivityHeatmapData[] = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmapData.push({
        day: days[day],
        hour,
        count: 0,
      });
    }
  }

  sessions.forEach((session) => {
    const date = parseISO(session.started_at);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    const index = heatmapData.findIndex(
      (entry) => entry.day === days[dayOfWeek] && entry.hour === hour
    );

    if (index !== -1) {
      heatmapData[index].count += 1;
    }
  });

  return heatmapData;
}

export async function getRecentActivity(
  limit: number = 10
): Promise<RecentActivity[]> {
  const adminClient = createAdminClient();

  const { data: sessions } = await adminClient
    .from("workout_sessions")
    .select("id, user_id, completed_at")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (!sessions) {
    return [];
  }

  const { data: authUsers } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const authMap = new Map((authUsers?.users || []).map((user) => [user.id, user]));

  return sessions
    .map((session) => {
      const user = authMap.get(session.user_id);

      return {
        id: session.id,
        type: "workout_completed" as const,
        user_name: getAuthDisplayName(user, "Unknown"),
        user_email: user?.email || "N/A",
        description: "Completed a workout",
        timestamp: session.completed_at,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}
