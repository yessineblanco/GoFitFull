import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups?: string[];
  image_url?: string;
  video_url?: string;
  instructions?: string;
  equipment?: string[];
  difficulty?: string;
  default_sets?: number;
  default_reps?: number;
  default_rest_time?: number;
}

export interface ExerciseConfig {
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
  day?: number;
}

export interface Workout {
  id: string;
  user_id?: string | null;
  name: string;
  difficulty: string;
  workout_type: 'native' | 'custom';
  wellness_category?: string;
  image_url?: string;
  exercises?: ExerciseConfig[];
  created_at: string;
  updated_at: string;
}

export interface CustomWorkout {
  id: string;
  user_id: string;
  name: string;
  difficulty: string;
  wellness_category?: string;
  image_url?: string;
  exercises: ExerciseConfig[];
  created_at: string;
  updated_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_id?: string;
  workout_name: string;
  workout_type: 'native' | 'custom';
  started_at: string;
  completed_at?: string;
  duration_minutes?: number;
  exercises_completed?: any[];
  notes?: string;
  created_at: string;
}

/**
 * Workout service for managing workouts, exercises, and workout sessions
 */
export const workoutService = {
  /**
   * Get all exercises from the exercise library
   */
  async getExercises(): Promise<Exercise[]> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      logger.error('Error fetching exercises:', error);
      throw new Error(`Failed to fetch exercises: ${error.message}`);
    }
  },

  /**
   * Check if a string is a valid UUID format
   */
  isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  },

  /**
   * Get a single exercise by ID
   */
  async getExerciseById(exerciseId: string): Promise<Exercise | null> {
    // Only query by ID if it's a valid UUID (custom workouts)
    // Native workouts use simple string IDs like "1", "2" which are not UUIDs
    if (!this.isValidUUID(exerciseId)) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      logger.error('Error fetching exercise by ID:', error);
      return null;
    }
  },

  /**
   * Get exercise by name (for native workouts that might use string IDs)
   */
  async getExerciseByName(exerciseName: string): Promise<Exercise | null> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('name', exerciseName)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      logger.error('Error fetching exercise by name:', error);
      return null;
    }
  },

  /**
   * Search exercises by name or category
   */
  async searchExercises(query: string): Promise<Exercise[]> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
        .order('name', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      logger.error('Error searching exercises:', error);
      throw new Error(`Failed to search exercises: ${error.message}`);
    }
  },

  /**
   * Get all native workouts (workouts with user_id = NULL and workout_type = 'native')
   * Optimized: Does NOT load exercises for better performance on list views.
   * Use getWorkoutById() if you need exercises.
   */
  async getNativeWorkouts(): Promise<Workout[]> {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          difficulty,
          workout_type,
          wellness_category,
          image_url,
          created_at,
          updated_at
        `)
        .is('user_id', null)
        .eq('workout_type', 'native')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Return workouts without exercises for better performance
      // Exercises are loaded on-demand via getWorkoutById() when needed
      return (data || []).map((workout) => ({
        ...workout,
        exercises: [], // Empty array - exercises loaded on demand
      }));
    } catch (error: any) {
      logger.error('Error fetching native workouts:', error);
      throw new Error(`Failed to fetch native workouts: ${error.message}`);
    }
  },

  /**
   * Get a workout by ID (works for both native and custom workouts)
   */
  async getWorkoutById(workoutId: string): Promise<Workout | null> {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          user_id,
          name,
          difficulty,
          workout_type,
          wellness_category,
          image_url,
          created_at,
          updated_at
        `)
        .eq('id', workoutId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      if (!data) return null;

      // Fetch exercises for the workout
      const exercises = await this.getWorkoutExercises(workoutId);

      return {
        ...data,
        exercises,
      };
    } catch (error: any) {
      logger.error('Error fetching workout by ID:', error);
      throw new Error(`Failed to fetch workout: ${error.message}`);
    }
  },

  /**
   * Get exercises for a workout from the workout_exercises junction table
   */
  async getWorkoutExercises(workoutId: string): Promise<ExerciseConfig[]> {
    try {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select(`
          sets,
          reps,
          rest_time,
          day,
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
        `)
        .eq('workout_id', workoutId)
        .order('day', { ascending: true })
        .order('exercise_order', { ascending: true });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.exercises?.id || '',
        name: item.exercises?.name || '',
        sets: item.sets?.toString() || '3',
        reps: item.reps?.toString() || '10',
        restTime: item.rest_time?.toString() || '60',
        image: item.exercises?.image_url,
        category: item.exercises?.category,
        muscle_groups: item.exercises?.muscle_groups,
        equipment: item.exercises?.equipment,
        difficulty: item.exercises?.difficulty,
        day: item.day || 1,
      }));
    } catch (error: any) {
      logger.error('Error fetching workout exercises:', error);
      throw new Error(`Failed to fetch workout exercises: ${error.message}`);
    }
  },

  /**
   * Get user's custom workouts (workouts with user_id set and workout_type = 'custom')
   * Optimized: Does NOT load exercises for better performance on list views.
   * Use getWorkoutById() if you need exercises.
   */
  async getCustomWorkouts(userId: string): Promise<CustomWorkout[]> {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          user_id,
          name,
          difficulty,
          workout_type,
          wellness_category,
          image_url,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .eq('workout_type', 'custom')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Return workouts without exercises for better performance
      // Exercises are loaded on-demand via getWorkoutById() when needed
      return (data || []).map((workout) => ({
        id: workout.id,
        user_id: workout.user_id || userId,
        name: workout.name,
        difficulty: workout.difficulty,
        wellness_category: workout.wellness_category,
        image_url: workout.image_url,
        exercises: [], // Empty array - exercises loaded on demand
        created_at: workout.created_at,
        updated_at: workout.updated_at,
      }));
    } catch (error: any) {
      logger.error('Error fetching custom workouts:', error);
      throw new Error(`Failed to fetch custom workouts: ${error.message}`);
    }
  },

  /**
   * Create a new custom workout
   */
  async createCustomWorkout(
    userId: string,
    workout: {
      name: string;
      difficulty?: string;
      wellness_category?: string;
      image_url?: string;
      exercises: ExerciseConfig[];
    }
  ): Promise<CustomWorkout> {
    try {
      // First, create the workout in the workouts table
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          name: workout.name,
          difficulty: workout.difficulty || 'Custom',
          workout_type: 'custom',
          wellness_category: workout.wellness_category || 'strength',
          image_url: workout.image_url,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      if (!workoutData) {
        throw new Error('Failed to create workout');
      }

      // Then, create the exercise associations in workout_exercises
      if (workout.exercises && workout.exercises.length > 0) {
        const exerciseInserts = workout.exercises.map((exercise, index) => ({
              workout_id: workoutData.id,
          exercise_id: exercise.id,
          sets: parseInt(exercise.sets) || 3,
          reps: parseInt(exercise.reps) || 10,
          rest_time: parseInt(exercise.restTime) || 60,
          day: exercise.day || 1,
              exercise_order: index,
        }));

        const { error: exercisesError } = await supabase
          .from('workout_exercises')
          .insert(exerciseInserts);

        if (exercisesError) {
          // Rollback: delete the workout if exercises fail
          await supabase.from('workouts').delete().eq('id', workoutData.id);
          throw exercisesError;
        }
      }

      // Fetch the complete workout with exercises
      const exercises = await this.getWorkoutExercises(workoutData.id);

      return {
        id: workoutData.id,
        user_id: workoutData.user_id || userId,
        name: workoutData.name,
        difficulty: workoutData.difficulty,
        wellness_category: workoutData.wellness_category,
        image_url: workoutData.image_url,
        exercises,
        created_at: workoutData.created_at,
        updated_at: workoutData.updated_at,
      };
    } catch (error: any) {
      logger.error('Error creating custom workout:', error);
      throw new Error(`Failed to create custom workout: ${error.message}`);
    }
  },

  /**
   * Update an existing custom workout
   */
  async updateCustomWorkout(
    workoutId: string,
    userId: string,
    updates: {
      name?: string;
      difficulty?: string;
      wellness_category?: string;
      image_url?: string;
      exercises?: ExerciseConfig[];
    }
  ): Promise<CustomWorkout> {
    try {
      // Update workout metadata
      const workoutUpdates: any = {};
      if (updates.name !== undefined) workoutUpdates.name = updates.name;
      if (updates.difficulty !== undefined) workoutUpdates.difficulty = updates.difficulty;
      if (updates.wellness_category !== undefined) workoutUpdates.wellness_category = updates.wellness_category;
      if (updates.image_url !== undefined) workoutUpdates.image_url = updates.image_url;

      if (Object.keys(workoutUpdates).length > 0) {
        const { error: workoutError } = await supabase
          .from('workouts')
          .update(workoutUpdates)
          .eq('id', workoutId)
          .eq('user_id', userId);

        if (workoutError) throw workoutError;
      }

      // Update exercises if provided
      if (updates.exercises !== undefined) {
        // Delete existing exercises
        const { error: deleteError } = await supabase
          .from('workout_exercises')
          .delete()
          .eq('workout_id', workoutId);

        if (deleteError) throw deleteError;

        // Insert new exercises
        if (updates.exercises.length > 0) {
          const exerciseInserts = updates.exercises.map((exercise, index) => ({
                workout_id: workoutId,
            exercise_id: exercise.id,
            sets: parseInt(exercise.sets) || 3,
            reps: parseInt(exercise.reps) || 10,
            rest_time: parseInt(exercise.restTime) || 60,
            day: exercise.day || 1,
                exercise_order: index,
          }));

          const { error: exercisesError } = await supabase
            .from('workout_exercises')
            .insert(exerciseInserts);

          if (exercisesError) throw exercisesError;
        }
      }

      // Fetch and return the updated workout
      const workout = await this.getWorkoutById(workoutId);
      if (!workout) {
        throw new Error('Workout not found after update');
      }

      const exercises = await this.getWorkoutExercises(workoutId);

      return {
        id: workout.id,
        user_id: workout.user_id || userId,
        name: workout.name,
        difficulty: workout.difficulty,
        wellness_category: workout.wellness_category,
        image_url: workout.image_url,
        exercises,
        created_at: workout.created_at,
        updated_at: workout.updated_at,
      };
    } catch (error: any) {
      logger.error('Error updating custom workout:', error);
      throw new Error(`Failed to update custom workout: ${error.message}`);
    }
  },

  /**
   * Delete a custom workout
   * Note: This will cascade delete workout_exercises due to foreign key constraints
   */
  async deleteCustomWorkout(workoutId: string, userId: string): Promise<void> {
    try {
      // First delete workout_exercises (if cascade doesn't work)
      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('workout_id', workoutId);

      if (exercisesError) {
        logger.warn('Error deleting workout exercises (may not exist):', exercisesError);
        // Continue anyway - exercises might not exist
      }

      // Then delete the workout
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error: any) {
      logger.error('Error deleting custom workout:', error);
      throw new Error(`Failed to delete custom workout: ${error.message}`);
    }
  },

  /**
   * Get workout sessions (history) for a user
   * NOTE: workout_name and workout_type are fetched from workouts table via join
   */
  async getWorkoutSessions(
    userId: string,
    limit?: number
  ): Promise<WorkoutSession[]> {
    try {
      let query = supabase
        .from('workout_sessions')
        .select(`
          *,
          workouts (
            name,
            workout_type
          )
        `)
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map the response to match the WorkoutSession interface
      return (data || []).map((session: any) => ({
        ...session,
        workout_name: session.workouts?.name || 'Unknown Workout',
        workout_type: session.workouts?.workout_type || 'custom',
      }));
    } catch (error: any) {
      logger.error('Error fetching workout sessions:', error);
      throw new Error(`Failed to fetch workout sessions: ${error.message}`);
    }
  },

  /**
   * Get the most recent incomplete workout session (not finished) for a user
   * Only returns the latest one - users typically only want to continue their most recent session
   * NOTE: workout_name and workout_type are fetched from workouts table via join
   */
  async getLatestIncompleteWorkoutSession(
    userId: string
  ): Promise<WorkoutSession | null> {
    try {
      // Get all incomplete sessions
      // Use a more explicit query to ensure we only get truly incomplete sessions
      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          workouts (
            name,
            workout_type
          )
        `)
        .eq('user_id', userId)
        .is('completed_at', null) // Only sessions that haven't been completed
        .order('started_at', { ascending: false });

      if (error) throw error;

      // Return null if no data
      if (!data || data.length === 0) {
        return null;
      }

      // Clean up sessions older than 24 hours (auto-complete them)
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const oldSessions = data.filter(session => {
        if (!session || !session.started_at) return false;
        try {
          const startedAt = new Date(session.started_at);
          return startedAt < twentyFourHoursAgo;
        } catch (e) {
          return false;
        }
      });

      // Auto-complete old sessions
      if (oldSessions.length > 0) {
        for (const oldSession of oldSessions) {
          if (!oldSession || !oldSession.id) continue;
          try {
            await supabase
              .from('workout_sessions')
              .update({ completed_at: now.toISOString() })
              .eq('id', oldSession.id)
              .eq('user_id', userId);
          } catch (err) {
            console.error('Error auto-completing old session:', err);
          }
        }
      }
      
      // IMPORTANT DESIGN DECISION:
      // We only return the MOST RECENT incomplete session, WITHOUT auto-completing others.
      // 
      // Why? Because:
      // 1. Auto-completing creates "fake" completed workouts in history
      // 2. Users should control when workouts are marked as completed
      // 3. Multiple incomplete sessions should be handled when starting a NEW workout
      // 4. Workout history (getWorkoutSessions) shows ALL sessions, so accuracy matters
      //
      // The proper place to handle multiple incomplete sessions is in createWorkoutSession()
      // where we can prompt the user or auto-complete the previous one when starting new

      // Get the most recent session that's not old (older than 24h are already auto-completed above)
      const recentSessions = data.filter(session => {
        if (!session || !session.started_at) return false;
        try {
          const startedAt = new Date(session.started_at);
          return startedAt >= twentyFourHoursAgo;
        } catch (e) {
          return false;
        }
      });

      if (recentSessions.length === 0) {
        return null;
      }

      // Sort by started_at descending to get the most recent first
      const sortedSessions = [...recentSessions].sort((a, b) => {
        if (!a.started_at || !b.started_at) return 0;
        try {
          const aTime = new Date(a.started_at).getTime();
          const bTime = new Date(b.started_at).getTime();
          return bTime - aTime; // Descending (most recent first)
        } catch (e) {
          return 0;
        }
      });
      
      // Return only the most recent session (others remain incomplete in DB)
      const session = sortedSessions[0];
      
      // Validate session exists and has required fields
      if (!session || !session.id) {
        return null;
      }

      // Double-check that completed_at is actually null (handles edge cases)
      // Check both null and undefined, and also verify it's not an empty string
      if (session.completed_at !== null && session.completed_at !== undefined && session.completed_at !== '') {
        return null;
      }

      // Additional validation: ensure session has required fields
      // NOTE: workout_name and workout_type were removed from workout_sessions during migration
      // Sessions now only have workout_id, and we fetch workout details from workouts table
      if (!session.workout_id) {
        return null;
      }

      // Map the response to match the WorkoutSession interface
      return {
        ...session,
        workout_name: session.workouts?.name || 'Unknown Workout',
        workout_type: session.workouts?.workout_type || 'custom',
      };
    } catch (error: any) {
      logger.error('Error fetching latest incomplete workout session:', error);
      throw new Error(`Failed to fetch latest incomplete workout session: ${error.message}`);
    }
  },

  /**
   * Create a new workout session
   * NOTE: workout_name and workout_type were removed from workout_sessions table during migration
   * These fields are now fetched from the workouts table via workout_id
   */
  async createWorkoutSession(
    userId: string,
    session: {
      workout_id?: string;
      workout_name: string; // Kept for backward compatibility, but not inserted into DB
      workout_type: 'native' | 'custom'; // Kept for backward compatibility, but not inserted into DB
      exercises_completed?: any[];
      notes?: string;
    }
  ): Promise<WorkoutSession> {
    try {
      // IMPORTANT: Before creating a new session, handle any existing incomplete sessions
      // When user starts a NEW workout, any previous incomplete sessions should be auto-completed
      // This is the proper place to handle multiple incomplete sessions (not in getLatestIncompleteWorkoutSession)
      // This preserves workout history accuracy - we only auto-complete when user explicitly starts new
      const existingIncomplete = await this.getLatestIncompleteWorkoutSession(userId);
      if (existingIncomplete && existingIncomplete.id) {
        const now = new Date();
        logger.info(`Auto-completing previous incomplete session ${existingIncomplete.id} before starting new workout`);
        
        // Auto-complete the previous incomplete session
        // This is safe because user is explicitly starting a NEW workout
        await supabase
          .from('workout_sessions')
          .update({ completed_at: now.toISOString() })
          .eq('id', existingIncomplete.id)
          .eq('user_id', userId);
      }

      // workout_name and workout_type are no longer stored in workout_sessions
      // They are fetched from the workouts table via workout_id when needed
      const insertData: any = {
        user_id: userId,
        exercises_completed: session.exercises_completed || [],
      };

      // Add workout_id if provided (optional for program-day workouts that don't have a workouts table entry)
      if (session.workout_id) {
        insertData.workout_id = session.workout_id;
      }

      if (session.notes) {
        insertData.notes = session.notes;
      }

      const { data, error } = await supabase
        .from('workout_sessions')
        .insert(insertData)
        .select(`
          *,
          workouts (
            name,
            workout_type
          )
        `)
        .single();

      if (error) throw error;

      // Map the response to match the WorkoutSession interface
      // workout_name and workout_type come from the joined workouts table
      return {
        ...data,
        workout_name: data.workouts?.name || session.workout_name,
        workout_type: data.workouts?.workout_type || session.workout_type,
      };
    } catch (error: any) {
      logger.error('Error creating workout session:', error);
      throw new Error(`Failed to create workout session: ${error.message}`);
    }
  },

  /**
   * Update a workout session (e.g., mark as completed)
   * NOTE: workout_name and workout_type are fetched from workouts table via join
   */
  async updateWorkoutSession(
    sessionId: string,
    userId: string,
    updates: {
      completed_at?: string;
      duration_minutes?: number;
      exercises_completed?: any[];
      notes?: string;
    }
  ): Promise<WorkoutSession> {
    try {
      const updateData: any = { ...updates };
      
      // If completed_at is being set, ensure it's a valid ISO string
      if (updates.completed_at) {
        updateData.completed_at = updates.completed_at;
      }

      const { data, error } = await supabase
        .from('workout_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .eq('user_id', userId)
        .select(`
          *,
          workouts (
            name,
            workout_type
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      // Map the response to match the WorkoutSession interface
      return {
        ...data,
        workout_name: data.workouts?.name || 'Unknown Workout',
        workout_type: data.workouts?.workout_type || 'custom',
      };
    } catch (error: any) {
      logger.error('Error updating workout session:', error);
      throw new Error(`Failed to update workout session: ${error.message}`);
    }
  },
};

