import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { z, ZodSchema } from 'zod';
import { STORAGE_KEYS } from '@/constants';
import { logger } from '@/utils/logger';

const FORM_DATA_PREFIX = STORAGE_KEYS.FORM_DATA_PREFIX;

/**
 * Save form data to AsyncStorage for persistence
 * 
 * Persists form data to AsyncStorage so it can be restored if the user navigates
 * away or the app is closed. Data is stored as JSON.
 * 
 * @param formName - Unique name for the form (e.g., 'login', 'signup')
 * @param data - Form data to persist (will be JSON stringified)
 * @returns Promise that resolves when data is saved
 * 
 * @example
 * ```typescript
 * await saveFormData('login', {
 *   email: 'user@example.com',
 *   password: '' // Don't save passwords!
 * });
 * ```
 */
export const saveFormData = async (formName: string, data: Record<string, unknown>): Promise<void> => {
  try {
    const key = `${FORM_DATA_PREFIX}${formName}`;
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    logger.warn('Failed to save form data', error);
  }
};

/**
 * Load form data from AsyncStorage with optional validation
 * 
 * Retrieves previously saved form data. If a Zod schema is provided, the data
 * is validated before being returned. Invalid or corrupted data is automatically
 * cleared.
 * 
 * @template T - The type of the form data
 * @param formName - Name of the form to load (e.g., 'login', 'signup')
 * @param schema - Optional Zod schema to validate the loaded data
 * @returns Promise that resolves with validated form data or null if not found/invalid
 * 
 * @example
 * ```typescript
 * import { loginSchema } from '@/lib/validations';
 * 
 * const savedData = await loadFormData('login', loginSchema.partial());
 * if (savedData) {
 *   setValue('email', savedData.email);
 * }
 * ```
 */
export const loadFormData = async <T = Record<string, unknown>>(
  formName: string,
  schema?: ZodSchema<T>
): Promise<T | null> => {
  try {
    const key = `${FORM_DATA_PREFIX}${formName}`;
    const dataStr = await AsyncStorage.getItem(key);
    
    if (!dataStr) {
      return null;
    }

    // Parse JSON
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(dataStr);
    } catch (parseError) {
      logger.warn(`Failed to parse form data for ${formName}`, parseError);
      // Clear corrupted data
      await clearFormData(formName);
      return null;
    }

    // Validate with schema if provided
    if (schema) {
      try {
        const validatedData = schema.parse(parsedData);
        return validatedData;
      } catch (validationError) {
        logger.warn(`Form data validation failed for ${formName}`, validationError);
        // Clear invalid data
        await clearFormData(formName);
        return null;
      }
    }

    // Return unvalidated data if no schema provided (for backward compatibility)
    return parsedData as T;
  } catch (error) {
    logger.warn('Failed to load form data', error);
    return null;
  }
};

/**
 * Clear form data from AsyncStorage
 * 
 * Removes persisted form data for the specified form. Should be called after
 * successful form submission or when the user explicitly clears the form.
 * 
 * @param formName - Name of the form to clear (e.g., 'login', 'signup')
 * @returns Promise that resolves when data is cleared
 * 
 * @example
 * ```typescript
 * // After successful login
 * await clearFormData('login');
 * 
 * // Or when user clicks "Clear"
 * await clearFormData('signup');
 * ```
 */
export const clearFormData = async (formName: string): Promise<void> => {
  try {
    const key = `${FORM_DATA_PREFIX}${formName}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    logger.warn('Failed to clear form data', error);
  }
};

// Note: Form persistence is handled directly in components using useEffect
// This keeps the implementation simple and avoids hook complexity

