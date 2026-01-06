import { create } from 'zustand';
import { userProfileService, type UserProfile } from '@/services/userProfile';
import { useAuthStore } from './authStore';
import { logger } from '@/utils/logger';

interface ProfileStore {
  profile: UserProfile | null;
  profilePictureUri: string | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null; // timestamp of last successful fetch
  lastUpdated: number | null; // timestamp of last profile update (for smart reload)
  loadProfile: (force?: boolean) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  uploadProfilePicture: (imageUri: string) => Promise<string | null>;
  deleteProfilePicture: () => Promise<void>;
  updateProfilePictureUrl: (url: string | null) => Promise<void>;
  clearProfile: () => void;
  getLastUpdateTime: () => number | null; // Get last update time for smart reload
}

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

// Helper to append cache-busting timestamp to URLs
const bustUrl = (url: string | null) => {
  if (!url) return null;
  // Only bust Supabase storage URLs
  if (url.includes('supabase.co/storage/v1/object/public')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  }
  return url;
};

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  profilePictureUri: null,
  loading: false,
  error: null,
  lastFetched: null,
  lastUpdated: null,

  loadProfile: async (force = false) => {
    const user = useAuthStore.getState().user;
    if (!user?.id) {
      set({ profile: null, error: 'No user logged in', lastFetched: null });
      return;
    }

    const state = get();

    // If we have cached data that's still fresh and not forcing, skip loading
    const now = Date.now();
    if (!force && state.lastFetched && (now - state.lastFetched) < CACHE_DURATION_MS && state.profile) {
      logger.info('Using cached profile data');
      return;
    }

    set({ loading: true, error: null });
    try {
      const profile = await userProfileService.getUserProfile(user.id);
      const profilePictureUri = bustUrl(profile?.profile_picture_url || null);

      set({
        profile,
        profilePictureUri,
        loading: false,
        lastFetched: now,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load profile';
      logger.error('Error loading profile:', error);
      set({ error: errorMessage, loading: false });
      // Don't clear existing data on error - keep showing cached data
    }
  },

  clearProfile: () => {
    set({
      profile: null,
      profilePictureUri: null,
      loading: false,
      error: null,
      lastFetched: null,
      lastUpdated: null,
    });
  },

  getLastUpdateTime: () => {
    return get().lastUpdated;
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const user = useAuthStore.getState().user;
    if (!user?.id) {
      throw new Error('No user logged in');
    }

    const state = get();
    const previousProfile = state.profile;

    // Optimistic update: update UI immediately
    if (previousProfile) {
      set({
        profile: { ...previousProfile, ...updates },
        loading: false,
        error: null
      });
    }

    set({ loading: true, error: null });
    try {
      // Convert updates to OnboardingData format if needed
      const onboardingUpdates: any = {};
      if (updates.weight !== undefined) {
        onboardingUpdates.weight = updates.weight;
        onboardingUpdates.weightUnit = updates.weight_unit || 'kg';
      }
      if (updates.height !== undefined) {
        onboardingUpdates.height = updates.height;
        onboardingUpdates.heightUnit = updates.height_unit || 'cm';
      }
      if (updates.goal !== undefined) {
        onboardingUpdates.goal = updates.goal;
      }

      await userProfileService.updateUserProfile(user.id, onboardingUpdates);
      // Mark profile as updated (for smart reload in ProfileScreen)
      set({ lastUpdated: Date.now() });
      // Force reload to get server-confirmed data (bypass cache)
      await get().loadProfile(true);
    } catch (error) {
      // Rollback optimistic update on error
      if (previousProfile) {
        set({ profile: previousProfile });
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      logger.error('Error updating profile:', error);
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  uploadProfilePicture: async (imageUri: string) => {
    const user = useAuthStore.getState().user;
    if (!user?.id) {
      throw new Error('No user logged in');
    }

    set({ loading: true, error: null });
    try {
      const url = await userProfileService.uploadProfilePicture(user.id, imageUri);
      await get().updateProfilePictureUrl(url);
      await get().loadProfile();
      return url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile picture';
      logger.error('Error uploading profile picture:', error);
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  deleteProfilePicture: async () => {
    const user = useAuthStore.getState().user;
    if (!user?.id) {
      throw new Error('No user logged in');
    }

    set({ loading: true, error: null });
    try {
      await userProfileService.deleteProfilePicture(user.id);
      await get().updateProfilePictureUrl(null);
      await get().loadProfile();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete profile picture';
      logger.error('Error deleting profile picture:', error);
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateProfilePictureUrl: async (url: string | null) => {
    const user = useAuthStore.getState().user;
    if (!user?.id) {
      throw new Error('No user logged in');
    }

    try {
      await userProfileService.updateProfilePictureUrl(user.id, url);
      set({ profilePictureUri: bustUrl(url) });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile picture URL';
      logger.error('Error updating profile picture URL:', error);
      throw new Error(errorMessage);
    }
  },
}));



