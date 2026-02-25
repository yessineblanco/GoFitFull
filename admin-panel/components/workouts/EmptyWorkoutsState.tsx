"use client";

import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function EmptyWorkoutsState() {
  return (
    <EmptyState
      icon={ListChecks}
      title="No workouts yet"
      description="Create your first native workout template. Workouts can include multiple exercises organized by days and sets."
      action={{
        label: "Create Workout",
        href: "/workouts/new",
      }}
    />
  );
}
