import { create } from 'zustand';
import {
  marketplaceService,
  type MarketplaceCoach,
  type CoachDetailData,
  type CoachReview,
  type CoachSessionPack,
  type MarketplaceFilters,
} from '@/services/marketplace';
import { logger } from '@/utils/logger';

interface MarketplaceStore {
  coaches: MarketplaceCoach[];
  topCoaches: MarketplaceCoach[];
  selectedCoach: CoachDetailData | null;
  reviews: CoachReview[];
  coachPacks: CoachSessionPack[];
  filters: MarketplaceFilters;
  loading: boolean;
  loadingDetail: boolean;
  loadingReviews: boolean;
  error: string | null;

  loadCoaches: (filters?: MarketplaceFilters) => Promise<void>;
  loadTopCoaches: () => Promise<void>;
  loadCoachDetail: (coachId: string) => Promise<void>;
  loadReviews: (coachId: string, loadMore?: boolean) => Promise<void>;
  loadCoachPacks: (coachId: string) => Promise<void>;
  setFilters: (filters: MarketplaceFilters) => void;
  clearSelectedCoach: () => void;
}

export const useMarketplaceStore = create<MarketplaceStore>((set, get) => ({
  coaches: [],
  topCoaches: [],
  selectedCoach: null,
  reviews: [],
  coachPacks: [],
  filters: {},
  loading: false,
  loadingDetail: false,
  loadingReviews: false,
  error: null,

  loadCoaches: async (filters?: MarketplaceFilters) => {
    set({ loading: true, error: null });
    try {
      const mergedFilters = { ...get().filters, ...filters };
      const coaches = await marketplaceService.getApprovedCoaches(mergedFilters);
      set({ coaches, loading: false, filters: mergedFilters });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to load coaches' });
      logger.error('Failed to load coaches:', error);
    }
  },

  loadTopCoaches: async () => {
    try {
      const topCoaches = await marketplaceService.getTopCoaches(5);
      set({ topCoaches });
    } catch (error) {
      logger.error('Failed to load top coaches:', error);
    }
  },

  loadCoachDetail: async (coachId: string) => {
    set({ loadingDetail: true, error: null });
    try {
      const coach = await marketplaceService.getCoachDetail(coachId);
      set({ selectedCoach: coach, loadingDetail: false });
    } catch (error: any) {
      set({ loadingDetail: false, error: error.message || 'Failed to load coach' });
    }
  },

  loadReviews: async (coachId: string, loadMore = false) => {
    set({ loadingReviews: true });
    try {
      const offset = loadMore ? get().reviews.length : 0;
      const newReviews = await marketplaceService.getCoachReviews(coachId, 10, offset);
      set({
        reviews: loadMore ? [...get().reviews, ...newReviews] : newReviews,
        loadingReviews: false,
      });
    } catch (error) {
      set({ loadingReviews: false });
      logger.error('Failed to load reviews:', error);
    }
  },

  loadCoachPacks: async (coachId: string) => {
    try {
      const packs = await marketplaceService.getCoachPacks(coachId);
      set({ coachPacks: packs });
    } catch (error) {
      logger.error('Failed to load coach packs:', error);
    }
  },

  setFilters: (filters: MarketplaceFilters) => {
    set({ filters });
  },

  clearSelectedCoach: () => {
    set({ selectedCoach: null, reviews: [], coachPacks: [] });
  },
}));
