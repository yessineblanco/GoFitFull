import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingData } from '@/services/userProfile';
import { STORAGE_KEYS } from '@/constants';

interface OnboardingStore {
  completedUserIds: Set<string>; // Track which users have completed onboarding
  onboardingData: Partial<OnboardingData>; // Store onboarding data temporarily
  hasCompletedOnboarding: (userId: string | null) => boolean;
  setHasCompletedOnboarding: (userId: string, completed: boolean) => Promise<void>;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  getOnboardingData: () => Partial<OnboardingData>;
  clearOnboardingData: () => void;
  resetOnboarding: (userId: string) => Promise<void>; // For testing - reset onboarding state for a user
  loadCompletedUsers: () => Promise<void>; // Load completed users from storage
}

const STORAGE_KEY = STORAGE_KEYS.ONBOARDING_COMPLETED;
const ONBOARDING_DATA_KEY = STORAGE_KEYS.ONBOARDING_TEMPORARY;

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  completedUserIds: new Set<string>(),
  onboardingData: {},

  loadCompletedUsers: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const userIds = JSON.parse(stored) as string[];
        set({ completedUserIds: new Set(userIds) });
      }
    } catch (error) {
      console.error('Error loading onboarding state:', error);
    }
  },

  hasCompletedOnboarding: (userId: string | null): boolean => {
    if (!userId) return false;
    const state = get();
    return state.completedUserIds.has(userId);
  },

  setHasCompletedOnboarding: async (userId: string, completed: boolean) => {
    const state = get();
    const newSet = new Set(state.completedUserIds);
    
    if (completed) {
      newSet.add(userId);
    } else {
      newSet.delete(userId);
    }

    set({ completedUserIds: newSet });

    // Persist to storage
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  },

  setOnboardingData: (data: Partial<OnboardingData>) => {
    const state = get();
    const newData = { ...state.onboardingData, ...data };
    set({ onboardingData: newData });
    
    // Persist to storage
    try {
      AsyncStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(newData));
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  },

  getOnboardingData: () => {
    return get().onboardingData;
  },

  clearOnboardingData: () => {
    set({ onboardingData: {} });
    try {
      AsyncStorage.removeItem(ONBOARDING_DATA_KEY);
    } catch (error) {
      console.error('Error clearing onboarding data:', error);
    }
  },

  resetOnboarding: async (userId: string) => {
    const state = get();
    const newSet = new Set(state.completedUserIds);
    newSet.delete(userId);
    set({ completedUserIds: newSet });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
    } catch (error) {
      console.error('Error resetting onboarding state:', error);
    }
  },
}));

// Load onboarding data when store initializes
useOnboardingStore.getState().loadCompletedUsers().then(async () => {
  try {
    const stored = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
    if (stored) {
      const data = JSON.parse(stored) as Partial<OnboardingData>;
      useOnboardingStore.setState({ onboardingData: data });
    }
  } catch (error) {
    console.error('Error loading onboarding data:', error);
  }
});

// Load completed users when the app initializes
useOnboardingStore.getState().loadCompletedUsers();
