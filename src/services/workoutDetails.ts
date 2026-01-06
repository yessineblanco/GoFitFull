import { supabase } from "@/api/client";

export const getWorkoutDetails = async (sessionId: string) => {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(`
      id,
      date,
      calories,
      notes,
      workouts (
        id,
        name,
        image_url,
        difficulty,
        duration,
        workout_type,
        workout_exercises (
          id,
          sets,
          reps,
          rest_time,
          exercise_order,
          exercises (
            id,
            name,
            image_url,
            category,
            muscle_groups,
            equipment,
            difficulty
          )
        )
      )
    `)
    .eq("id", sessionId)
    .single();

  if (error) {
    console.error("Error fetching workout details:", error);
    throw error;
  }

  return data;
};
