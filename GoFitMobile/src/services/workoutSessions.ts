import { supabase } from "@/api/client";
import { WorkoutSession, WorkoutInfo } from "@/types/session";

type SupabaseSession = Omit<WorkoutSession, "workout"> & {
  workout: WorkoutInfo[] | null;
};

// Cette fonction n'est plus utilisée mais gardée pour compatibilité
const normalizeSession = (s: SupabaseSession): WorkoutSession => ({
  ...s,
  workout: s.workout?.[0] ?? null,
});

export const getSessions = async (
  userId: string
): Promise<WorkoutSession[]> => {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(`
      id,
      user_id,
      date,
      started_at,
      completed_at,
      calories,
      notes,
      workout_id,
      workouts (
        id,
        name,
        image_url,
        difficulty,
        workout_type,
        duration,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching sessions:", error);
    throw error;
  }

  // Créer l'objet workout à partir du join avec workouts
  return (data || []).map((session: any) => {
    const workoutData = session.workouts;
    const sessionDate = session.date || (session.started_at ? session.started_at.split("T")[0] : null);
    
    return {
      id: session.id,
      user_id: session.user_id,
      workout_id: session.workout_id,
      date: sessionDate,
      started_at: session.started_at,
      completed_at: session.completed_at,
      calories: session.calories,
      notes: session.notes,
      exercises_completed: session.exercises_completed ?? [],
      workout: workoutData
        ? {
            id: workoutData.id,
            name: workoutData.name,
            workout_type: workoutData.workout_type,
            image_url: workoutData.image_url,
            difficulty: workoutData.difficulty,
            duration: workoutData.duration,
                  created_at: workoutData.created_at,
      updated_at: workoutData.updated_at,
          }
        : null,
    };
  });
};
export const addSession = async (
  payload: Partial<WorkoutSession>
): Promise<WorkoutSession> => {
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert(payload)
    .select(`
      id,
      user_id,
      date,
      workout:workouts (
        id,
        name,
        image_url,
        workout_type
      )
    `)
    .single();

  if (error) throw error;

  return normalizeSession(data as SupabaseSession);
};
export const updateSession = async (
  id: string,
  patch: Partial<WorkoutSession>,
  userId: string
): Promise<WorkoutSession> => {
  const { data, error } = await supabase
    .from("workout_sessions")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select(`
      id,
      user_id,
      date,
      workout:workouts (
        id,
        name,
        image_url,
        workout_type
      )
    `)
    .single();

  if (error) throw error;

  return normalizeSession(data as SupabaseSession);
};
export const deleteSession = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
};

