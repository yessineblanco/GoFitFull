import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export interface CoachClient {
  client_id: string;
  display_name: string;
  profile_picture_url?: string | null;
  last_session_at: string | null;
  has_active_pack: boolean;
}

export interface ClientNote {
  id: string;
  coach_id: string;
  client_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface ClientDetail {
  client: CoachClient;
  activePrograms: Array<{ id: string; title: string; status: string }>;
  upcomingBookings: Array<{ id: string; scheduled_at: string; status: string }>;
}

export interface ClientProgressData {
  sessions: Array<{
    id: string;
    workout_name: string;
    started_at: string;
    completed_at: string | null;
    duration_minutes: number | null;
    exercises_completed?: Array<{
      id?: string;
      name?: string;
      sets?: number | string;
      reps?: string;
      weights?: Array<number | string>;
      completedSets?: boolean[];
      completed?: boolean;
    }>;
  }>;
  total_workouts: number;
  streak: number;
  weekly_consistency: number;
}

export const clientManagementService = {
  async getCoachClients(coachId: string): Promise<CoachClient[]> {
    try {
      const { data, error } = await supabase.rpc('get_coach_clients', { p_coach_id: coachId });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        client_id: row.client_id,
        display_name: row.display_name,
        profile_picture_url: row.profile_picture_url ?? null,
        last_session_at: row.last_session_at,
        has_active_pack: row.has_active_pack ?? false,
      }));
    } catch (error) {
      logger.error('Failed to fetch coach clients:', error);
      return [];
    }
  },

  async getClientDetail(clientId: string, coachId: string): Promise<ClientDetail | null> {
    try {
      const [clientsRes, programsRes, bookingsRes] = await Promise.all([
        supabase.rpc('get_coach_clients', { p_coach_id: coachId }),
        supabase
          .from('custom_programs')
          .select('id, title, status')
          .eq('coach_id', coachId)
          .eq('client_id', clientId)
          .in('status', ['active', 'completed']),
        supabase
          .from('bookings')
          .select('id, scheduled_at, status')
          .eq('coach_id', coachId)
          .eq('client_id', clientId)
          .gte('scheduled_at', new Date().toISOString())
          .in('status', ['pending', 'confirmed']),
      ]);

      const clients = clientsRes.data || [];
      const clientRow = clients.find((c: any) => c.client_id === clientId);
      if (!clientRow) return null;

      return {
        client: {
          client_id: clientRow.client_id,
          display_name: clientRow.display_name,
          profile_picture_url: clientRow.profile_picture_url ?? null,
          last_session_at: clientRow.last_session_at,
          has_active_pack: clientRow.has_active_pack ?? false,
        },
        activePrograms: (programsRes.data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          status: p.status,
        })),
        upcomingBookings: (bookingsRes.data || []).map((b: any) => ({
          id: b.id,
          scheduled_at: b.scheduled_at,
          status: b.status,
        })),
      };
    } catch (error) {
      logger.error('Failed to fetch client detail:', error);
      return null;
    }
  },

  async getClientNotes(coachId: string, clientId: string): Promise<ClientNote[]> {
    try {
      const { data, error } = await supabase
        .from('coach_client_notes')
        .select('*')
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch client notes:', error);
      return [];
    }
  },

  async createNote(coachId: string, clientId: string, note: string): Promise<ClientNote | null> {
    try {
      const { data, error } = await supabase
        .from('coach_client_notes')
        .insert({ coach_id: coachId, client_id: clientId, note })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create client note:', error);
      throw error;
    }
  },

  async updateNote(noteId: string, note: string): Promise<ClientNote | null> {
    try {
      const { data, error } = await supabase
        .from('coach_client_notes')
        .update({ note })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to update client note:', error);
      throw error;
    }
  },

  async getClientProgress(clientId: string, coachId: string): Promise<ClientProgressData | null> {
    try {
      const { data, error } = await supabase.rpc('get_client_progress', {
        p_client_id: clientId,
        p_coach_id: coachId,
      });
      if (error) throw error;
      if (!data || data.error) return null;
      return {
        sessions: data.sessions || [],
        total_workouts: data.total_workouts ?? 0,
        streak: data.streak ?? 0,
        weekly_consistency: data.weekly_consistency ?? 0,
      };
    } catch (error) {
      logger.error('Failed to fetch client progress:', error);
      return null;
    }
  },

  async deleteNote(noteId: string): Promise<void> {
    try {
      const { error } = await supabase.from('coach_client_notes').delete().eq('id', noteId);
      if (error) throw error;
    } catch (error) {
      logger.error('Failed to delete client note:', error);
      throw error;
    }
  },
};
