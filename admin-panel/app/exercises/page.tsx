import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Dumbbell } from "lucide-react";
import Link from "next/link";
import type { Exercise } from "@/types/database";
import ExerciseSearchFilter from "@/components/exercises/ExerciseSearchFilter";
import { EmptyState } from "@/components/ui/empty-state";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getExercises() {
  try {
    const adminClient = createAdminClient();

    const { data: exercises, error } = await adminClient
      .from("exercises")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching exercises:", error);
      return [];
    }

    return exercises as Exercise[];
  } catch (error: any) {
    console.error("Unexpected error in getExercises:", error);
    return [];
  }
}


export default async function ExercisesPage() {
  const exercises = await getExercises();

  const stats = {
    total: exercises.length,
    beginner: exercises.filter((e) => e.difficulty === "Beginner").length,
    intermediate: exercises.filter((e) => e.difficulty === "Intermediate").length,
    advanced: exercises.filter((e) => e.difficulty === "Advanced").length,
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-6 page-transition">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Exercise Library</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage all exercises available in the app
          </p>
        </div>
        <Link href="/exercises/new" className="w-full sm:w-auto">
          <Button className="btn-smooth w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Exercise
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exercises</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground icon-rotate" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="card-hover stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beginner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.beginner}</div>
          </CardContent>
        </Card>
        <Card className="card-hover stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intermediate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.intermediate}</div>
          </CardContent>
        </Card>
        <Card className="card-hover stagger-item">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Advanced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.advanced}</div>
          </CardContent>
        </Card>
      </div>

      {/* Exercise Table with Filters */}
      {exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No exercises yet"
          description="Get started by adding your first exercise to the library. Exercises can be used to build custom workouts."
          action={{
            label: "Add Exercise",
            href: "/exercises/new",
          }}
        />
      ) : (
        <ExerciseSearchFilter exercises={exercises} />
      )}
    </div>
  );
}
