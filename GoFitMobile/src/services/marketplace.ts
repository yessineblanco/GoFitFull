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

function parseHourlyRate(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeMarketplaceCoachRow(coach: Record<string, unknown>): MarketplaceCoach {
  const avg =
    coach.average_rating == null
      ? 0
      : typeof coach.average_rating === 'string'
        ? parseFloat(coach.average_rating)
        : Number(coach.average_rating);
  const safeAvg = Number.isFinite(avg) ? avg : 0;
  const policy = coach.cancellation_policy as string;
  const cancellation_policy: MarketplaceCoach['cancellation_policy'] =
    policy === 'flexible' || policy === 'moderate' || policy === 'strict' ? policy : 'flexible';
  const dn = coach.display_name;
  const up = coach.user_profile_picture;
  return {
    id: coach.id as string,
    user_id: coach.user_id as string,
    bio: (coach.bio as string) ?? null,
    specialties: Array.isArray(coach.specialties) ? (coach.specialties as string[]) : [],
    hourly_rate: parseHourlyRate(coach.hourly_rate),
    profile_picture_url: (coach.profile_picture_url as string) ?? null,
    is_verified: Boolean(coach.is_verified),
    average_rating: safeAvg,
    total_reviews: Number(coach.total_reviews) || 0,
    total_sessions: Number(coach.total_sessions) || 0,
    cancellation_policy,
    created_at: coach.created_at as string,
    display_name: typeof dn === 'string' ? dn.trim() || null : null,
    user_profile_picture: typeof up === 'string' ? up.trim() || null : null,
  };
}

function sortMarketplaceCoaches(rows: MarketplaceCoach[], sortBy?: MarketplaceFilters['sortBy']): void {
  const key = sortBy ?? 'rating';
  rows.sort((a, b) => {
    switch (key) {
      case 'reviews':
        return b.total_reviews - a.total_reviews;
      case 'rate_low':
        return (a.hourly_rate ?? 999999) - (b.hourly_rate ?? 999999);
      case 'rate_high':
        return (b.hourly_rate ?? 0) - (a.hourly_rate ?? 0);
      case 'sessions':
        return b.total_sessions - a.total_sessions;
      case 'rating':
      default:
        return b.average_rating - a.average_rating;
    }
  });
}

export const marketplaceService = {
  async getApprovedCoaches(filters?: MarketplaceFilters): Promise<MarketplaceCoach[]> {
    try {
      const { data: raw, error } = await supabase.rpc('list_approved_coaches_for_marketplace');
      if (error) {
        logger.error('list_approved_coaches_for_marketplace failed:', error);
        return [];
      }

      let result = (raw || []).map((row) => normalizeMarketplaceCoachRow(row as Record<string, unknown>));

      if (filters?.specialty) {
        result = result.filter((c) => c.specialties.includes(filters.specialty!));
      }
      if (filters?.minRating != null) {
        result = result.filter((c) => c.average_rating >= filters.minRating!);
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (c) =>
            c.display_name?.toLowerCase().includes(q) ||
            c.bio?.toLowerCase().includes(q) ||
            c.specialties.some((s) => s.toLowerCase().includes(q))
        );
      }

      sortMarketplaceCoaches(result, filters?.sortBy);
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

      const { data: identityRows } = await supabase.rpc('get_coach_profile_identity', {
        p_user_id: coach.user_id,
      });
      const identity = (Array.isArray(identityRows) ? identityRows[0] : identityRows) as
        | { display_name: string | null; profile_picture_url: string | null }
        | undefined;

      const avg =
        coach.average_rating == null
          ? 0
          : typeof coach.average_rating === 'string'
            ? parseFloat(coach.average_rating)
            : Number(coach.average_rating);
      const safeAvg = Number.isFinite(avg) ? avg : 0;

      return {
        ...coach,
        average_rating: safeAvg,
        total_reviews: Number(coach.total_reviews) || 0,
        total_sessions: Number(coach.total_sessions) || 0,
        display_name: identity?.display_name?.trim() || null,
        user_profile_picture: identity?.profile_picture_url?.trim() || null,
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

  async submitReview(coachId: string, clientId: string, rating: number, comment: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('coach_reviews')
        .insert({ coach_id: coachId, client_id: clientId, rating, comment });

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Failed to submit review:', error);
      return false;
    }
  },

  async hasReviewedBooking(coachId: string, clientId: string): Promise<boolean> {
    try {
      const { count } = await supabase
        .from('coach_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', coachId)
        .eq('client_id', clientId);
      return (count || 0) > 0;
    } catch {
      return false;
    }
  },
};
