import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export interface MarketplaceCoach {
  id: string;
  user_id: string;
  bio: string | null;
  specialties: string[];
  hourly_rate: number | null;
  profile_picture_url: string | null;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
  total_sessions: number;
  cancellation_policy: 'flexible' | 'moderate' | 'strict';
  created_at: string;
  display_name: string | null;
  user_profile_picture: string | null;
}

export interface CoachDetailData extends MarketplaceCoach {
  cv_url: string | null;
  certifications: CoachCertificationPublic[];
}

export interface CoachCertificationPublic {
  id: string;
  name: string;
  issuer: string | null;
  status: 'pending' | 'verified' | 'rejected';
}

export interface CoachReview {
  id: string;
  coach_id: string;
  client_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string | null;
  client_picture: string | null;
}

export interface MarketplaceFilters {
  specialty?: string;
  minRating?: number;
  sortBy?: 'rating' | 'reviews' | 'rate_low' | 'rate_high' | 'sessions';
  search?: string;
}

export interface CoachSessionPack {
  id: string;
  name: string;
  session_count: number;
  price: number;
  currency: string;
  description: string | null;
}

export const marketplaceService = {
  async getApprovedCoaches(filters?: MarketplaceFilters): Promise<MarketplaceCoach[]> {
    try {
      let query = supabase
        .from('coach_profiles')
        .select(`
          id, user_id, bio, specialties, hourly_rate,
          profile_picture_url, is_verified, average_rating,
          total_reviews, total_sessions, cancellation_policy, created_at
        `)
        .eq('status', 'approved');

      if (filters?.specialty) {
        query = query.contains('specialties', [filters.specialty]);
      }

      if (filters?.minRating) {
        query = query.gte('average_rating', filters.minRating);
      }

      switch (filters?.sortBy) {
        case 'rating':
          query = query.order('average_rating', { ascending: false });
          break;
        case 'reviews':
          query = query.order('total_reviews', { ascending: false });
          break;
        case 'rate_low':
          query = query.order('hourly_rate', { ascending: true });
          break;
        case 'rate_high':
          query = query.order('hourly_rate', { ascending: false });
          break;
        case 'sessions':
          query = query.order('total_sessions', { ascending: false });
          break;
        default:
          query = query.order('average_rating', { ascending: false });
      }

      const { data: coaches, error } = await query;

      if (error) throw error;
      if (!coaches || coaches.length === 0) return [];

      const userIds = coaches.map((c) => c.user_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, profile_picture_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      let result: MarketplaceCoach[] = coaches.map((coach) => {
        const profile = profileMap.get(coach.user_id);
        return {
          ...coach,
          display_name: profile?.display_name || null,
          user_profile_picture: profile?.profile_picture_url || null,
        };
      });

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (c) =>
            c.display_name?.toLowerCase().includes(q) ||
            c.bio?.toLowerCase().includes(q) ||
            c.specialties.some((s) => s.toLowerCase().includes(q))
        );
      }

      return result;
    } catch (error) {
      logger.error('Failed to fetch approved coaches:', error);
      return [];
    }
  },

  async getTopCoaches(limit: number = 5): Promise<MarketplaceCoach[]> {
    return this.getApprovedCoaches({ sortBy: 'rating' }).then((coaches) =>
      coaches.slice(0, limit)
    );
  },

  async getCoachDetail(coachId: string): Promise<CoachDetailData | null> {
    try {
      const { data: coach, error } = await supabase
        .from('coach_profiles')
        .select('*')
        .eq('id', coachId)
        .eq('status', 'approved')
        .single();

      if (error || !coach) return null;

      const { data: certs } = await supabase
        .from('coach_certifications')
        .select('id, name, issuer, status')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false });

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, profile_picture_url')
        .eq('id', coach.user_id)
        .single();

      return {
        ...coach,
        display_name: profile?.display_name || null,
        user_profile_picture: profile?.profile_picture_url || null,
        certifications: (certs || []).map((c) => ({
          id: c.id,
          name: c.name,
          issuer: c.issuer,
          status: c.status,
        })),
      };
    } catch (error) {
      logger.error('Failed to fetch coach detail:', error);
      return null;
    }
  },

  async getCoachReviews(coachId: string, limit: number = 10, offset: number = 0): Promise<CoachReview[]> {
    try {
      const { data: reviews, error } = await supabase
        .from('coach_reviews')
        .select('id, coach_id, client_id, rating, comment, created_at')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !reviews) return [];

      const clientIds = reviews.map((r) => r.client_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, profile_picture_url')
        .in('id', clientIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return reviews.map((review) => {
        const clientProfile = profileMap.get(review.client_id);
        return {
          ...review,
          client_name: null,
          client_picture: clientProfile?.profile_picture_url || null,
        };
      });
    } catch (error) {
      logger.error('Failed to fetch coach reviews:', error);
      return [];
    }
  },

  async getCoachPacks(coachId: string): Promise<CoachSessionPack[]> {
    try {
      const { data, error } = await supabase
        .from('session_packs')
        .select('id, name, session_count, price, currency, description')
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch coach packs:', error);
      return [];
    }
  },
};
