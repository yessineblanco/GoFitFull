/**
 * Application-wide constants
 * Centralized location for all magic numbers, strings, and configuration values
 */

// Storage Keys
export const STORAGE_KEYS = {
  // Auth
  REMEMBER_ME: 'remember_me',
  REMEMBERED_EMAIL: 'remembered_email',
  
  // Onboarding
  ONBOARDING_COMPLETED: 'onboarding-completed-users',
  ONBOARDING_TEMPORARY: 'onboarding-temporary-data',
  
  // Form Persistence
  FORM_DATA_PREFIX: 'form_data_',
  
  // Rate Limiting
  RATE_LIMIT_PREFIX: 'rate_limit_',
} as const;

// API Configuration
export const API_CONFIG = {
  TIMEOUT_MS: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_SIGNUP_ATTEMPTS: 3,
  SIGNUP_WINDOW_MS: 60 * 60 * 1000, // 1 hour
} as const;

// Validation Limits
export const VALIDATION_LIMITS = {
  EMAIL_MAX_LENGTH: 254,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 100,
  GOAL_MAX_LENGTH: 200,
  WEIGHT_MIN_KG: 20,
  WEIGHT_MAX_KG: 300,
  WEIGHT_MIN_LB: 44,
  WEIGHT_MAX_LB: 660,
  HEIGHT_MIN_CM: 100,
  HEIGHT_MAX_CM: 250,
  HEIGHT_MIN_INCHES: 39,
  HEIGHT_MAX_INCHES: 98,
} as const;

// Session Configuration
export const SESSION_CONFIG = {
  REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // Refresh if expires in less than 5 minutes
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  TABLE_NOT_FOUND: 'Database table not found. Please contact support.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  PROFILE_SAVED: 'Profile saved successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  ONBOARDING_COMPLETE: 'Onboarding completed successfully!',
} as const;
// Layout Configuration
export const LAYOUT_CONFIG = {
  TAB_BAR_HEIGHT: 80,
  TAB_BAR_SPACING: 20,
} as const;



