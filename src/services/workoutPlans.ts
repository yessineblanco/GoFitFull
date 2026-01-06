import { supabase } from "@/api/client";
import { WorkoutPlan } from "@/types/workoutPlan";

export const getWorkoutPlans = async (
  userId: string
): Promise<WorkoutPlan[]> => {
  const { data, error } = await supabase
    .from("workout_plans")
    .select(`
      id,
      user_id,
      planned_date,
      planned_time,
      planned_day,
      status,
      session_id,
      created_at,
      workout:workouts (
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
    .eq("user_id", userId);

  if (error) {
    console.error("fetch workout plans error", error);
    throw error;
  }

  return (data || []).map((p: any) => ({
    ...p,
    workout: p.workout,
  }));
};

export const createWorkoutPlan = async (
  userId: string,
  workoutId: string,
  date: string,
  day?: number
): Promise<WorkoutPlan | null> => {
  const plannedDayValue = day || 1;

  // Check if this specific workout day already exists on this date
  const { data: existingPlans, error: checkError } = await supabase
    .from("workout_plans")
    .select("id, planned_day, planned_time")
    .eq("user_id", userId)
    .eq("workout_id", workoutId)
    .eq("planned_date", date);

  if (checkError) {
    console.error("error checking existing plans", checkError);
  }

  // Check if this exact workout day already exists on this date
  const duplicateDay = existingPlans?.find(p => p.planned_day === plannedDayValue);
  if (duplicateDay) {
    const error = {
      code: "23505",
      message: `You've already scheduled Day ${plannedDayValue} of this workout for this date. Please choose a different day or date.`,
      details: "Duplicate workout day on same date",
      hint: "You can schedule different workout days on the same date (e.g., Day 1 morning, Day 2 evening)"
    };
    throw error;
  }

  // Generate a unique time to work around database constraint
  // Database has unique constraint on (user_id, workout_id, planned_date) only
  // We use planned_time to differentiate multiple workouts on same day
  let plannedTime = "08:00"; // Default morning time
  if (existingPlans && existingPlans.length > 0) {
    // Auto-generate different times for each workout on same day
    const existingTimes = existingPlans.map(p => p.planned_time).filter(Boolean);
    const timeSlots = ["08:00", "12:00", "16:00", "18:00", "20:00"];
    plannedTime = timeSlots.find(t => !existingTimes.includes(t)) || `${8 + existingPlans.length}:00`;
  }

  const { data, error } = await supabase
    .from("workout_plans")
    .insert({
      user_id: userId,
      workout_id: workoutId,
      planned_date: date,
      planned_day: plannedDayValue,
      planned_time: plannedTime, // Add time to make it unique in database
      status: "planned",
    })
    .select(`
      *,
      workout:workouts (*)
    `)
    .single();

  if (error) {
    console.error("create workout plan error", error);
    throw error;
  }

  return {
    ...data,
    workout: data.workout,
  };
};

export const updateWorkoutPlanStatus = async (
  planId: string,
  status: 'completed' | 'skipped' | 'planned',
  sessionId?: string
): Promise<void> => {
  const updateData: any = { status };
  if (sessionId) {
    updateData.session_id = sessionId;
  }

  const { error } = await supabase
    .from("workout_plans")
    .update(updateData)
    .eq("id", planId);

  if (error) {
    console.error("update workout plan status error", error);
    throw error;
  }
};

export const deleteWorkoutPlan = async (planId: string): Promise<void> => {
  const { error } = await supabase
    .from("workout_plans")
    .delete()
    .eq("id", planId);

  if (error) {
    console.error("delete workout plan error", error);
    throw error;
  }
};

export const updateWorkoutPlanTime = async (
  planId: string,
  time: string // HH:MM
): Promise<void> => {
  const { error } = await supabase
    .from("workout_plans")
    .update({ planned_time: time }) // Ensure database column is TIME type
    .eq("id", planId);

  if (error) {
    console.error("update workout plan time error", error);
    throw error;
  }
};
