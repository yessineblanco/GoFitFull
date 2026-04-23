import {
  getCoachPerformanceData,
  getUserGrowthData,
  getPopularExercises,
  getWorkoutCompletionRates,
  getEngagementMetrics,
  getActivityHeatmap,
  getRecentActivity,
  getSessionActivityData,
} from "@/lib/analytics";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import CoachPerformanceTable from "@/components/analytics/CoachPerformanceTable";
import SessionActivityChart from "@/components/analytics/SessionActivityChart";
import UserGrowthChart from "@/components/analytics/UserGrowthChart";
import PopularExercisesCard from "@/components/analytics/PopularExercisesCard";
import WorkoutCompletionCard from "@/components/analytics/WorkoutCompletionCard";
import EngagementMetricsCards from "@/components/analytics/EngagementMetricsCards";
import ActivityHeatmap from "@/components/analytics/ActivityHeatmap";
import RecentActivityFeed from "@/components/analytics/RecentActivityFeed";
import { SystemHealth } from "@/components/health/SystemHealth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, Dumbbell, UserCheck } from "lucide-react";

async function getAnalyticsData() {
  try {
    const [
      userGrowth,
      popularExercises,
      workoutCompletion,
      engagement,
      heatmap,
      recentActivity,
      sessionActivity,
      coachPerformance,
    ] = await Promise.all([
      getUserGrowthData(30, "daily"),
      getPopularExercises(10),
      getWorkoutCompletionRates(10),
      getEngagementMetrics(),
      getActivityHeatmap(),
      getRecentActivity(10),
      getSessionActivityData(30),
      getCoachPerformanceData(30, 5),
    ]);

    return {
      userGrowth,
      popularExercises,
      workoutCompletion,
      engagement,
      heatmap,
      recentActivity,
      sessionActivity,
      coachPerformance,
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
      sessionActivity: {
        points: [],
        summary: {
          totalWorkoutSessions: 0,
          completedWorkouts: 0,
          workoutCompletionRate: 0,
          completedBookings: 0,
          activeUsers: 0,
          activeCoaches: 0,
        },
      },
      coachPerformance: {
        rows: [],
        summary: {
          approvedCoaches: 0,
          activeCoaches: 0,
          totalCompletedBookings: 0,
        },
      },
    };
  }
}

export default async function DashboardPage() {
  const data = await getAnalyticsData();

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-6 page-transition">
      <div className="flex items-center justify-between space-y-2 fade-in">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            BI v1 stays inside the main dashboard and focuses on trustworthy growth,
            session activity, and coach performance.
          </p>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <EngagementMetricsCards metrics={data.engagement} />
      </div>

      {/* BI v1 Snapshot */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workout Sessions (30d)</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.sessionActivity.summary.totalWorkoutSessions}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.sessionActivity.summary.completedWorkouts} completed workouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workout Completion</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(data.sessionActivity.summary.workoutCompletionRate)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Based on all workout sessions in the last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Bookings (30d)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.coachPerformance.summary.totalCompletedBookings}
            </div>
            <p className="text-xs text-muted-foreground">
              Coach-led sessions marked completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Coaches (30d)</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.coachPerformance.summary.activeCoaches}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.coachPerformance.summary.approvedCoaches} approved coaches total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* BI v1 Trend + Coach Snapshot */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SessionActivityChart data={data.sessionActivity.points} />
        </div>
        <div className="lg:col-span-2">
          <CoachPerformanceTable coaches={data.coachPerformance.rows} />
        </div>
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
