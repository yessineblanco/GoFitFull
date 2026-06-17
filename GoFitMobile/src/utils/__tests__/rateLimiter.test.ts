const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    mockStorage.delete(key);
    return Promise.resolve();
  }),
}));

jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn() },
}));

import { RATE_LIMIT_CONFIG, STORAGE_KEYS } from '@/constants';
import {
  checkRateLimit,
  clearRateLimit,
  formatTimeRemaining,
  recordAttempt,
} from '../rateLimiter';

const loginKey = `${STORAGE_KEYS.RATE_LIMIT_PREFIX}login`;
const signupKey = `${STORAGE_KEYS.RATE_LIMIT_PREFIX}signup`;
const now = new Date('2026-06-13T12:00:00.000Z');

describe('rate limiter', () => {
  beforeEach(() => {
    mockStorage.clear();
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('allows an action with no previous attempts', async () => {
    await expect(checkRateLimit('login')).resolves.toEqual({
      isLimited: false,
      attemptsRemaining: RATE_LIMIT_CONFIG.MAX_LOGIN_ATTEMPTS,
    });
  });

  test('blocks login after the configured maximum attempts in the active window', async () => {
    for (let index = 0; index < RATE_LIMIT_CONFIG.MAX_LOGIN_ATTEMPTS; index += 1) {
      await recordAttempt('login');
    }

    await expect(checkRateLimit('login')).resolves.toEqual({
      isLimited: true,
      timeRemainingMs: RATE_LIMIT_CONFIG.LOGIN_WINDOW_MS,
      attemptsRemaining: 0,
    });
  });

  test('clears an expired window when checking the limit', async () => {
    mockStorage.set(
      loginKey,
      JSON.stringify({
        attempts: RATE_LIMIT_CONFIG.MAX_LOGIN_ATTEMPTS,
        firstAttempt: now.getTime() - RATE_LIMIT_CONFIG.LOGIN_WINDOW_MS - 1,
        lastAttempt: now.getTime() - RATE_LIMIT_CONFIG.LOGIN_WINDOW_MS - 1,
      }),
    );

    await expect(checkRateLimit('login')).resolves.toEqual({
      isLimited: false,
      attemptsRemaining: RATE_LIMIT_CONFIG.MAX_LOGIN_ATTEMPTS,
    });
    expect(mockStorage.has(loginKey)).toBe(false);
  });

  test('resets expired windows before recording a new attempt', async () => {
    mockStorage.set(
      signupKey,
      JSON.stringify({
        attempts: RATE_LIMIT_CONFIG.MAX_SIGNUP_ATTEMPTS,
        firstAttempt: now.getTime() - RATE_LIMIT_CONFIG.SIGNUP_WINDOW_MS - 1,
        lastAttempt: now.getTime() - RATE_LIMIT_CONFIG.SIGNUP_WINDOW_MS - 1,
      }),
    );

    await recordAttempt('signup');

    await expect(checkRateLimit('signup')).resolves.toEqual({
      isLimited: false,
      attemptsRemaining: RATE_LIMIT_CONFIG.MAX_SIGNUP_ATTEMPTS - 1,
    });
  });

  test('clears stored attempts and formats remaining time for users', async () => {
    await recordAttempt('login');
    expect(mockStorage.has(loginKey)).toBe(true);

    await clearRateLimit('login');

    expect(mockStorage.has(loginKey)).toBe(false);
    expect(formatTimeRemaining(60 * 1000)).toBe('1 minute');
    expect(formatTimeRemaining(61 * 1000)).toBe('2 minutes');
  });
});
