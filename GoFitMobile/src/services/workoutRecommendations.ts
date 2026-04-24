import { supabase } from '@/config/supabase';

export interface AIWorkoutExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  restTime: string;
  image?: string;
  category?: string;
  muscle_groups?: string[];
  equipment?: string[];
  difficulty?: string;
}

export interface AIWorkoutRecommendation {
  name: string;
  difficulty: 'Custom';
  focus: string;
  reason: string;
  image_url?: string | null;
  exercises: AIWorkoutExercise[];
}

export const workoutRecommendationService = {
  async generateAIWorkout(): Promise<AIWorkoutRecommendation> {
    const { data, error } = await supabase.functions.invoke('ai-workout-recommendation');

    if (error) {
      throw new Error(error.message || 'Failed to generate AI workout');
    }

    if (!data?.exercises || data.exercises.length === 0) {
      throw new Error('AI did not return a usable workout');
    }

    return data as AIWorkoutRecommendation;
  },
};
