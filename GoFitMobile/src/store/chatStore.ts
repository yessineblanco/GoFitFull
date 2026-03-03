import { create } from 'zustand';
import { chatService, type Conversation, type Message } from '@/services/chat';
import { logger } from '@/utils/logger';

interface ChatStore {
  conversations: Conversation[];
  messages: Message[];
  activeConversation: Conversation | null;
  loading: boolean;
  loadingMessages: boolean;

  loadConversationsForClient: (clientUserId: string) => Promise<void>;
  loadConversationsForCoach: (coachProfileId: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, senderId: string, content: string) => Promise<void>;
  addRealtimeMessage: (message: Message) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  getOrCreateConversation: (coachId: string, clientId: string) => Promise<Conversation | null>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  messages: [],
  activeConversation: null,
  loading: false,
  loadingMessages: false,

  loadConversationsForClient: async (clientUserId: string) => {
    set({ loading: true });
    try {
      const convos = await chatService.getConversationsForClient(clientUserId);
      set({ conversations: convos, loading: false });
    } catch (error) {
      set({ loading: false });
      logger.error('Failed to load client conversations:', error);
    }
  },

  loadConversationsForCoach: async (coachProfileId: string) => {
    set({ loading: true });
    try {
      const convos = await chatService.getConversationsForCoach(coachProfileId);
      set({ conversations: convos, loading: false });
    } catch (error) {
      set({ loading: false });
      logger.error('Failed to load coach conversations:', error);
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ loadingMessages: true });
    try {
      const msgs = await chatService.getMessages(conversationId);
      set({ messages: msgs, loadingMessages: false });
    } catch (error) {
      set({ loadingMessages: false });
      logger.error('Failed to load messages:', error);
    }
  },

  sendMessage: async (conversationId, senderId, content) => {
    try {
      const msg = await chatService.sendMessage(conversationId, senderId, content);
      if (msg) {
        const exists = get().messages.some((m) => m.id === msg.id);
        if (!exists) {
          set({ messages: [...get().messages, msg] });
        }
      }
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  },

  addRealtimeMessage: (message: Message) => {
    const exists = get().messages.some((m) => m.id === message.id);
    if (!exists) {
      set({ messages: [...get().messages, message] });
    }
  },

  setActiveConversation: (conversation) => {
    set({ activeConversation: conversation, messages: [] });
  },

  getOrCreateConversation: async (coachId, clientId) => {
    try {
      return await chatService.getOrCreateConversation(coachId, clientId);
    } catch (error) {
      logger.error('Failed to get/create conversation:', error);
      return null;
    }
  },
}));
