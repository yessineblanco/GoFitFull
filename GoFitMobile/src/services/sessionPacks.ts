import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export interface SessionPack {
  id: string;
  coach_id: string;
  name: string;
  session_count: number;
  price: number;
  currency: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchasedPack {
  id: string;
  client_id: string;
  pack_id: string;
  coach_id: string;
  sessions_remaining: number;
  sessions_total: number;
  purchased_at: string;
  expires_at: string | null;
  status: 'active' | 'exhausted' | 'expired' | 'refunded';
  pack_name?: string;
  coach_name?: string;
}

export interface CreatePackInput {
  coach_id: string;
  name: string;
  session_count: number;
  price: number;
  currency?: string;
  description?: string;
}

export const sessionPacksService = {
  async getPacksByCoach(coachId: string): Promise<SessionPack[]> {
    try {
      const { data, error } = await supabase
        .from('session_packs')
        .select('*')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch session packs:', error);
      return [];
    }
  },

  async getActivePacksByCoach(coachId: string): Promise<SessionPack[]> {
    try {
      const { data, error } = await supabase
        .from('session_packs')
        .select('*')
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch active packs:', error);
      return [];
    }
  },

  async createPack(input: CreatePackInput): Promise<SessionPack | null> {
    try {
      const { data, error } = await supabase
        .from('session_packs')
        .insert({
          coach_id: input.coach_id,
          name: input.name,
          session_count: input.session_count,
          price: input.price,
          currency: input.currency || 'EUR',
          description: input.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create session pack:', error);
      throw error;
    }
  },

  async updatePack(packId: string, updates: Partial<Pick<SessionPack, 'name' | 'session_count' | 'price' | 'description' | 'is_active'>>): Promise<SessionPack | null> {
    try {
      const { data, error } = await supabase
        .from('session_packs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', packId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to update session pack:', error);
      throw error;
    }
  },

  async deletePack(packId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('session_packs')
        .delete()
        .eq('id', packId);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to delete session pack:', error);
      throw error;
    }
  },

  async getPurchasedPacks(clientId: string): Promise<PurchasedPack[]> {
    try {
      const { data, error } = await supabase
        .from('purchased_packs')
        .select(`
          *,
          session_packs(name),
          coach_profiles(user_id)
        `)
        .eq('client_id', clientId)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        pack_name: p.session_packs?.name || 'Unknown Pack',
        coach_name: null,
      }));
    } catch (error) {
      logger.error('Failed to fetch purchased packs:', error);
      return [];
    }
  },
};
