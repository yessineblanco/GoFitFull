/**
 * Secure Storage Utility with Chunking Support
 * 
 * SecureStore has a 2048 byte limit per key. This utility automatically
 * splits large data across multiple keys and reassembles it transparently.
 * 
 * Use this for storing sensitive data that might exceed 2048 bytes.
 * 
 * On web, falls back to AsyncStorage since SecureStore is not available.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

const IS_WEB = Platform.OS === 'web';

const CHUNK_SIZE = 2000; // Stay safely under 2048 byte limit
const CHUNK_COUNT_KEY_SUFFIX = '_chunk_count';

/**
 * Save data to SecureStore, splitting into chunks if necessary
 * 
 * Saves data to SecureStore (encrypted storage). If the data exceeds 2048 bytes,
 * it automatically splits it into multiple chunks and reassembles them transparently.
 * 
 * @param key - Storage key for the data
 * @param value - Data to save (will be chunked if > 2000 bytes)
 * @returns Promise that resolves when data is saved
 * @throws {Error} If saving fails
 * 
 * @example
 * ```typescript
 * await saveSecureItem('session_token', largeTokenString);
 * // Automatically handles chunking if needed
 * ```
 */
export const saveSecureItem = async (key: string, value: string): Promise<void> => {
  // On web, use AsyncStorage as fallback
  if (IS_WEB) {
    try {
      await AsyncStorage.setItem(key, value);
      return;
    } catch (error) {
      logger.error(`Error writing to AsyncStorage (key: ${key})`, error);
      throw error;
    }
  }

  // If data is small enough, save normally
  if (value.length <= CHUNK_SIZE) {
    try {
      // Clean up any old chunks if they exist (before saving new value)
      // Only delete chunk-related keys, not the main key
      try {
        const countStr = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_KEY_SUFFIX}`);
        if (countStr) {
          const count = parseInt(countStr, 10);
          if (!isNaN(count) && count > 0) {
            // Delete chunk count
            await SecureStore.deleteItemAsync(`${key}${CHUNK_COUNT_KEY_SUFFIX}`);
            // Delete all chunks
            for (let i = 0; i < count; i++) {
              try {
                await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
              } catch {
                // Ignore individual chunk deletion errors
              }
            }
          }
        }
      } catch {
        // Ignore cleanup errors
      }
      // Now save the new value
      await SecureStore.setItemAsync(key, value);
      return;
    } catch (error) {
      logger.error(`Error writing to SecureStore (key: ${key})`, error);
      throw error;
    }
  }

  // Split into chunks
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }

  try {
    // Save chunk count
    await SecureStore.setItemAsync(`${key}${CHUNK_COUNT_KEY_SUFFIX}`, chunks.length.toString());
    
    // Save each chunk
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
    }
    
    // Remove the non-chunked version if it exists
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore if it doesn't exist
    }
  } catch (error) {
    logger.error(`Error writing chunked data to SecureStore (key: ${key})`, error);
    throw error;
  }
};

/**
 * Load data from SecureStore, reassembling chunks if necessary
 * 
 * Retrieves data from SecureStore. If the data was stored in chunks (due to size),
 * it automatically reassembles them. Also supports backward compatibility with
 * non-chunked data.
 * 
 * @param key - Storage key for the data
 * @returns Promise that resolves with the data or null if not found
 * 
 * @example
 * ```typescript
 * const token = await getSecureItem('session_token');
 * if (token) {
 *   // Use token
 * }
 * ```
 */
export const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    // On web, use AsyncStorage as fallback
    if (IS_WEB) {
      return await AsyncStorage.getItem(key);
    }

    // First, try to load as non-chunked (for backward compatibility)
    const directValue = await SecureStore.getItemAsync(key);
    if (directValue !== null) {
      return directValue;
    }

    // Check if data is chunked
    const countStr = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_KEY_SUFFIX}`);
    if (!countStr) {
      return null;
    }

    const count = parseInt(countStr, 10);
    if (isNaN(count) || count <= 0) {
      logger.warn(`Invalid chunk count for key ${key}`);
      await deleteSecureItem(key);
      return null;
    }

    // Reassemble chunks
    let value = '';
    for (let i = 0; i < count; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
      if (!chunk) {
        logger.warn(`Missing chunk ${i} for key ${key}`);
        await deleteSecureItem(key);
        return null;
      }
      value += chunk;
    }

    return value || null;
  } catch (error) {
    logger.error(`Error reading from SecureStore (key: ${key})`, error);
    return null;
  }
};

/**
 * Delete data from SecureStore, including all chunks
 * 
 * Removes data from SecureStore, including all associated chunks if the data
 * was stored in chunks. Handles both chunked and non-chunked data.
 * 
 * @param key - Storage key for the data to delete
 * @returns Promise that resolves when data is deleted
 * 
 * @example
 * ```typescript
 * await deleteSecureItem('session_token');
 * // Removes all chunks if data was chunked
 * ```
 */
export const deleteSecureItem = async (key: string): Promise<void> => {
  try {
    // On web, use AsyncStorage as fallback
    if (IS_WEB) {
      await AsyncStorage.removeItem(key);
      return;
    }

    // Try to delete non-chunked version
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore if it doesn't exist
  }

  try {
    // Delete chunk count
    const countStr = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_KEY_SUFFIX}`);
    if (countStr) {
      await SecureStore.deleteItemAsync(`${key}${CHUNK_COUNT_KEY_SUFFIX}`);
      const count = parseInt(countStr, 10);
      
      if (!isNaN(count) && count > 0) {
        // Delete all chunks
        for (let i = 0; i < count; i++) {
          try {
            await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
          } catch {
            // Ignore individual chunk deletion errors
          }
        }
      }
    }
  } catch (error) {
    // Removal failures are non-critical, but log for debugging
    logger.warn(`Error removing chunked data from SecureStore (key: ${key}, non-critical)`, error);
  }
};

