import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, Search, Star, CheckCircle, X, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useMarketplaceStore } from '@/store/marketplaceStore';
import { COACH_SPECIALTIES } from '@/services/coachProfile';
import type { MarketplaceCoach } from '@/services/marketplace';
import { SkeletonCoachCard } from '@/components/shared/Shimmer';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#B4F04E';

export const MarketplaceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { coaches, loading, loadCoaches, filters, setFilters } = useMarketplaceStore();

  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  useEffect(() => {
    loadCoaches();
  }, []);

  const handleRefresh = useCallback(() => {
    loadCoaches({ search, specialty: selectedSpecialty || undefined });
  }, [search, selectedSpecialty]);

  const handleSearch = (text: string) => {
    setSearch(text);
    loadCoaches({ search: text, specialty: selectedSpecialty || undefined });
  };

  const handleSpecialtyFilter = (specialty: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSpecialty = selectedSpecialty === specialty ? null : specialty;
    setSelectedSpecialty(newSpecialty);
    loadCoaches({ search, specialty: newSpecialty || undefined });
  };

  const handleCoachPress = (coach: MarketplaceCoach) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('CoachDetail', { coachId: coach.id });
  };

  const renderCoachCard = ({ item }: { item: MarketplaceCoach }) => (
    <TouchableOpacity
      style={styles.coachCard}
      onPress={() => handleCoachPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.coachImageContainer}>
        {item.profile_picture_url || item.user_profile_picture ? (
          <Image
            source={{ uri: item.profile_picture_url || item.user_profile_picture || '' }}
            style={styles.coachImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.coachImagePlaceholder}>
            <Text style={styles.coachInitial}>
              {(item.display_name || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.coachInfo}>
        <View style={styles.coachNameRow}>
          <Text style={styles.coachName} numberOfLines={1}>{item.display_name || t('marketplace.unknownCoach')}</Text>
          {item.is_verified && <CheckCircle size={14} color={PRIMARY_GREEN} />}
        </View>

        <View style={styles.specialtiesRow}>
          {item.specialties.slice(0, 2).map((s) => (
            <View key={s} style={styles.miniChip}>
              <Text style={styles.miniChipText}>{t(`coachOnboarding.specialties.${s}`)}</Text>
            </View>
          ))}
          {item.specialties.length > 2 && (
            <Text style={styles.moreText}>+{item.specialties.length - 2}</Text>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.ratingBadge}>
            <Star size={12} color={PRIMARY_GREEN} fill={PRIMARY_GREEN} />
            <Text style={styles.ratingText}>{item.average_rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.reviewCount}>({item.total_reviews})</Text>
          <View style={styles.statDot} />
          <Text style={styles.sessionCount}>{item.total_sessions} {t('marketplace.sessions')}</Text>
        </View>
      </View>

      <View style={styles.rateContainer}>
        <Text style={styles.rateValue}>€{item.hourly_rate?.toFixed(0) || '—'}</Text>
        <Text style={styles.rateUnit}>/h</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Users size={48} color="rgba(180,240,78,0.3)" />
      <Text style={styles.emptyTitle}>{t('marketplace.noCoaches')}</Text>
      <Text style={styles.emptySubtitle}>{t('marketplace.noCoachesSubtitle')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#030303', '#0a1a0a', '#030303']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('marketplace.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color="rgba(255,255,255,0.4)" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('marketplace.searchPlaceholder')}
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <X size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Specialty Filters */}
      <FlatList
        horizontal
        data={COACH_SPECIALTIES as unknown as string[]}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersScroll}
        style={styles.filtersContainer}
        renderItem={({ item }) => {
          const isSelected = selectedSpecialty === item;
          return (
            <TouchableOpacity
              style={[styles.filterChip, isSelected && styles.filterChipSelected]}
              onPress={() => handleSpecialtyFilter(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                {t(`coachOnboarding.specialties.${item}`)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Coach List */}
      <FlatList
        data={coaches}
        keyExtractor={(item) => item.id}
        renderItem={renderCoachCard}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonList}>
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonCoachCard key={i} />
              ))}
            </View>
          ) : (
            renderEmpty()
          )
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={PRIMARY_GREEN} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
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
    fontSize: getResponsiveFontSize(20),
    color: '#FFFFFF',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(15),
    color: '#FFFFFF',
    padding: 0,
  },
  filtersContainer: { maxHeight: 48, marginTop: 12 },
  filtersScroll: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipSelected: {
    backgroundColor: PRIMARY_GREEN,
    borderColor: PRIMARY_GREEN,
  },
  filterChipText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.7)',
  },
  filterChipTextSelected: { color: '#000000' },
  listContent: { paddingHorizontal: 20, paddingTop: 16 },
  skeletonList: { paddingHorizontal: 0, paddingTop: 8 },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    marginBottom: 12,
    gap: 14,
  },
  coachImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  coachImage: { width: '100%', height: '100%' },
  coachImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(180, 240, 78, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInitial: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(20),
    color: PRIMARY_GREEN,
  },
  coachInfo: { flex: 1, gap: 4 },
  coachNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coachName: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(15),
    color: '#FFFFFF',
    flexShrink: 1,
  },
  specialtiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniChipText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(10),
    color: 'rgba(255,255,255,0.6)',
  },
  moreText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(10),
    color: 'rgba(255,255,255,0.4)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(12),
    color: '#FFFFFF',
  },
  reviewCount: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.4)',
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sessionCount: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.5)',
  },
  rateContainer: { alignItems: 'flex-end' },
  rateValue: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(18),
    color: PRIMARY_GREEN,
  },
  rateUnit: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.4)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(18),
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    maxWidth: 280,
  },
});
