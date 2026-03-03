import { create } from 'zustand';
import {
  sessionPacksService,
  type SessionPack,
  type PurchasedPack,
  type CreatePackInput,
} from '@/services/sessionPacks';
import { logger } from '@/utils/logger';

interface PacksStore {
  myPacks: SessionPack[];
  coachPacks: SessionPack[];
  purchasedPacks: PurchasedPack[];
  loading: boolean;
  loadingCoachPacks: boolean;

  loadMyPacks: (coachId: string) => Promise<void>;
  loadCoachPacks: (coachId: string) => Promise<void>;
  loadPurchasedPacks: (clientId: string) => Promise<void>;
  createPack: (input: CreatePackInput) => Promise<SessionPack | null>;
  updatePack: (packId: string, updates: Partial<Pick<SessionPack, 'name' | 'session_count' | 'price' | 'description' | 'is_active'>>) => Promise<void>;
  deletePack: (packId: string, coachId: string) => Promise<void>;
}

export const usePacksStore = create<PacksStore>((set, get) => ({
  myPacks: [],
  coachPacks: [],
  purchasedPacks: [],
  loading: false,
  loadingCoachPacks: false,

  loadMyPacks: async (coachId: string) => {
    set({ loading: true });
    try {
      const packs = await sessionPacksService.getPacksByCoach(coachId);
      set({ myPacks: packs, loading: false });
    } catch (error) {
      set({ loading: false });
      logger.error('Failed to load my packs:', error);
    }
  },

  loadCoachPacks: async (coachId: string) => {
    set({ loadingCoachPacks: true });
    try {
      const packs = await sessionPacksService.getActivePacksByCoach(coachId);
      set({ coachPacks: packs, loadingCoachPacks: false });
    } catch (error) {
      set({ loadingCoachPacks: false });
      logger.error('Failed to load coach packs:', error);
    }
  },

  loadPurchasedPacks: async (clientId: string) => {
    set({ loading: true });
    try {
      const packs = await sessionPacksService.getPurchasedPacks(clientId);
      set({ purchasedPacks: packs, loading: false });
    } catch (error) {
      set({ loading: false });
      logger.error('Failed to load purchased packs:', error);
    }
  },

  createPack: async (input: CreatePackInput) => {
    try {
      const pack = await sessionPacksService.createPack(input);
      if (pack) {
        set({ myPacks: [pack, ...get().myPacks] });
      }
      return pack;
    } catch (error) {
      logger.error('Failed to create pack:', error);
      throw error;
    }
  },

  updatePack: async (packId, updates) => {
    try {
      const updated = await sessionPacksService.updatePack(packId, updates);
      if (updated) {
        set({ myPacks: get().myPacks.map((p) => (p.id === packId ? updated : p)) });
      }
    } catch (error) {
      logger.error('Failed to update pack:', error);
      throw error;
    }
  },

  deletePack: async (packId, coachId) => {
    try {
      await sessionPacksService.deletePack(packId);
      set({ myPacks: get().myPacks.filter((p) => p.id !== packId) });
    } catch (error) {
      logger.error('Failed to delete pack:', error);
      throw error;
    }
  },
}));
