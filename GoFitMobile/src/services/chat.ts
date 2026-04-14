import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { notificationInboxService } from '@/services/notificationInbox';
import { pushNotificationService } from '@/services/pushNotification';

export interface Conversation {
  id: string;
  coach_id: string;
  client_id: string;
  last_message_at: string | null;
  created_at: string;
  other_user_name?: string;
  other_user_picture?: string | null;
  last_message?: string | null;
  unread_count?: number;
}

async function enrichCoachConversationsWithClientAvatars(conversations: Conversation[]): Promise<Conversation[]> {
  const ids = [...new Set(conversations.map((c) => c.client_id).filter(Boolean))];
  if (!ids.length) return conversations;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, profile_picture_url')
      .in('id', ids);
    if (error) {
      logger.warn('enrichCoachConversationsWithClientAvatars: user_profiles select failed', error);
      return conversations;
    }
    if (!data?.length) return conversations;
    const map = new Map<string, string | null>(
      data.map((r: { id: string; profile_picture_url: string | null }) => [
        String(r.id).toLowerCase(),
        r.profile_picture_url,
      ]),
    );
    return conversations.map((c) => {
      const url = map.get(String(c.client_id).toLowerCase());
      if (url != null && String(url).trim()) {
        return { ...c, other_user_picture: url };
      }
      return c;
    });
  } catch (e) {
    logger.warn('enrichCoachConversationsWithClientAvatars', e);
    return conversations;
  }
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice';
  media_url: string | null;
  media_metadata: any | null;
  read_at: string | null;
  created_at: string;
}

export const chatService = {
  async getConversationsForClient(clientUserId: string): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_conversations_enriched', { p_role: 'client' });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        coach_id: row.coach_id,
        client_id: row.client_id,
        last_message_at: row.last_message_at,
        created_at: row.created_at,
        last_message: row.last_message,
        other_user_name: row.coach_display_name,
        other_user_picture: row.coach_profile_picture_url,
      }));
    } catch (error) {
      logger.error('Failed to fetch client conversations:', error);
      return [];
    }
  },

  async getConversationsForCoach(coachProfileId: string): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_conversations_enriched', { p_role: 'coach' });

      if (error) throw error;
      const list = (data || []).map((row: any) => ({
        id: row.id,
        coach_id: row.coach_id,
        client_id: row.client_id,
        last_message_at: row.last_message_at,
        created_at: row.created_at,
        last_message: row.last_message,
        other_user_name: row.client_display_name,
        other_user_picture: row.client_profile_picture_url,
      }));
      return enrichCoachConversationsWithClientAvatars(list);
    } catch (error) {
      logger.error('Failed to fetch coach conversations:', error);
      return [];
    }
  },

  async getOrCreateConversation(coachProfileId: string, clientUserId: string): Promise<Conversation | null> {
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('coach_id', coachProfileId)
        .eq('client_id', clientUserId)
        .single();

      if (existing) return existing;

      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ coach_id: coachProfileId, client_id: clientUserId })
        .select()
        .single();

      if (error) throw error;
      return created;
    } catch (error) {
      logger.error('Failed to get/create conversation:', error);
      return null;
    }
  },

  async getMessages(conversationId: string, limit = 50, before?: string): Promise<Message[]> {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).reverse();
    } catch (error) {
      logger.error('Failed to fetch messages:', error);
      return [];
    }
  },

  async sendMessage(conversationId: string, senderId: string, content: string, type: 'text' | 'image' | 'file' | 'voice' = 'text', mediaUrl?: string): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          type,
          media_url: mediaUrl || null,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      const { data: conv } = await supabase.from('conversations').select('client_id, coach_id').eq('id', conversationId).single();
      if (conv) {
        const recipientUserId = senderId === conv.client_id
          ? (await supabase.from('coach_profiles').select('user_id').eq('id', conv.coach_id).single()).data?.user_id
          : conv.client_id;
        if (recipientUserId && recipientUserId !== senderId) {
          const notifBody = content.length > 50 ? `${content.slice(0, 50)}...` : content;
          await notificationInboxService.createNotification({
            user_id: recipientUserId,
            type: 'new_message',
            title: 'New message',
            body: notifBody,
            data: { screen: 'Chat', id: conversationId },
          });
          pushNotificationService.send({
            user_id: recipientUserId,
            title: 'New message',
            body: notifBody,
            data: { screen: 'Chat', id: conversationId },
          });
        }
      }

      return data;
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  },

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);
    } catch (error) {
      logger.error('Failed to mark messages as read:', error);
    }
  },

  async getUserProfilePictureUrl(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('profile_picture_url')
        .eq('id', userId)
        .maybeSingle();
      if (error) return null;
      const u = data?.profile_picture_url?.trim();
      return u || null;
    } catch {
      return null;
    }
  },

  async getCoachProfilePictureUrl(coachProfileId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('coach_profiles')
        .select('profile_picture_url')
        .eq('id', coachProfileId)
        .maybeSingle();
      if (error) return null;
      const u = data?.profile_picture_url?.trim();
      return u || null;
    } catch {
      return null;
    }
  },

  subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void,
    onStatus?: (status: string) => void
  ) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe((status, err) => {
        if (err) logger.warn('Realtime messages channel error', err);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('Realtime messages subscription:', status);
        }
        onStatus?.(status);
      });
  },
};
