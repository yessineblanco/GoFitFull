/**
 * API Client Abstraction Layer
 * Provides centralized error handling, retry logic, and timeout management
 */

import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { API_CONFIG, ERROR_MESSAGES } from '@/constants';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Custom error class for API operations
 * 
 * Provides structured error information including error codes and original errors
 * for better error handling and debugging.
 * 
 * @example
 * ```typescript
 * try {
 *   await apiClient.selectOne('table', (b) => b.eq('id', '123'));
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.log(error.code); // 'PGRST116'
 *     console.log(error.message); // User-friendly message
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /**
   * Creates a new ApiError instance
   * 
   * @param message - User-friendly error message
   * @param code - Optional error code (e.g., 'PGRST116', 'PGRST205')
   * @param statusCode - Optional HTTP status code
   * @param originalError - Optional original error for debugging
   */
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Wraps a promise with a timeout to prevent hanging requests
 * 
 * If the promise doesn't resolve within the timeout period, it rejects with an ApiError.
 * This prevents requests from hanging indefinitely on slow networks or server issues.
 * 
 * @template T - The type of the promise result
 * @param promise - The promise to wrap with timeout
 * @param timeoutMs - Timeout in milliseconds (default: 10 seconds)
 * @returns Promise that rejects with ApiError if timeout is exceeded
 * 
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   supabase.from('table').select(),
 *   5000 // 5 second timeout
 * );
 * ```
 */
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = API_CONFIG.TIMEOUT_MS
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new ApiError(ERROR_MESSAGES.TIMEOUT_ERROR)), timeoutMs)
    ),
  ]);
};

/**
 * Retries a function with exponential backoff
 * 
 * Automatically retries failed operations with increasing delays between attempts.
 * This helps recover from temporary network issues or server overload.
 * 
 * Retry schedule:
 * - Attempt 1: Immediate
 * - Attempt 2: Wait 1 second
 * - Attempt 3: Wait 2 seconds
 * - etc.
 * 
 * @template T - The return type of the function
 * @param fn - The function to retry (must return a Promise)
 * @param maxAttempts - Maximum number of retry attempts (default: 3)
 * @param delayMs - Base delay in milliseconds for exponential backoff (default: 1000ms)
 * @returns Promise that resolves with the function result or rejects after max attempts
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => supabase.from('table').select(),
 *   3, // Max 3 attempts
 *   1000 // Start with 1 second delay
 * );
 * ```
 */
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = API_CONFIG.MAX_RETRIES,
  delayMs: number = API_CONFIG.RETRY_DELAY_MS
): Promise<T> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      // Exponential backoff
      const delay = delayMs * attempt;
      logger.warn(`API call failed, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retry attempts reached');
};

/**
 * Converts Supabase errors to user-friendly ApiError instances
 * 
 * Maps Supabase error codes to meaningful error messages and handles
 * both PostgrestError (database errors) and general Error types.
 * 
 * Error code mappings:
 * - PGRST116: Not found → "The requested resource was not found."
 * - PGRST205: Table not found → "Database table not found."
 * - PGRST301: Unauthorized → "You are not authorized to perform this action."
 * - Network errors → "Network error. Please check your connection."
 * 
 * @param error - The error to convert (PostgrestError or Error)
 * @returns ApiError instance with user-friendly message and error code
 * 
 * @example
 * ```typescript
 * try {
 *   await supabase.from('table').select();
 * } catch (error) {
 *   const apiError = handleSupabaseError(error);
 *   console.log(apiError.message); // User-friendly message
 *   console.log(apiError.code); // Error code
 * }
 * ```
 */
const handleSupabaseError = (error: PostgrestError | Error): ApiError => {
  if ('code' in error) {
    const supabaseError = error as PostgrestError;
    
    // Handle specific error codes
    switch (supabaseError.code) {
      case 'PGRST116':
        return new ApiError(ERROR_MESSAGES.NOT_FOUND, supabaseError.code);
      case 'PGRST205':
        return new ApiError(ERROR_MESSAGES.TABLE_NOT_FOUND, supabaseError.code);
      case 'PGRST301':
        return new ApiError(ERROR_MESSAGES.UNAUTHORIZED, supabaseError.code);
      default:
        return new ApiError(
          supabaseError.message || ERROR_MESSAGES.UNKNOWN_ERROR,
          supabaseError.code,
          undefined,
          supabaseError
        );
    }
  }
  
  // Handle network errors
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return new ApiError(ERROR_MESSAGES.NETWORK_ERROR, undefined, undefined, error);
  }
  
  return new ApiError(error.message || ERROR_MESSAGES.UNKNOWN_ERROR, undefined, undefined, error);
};

/**
 * Executes a Supabase query with automatic timeout, retry, and error handling
 * 
 * This is the core function that wraps all Supabase queries with:
 * - Automatic timeout (prevents hanging requests)
 * - Automatic retry (handles temporary failures)
 * - Error conversion (user-friendly error messages)
 * 
 * @template T - The type of data returned by the query
 * @param query - Function that returns a Supabase query result
 * @param options - Optional configuration
 * @param options.retry - Whether to retry on failure (default: true)
 * @param options.timeout - Timeout in milliseconds (default: 10 seconds)
 * @returns Promise that resolves with the query data
 * @throws {ApiError} If the query fails after all retries or times out
 * 
 * @example
 * ```typescript
 * const data = await executeQuery(
 *   () => supabase.from('users').select('*').eq('id', userId).single(),
 *   { retry: true, timeout: 5000 }
 * );
 * ```
 */
export const executeQuery = async <T>(
  query: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options?: {
    retry?: boolean;
    timeout?: number;
  }
): Promise<T> => {
  const { retry = true, timeout = API_CONFIG.TIMEOUT_MS } = options || {};

  try {
    const execute = async () => {
      const result = await withTimeout(query(), timeout);
      
      if (result.error) {
        throw handleSupabaseError(result.error);
      }
      
      if (result.data === null) {
        throw new ApiError(ERROR_MESSAGES.NOT_FOUND);
      }
      
      return result.data;
    };

    if (retry) {
      return await withRetry(execute);
    }
    
    return await execute();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw handleSupabaseError(error as Error);
  }
};

/**
 * API Client for Supabase database operations
 * 
 * Provides a high-level interface for database queries with automatic:
 * - Timeout handling (10 seconds default)
 * - Retry logic (3 attempts with exponential backoff)
 * - Error handling (user-friendly error messages)
 * 
 * All methods use the underlying `executeQuery` function which handles
 * these concerns automatically.
 * 
 * @example
 * ```typescript
 * import { apiClient } from '@/api/client';
 * 
 * // Get all profiles
 * const profiles = await apiClient.select<UserProfile>(
 *   'user_profiles',
 *   (builder) => builder.eq('user_id', userId).order('created_at')
 * );
 * ```
 */
export class ApiClient {
  /**
   * Execute a SELECT query to retrieve multiple records
   * 
   * Automatically applies timeout, retry, and error handling.
   * Returns an array of records matching the query.
   * 
   * @template T - The type of records being retrieved
   * @param table - The table name to query
   * @param query - Function that builds the query using Supabase query builder
   * @param options - Optional configuration
   * @param options.retry - Whether to retry on failure (default: true)
   * @param options.timeout - Timeout in milliseconds (default: 10 seconds)
   * @returns Promise that resolves with an array of records
   * @throws {ApiError} If the query fails or times out
   * 
   * @example
   * ```typescript
   * const profiles = await apiClient.select<UserProfile>(
   *   'user_profiles',
   *   (builder) => builder
   *     .eq('user_id', userId)
   *     .order('created_at', { ascending: false })
   *     .limit(10)
   * );
   * ```
   */
  async select<T>(
    table: string,
    query: (builder: any) => any,
    options?: { retry?: boolean; timeout?: number }
  ): Promise<T[]> {
    return executeQuery(
      async () => {
        const builder = supabase.from(table).select('*');
        const result = query(builder);
        return result;
      },
      options
    ) as Promise<T[]>;
  }

  /**
   * Execute a SELECT query to retrieve a single record
   * 
   * Automatically applies timeout, retry, and error handling.
   * Returns a single record matching the query. Throws ApiError if no record found.
   * 
   * @template T - The type of record being retrieved
   * @param table - The table name to query
   * @param query - Function that builds the query using Supabase query builder
   * @param options - Optional configuration
   * @param options.retry - Whether to retry on failure (default: true)
   * @param options.timeout - Timeout in milliseconds (default: 10 seconds)
   * @returns Promise that resolves with a single record
   * @throws {ApiError} If the query fails, times out, or no record is found
   * 
   * @example
   * ```typescript
   * const profile = await apiClient.selectOne<UserProfile>(
   *   'user_profiles',
   *   (builder) => builder.eq('id', userId)
   * );
   * ```
   */
  async selectOne<T>(
    table: string,
    query: (builder: any) => any,
    options?: { retry?: boolean; timeout?: number }
  ): Promise<T> {
    return executeQuery(
      async () => {
        const builder = supabase.from(table).select('*');
        const result = query(builder).single();
        return result;
      },
      options
    ) as Promise<T>;
  }

  /**
   * Execute an INSERT or UPSERT operation
   * 
   * Inserts a new record or updates an existing one if a conflict occurs.
   * Automatically applies timeout, retry, and error handling.
   * 
   * @template T - The type of record being inserted/updated
   * @param table - The table name
   * @param data - The record data to insert or update
   * @param options - Optional configuration
   * @param options.onConflict - Column name to use for conflict resolution (e.g., 'id')
   * @param options.retry - Whether to retry on failure (default: true)
   * @param options.timeout - Timeout in milliseconds (default: 10 seconds)
   * @returns Promise that resolves with the inserted/updated record
   * @throws {ApiError} If the operation fails or times out
   * 
   * @example
   * ```typescript
   * const profile = await apiClient.upsert<UserProfile>(
   *   'user_profiles',
   *   { id: userId, weight: 70, goal: 'Lose weight' },
   *   { onConflict: 'id' }
   * );
   * ```
   */
  async upsert<T>(
    table: string,
    data: Partial<T>,
    options?: { onConflict?: string; retry?: boolean; timeout?: number }
  ): Promise<T> {
    return executeQuery(
      async () => {
        // Supabase upsert accepts options as second parameter
        const upsertOptions = options?.onConflict
          ? { onConflict: options.onConflict }
          : {};
        const result = supabase.from(table).upsert(data as any, upsertOptions);
        return result.select().single();
      },
      options
    ) as Promise<T>;
  }

  /**
   * Execute an UPDATE operation
   * 
   * Updates existing records matching the query conditions.
   * Automatically applies timeout, retry, and error handling.
   * 
   * @template T - The type of record being updated
   * @param table - The table name
   * @param data - The data to update (partial record)
   * @param query - Function that builds the WHERE clause using Supabase query builder
   * @param options - Optional configuration
   * @param options.retry - Whether to retry on failure (default: true)
   * @param options.timeout - Timeout in milliseconds (default: 10 seconds)
   * @returns Promise that resolves with the updated record
   * @throws {ApiError} If the operation fails, times out, or no record matches
   * 
   * @example
   * ```typescript
   * const updated = await apiClient.update<UserProfile>(
   *   'user_profiles',
   *   { weight: 75, goal: 'Build muscle' },
   *   (builder) => builder.eq('id', userId)
   * );
   * ```
   */
  async update<T>(
    table: string,
    data: Partial<T>,
    query: (builder: any) => any,
    options?: { retry?: boolean; timeout?: number }
  ): Promise<T> {
    return executeQuery(
      async () => {
        const builder = supabase.from(table).update(data as any);
        const result = query(builder).select().single();
        return result;
      },
      options
    ) as Promise<T>;
  }

  /**
   * Execute a DELETE operation
   * 
   * Deletes records matching the query conditions.
   * Automatically applies timeout, retry, and error handling.
   * 
   * @param table - The table name
   * @param query - Function that builds the WHERE clause using Supabase query builder
   * @param options - Optional configuration
   * @param options.retry - Whether to retry on failure (default: true)
   * @param options.timeout - Timeout in milliseconds (default: 10 seconds)
   * @returns Promise that resolves when deletion is complete
   * @throws {ApiError} If the operation fails or times out
   * 
   * @example
   * ```typescript
   * await apiClient.delete(
   *   'user_profiles',
   *   (builder) => builder.eq('id', userId)
   * );
   * ```
   */
  async delete(
    table: string,
    query: (builder: any) => any,
    options?: { retry?: boolean; timeout?: number }
  ): Promise<void> {
    await executeQuery(
      async () => {
        const builder = supabase.from(table).delete();
        const result = query(builder);
        return result;
      },
      options
    );
  }
}

/**
 * Singleton instance of ApiClient
 * 
 * Use this instance for all database operations throughout the app.
 * It provides automatic timeout, retry, and error handling for all queries.
 * 
 * @example
 * ```typescript
 * import { apiClient } from '@/api/client';
 * 
 * const profile = await apiClient.selectOne('user_profiles', (b) => b.eq('id', userId));
 * ```
 */
export const apiClient = new ApiClient();


export { supabase };
