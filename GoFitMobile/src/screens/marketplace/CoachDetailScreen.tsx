import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ArrowLeft, Star, CheckCircle, Award, Clock, Users, Shield, Calendar, Package,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMarketplaceStore } from '@/store/marketplaceStore';
import { CustomButton } from '@/components/auth';
import { SkeletonCoachDetail } from '@/components/shared/Shimmer';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#B4F04E';

export const CoachDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { selectedCoach, reviews, coachPacks, loadingDetail, loadingReviews, loadCoachDetail, loadReviews, loadCoachPacks, clearSelectedCoach } = useMarketplaceStore();

  const coachId = route.params?.coachId;

  useEffect(() => {
    if (coachId) {
      loadCoachDetail(coachId);
      loadReviews(coachId);
      loadCoachPacks(coachId);
    }
    return () => clearSelectedCoach();
  }, [coachId]);

  const handleRefresh = useCallback(() => {
    if (coachId) {
      loadCoachDetail(coachId);
      loadReviews(coachId);
      loadCoachPacks(coachId);
    }
  }, [coachId, loadCoachDetail, loadReviews, loadCoachPacks]);

  if (!selectedCoach) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('marketplace.coachProfile')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          <SkeletonCoachDetail />
        </ScrollView>
      </View>
    );
  }

  const coach = selectedCoach;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('marketplace.coachProfile')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loadingDetail || loadingReviews} onRefresh={handleRefresh} tintColor={PRIMARY_GREEN} />}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            {coach.profile_picture_url || coach.user_profile_picture ? (
              <Image
                source={{ uri: coach.profile_picture_url || coach.user_profile_picture || '' }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{(coach.display_name || '?')[0].toUpperCase()}</Text>
              </View>
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.coachName}>{coach.display_name || t('marketplace.unknownCoach')}</Text>
            {coach.is_verified && <CheckCircle size={18} color={PRIMARY_GREEN} />}
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Star size={16} color={PRIMARY_GREEN} fill={PRIMARY_GREEN} />
              <Text style={styles.statValue}>{coach.average_rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>{t('marketplace.rating')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Users size={16} color={PRIMARY_GREEN} />
              <Text style={styles.statValue}>{coach.total_reviews}</Text>
              <Text style={styles.statLabel}>{t('marketplace.reviews')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Calendar size={16} color={PRIMARY_GREEN} />
              <Text style={styles.statValue}>{coach.total_sessions}</Text>
              <Text style={styles.statLabel}>{t('marketplace.sessions')}</Text>
            </View>
          </View>
        </View>

        {/* Rate & Policy */}
        <View style={styles.rateCard}>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>{t('marketplace.hourlyRate')}</Text>
            <Text style={styles.rateValue}>€{coach.hourly_rate?.toFixed(2) || '—'}/h</Text>
          </View>
          <View style={styles.policyRow}>
            <Shield size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.policyText}>
              {t(`coachOnboarding.policies.${coach.cancellation_policy}`)} {t('marketplace.cancellation')}
            </Text>
          </View>
        </View>

        {/* Bio */}
        {coach.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('marketplace.about')}</Text>
            <Text style={styles.bioText}>{coach.bio}</Text>
          </View>
        ) : null}

        {/* Specialties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('marketplace.specialties')}</Text>
          <View style={styles.chipsRow}>
            {coach.specialties.map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{t(`coachOnboarding.specialties.${s}`)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Certifications */}
        {coach.certifications && coach.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('marketplace.certifications')}</Text>
            {coach.certifications.map((cert) => (
              <View key={cert.id} style={styles.certRow}>
                <Award size={16} color={cert.status === 'verified' ? PRIMARY_GREEN : 'rgba(255,255,255,0.3)'} />
                <View style={styles.certInfo}>
                  <Text style={styles.certName}>{cert.name}</Text>
                  {cert.issuer ? <Text style={styles.certIssuer}>{cert.issuer}</Text> : null}
                </View>
                {cert.status === 'verified' && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>{t('marketplace.verified')}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Session Packs */}
        {coachPacks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('sessionPacks.clientPacks')}</Text>
            {coachPacks.map((pack) => (
              <TouchableOpacity
                key={pack.id}
                style={styles.packCard}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.packLeft}>
                  <Package size={16} color={PRIMARY_GREEN} />
                  <View style={styles.packInfo}>
                    <Text style={styles.packName}>{pack.name}</Text>
                    <Text style={styles.packSessions}>{pack.session_count} {t('sessionPacks.sessions')}</Text>
                  </View>
                </View>
                <Text style={styles.packPrice}>€{pack.price.toFixed(0)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('marketplace.reviewsTitle')} ({coach.total_reviews})
          </Text>
          {reviews.length === 0 && !loadingReviews ? (
            <Text style={styles.noReviews}>{t('marketplace.noReviews')}</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewStars}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        color={i < review.rating ? PRIMARY_GREEN : 'rgba(255,255,255,0.2)'}
                        fill={i < review.rating ? PRIMARY_GREEN : 'transparent'}
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {review.comment ? (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                ) : null}
              </View>
            ))
          )}
          {loadingReviews && <ActivityIndicator color={PRIMARY_GREEN} style={{ marginTop: 12 }} />}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <CustomButton
          title={t('marketplace.bookSession')}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            (navigation as any).navigate('BookSession', { coachId: coach.id, coachName: coach.display_name || coach.full_name });
          }}
          variant="primary"
          style={styles.bookButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: { padding: 8, width: 40 },
  headerTitle: {
    flex: 1,
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(18),
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(180, 240, 78, 0.3)',
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(180, 240, 78, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(32),
    color: PRIMARY_GREEN,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  coachName: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(22),
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(18),
    color: '#FFFFFF',
  },
  statLabel: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.5)',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rateCard: {
    backgroundColor: 'rgba(180, 240, 78, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(180, 240, 78, 0.15)',
    padding: 16,
    marginBottom: 20,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rateLabel: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.7)',
  },
  rateValue: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(22),
    color: PRIMARY_GREEN,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  policyText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.5)',
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(16),
    color: '#FFFFFF',
    marginBottom: 12,
  },
  bioText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.7)',
    lineHeight: getResponsiveFontSize(22),
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'rgba(180, 240, 78, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  chipText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(12),
    color: PRIMARY_GREEN,
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  certInfo: { flex: 1 },
  certName: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(14),
    color: '#FFFFFF',
  },
  certIssuer: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(180, 240, 78, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(10),
    color: PRIMARY_GREEN,
  },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(180, 240, 78, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(180, 240, 78, 0.1)',
    padding: 14,
    marginBottom: 8,
  },
  packLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  packInfo: { flex: 1 },
  packName: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: '#FFFFFF' },
  packSessions: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  packPrice: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18), color: PRIMARY_GREEN },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewDate: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.4)',
  },
  reviewComment: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255,255,255,0.7)',
    lineHeight: getResponsiveFontSize(19),
  },
  noReviews: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingVertical: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(3,3,3,0.95)',
  },
  bookButton: { width: '100%' },
});
