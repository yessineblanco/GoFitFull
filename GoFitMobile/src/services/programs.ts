import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { notificationInboxService } from '@/services/notificationInbox';
import { pushNotificationService } from '@/services/pushNotification';

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
  client_id: string | null;
  title: string;
  description: string | null;
  type: 'workout' | 'meal' | 'both';
  program_data: ProgramDay[];
  status: 'active' | 'completed' | 'archived';
  is_template: boolean;
  created_at: string;
  updated_at: string;
  coach_name?: string;
  client_name?: string;
}

export interface CreateProgramInput {
  coach_id: string;
  client_id: string | null;
  title: string;
  description?: string;
  type: 'workout' | 'meal' | 'both';
  program_data: ProgramDay[];
  is_template?: boolean;
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
          is_template: input.is_template ?? false,
        })
        .select()
        .single();

      if (error) throw error;

      if (input.client_id) {
        await notificationInboxService.createNotification({
          user_id: input.client_id,
          type: 'program_received',
          title: 'New program',
          body: `Your coach created a program: ${input.title}`,
          data: { screen: 'ProgramDetail', id: data.id },
        });
        pushNotificationService.send({
          user_id: input.client_id,
          title: 'New program',
          body: `Your coach created a program: ${input.title}`,
          data: { screen: 'ProgramDetail', id: data.id },
        });
      }

      return data;
    } catch (error) {
      logger.error('Failed to create program:', error);
      throw error;
    }
  },

  async duplicateAsTemplate(programId: string): Promise<CustomProgram | null> {
    try {
      const original = await this.getById(programId);
      if (!original) return null;

      const { data, error } = await supabase
        .from('custom_programs')
        .insert({
          coach_id: original.coach_id,
          client_id: null,
          title: `${original.title} Template`,
          description: original.description,
          type: original.type,
          program_data: JSON.parse(JSON.stringify(original.program_data || [])),
          status: 'active',
          is_template: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to duplicate program as template:', error);
      throw error;
    }
  },

  async update(programId: string, updates: Partial<Pick<CustomProgram, 'title' | 'description' | 'client_id' | 'program_data' | 'status' | 'is_template'>>): Promise<CustomProgram | null> {
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
