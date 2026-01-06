// src/services/exercises.ts
import { supabase } from "@/api/client";

export type Exercise = {
  id: string;
  name: string;
  category: string;
  muscleGroups: string[]; // ou string si stocké en CSV
  image_url?: string;
};

export const getExercises = async (): Promise<Exercise[]> => {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
};
