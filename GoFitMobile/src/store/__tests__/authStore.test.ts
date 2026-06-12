jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@/services/auth', () => ({
  authService: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
  },
}));

jest.mock('@/config/supabase', () => ({
  supabase: {
    auth: { refreshSession: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('@/utils/rateLimiter', () => ({
  checkRateLimit: jest.fn(),
  recordAttempt: jest.fn(),
  clearRateLimit: jest.fn(),
  formatTimeRemaining: jest.fn(() => '2 minutes'),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/config/supabase';
import { authService } from '@/services/auth';
import {
  checkRateLimit,
  clearRateLimit,
  recordAttempt,
} from '@/utils/rateLimiter';
import { useAuthStore } from '../authStore';

const mockedAuthService = authService as jest.Mocked<typeof authService>;
const mockedCheckRateLimit = checkRateLimit as jest.Mock;
const mockedRecordAttempt = recordAttempt as jest.Mock;
const mockedClearRateLimit = clearRateLimit as jest.Mock;
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const user: SupabaseUser = {
  id: 'user-1',
  app_metadata: {},
  aud: 'authenticated',
  email: 'client@example.com',
  created_at: '2026-06-12T10:00:00.000Z',
  user_metadata: { user_type: 'client' },
};

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user,
} as Session;

describe('auth store', () => {
  let appStateListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    appStateListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() });
    useAuthStore.setState({
      user: null,
      session: null,
      loading: false,
      initialized: false,
      isResettingPassword: false,
      rememberMe: false,
      rememberedEmail: null,
      authSubscription: null,
      lastActivity: null,
      userType: 'client',
    });
    mockedCheckRateLimit.mockResolvedValue({ isLimited: false });
    mockedRecordAttempt.mockResolvedValue(undefined);
    mockedClearRateLimit.mockResolvedValue(undefined);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);

    const single = jest.fn().mockResolvedValue({
      data: { user_type: 'coach' },
      error: null,
    });
    const eq = jest.fn(() => ({ single }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    appStateListenerSpy.mockRestore();
  });

  test('blocks a rate-limited sign-in before calling Supabase', async () => {
    mockedCheckRateLimit.mockResolvedValue({
      isLimited: true,
      timeRemainingMs: 120_000,
    });

    await expect(
      useAuthStore.getState().signIn('client@example.com', 'password'),
    ).rejects.toThrow('Too many login attempts. Please try again in 2 minutes.');

    expect(mockedAuthService.signIn).not.toHaveBeenCalled();
    expect(mockedRecordAttempt).not.toHaveBeenCalled();
    expect(useAuthStore.getState().loading).toBe(false);
  });

  test('stores a successful session, user type, and remember-me preference', async () => {
    mockedAuthService.signIn.mockResolvedValue({ user, session });

    await useAuthStore
      .getState()
      .signIn('client@example.com', 'password', true);

    expect(mockedRecordAttempt).toHaveBeenCalledWith('login');
    expect(mockedClearRateLimit).toHaveBeenCalledWith('login');
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      expect.any(String),
      'client@example.com',
    );
    expect(useAuthStore.getState()).toMatchObject({
      loading: false,
      session,
      user: {
        id: 'user-1',
        email: 'client@example.com',
      },
      userType: 'coach',
      rememberMe: true,
      rememberedEmail: 'client@example.com',
    });
  });

  test('clears loading and preserves anonymous state when sign-in fails', async () => {
    mockedAuthService.signIn.mockRejectedValue(new Error('Invalid credentials'));

    await expect(
      useAuthStore.getState().signIn('client@example.com', 'wrong-password'),
    ).rejects.toThrow('Invalid credentials');

    expect(mockedRecordAttempt).toHaveBeenCalledWith('login');
    expect(mockedClearRateLimit).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      session: null,
      loading: false,
    });
  });
});
