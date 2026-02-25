import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WorkoutForm } from "@/components/workouts/WorkoutForm";
import { notFound } from "next/navigation";
import type { Workout, WorkoutExercise, Exercise } from "@/types/database";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type WorkoutWithExercises = Workout & {
  workout_exercises: (WorkoutExercise & {
    exercises: Exercise;
  })[];
};

async function getWorkout(id: string) {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
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
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching workout:", error);
      return null;
    }

    return data as WorkoutWithExercises;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workout = await getWorkout(id);

  if (!workout) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/workouts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Workout</h2>
          <p className="text-muted-foreground">
            Update workout details for {workout.name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workout Details</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkoutForm
            workout={workout}
            workoutExercises={workout.workout_exercises}
            isEditing={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
