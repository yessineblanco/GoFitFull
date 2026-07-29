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
  logger: { warn: jest.fn() },
}));

import { z } from 'zod';

import { STORAGE_KEYS } from '@/constants';
import { clearFormData, loadFormData, saveFormData } from '../formPersistence';

const loginKey = `${STORAGE_KEYS.FORM_DATA_PREFIX}login`;
const loginSchema = z.object({
  email: z.string().email(),
  rememberMe: z.boolean(),
});

describe('form persistence', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('saves and loads valid form data with schema validation', async () => {
    const data = {
      email: 'user@example.com',
      rememberMe: true,
    };

    await saveFormData('login', data);

    await expect(loadFormData('login', loginSchema)).resolves.toEqual(data);
    expect(mockStorage.get(loginKey)).toBe(JSON.stringify(data));
  });

  test('clears corrupted persisted JSON and returns null', async () => {
    mockStorage.set(loginKey, '{not-valid-json');

    await expect(loadFormData('login', loginSchema)).resolves.toBeNull();
    expect(mockStorage.has(loginKey)).toBe(false);
  });

  test('clears data that fails schema validation', async () => {
    mockStorage.set(
      loginKey,
      JSON.stringify({
        email: 'not-an-email',
        rememberMe: true,
      }),
    );

    await expect(loadFormData('login', loginSchema)).resolves.toBeNull();
    expect(mockStorage.has(loginKey)).toBe(false);
  });

  test('clears saved form data after submission', async () => {
    await saveFormData('login', {
      email: 'user@example.com',
      rememberMe: false,
    });

    await clearFormData('login');

    expect(mockStorage.has(loginKey)).toBe(false);
  });
});
