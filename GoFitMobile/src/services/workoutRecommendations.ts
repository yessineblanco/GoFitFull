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
  adaptation?: {
    volumeAdjustment: 'reduce' | 'maintain' | 'increase';
    readinessLevel: 'unknown' | 'low' | 'moderate' | 'high';
    readinessScore?: number | null;
    daysSinceLastWorkout?: number | null;
    rationale?: string;
    coachContext?: {
      hasAssignedProgram: boolean;
      hasActivePack: boolean;
      programTitle?: string | null;
      guidance?: string;
    };
  };
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
