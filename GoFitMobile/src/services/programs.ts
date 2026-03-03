import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { notificationInboxService } from '@/services/notificationInbox';

export interface ProgramExercise {
  id?: string;
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
}

export interface ProgramMeal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ProgramDay {
  day_number: number;
  exercises?: ProgramExercise[];
  meals?: ProgramMeal[];
}

export interface CustomProgram {
  id: string;
  coach_id: string;
  client_id: string;
  title: string;
  description: string | null;
  type: 'workout' | 'meal' | 'both';
  program_data: ProgramDay[];
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  coach_name?: string;
  client_name?: string;
}

export interface CreateProgramInput {
  coach_id: string;
  client_id: string;
  title: string;
  description?: string;
  type: 'workout' | 'meal' | 'both';
  program_data: ProgramDay[];
}

export const programsService = {
  async getByCoach(coachId: string): Promise<CustomProgram[]> {
    try {
      const { data, error } = await supabase
        .from('custom_programs')
        .select('*')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch coach programs:', error);
      return [];
    }
  },

  async getByClient(clientId: string): Promise<CustomProgram[]> {
    try {
      const { data, error } = await supabase
        .from('custom_programs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch client programs:', error);
      return [];
    }
  },

  async getById(programId: string): Promise<CustomProgram | null> {
    try {
      const { data, error } = await supabase
        .from('custom_programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to fetch program:', error);
      return null;
    }
  },

  async create(input: CreateProgramInput): Promise<CustomProgram | null> {
    try {
      const { data, error } = await supabase
        .from('custom_programs')
        .insert({
          coach_id: input.coach_id,
          client_id: input.client_id,
          title: input.title,
          description: input.description || null,
          type: input.type,
          program_data: input.program_data,
        })
        .select()
        .single();

      if (error) throw error;

      await notificationInboxService.createNotification({
        user_id: input.client_id,
        type: 'program_received',
        title: 'New program',
        body: `Your coach created a program: ${input.title}`,
        data: { screen: 'ProgramDetail', id: data.id },
      });

      return data;
    } catch (error) {
      logger.error('Failed to create program:', error);
      throw error;
    }
  },

  async update(programId: string, updates: Partial<Pick<CustomProgram, 'title' | 'description' | 'program_data' | 'status'>>): Promise<CustomProgram | null> {
    try {
      const { data, error } = await supabase
        .from('custom_programs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', programId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to update program:', error);
      throw error;
    }
  },

  async getCoachClients(coachId: string): Promise<Array<{ client_id: string; display_name: string }>> {
    try {
      const { data, error } = await supabase.rpc('get_coach_clients', { p_coach_id: coachId });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        client_id: row.client_id,
        display_name: row.display_name,
      }));
    } catch (error) {
      logger.error('Failed to fetch coach clients:', error);
      return [];
    }
  },
};
