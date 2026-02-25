"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToJSON } from "@/lib/export";
import type { Workout, WorkoutExercise, Exercise } from "@/types/database";

type WorkoutWithExercises = Workout & {
  workout_exercises?: (WorkoutExercise & {
    exercises?: Exercise;
  })[];
};

interface ExportWorkoutsButtonProps {
  workouts: WorkoutWithExercises[];
}

export function ExportWorkoutsButton({ workouts }: ExportWorkoutsButtonProps) {
  const handleExportCSV = () => {
    const data = workouts.map((workout) => {
      const exerciseCount = workout.workout_exercises?.length || 0;
      const hasSplits = workout.workout_exercises?.some(
        (we) => we.day && we.day > 1
      );
      const days = hasSplits
        ? [
            ...new Set(
              workout.workout_exercises?.map((we) => we.day).filter(Boolean) || []
            ),
          ].length
        : 1;

      return {
        Name: workout.name,
        Difficulty: workout.difficulty,
        "Exercise Count": exerciseCount,
        "Day Split": hasSplits ? `${days} days` : "Single day",
        "Image URL": workout.image_url || "",
        "Created At": workout.created_at
          ? new Date(workout.created_at).toLocaleString()
          : "",
        "Updated At": workout.updated_at
          ? new Date(workout.updated_at).toLocaleString()
          : "",
      };
    });

    exportToCSV(data, `workouts-${new Date().toISOString().split("T")[0]}`);
  };

  const handleExportJSON = () => {
    const data = workouts.map((workout) => ({
      id: workout.id,
      name: workout.name,
      difficulty: workout.difficulty,
      image_url: workout.image_url,
      workout_type: workout.workout_type,
      workout_exercises: workout.workout_exercises?.map((we) => ({
        exercise_id: we.exercise_id,
        day: we.day,
        exercise_order: we.exercise_order,
        sets: we.sets,
        reps: we.reps,
        rest_time: we.rest_time,
        exercise_name: we.exercises?.name || "",
      })) || [],
      created_at: workout.created_at,
      updated_at: workout.updated_at,
    }));

    exportToJSON(data, `workouts-${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON}>
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
