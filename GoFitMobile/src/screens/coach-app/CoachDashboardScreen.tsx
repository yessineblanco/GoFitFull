import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart3, Users, Calendar, Star, TrendingUp, DollarSign, Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useCoachStore } from '@/store/coachStore';
import { useBookingsStore } from '@/store/bookingsStore';
import { usePacksStore } from '@/store/packsStore';
import { supabase } from '@/config/supabase';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#B4F04E';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardStats {
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  activeClients: number;
  activePacks: number;
  averageRating: number;
  totalReviews: number;
}

export const CoachDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { profile, loadProfile } = useCoachStore();
  const { coachBookings, loadCoachBookings } = useBookingsStore();
  const { myPacks, loadMyPacks } = usePacksStore();

  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0, upcomingSessions: 0, completedSessions: 0,
    activeClients: 0, activePacks: 0, averageRating: 0, totalReviews: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    if (!profile?.id) return;
    try {
      await Promise.all([
        loadCoachBookings(profile.id),
        loadMyPacks(profile.id),
      ]);

      const { data: reviews } = await supabase
        .from('coach_reviews')
        .select('rating')
        .eq('coach_id', profile.id);

      const now = new Date();
      const allBookings = coachBookings.length > 0 ? coachBookings : [];
      const uniqueClients = new Set(allBookings.map((b) => b.client_id));

      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
        : 0;

      setStats({
        totalSessions: allBookings.length,
        upcomingSessions: allBookings.filter((b) => new Date(b.scheduled_at) > now && b.status !== 'cancelled').length,
        completedSessions: allBookings.filter((b) => b.status === 'completed').length,
        activeClients: uniqueClients.size,
        activePacks: myPacks.filter((p) => p.is_active).length,
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: reviews?.length || 0,
      });
    } catch {}
    setLoading(false);
  }, [profile?.id, coachBookings.length]);

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { if (profile?.id) loadDashboard(); }, [profile?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const statCards = [
    { label: t('coachDashboard.upcomingSessions'), value: stats.upcomingSessions, icon: Calendar, color: PRIMARY_GREEN },
    { label: t('coachDashboard.completedSessions'), value: stats.completedSessions, icon: BarChart3, color: '#4CAF50' },
    { label: t('coachDashboard.activeClients'), value: stats.activeClients, icon: Users, color: '#29B6F6' },
    { label: t('coachDashboard.activePacks'), value: stats.activePacks, icon: TrendingUp, color: '#FFC107' },
    { label: t('coachDashboard.averageRating'), value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '--', icon: Star, color: '#FFB300' },
    { label: t('coachDashboard.totalReviews'), value: stats.totalReviews, icon: Star, color: '#AB47BC' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY_GREEN} />}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => navigation.navigate('NotificationInbox')}
            accessibilityLabel={t('notifications.title')}
          >
            <Bell size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.greeting}>
          {t('coachDashboard.welcome')}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </Text>
        <Text style={styles.subtitle}>{t('coachDashboard.subtitle')}</Text>

        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY_GREEN} style={{ marginTop: 60 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              {statCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <View key={idx} style={styles.statCard}>
                    <View style={[styles.statIconBg, { backgroundColor: `${card.color}10` }]}>
                      <Icon size={18} color={card.color} />
                    </View>
                    <Text style={styles.statValue}>{card.value}</Text>
                    <Text style={styles.statLabel}>{card.label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('coachDashboard.totalSessions')}</Text>
              <View style={styles.bigStatRow}>
                <Text style={styles.bigStatValue}>{stats.totalSessions}</Text>
                <Text style={styles.bigStatLabel}>{t('coachDashboard.sessionsTotal')}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  scrollContent: { paddingHorizontal: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  bellButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  greeting: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(26), color: '#FFFFFF' },
  subtitle: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)', marginTop: 4, marginBottom: 28 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: (SCREEN_WIDTH - 48 - 10) / 2,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
  },
  statIconBg: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(22), color: '#FFFFFF' },
  statLabel: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  section: { marginTop: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 20 },
  sectionTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)', marginBottom: 12 },
  bigStatRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  bigStatValue: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(36), color: PRIMARY_GREEN },
  bigStatLabel: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)' },
});
