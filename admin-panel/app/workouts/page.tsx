import { createAdminClient } from "@/lib/supabase/admin";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Target, TrendingUp, Award } from "lucide-react";
import Link from "next/link";
import type { Workout, WorkoutExercise, Exercise } from "@/types/database";
import WorkoutSearchFilter from "@/components/workouts/WorkoutSearchFilter";
import { EmptyWorkoutsState } from "@/components/workouts/EmptyWorkoutsState";

type WorkoutWithExercises = Workout & {
  workout_exercises: (WorkoutExercise & {
    exercises: Exercise;
  })[];
};

async function getWorkouts() {
  try {
    const adminClient = createAdminClient();

    const { data: workouts, error } = await adminClient
      .from("workouts")
      .select(
        `
        *,
        workout_exercises (
          *,
          exercises (*)
        )
      `
      )
      .eq("workout_type", "native")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching workouts:", error);
      return [];
    }

    return workouts as WorkoutWithExercises[];
  } catch (error: any) {
    console.error("Unexpected error in getWorkouts:", error);
    return [];
  }
}


export default async function WorkoutsPage() {
  const workouts = await getWorkouts();

  const stats = {
    total: workouts.length,
    beginner: workouts.filter((w) => w.difficulty === "Beginner").length,
    intermediate: workouts.filter((w) => w.difficulty === "Intermediate").length,
    advanced: workouts.filter((w) => w.difficulty === "Advanced").length,
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-6 page-transition">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Native Workouts</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage pre-built workouts available to all users
          </p>
        </div>
        <Link href="/workouts/new" className="w-full sm:w-auto">
          <Button className="btn-smooth w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Workout
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground icon-rotate" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All native workouts
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beginner</CardTitle>
            <Target className="h-4 w-4 text-green-600 icon-rotate" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.beginner}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Entry level workouts
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intermediate</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600 icon-rotate" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.intermediate}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Mid-level workouts
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Advanced</CardTitle>
            <Award className="h-4 w-4 text-red-600 icon-rotate" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.advanced}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Expert level workouts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workouts List with Search/Filter */}
      {workouts.length === 0 ? (
        <EmptyWorkoutsState />
      ) : (
        <WorkoutSearchFilter workouts={workouts} />
      )}
    </div>
  );
}
