import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export const pushNotificationService = {
  async send(params: {
    user_id: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: params.user_id,
          title: params.title,
          body: params.body || '',
          data: params.data || {},
        },
      });
    } catch (error) {
      logger.error('Failed to send push notification:', error);
    }
  },
};
