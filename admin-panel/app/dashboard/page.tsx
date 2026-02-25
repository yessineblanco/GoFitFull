import {
  getUserGrowthData,
  getPopularExercises,
  getWorkoutCompletionRates,
  getEngagementMetrics,
  getActivityHeatmap,
  getRecentActivity,
} from "@/lib/analytics";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import UserGrowthChart from "@/components/analytics/UserGrowthChart";
import PopularExercisesCard from "@/components/analytics/PopularExercisesCard";
import WorkoutCompletionCard from "@/components/analytics/WorkoutCompletionCard";
import EngagementMetricsCards from "@/components/analytics/EngagementMetricsCards";
import ActivityHeatmap from "@/components/analytics/ActivityHeatmap";
import RecentActivityFeed from "@/components/analytics/RecentActivityFeed";
import { SystemHealth } from "@/components/health/SystemHealth";

async function getAnalyticsData() {
  try {
    const [
      userGrowth,
      popularExercises,
      workoutCompletion,
      engagement,
      heatmap,
      recentActivity,
    ] = await Promise.all([
      getUserGrowthData(30, "daily"),
      getPopularExercises(10),
      getWorkoutCompletionRates(10),
      getEngagementMetrics(),
      getActivityHeatmap(),
      getRecentActivity(10),
    ]);

    return {
      userGrowth,
      popularExercises,
      workoutCompletion,
      engagement,
      heatmap,
      recentActivity,
    };
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return {
      userGrowth: [],
      popularExercises: [],
      workoutCompletion: [],
      engagement: { dau: 0, wau: 0, mau: 0, totalUsers: 0 },
      heatmap: [],
      recentActivity: [],
    };
  }
}

export default async function DashboardPage() {
  const data = await getAnalyticsData();

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-6 page-transition">
      <div className="flex items-center justify-between space-y-2 fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
      </div>

      {/* Engagement Metrics */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <EngagementMetricsCards metrics={data.engagement} />
      </div>

      {/* Main Analytics Row */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
        {/* User Growth Chart - Takes full width on mobile, 2 columns on desktop */}
        <div className="lg:col-span-2">
          <UserGrowthChart data={data.userGrowth} />
        </div>
        {/* System Health - Sidebar */}
        <div className="lg:col-span-1">
          <SystemHealth />
        </div>
      </div>

      {/* Activity Heatmap - Full width */}
      <div className="grid gap-3 grid-cols-1">
        <ActivityHeatmap data={data.heatmap} />
      </div>

      {/* Workout Completion & Analytics Sidebar */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-5">
        {/* Left side - Workout Completion & Recent Activity stacked */}
        <div className="lg:col-span-3 space-y-3">
          <WorkoutCompletionCard workouts={data.workoutCompletion} />
          <RecentActivityFeed activities={data.recentActivity} />
        </div>
        {/* Popular Exercises - Right side */}
        <div className="lg:col-span-2">
          <PopularExercisesCard exercises={data.popularExercises} />
        </div>
      </div>
    </div>
  );
}
