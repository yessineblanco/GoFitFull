import { supabase } from '@/config/supabase';
import { apiClient, ApiError } from '@/api/client';
import { logger } from '@/utils/logger';

export interface CoachProfile {
  id: string;
  user_id: string;
  bio?: string;
  specialties: string[];
  hourly_rate?: number;
  cv_url?: string;
  profile_picture_url?: string;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
  total_sessions: number;
  status: 'pending' | 'approved' | 'rejected';
  cancellation_policy: 'flexible' | 'moderate' | 'strict';
  stripe_account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CoachCertification {
  id: string;
  coach_id: string;
  name: string;
  issuer?: string;
  document_url?: string;
  verified_at?: string;
  status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface CoachOnboardingData {
  bio: string;
  specialties: string[];
  hourly_rate: number;
  cancellation_policy: 'flexible' | 'moderate' | 'strict';
}

export const COACH_SPECIALTIES = [
  'strength',
  'cardio',
  'hiit',
  'yoga',
  'pilates',
  'crossfit',
  'boxing',
  'nutrition',
  'weight_loss',
  'muscle_gain',
  'flexibility',
  'rehabilitation',
  'sports_performance',
  'bodybuilding',
  'functional_training',
] as const;

export type CoachSpecialty = typeof COACH_SPECIALTIES[number];

export const coachProfileService = {
  async createProfile(userId: string, data: CoachOnboardingData): Promise<CoachProfile> {
    try {
      return await apiClient.upsert<CoachProfile>(
        'coach_profiles',
        {
          user_id: userId,
          bio: data.bio,
          specialties: data.specialties,
          hourly_rate: data.hourly_rate,
          cancellation_policy: data.cancellation_policy,
          status: 'pending',
        } as any,
        { onConflict: 'user_id' }
      );
    } catch (error) {
      logger.error('Failed to create coach profile:', error);
      throw error;
    }
  },

  async getProfile(userId: string): Promise<CoachProfile | null> {
    try {
      return await apiClient.selectOne<CoachProfile>(
        'coach_profiles',
        (builder) => builder.eq('user_id', userId)
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PGRST116') {
        return null;
      }
      logger.error('Failed to get coach profile:', error);
      throw error;
    }
  },

  async updateProfile(coachProfileId: string, updates: Partial<CoachProfile>): Promise<void> {
    try {
      await apiClient.update<CoachProfile>(
        'coach_profiles',
        updates,
        (builder) => builder.eq('id', coachProfileId)
      );
    } catch (error) {
      logger.error('Failed to update coach profile:', error);
      throw error;
    }
  },

  async uploadCV(userId: string, fileUri: string, fileName: string): Promise<string> {
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const filePath = `${userId}/cv/${Date.now()}_${fileName}`;

      const { data, error } = await supabase.storage
        .from('coach-documents')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('coach-documents')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      logger.error('Failed to upload CV:', error);
      throw error;
    }
  },

  async getCertifications(coachProfileId: string): Promise<CoachCertification[]> {
    try {
      return await apiClient.select<CoachCertification>(
        'coach_certifications',
        (builder) => builder.eq('coach_id', coachProfileId).order('created_at', { ascending: false })
      );
    } catch (error) {
      logger.error('Failed to get certifications:', error);
      return [];
    }
  },

  async addCertification(
    coachProfileId: string,
    name: string,
    issuer: string,
    documentUri?: string,
    documentName?: string
  ): Promise<CoachCertification> {
    try {
      let documentUrl: string | undefined;

      if (documentUri && documentName) {
        const response = await fetch(documentUri);
        const blob = await response.blob();
        const filePath = `certifications/${coachProfileId}/${Date.now()}_${documentName}`;

        const { data, error } = await supabase.storage
          .from('coach-documents')
          .upload(filePath, blob, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('coach-documents')
          .getPublicUrl(data.path);

        documentUrl = urlData.publicUrl;
      }

      return await apiClient.upsert<CoachCertification>(
        'coach_certifications',
        {
          coach_id: coachProfileId,
          name,
          issuer,
          document_url: documentUrl,
          status: 'pending',
        } as any
      );
    } catch (error) {
      logger.error('Failed to add certification:', error);
      throw error;
    }
  },

  async deleteCertification(certificationId: string): Promise<void> {
    try {
      await apiClient.delete(
        'coach_certifications',
        (builder) => builder.eq('id', certificationId)
      );
    } catch (error) {
      logger.error('Failed to delete certification:', error);
      throw error;
    }
  },
};
