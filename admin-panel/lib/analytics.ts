import { createAdminClient } from "./supabase/admin";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  subMonths,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  parseISO,
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
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
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

// Get user growth data
export async function getUserGrowthData(
  days: number = 30,
  granularity: "daily" | "weekly" | "monthly" = "daily"
): Promise<UserGrowthData[]> {
  const adminClient = createAdminClient();
  
  const endDate = new Date();
  const startDate =
    granularity === "monthly"
      ? subMonths(endDate, Math.ceil(days / 30))
      : subDays(endDate, days);

  // Get all users with creation dates
  const { data: users } = await adminClient
    .from("user_profiles")
    .select("created_at")
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true });

  if (!users || users.length === 0) {
    return [];
  }

  // Generate date intervals
  let intervals: Date[] = [];
  if (granularity === "daily") {
    intervals = eachDayOfInterval({ start: startDate, end: endDate });
  } else if (granularity === "weekly") {
    intervals = eachWeekOfInterval({ start: startDate, end: endDate });
  } else {
    intervals = eachMonthOfInterval({ start: startDate, end: endDate });
  }

  // Count users per interval
  let cumulative = 0;
  const growthData: UserGrowthData[] = intervals.map((date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const usersInPeriod = users.filter((user) => {
      const userDate = format(parseISO(user.created_at), "yyyy-MM-dd");
      return userDate === dateStr;
    }).length;
    
    cumulative += usersInPeriod;
    
    return {
      date: format(date, granularity === "monthly" ? "MMM yyyy" : "MMM dd"),
      users: usersInPeriod,
      cumulative,
    };
  });

  return growthData;
}

// Get popular exercises
export async function getPopularExercises(limit: number = 10): Promise<PopularExercise[]> {
  const adminClient = createAdminClient();

  // Get all workout exercises with exercise details
  const { data: workoutExercises } = await adminClient
    .from("workout_exercises")
    .select("exercise_id, exercise:exercises(id, name, category)");

  if (!workoutExercises) {
    return [];
  }

  // Count exercise usage
  const exerciseUsage = new Map<string, { name: string; category: string; count: number }>();
  
  workoutExercises.forEach((we: any) => {
    if (we.exercise) {
      const existing = exerciseUsage.get(we.exercise.id) || {
        name: we.exercise.name,
        category: we.exercise.category,
        count: 0,
      };
      existing.count++;
      exerciseUsage.set(we.exercise.id, existing);
    }
  });

  // Convert to array and sort
  const sorted = Array.from(exerciseUsage.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      category: data.category,
      usageCount: data.count,
    }))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);

  return sorted;
}

// Get workout completion rates (native workouts only)
export async function getWorkoutCompletionRates(
  limit: number = 10
): Promise<WorkoutCompletionRate[]> {
  const adminClient = createAdminClient();

  // Only get sessions for native workouts (workout_type = 'native')
  const { data: sessions } = await adminClient
    .from("workout_sessions")
    .select("workout_id, completed_at, workouts!inner(name, workout_type)")
    .not("workout_id", "is", null)
    .eq("workouts.workout_type", "native");

  if (!sessions) {
    return [];
  }

  // Group by workout
  const workoutStats = new Map<
    string,
    { name: string; total: number; completed: number }
  >();

  sessions.forEach((session: any) => {
    if (!session.workout_id || !session.workouts) return;

    const existing = workoutStats.get(session.workout_id) || {
      name: session.workouts.name,
      total: 0,
      completed: 0,
    };
    existing.total++;
    if (session.completed_at) {
      existing.completed++;
    }
    workoutStats.set(session.workout_id, existing);
  });

  // Convert to array and calculate rates
  const rates = Array.from(workoutStats.entries())
    .map(([id, data]) => ({
      workout_id: id,
      workout_name: data.name,
      total_sessions: data.total,
      completed_sessions: data.completed,
      completion_rate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
    }))
    .sort((a, b) => b.total_sessions - a.total_sessions)
    .slice(0, limit);

  return rates;
}

// Get engagement metrics
export async function getEngagementMetrics(): Promise<EngagementMetrics> {
  const adminClient = createAdminClient();

  const now = new Date();
  const dayAgo = subDays(now, 1);
  const weekAgo = subDays(now, 7);
  const monthAgo = subDays(now, 30);

  const [dauResult, wauResult, mauResult, totalResult] = await Promise.all([
    // Daily Active Users
    adminClient
      .from("workout_sessions")
      .select("user_id", { count: "exact", head: true })
      .gte("started_at", dayAgo.toISOString()),
    // Weekly Active Users
    adminClient
      .from("workout_sessions")
      .select("user_id", { count: "exact", head: true })
      .gte("started_at", weekAgo.toISOString()),
    // Monthly Active Users
    adminClient
      .from("workout_sessions")
      .select("user_id", { count: "exact", head: true })
      .gte("started_at", monthAgo.toISOString()),
    // Total Users
    adminClient
      .from("user_profiles")
      .select("id", { count: "exact", head: true }),
  ]);

  return {
    dau: dauResult.count || 0,
    wau: wauResult.count || 0,
    mau: mauResult.count || 0,
    totalUsers: totalResult.count || 0,
  };
}

// Get activity heatmap data
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

  // Initialize heatmap data structure
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

  // Count sessions by day and hour
  sessions.forEach((session) => {
    const date = parseISO(session.started_at);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    
    const index = heatmapData.findIndex(
      (d) => d.day === days[dayOfWeek] && d.hour === hour
    );
    if (index !== -1) {
      heatmapData[index].count++;
    }
  });

  return heatmapData;
}

// Get recent activity
export async function getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
  const adminClient = createAdminClient();

  // Get recent workout sessions
  const { data: sessions } = await adminClient
    .from("workout_sessions")
    .select("id, user_id, completed_at, started_at")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (!sessions) {
    return [];
  }

  // Get user details for these sessions
  const userIds = [...new Set(sessions.map((s) => s.user_id))];
  const { data: authUsers } = await adminClient.auth.admin.listUsers();

  const activities: RecentActivity[] = sessions.map((session) => {
    const user = authUsers?.users.find((u) => u.id === session.user_id);
    return {
      id: session.id,
      type: "workout_completed" as const,
      user_name: user?.user_metadata?.display_name || user?.email || "Unknown",
      user_email: user?.email || "N/A",
      description: "Completed a workout",
      timestamp: session.completed_at,
    };
  });

  return activities.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
