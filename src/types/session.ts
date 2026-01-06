export interface WorkoutInfo {
  id: string;
  name: string;
  image_url?: string;
  difficulty?: string;
  workout_type: "native" | "custom";
  duration?: number;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CompletedExercise {
  exercise_name: string;
  sets: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  date?: string | null;
  started_at?: string;
  completed_at?: string | null;
  calories?: number;
  notes?: string;
  workout?: WorkoutInfo | null;
  exercises_completed?: CompletedExercise[];
}

