// Database types based on GoFit Supabase schema

export interface UserProfile {
  id: string; // Primary key, references auth.users(id)
  // Note: display_name is stored in auth.users.user_metadata, not here
  weight: number | null;
  weight_unit: string | null;
  height: number | null;
  height_unit: string | null;
  goal: string | null;
  profile_picture_url: string | null;
  activity_level: string | null;
  age: number | null;
  gender: string | null;
  is_admin: boolean;
  notification_preferences: Record<string, any> | null;
  rest_timer_preferences: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[] | null;
  image_url: string | null;
  video_url: string | null;
  instructions: string | null;
  equipment: string[] | null;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  default_sets: number | null;
  default_reps: number | null;
  default_rest_time: number | null;
  created_at: string;
  updated_at: string;
}

export interface Workout {
  id: string;
  user_id: string | null; // null for native workouts
  name: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Custom";
  image_url: string | null;
  workout_type: "native" | "custom";
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  sets: number;
  reps: string; // Can be "10" or "12,10,8"
  rest_time: number; // seconds
  exercise_order: number;
  day: number | null; // 1-7 for split workouts
  // Snapshot fields (preserve exercise data at time of workout creation)
  exercise_name: string | null;
  exercise_image_url: string | null;
  exercise_equipment: string[] | null;
  exercise_difficulty: string | null;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_id: string | null;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  date: string | null;
  calories: number | null;
  exercises_completed: Record<string, any> | null; // JSONB
  notes: string | null;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Type for workout with exercises joined
export interface WorkoutWithExercises extends Workout {
  exercises: (WorkoutExercise & {
    exercise: Exercise;
  })[];
}

// Form types
export interface ExerciseFormData {
  name: string;
  category: string;
  muscle_groups: string[];
  image_url?: string;
  video_url?: string;
  instructions?: string;
  equipment: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

export interface WorkoutFormData {
  name: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  image_url?: string;
  exercises: {
    exercise_id: string;
    sets: number;
    reps: string;
    rest_time: number;
    exercise_order: number;
    day?: number;
  }[];
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
