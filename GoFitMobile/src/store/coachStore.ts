import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { coachProfileService, type CoachProfile, type CoachCertification, type CoachOnboardingData } from '@/services/coachProfile';
import { useAuthStore } from './authStore';
import { logger } from '@/utils/logger';

const COACH_ONBOARDING_COMPLETED_KEY = 'coach_onboarding_completed_users';
const COACH_ONBOARDING_DATA_KEY = 'coach_onboarding_temporary_data';

interface CoachStore {
  profile: CoachProfile | null;
  certifications: CoachCertification[];
  loading: boolean;
  error: string | null;
  completedUserIds: Set<string>;
  onboardingData: Partial<CoachOnboardingData>;

  loadProfile: (force?: boolean) => Promise<void>;
  createProfile: (data: CoachOnboardingData) => Promise<CoachProfile>;
  updateProfile: (updates: Partial<CoachProfile>) => Promise<void>;
  uploadCV: (fileUri: string, fileName: string) => Promise<string>;
  loadCertifications: () => Promise<void>;
  addCertification: (name: string, issuer: string, docUri?: string, docName?: string) => Promise<void>;
  deleteCertification: (certId: string) => Promise<void>;
  clearCoachData: () => void;

  hasCompletedCoachOnboarding: (userId: string | null) => boolean;
  setCoachOnboardingCompleted: (userId: string) => Promise<void>;
  setOnboardingData: (data: Partial<CoachOnboardingData>) => void;
  getOnboardingData: () => Partial<CoachOnboardingData>;
  clearOnboardingData: () => void;
  loadCompletedUsers: () => Promise<void>;
}

export const useCoachStore = create<CoachStore>((set, get) => ({
  profile: null,
  certifications: [],
  loading: false,
  error: null,
  completedUserIds: new Set<string>(),
  onboardingData: {},

  loadCompletedUsers: async () => {
    try {
      const stored = await AsyncStorage.getItem(COACH_ONBOARDING_COMPLETED_KEY);
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        set({ completedUserIds: new Set(ids) });
      }
    } catch (error) {
      logger.warn('Failed to load coach onboarding completed users:', error);
    }
  },

  hasCompletedCoachOnboarding: (userId: string | null) => {
    if (!userId) return false;
    return get().completedUserIds.has(userId);
  },

  setCoachOnboardingCompleted: async (userId: string) => {
    try {
      const newSet = new Set(get().completedUserIds);
      newSet.add(userId);
      set({ completedUserIds: newSet });
      await AsyncStorage.setItem(
        COACH_ONBOARDING_COMPLETED_KEY,
        JSON.stringify(Array.from(newSet))
      );
    } catch (error) {
      logger.warn('Failed to save coach onboarding state:', error);
    }
  },

  setOnboardingData: (data: Partial<CoachOnboardingData>) => {
    const merged = { ...get().onboardingData, ...data };
    set({ onboardingData: merged });
    AsyncStorage.setItem(COACH_ONBOARDING_DATA_KEY, JSON.stringify(merged)).catch(() => {});
  },

  getOnboardingData: () => get().onboardingData,

  clearOnboardingData: () => {
    set({ onboardingData: {} });
    AsyncStorage.removeItem(COACH_ONBOARDING_DATA_KEY).catch(() => {});
  },

  loadProfile: async (force = false) => {
    const { user } = useAuthStore.getState();
    if (!user?.id) return;

    if (!force && get().profile) return;

    set({ loading: true, error: null });
    try {
      const profile = await coachProfileService.getProfile(user.id);
      set({ profile, loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to load coach profile' });
      logger.error('Failed to load coach profile:', error);
    }
  },

  createProfile: async (data: CoachOnboardingData) => {
    const { user } = useAuthStore.getState();
    if (!user?.id) throw new Error('User not authenticated');

    set({ loading: true, error: null });
    try {
      const profile = await coachProfileService.createProfile(user.id, data);
      set({ profile, loading: false });
      return profile;
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to create coach profile' });
      throw error;
    }
  },

  updateProfile: async (updates: Partial<CoachProfile>) => {
    const { profile } = get();
    if (!profile) throw new Error('No coach profile found');

    const previousProfile = { ...profile };
    set({ profile: { ...profile, ...updates } as CoachProfile });

    try {
      await coachProfileService.updateProfile(profile.id, updates);
    } catch (error: any) {
      set({ profile: previousProfile, error: error.message || 'Failed to update profile' });
      throw error;
    }
  },

  uploadCV: async (fileUri: string, fileName: string) => {
    const { user } = useAuthStore.getState();
    if (!user?.id) throw new Error('User not authenticated');

    set({ loading: true });
    try {
      const cvUrl = await coachProfileService.uploadCV(user.id, fileUri, fileName);
      const { profile } = get();
      if (profile) {
        set({ profile: { ...profile, cv_url: cvUrl }, loading: false });
      } else {
        set({ loading: false });
      }
      return cvUrl;
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to upload CV' });
      throw error;
    }
  },

  loadCertifications: async () => {
    const { profile } = get();
    if (!profile) return;

    try {
      const certs = await coachProfileService.getCertifications(profile.id);
      set({ certifications: certs });
    } catch (error) {
      logger.error('Failed to load certifications:', error);
    }
  },

  addCertification: async (name: string, issuer: string, docUri?: string, docName?: string) => {
    const { profile } = get();
    if (!profile) throw new Error('No coach profile found');

    set({ loading: true });
    try {
      const cert = await coachProfileService.addCertification(profile.id, name, issuer, docUri, docName);
      set({ certifications: [cert, ...get().certifications], loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to add certification' });
      throw error;
    }
  },

  deleteCertification: async (certId: string) => {
    const previousCerts = [...get().certifications];
    set({ certifications: get().certifications.filter((c) => c.id !== certId) });

    try {
      await coachProfileService.deleteCertification(certId);
    } catch (error: any) {
      set({ certifications: previousCerts, error: error.message || 'Failed to delete certification' });
      throw error;
    }
  },

  clearCoachData: () => {
    set({ profile: null, certifications: [], loading: false, error: null });
  },
}));

// Hydrate on init
useCoachStore.getState().loadCompletedUsers().then(async () => {
  try {
    const stored = await AsyncStorage.getItem(COACH_ONBOARDING_DATA_KEY);
    if (stored) {
      useCoachStore.setState({ onboardingData: JSON.parse(stored) });
    }
  } catch {
    // ignore
  }
});
