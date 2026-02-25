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
import type { Exercise } from "@/types/database";

interface ExportExercisesButtonProps {
  exercises: Exercise[];
}

export function ExportExercisesButton({ exercises }: ExportExercisesButtonProps) {
  const handleExportCSV = () => {
    const data = exercises.map((exercise) => ({
      Name: exercise.name,
      Category: exercise.category,
      Difficulty: exercise.difficulty,
      "Muscle Groups": exercise.muscle_groups?.join("; ") || "",
      Equipment: exercise.equipment?.join("; ") || "None",
      "Default Sets": exercise.default_sets || "",
      "Default Reps": exercise.default_reps || "",
      "Rest Time (seconds)": exercise.default_rest_time || "",
      "Image URL": exercise.image_url || "",
      "Video URL": exercise.video_url || "",
      Instructions: exercise.instructions || "",
      "Created At": exercise.created_at ? new Date(exercise.created_at).toLocaleString() : "",
      "Updated At": exercise.updated_at ? new Date(exercise.updated_at).toLocaleString() : "",
    }));

    exportToCSV(data, `exercises-${new Date().toISOString().split("T")[0]}`);
  };

  const handleExportJSON = () => {
    const data = exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      difficulty: exercise.difficulty,
      muscle_groups: exercise.muscle_groups || [],
      equipment: exercise.equipment || [],
      default_sets: exercise.default_sets,
      default_reps: exercise.default_reps,
      default_rest_time: exercise.default_rest_time,
      image_url: exercise.image_url,
      video_url: exercise.video_url,
      instructions: exercise.instructions,
      created_at: exercise.created_at,
      updated_at: exercise.updated_at,
    }));

    exportToJSON(data, `exercises-${new Date().toISOString().split("T")[0]}`);
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
