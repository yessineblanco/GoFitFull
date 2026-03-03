import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export const notificationInboxService = {
  async getNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch notifications:', error);
      return [];
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
    }
  },

  async createNotification(params: {
    user_id: string;
    type: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await supabase.from('notifications').insert({
        user_id: params.user_id,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        data: params.data ?? {},
      });
    } catch (error) {
      logger.error('Failed to create notification:', error);
    }
  },
};
