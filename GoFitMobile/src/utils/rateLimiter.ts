/**
 * Rate Limiting Utility
 * Prevents brute force attacks by limiting the number of attempts within a time window
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, RATE_LIMIT_CONFIG } from '@/constants';
import { logger } from '@/utils/logger';

interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
}

/**
 * Get the storage key for rate limiting
 */
const getRateLimitKey = (action: 'login' | 'signup' | 'forgotPassword'): string => {
  return `${STORAGE_KEYS.RATE_LIMIT_PREFIX}${action}`;
};

/**
 * Get rate limit configuration for an action
 */
const getRateLimitConfig = (action: 'login' | 'signup' | 'forgotPassword') => {
  switch (action) {
    case 'login':
      return {
        maxAttempts: RATE_LIMIT_CONFIG.MAX_LOGIN_ATTEMPTS,
        windowMs: RATE_LIMIT_CONFIG.LOGIN_WINDOW_MS,
      };
    case 'signup':
      return {
        maxAttempts: RATE_LIMIT_CONFIG.MAX_SIGNUP_ATTEMPTS,
        windowMs: RATE_LIMIT_CONFIG.SIGNUP_WINDOW_MS,
      };
    case 'forgotPassword':
      // Use same limits as login for password reset
      return {
        maxAttempts: RATE_LIMIT_CONFIG.MAX_LOGIN_ATTEMPTS,
        windowMs: RATE_LIMIT_CONFIG.LOGIN_WINDOW_MS,
      };
    default:
      return {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
      };
  }
};

/**
 * Check if an action is currently rate limited
 * 
 * Determines if the user has exceeded the maximum number of attempts for an action
 * within the configured time window. Used to prevent brute force attacks.
 * 
 * @param action - The action to check ('login', 'signup', or 'forgotPassword')
 * @returns Promise that resolves with rate limit status
 * @returns Returns.isLimited - Whether the action is currently blocked
 * @returns Returns.timeRemainingMs - Time remaining until rate limit expires (if limited)
 * @returns Returns.attemptsRemaining - Number of attempts remaining before limit (if not limited)
 * 
 * @example
 * ```typescript
 * const check = await checkRateLimit('login');
 * if (check.isLimited) {
 *   const minutes = Math.ceil(check.timeRemainingMs! / 60000);
 *   console.log(`Too many attempts. Try again in ${minutes} minutes.`);
 * } else {
 *   console.log(`${check.attemptsRemaining} attempts remaining`);
 * }
 * ```
 */
export const checkRateLimit = async (
  action: 'login' | 'signup' | 'forgotPassword'
): Promise<{ isLimited: boolean; timeRemainingMs?: number; attemptsRemaining?: number }> => {
  try {
    const key = getRateLimitKey(action);
    const config = getRateLimitConfig(action);
    const now = Date.now();

    // Get existing record
    const recordStr = await AsyncStorage.getItem(key);
    
    if (!recordStr) {
      // No previous attempts
      return { isLimited: false, attemptsRemaining: config.maxAttempts };
    }

    const record: RateLimitRecord = JSON.parse(recordStr);

    // Check if time window has passed
    const timeSinceFirstAttempt = now - record.firstAttempt;
    
    if (timeSinceFirstAttempt > config.windowMs) {
      // Time window expired, reset
      await AsyncStorage.removeItem(key);
      return { isLimited: false, attemptsRemaining: config.maxAttempts };
    }

    // Check if max attempts exceeded
    if (record.attempts >= config.maxAttempts) {
      const timeRemainingMs = config.windowMs - timeSinceFirstAttempt;
      return {
        isLimited: true,
        timeRemainingMs,
        attemptsRemaining: 0,
      };
    }

    // Not limited yet
    const attemptsRemaining = config.maxAttempts - record.attempts;
    return { isLimited: false, attemptsRemaining };
  } catch (error) {
    logger.error('Error checking rate limit', error);
    // On error, allow the action (fail open for better UX)
    return { isLimited: false };
  }
};

/**
 * Record an attempt for rate limiting
 * 
 * Increments the attempt counter for the specified action. This should be called
 * before making the actual authentication request to track attempts.
 * 
 * @param action - The action being attempted ('login', 'signup', or 'forgotPassword')
 * @returns Promise that resolves when the attempt is recorded
 * 
 * @example
 * ```typescript
 * // Before attempting login
 * await recordAttempt('login');
 * try {
 *   await authService.signIn(email, password);
 *   // On success, clear rate limit
 *   await clearRateLimit('login');
 * } catch (error) {
 *   // Attempt already recorded, error will be thrown
 * }
 * ```
 */
export const recordAttempt = async (action: 'login' | 'signup' | 'forgotPassword'): Promise<void> => {
  try {
    const key = getRateLimitKey(action);
    const now = Date.now();

    // Get existing record
    const recordStr = await AsyncStorage.getItem(key);
    
    if (!recordStr) {
      // First attempt
      const newRecord: RateLimitRecord = {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
      };
      await AsyncStorage.setItem(key, JSON.stringify(newRecord));
      return;
    }

    const record: RateLimitRecord = JSON.parse(recordStr);
    const config = getRateLimitConfig(action);
    const timeSinceFirstAttempt = now - record.firstAttempt;

    // If time window expired, reset
    if (timeSinceFirstAttempt > config.windowMs) {
      const newRecord: RateLimitRecord = {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
      };
      await AsyncStorage.setItem(key, JSON.stringify(newRecord));
      return;
    }

    // Increment attempts
    record.attempts += 1;
    record.lastAttempt = now;
    await AsyncStorage.setItem(key, JSON.stringify(record));
  } catch (error) {
    logger.error('Error recording rate limit attempt', error);
    // Don't throw - rate limiting shouldn't break the app
  }
};

/**
 * Clear rate limit for an action
 * 
 * Resets the rate limit counter for the specified action. Should be called
 * after a successful authentication to allow future attempts immediately.
 * 
 * @param action - The action to clear ('login', 'signup', or 'forgotPassword')
 * @returns Promise that resolves when the rate limit is cleared
 * 
 * @example
 * ```typescript
 * try {
 *   await authService.signIn(email, password);
 *   // Clear rate limit on successful login
 *   await clearRateLimit('login');
 * } catch (error) {
 *   // Rate limit remains, user must wait
 * }
 * ```
 */
export const clearRateLimit = async (action: 'login' | 'signup' | 'forgotPassword'): Promise<void> => {
  try {
    const key = getRateLimitKey(action);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    logger.error('Error clearing rate limit', error);
  }
};

/**
 * Format time remaining in a user-friendly way
 * 
 * Converts milliseconds to a human-readable time string (e.g., "5 minutes").
 * 
 * @param ms - Time in milliseconds
 * @returns Formatted time string (e.g., "1 minute" or "15 minutes")
 * 
 * @example
 * ```typescript
 * const timeRemaining = 900000; // 15 minutes
 * const formatted = formatTimeRemaining(timeRemaining);
 * console.log(`Try again in ${formatted}`); // "Try again in 15 minutes"
 * ```
 */
export const formatTimeRemaining = (ms: number): string => {
  const minutes = Math.ceil(ms / (60 * 1000));
  if (minutes === 1) {
    return '1 minute';
  }
  return `${minutes} minutes`;
};

