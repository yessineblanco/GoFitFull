import { create } from 'zustand';
import {
  clientManagementService,
  type CoachClient,
  type ClientDetail,
  type ClientNote,
} from '@/services/clientManagement';
import { logger } from '@/utils/logger';

interface ClientManagementStore {
  clients: CoachClient[];
  selectedClientDetail: ClientDetail | null;
  clientNotes: ClientNote[];
  loading: boolean;
  loadingDetail: boolean;
  loadingNotes: boolean;

  loadClients: (coachId: string) => Promise<void>;
  loadClientDetail: (clientId: string, coachId: string) => Promise<void>;
  loadClientNotes: (coachId: string, clientId: string) => Promise<void>;
  clearSelectedClient: () => void;
  createNote: (coachId: string, clientId: string, note: string) => Promise<ClientNote | null>;
  updateNote: (noteId: string, note: string) => Promise<ClientNote | null>;
  deleteNote: (noteId: string) => Promise<void>;
}

export const useClientManagementStore = create<ClientManagementStore>((set, get) => ({
  clients: [],
  selectedClientDetail: null,
  clientNotes: [],
  loading: false,
  loadingDetail: false,
  loadingNotes: false,

  loadClients: async (coachId: string) => {
    set({ loading: true });
    try {
      const clients = await clientManagementService.getCoachClients(coachId);
      set({ clients, loading: false });
    } catch (error) {
      set({ loading: false });
      logger.error('Failed to load clients:', error);
    }
  },

  loadClientDetail: async (clientId: string, coachId: string) => {
    set({ loadingDetail: true });
    try {
      const detail = await clientManagementService.getClientDetail(clientId, coachId);
      set({ selectedClientDetail: detail, loadingDetail: false });
    } catch (error) {
      set({ loadingDetail: false });
      logger.error('Failed to load client detail:', error);
    }
  },

  loadClientNotes: async (coachId: string, clientId: string) => {
    set({ loadingNotes: true });
    try {
      const notes = await clientManagementService.getClientNotes(coachId, clientId);
      set({ clientNotes: notes, loadingNotes: false });
    } catch (error) {
      set({ loadingNotes: false });
      logger.error('Failed to load client notes:', error);
    }
  },

  clearSelectedClient: () => {
    set({ selectedClientDetail: null, clientNotes: [] });
  },

  createNote: async (coachId: string, clientId: string, note: string) => {
    try {
      const created = await clientManagementService.createNote(coachId, clientId, note);
      if (created) {
        set({ clientNotes: [created, ...get().clientNotes] });
        return created;
      }
      return null;
    } catch (error) {
      throw error;
    }
  },

  updateNote: async (noteId: string, note: string) => {
    try {
      const updated = await clientManagementService.updateNote(noteId, note);
      if (updated) {
        set({
          clientNotes: get().clientNotes.map((n) => (n.id === noteId ? updated : n)),
        });
        return updated;
      }
      return null;
    } catch (error) {
      throw error;
    }
  },

  deleteNote: async (noteId: string) => {
    try {
      await clientManagementService.deleteNote(noteId);
      set({ clientNotes: get().clientNotes.filter((n) => n.id !== noteId) });
    } catch (error) {
      throw error;
    }
  },
}));
