jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/services/coachProfile', () => ({
  coachProfileService: { getProfile: jest.fn(), updateProfile: jest.fn() },
}));
jest.mock('../authStore', () => ({
  useAuthStore: { getState: jest.fn() },
}));
jest.mock('@/utils/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

import { coachProfileService, type CoachProfile } from '@/services/coachProfile';
import { useAuthStore } from '../authStore';
import { useCoachStore } from '../coachStore';

const getProfile = coachProfileService.getProfile as jest.Mock;
const getAuth = useAuthStore.getState as jest.Mock;
const profile = (status: CoachProfile['status'], userId = 'coach-user') => ({
  id: 'profile-id', user_id: userId, status,
} as CoachProfile);

describe('existing coach onboarding routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCoachStore.getState().clearCoachData();
    useCoachStore.setState({ completedUserIds: new Set() });
    getAuth.mockReturnValue({ user: { id: 'coach-user' } });
  });

  test('recognizes an approved server profile with no local completion marker', async () => {
    getProfile.mockResolvedValue(profile('approved'));
    await useCoachStore.getState().loadProfile();
    expect(useCoachStore.getState().hasCompletedCoachOnboarding('coach-user')).toBe(true);
    expect(useCoachStore.getState().completedUserIds.size).toBe(0);
  });

  test('distinguishes a new coach from a profile lookup still in progress', async () => {
    let resolve!: (value: null) => void;
    getProfile.mockReturnValue(new Promise(r => { resolve = r; }));
    const pending = useCoachStore.getState().loadProfile();
    expect(useCoachStore.getState()).toMatchObject({ loading: true, profileLoadedUserId: null });
    resolve(null);
    await pending;
    expect(useCoachStore.getState()).toMatchObject({ loading: false, profileLoadedUserId: 'coach-user', profile: null });
    expect(useCoachStore.getState().hasCompletedCoachOnboarding('coach-user')).toBe(false);
  });

  test.each(['pending', 'rejected'] as const)('does not infer completion from a %s profile', async status => {
    getProfile.mockResolvedValue(profile(status));
    await useCoachStore.getState().loadProfile();
    expect(useCoachStore.getState().hasCompletedCoachOnboarding('coach-user')).toBe(false);
  });

  test('preserves existing local completion behavior', () => {
    useCoachStore.setState({ completedUserIds: new Set(['coach-user']) });
    expect(useCoachStore.getState().hasCompletedCoachOnboarding('coach-user')).toBe(true);
    expect(useCoachStore.getState().hasCompletedCoachOnboarding(null)).toBe(false);
  });

  test('keeps a failed lookup unresolved and permits retry', async () => {
    getProfile.mockRejectedValueOnce(new Error('Connection failed'));
    await useCoachStore.getState().loadProfile();
    expect(useCoachStore.getState()).toMatchObject({ loading: false, profileLoadedUserId: null, error: 'Connection failed' });
    getProfile.mockResolvedValue(profile('approved'));
    await useCoachStore.getState().loadProfile(true);
    expect(useCoachStore.getState()).toMatchObject({ profileLoadedUserId: 'coach-user', error: null });
  });

  test('does not use a previous account profile as the new account cache', async () => {
    useCoachStore.setState({ profile: profile('approved', 'other-user') });
    getProfile.mockResolvedValue(null);
    await useCoachStore.getState().loadProfile();
    expect(getProfile).toHaveBeenCalledWith('coach-user');
    expect(useCoachStore.getState().hasCompletedCoachOnboarding('coach-user')).toBe(false);
  });

  test('ignores a response after the authenticated account changes', async () => {
    let resolve!: (value: CoachProfile) => void;
    getProfile.mockReturnValue(new Promise(r => { resolve = r; }));
    const pending = useCoachStore.getState().loadProfile();
    getAuth.mockReturnValue({ user: { id: 'other-user' } });
    resolve(profile('approved'));
    await pending;
    expect(useCoachStore.getState().profile).toBeNull();
    expect(useCoachStore.getState().profileLoadedUserId).toBeNull();
  });

  test('keeps the approved route while refreshing the same account profile', async () => {
    useCoachStore.setState({ profile: profile('approved'), profileLoadedUserId: 'coach-user' });
    let resolve!: (value: CoachProfile) => void;
    getProfile.mockReturnValue(new Promise(r => { resolve = r; }));
    const pending = useCoachStore.getState().loadProfile(true);
    expect(useCoachStore.getState().hasCompletedCoachOnboarding('coach-user')).toBe(true);
    resolve(profile('approved'));
    await pending;
    expect(useCoachStore.getState().loading).toBe(false);
  });

  test('persists duration and reloads it after clearing the profile cache', async () => {
    useCoachStore.setState({ profile: { ...profile('approved'), default_session_duration: 60 } });
    const update = coachProfileService.updateProfile as jest.Mock;
    update.mockResolvedValue(undefined);
    await useCoachStore.getState().updateProfile({ default_session_duration: 45 });
    expect(update).toHaveBeenCalledWith('profile-id', { default_session_duration: 45 });
    useCoachStore.getState().clearCoachData();
    getProfile.mockResolvedValue({ ...profile('approved'), default_session_duration: 45 });
    await useCoachStore.getState().loadProfile();
    expect(useCoachStore.getState().profile?.default_session_duration).toBe(45);
  });

  test('restores the previous duration when saving fails', async () => {
    useCoachStore.setState({ profile: { ...profile('approved'), default_session_duration: 60 } });
    (coachProfileService.updateProfile as jest.Mock).mockRejectedValue(new Error('Save failed'));
    await expect(useCoachStore.getState().updateProfile({ default_session_duration: 45 })).rejects.toThrow('Save failed');
    expect(useCoachStore.getState().profile?.default_session_duration).toBe(60);
  });
});
