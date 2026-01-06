// src/types/workoutPlan.ts

import { WorkoutInfo } from "./session";

export interface WorkoutPlan {
  id: string;
  user_id: string;
  planned_date: string; // YYYY-MM-DD
  planned_time?: string | null; // HH:MM:SS
  planned_day?: number; // Day number in the workout (1, 2, 3...)
  status: "planned" | "started" | "completed" | "skipped";

  workout: WorkoutInfo;
  session_id?: string | null;

  created_at?: string;
}
