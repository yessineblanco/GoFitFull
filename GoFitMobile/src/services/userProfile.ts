import { logger } from '@/utils/logger';
import { VALIDATION_LIMITS } from '@/constants';
import { z } from 'zod';
import { sanitizeForDatabase } from '@/utils/sanitize';
import { apiClient, ApiError } from '@/api/client';
import { supabase } from '@/config/supabase';

// Validation schema for goal field
const goalSchema = z
  .string()
  .min(1, 'Goal is required')
  .max(VALIDATION_LIMITS.GOAL_MAX_LENGTH, `Goal must be less than ${VALIDATION_LIMITS.GOAL_MAX_LENGTH} characters`)
  .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Goal contains invalid characters');

export interface OnboardingData {
  weight: number;
  weightUnit: 'kg' | 'lb';
  height: number;
  heightUnit: 'cm' | 'inches';
  goal: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  notificationPreferences?: NotificationPreferences;
  displayName?: string;
}

export interface NotificationPreferences {
  workout_reminders?: boolean;
  achievement_notifications?: boolean;
  weekly_progress_reports?: boolean;
  notification_time?: string; // HH:MM format
  inactivity_nudges?: boolean;
  inactivity_threshold_days?: number;
  streak_alerts?: boolean;
}

export interface UserProfile {
  id: string;
  display_name?: string | null;
  weight?: number;
  weight_unit?: 'kg' | 'lb';
  height?: number;
  height_unit?: 'cm' | 'inches';
  goal?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  profile_picture_url?: string | null;
  notification_preferences?: NotificationPreferences;
  updated_at?: string;
}

/**
 * User profile service for managing user profile data
 * 
 * Provides methods for saving, retrieving, and updating user profile information
 * including weight, height, goals, and preferences. All database operations use
 * the API client for automatic timeout, retry, and error handling.
 */
export const userProfileService = {
  /**
   * Save onboarding data to user profile
   * 
   * Saves user onboarding information (weight, height, goal) to the database.
   * Automatically converts units to standard format (kg, cm) and validates/sanitizes input.
   * 
   * @param userId - The user's unique identifier
   * @param data - The onboarding data to save
   * @param data.weight - User's weight
   * @param data.weightUnit - Weight unit ('kg' or 'lb')
   * @param data.height - User's height
   * @param data.heightUnit - Height unit ('cm' or 'inches')
   * @param data.goal - User's fitness goal (validated and sanitized)
   * @returns Promise that resolves when data is saved
   * @throws {Error} If validation fails, data is invalid, or save operation fails
   * 
   * @example
   * ```typescript
   * await userProfileService.saveOnboardingData(userId, {
   *   weight: 70,
   *   weightUnit: 'kg',
   *   height: 175,
   *   heightUnit: 'cm',
   *   goal: 'Lose weight and build muscle'
   * });
   * ```
   */
  async saveOnboardingData(userId: string, data: OnboardingData): Promise<void> {
    try {
      // Validate and sanitize goal field
      const validatedGoal = goalSchema.parse(data.goal);
      const sanitizedGoal = sanitizeForDatabase(validatedGoal);

      // Validate weight range
      const minWeight = data.weightUnit === 'kg' ? VALIDATION_LIMITS.WEIGHT_MIN_KG : VALIDATION_LIMITS.WEIGHT_MIN_LB;
      const maxWeight = data.weightUnit === 'kg' ? VALIDATION_LIMITS.WEIGHT_MAX_KG : VALIDATION_LIMITS.WEIGHT_MAX_LB;
      if (data.weight < minWeight || data.weight > maxWeight) {
        throw new Error(`Weight must be between ${minWeight} and ${maxWeight} ${data.weightUnit}`);
      }

      // Validate height range
      const minHeight = data.heightUnit === 'cm' ? VALIDATION_LIMITS.HEIGHT_MIN_CM : VALIDATION_LIMITS.HEIGHT_MIN_INCHES;
      const maxHeight = data.heightUnit === 'cm' ? VALIDATION_LIMITS.HEIGHT_MAX_CM : VALIDATION_LIMITS.HEIGHT_MAX_INCHES;
      if (data.height < minHeight || data.height > maxHeight) {
        throw new Error(`Height must be between ${minHeight} and ${maxHeight} ${data.heightUnit}`);
      }

      // Convert weight to kg if in lb
      const weightInKg = data.weightUnit === 'lb'
        ? data.weight / 2.20462
        : data.weight;

      // Convert height to cm if in inches
      const heightInCm = data.heightUnit === 'inches'
        ? data.height * 2.54
        : data.height;

      // Use API client with automatic timeout and retry
      await apiClient.upsert<UserProfile>(
        'user_profiles',
        {
          id: userId,
          weight: weightInKg,
          weight_unit: data.weightUnit,
          height: heightInCm,
          height_unit: data.heightUnit,
          goal: sanitizedGoal,
          age: data.age,
          gender: data.gender,
          activity_level: data.activityLevel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (error: unknown) {
      // Handle table not found errors gracefully
      if (error instanceof ApiError) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('table not found')) {
          logger.warn(
            '⚠️ user_profiles table not found in Supabase. ' +
            'Please create the table using the SQL script in the project root (create_user_profiles_table.sql). ' +
            'The app will continue without saving to database.'
          );
          // Don't throw - allow app to continue
          return;
        }
        // Re-throw other API errors
        throw error;
      }

      // Re-throw validation errors
      if (error instanceof z.ZodError) {
        throw new Error(error.issues[0].message);
      }

      // For other errors (like Supabase not configured), log but don't crash
      logger.warn('Could not save onboarding data (Supabase may not be configured)', error);
      // In development, we'll allow the app to continue even if Supabase isn't configured
    }
  },

  /**
   * Get user profile data
   * 
   * Retrieves the user's profile information from the database.
   * Returns null if no profile exists or if the table is not found.
   * 
   * @param userId - The user's unique identifier
   * @returns Promise that resolves with the user profile or null if not found
   * 
   * @example
   * ```typescript
   * const profile = await userProfileService.getUserProfile(userId);
   * if (profile) {
   *   console.log('Weight:', profile.weight, profile.weight_unit);
   *   console.log('Goal:', profile.goal);
   * } else {
   *   console.log('No profile found');
   * }
   * ```
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Use API client with automatic timeout and retry
      return await apiClient.selectOne<UserProfile>(
        'user_profiles',
        (builder) => builder.eq('id', userId)
      );
    } catch (error: unknown) {
      // Handle "not found" errors gracefully (return null)
      if (error instanceof ApiError) {
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
          // No profile found, return null
          return null;
        }
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('table not found')) {
          // Table doesn't exist, return null gracefully
          logger.warn('user_profiles table not found. Returning null.');
          return null;
        }
        // Re-throw other API errors
        throw error;
      }

      // For other errors (like network issues), log and return null
      logger.warn('Could not fetch user profile (Supabase may not be configured)', error);
      return null;
    }
  },

  /**
   * Update user profile data
   * 
   * Updates specific fields in the user's profile. Only provided fields are updated.
   * Automatically converts units and validates/sanitizes the goal field if provided.
   * 
   * @param userId - The user's unique identifier
   * @param updates - Partial onboarding data with fields to update
   * @param updates.weight - Optional: New weight value
   * @param updates.weightUnit - Optional: Weight unit (required if weight is provided)
   * @param updates.height - Optional: New height value
   * @param updates.heightUnit - Optional: Height unit (required if height is provided)
   * @param updates.goal - Optional: New fitness goal (validated and sanitized)
   * @returns Promise that resolves when update is complete
   * @throws {Error} If validation fails or update operation fails
   * 
   * @example
   * ```typescript
   * // Update only weight
   * await userProfileService.updateUserProfile(userId, {
   *   weight: 75,
   *   weightUnit: 'kg'
   * });
   * 
   * // Update goal
   * await userProfileService.updateUserProfile(userId, {
   *   goal: 'Build muscle and increase strength'
   * });
   * ```
   */
  async updateUserProfile(userId: string, updates: Partial<OnboardingData>): Promise<void> {
    try {
      interface UpdateData {
        updated_at: string;
        weight?: number;
        weight_unit?: 'kg' | 'lb';
        height?: number;
        height_unit?: 'cm' | 'inches';
        goal?: string;
        notification_preferences?: NotificationPreferences;
      }

      const updateData: UpdateData = {
        updated_at: new Date().toISOString(),
      };

      if (updates.weight !== undefined && updates.weightUnit !== undefined) {
        const weightInKg = updates.weightUnit === 'lb'
          ? updates.weight / 2.20462
          : updates.weight;
        updateData.weight = weightInKg;
        updateData.weight_unit = updates.weightUnit;
      }

      if (updates.height !== undefined && updates.heightUnit !== undefined) {
        const heightInCm = updates.heightUnit === 'inches'
          ? updates.height * 2.54
          : updates.height;
        updateData.height = heightInCm;
        updateData.height_unit = updates.heightUnit;
      }

      if (updates.goal !== undefined) {
        // Validate and sanitize goal
        const validatedGoal = goalSchema.parse(updates.goal);
        updateData.goal = sanitizeForDatabase(validatedGoal);
      }

      // Allow updating just the units without changing weight/height values
      if (updates.weightUnit !== undefined && updates.weight === undefined) {
        updateData.weight_unit = updates.weightUnit;
      }

      if (updates.heightUnit !== undefined && updates.height === undefined) {
        updateData.height_unit = updates.heightUnit;
      }

      // Handle notification preferences
      if (updates.notificationPreferences !== undefined) {
        updateData.notification_preferences = updates.notificationPreferences;
      }

      // Use API client with automatic timeout and retry
      await apiClient.update<UserProfile>(
        'user_profiles',
        updateData,
        (builder) => builder.eq('id', userId)
      );
    } catch (error: unknown) {
      // Handle table not found errors gracefully
      if (error instanceof ApiError) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('table not found')) {
          logger.warn('user_profiles table not found. App will continue without updating database.');
          return;
        }
        // Re-throw other API errors
        throw error;
      }

      // For other errors, log and re-throw
      logger.warn('Could not update user profile (Supabase may not be configured)', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update user profile');
    }
  },

  /**
   * Upload a profile picture to Supabase Storage
   * 
   * @param userId - The user's unique identifier
   * @param imageUri - Local file URI of the image to upload
   * @returns Promise that resolves with the public URL of the uploaded image
   * @throws {Error} If upload fails
   */
  async uploadProfilePicture(userId: string, imageUri: string): Promise<string> {
    try {
      const { supabase } = await import('@/config/supabase');
      const FileSystem = await import('expo-file-system/legacy');

      // Read the image file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const arrayBuffer = byteArray.buffer;

      // Upload to Supabase Storage
      const fileName = `${userId}.jpg`;
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      logger.error('Error uploading profile picture:', error);
      throw error;
    }
  },

  /**
   * Delete a profile picture from Supabase Storage
   * 
   * @param userId - The user's unique identifier
   * @returns Promise that resolves when deletion is complete
   * @throws {Error} If deletion fails
   */
  async deleteProfilePicture(userId: string): Promise<void> {
    try {
      const { supabase } = await import('@/config/supabase');
      const fileName = `${userId}.jpg`;

      const { error } = await supabase.storage
        .from('profile-pictures')
        .remove([fileName]);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting profile picture:', error);
      throw error;
    }
  },

  /**
   * Update the profile_picture_url in the user_profiles table
   * 
   * @param userId - The user's unique identifier
   * @param url - The public URL of the profile picture, or null to remove it
   * @returns Promise that resolves when update is complete
   * @throws {Error} If update fails
   */
  async updateProfilePictureUrl(userId: string, url: string | null): Promise<void> {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('user_profiles').upsert(
        {
          id: userId,
          profile_picture_url: url,
          updated_at: now,
        },
        { onConflict: 'id' },
      );
      if (error) throw error;
    } catch (error) {
      logger.error('Error updating profile picture URL:', error);
      throw error;
    }
  },
};

