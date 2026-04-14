import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { ChartSkeleton, StatCardSkeleton } from '@/components/shared/Shimmer';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, TrendingUp, Flame, Target, Calendar } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCoachStore } from '@/store/coachStore';
import { clientManagementService, type ClientProgressData } from '@/services/clientManagement';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';

const PRIMARY_GREEN = '#B4F04E';

export const ClientProgressScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { profile } = useCoachStore();

  const clientId = route.params?.clientId;
  const clientName = route.params?.clientName || '';

  const [data, setData] = React.useState<ClientProgressData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    backgroundGradientTo: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(180, 240, 78, ${opacity})`,
    labelColor: () => isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    barPercentage: 0.6,
  };

  const loadProgress = useCallback(async () => {
    if (!clientId || !profile?.id) return;
    setLoading(true);
    try {
      const result = await clientManagementService.getClientProgress(clientId, profile.id);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [clientId, profile?.id]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const chartData = useMemo(() => {
    if (!data?.sessions?.length) return null;
    const byDate: Record<string, number> = {};
    data.sessions.forEach((s) => {
      const d = new Date(s.started_at).toDateString();
      byDate[d] = (byDate[d] || 0) + 1;
    });
    const entries = Object.entries(byDate)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 7);
    if (!entries.length) return null;
    return {
      labels: entries.map(([d]) => new Date(d).toLocaleDateString(undefined, { weekday: 'short' })),
      datasets: [{ data: entries.map(([, count]) => count) }],
    };
  }, [data?.sessions]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !data) {
    return (
      <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
        <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{clientName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <View style={styles.statsRow}>
            {[...Array(3)].map((_, i) => <StatCardSkeleton key={i} />)}
          </View>
          <ChartSkeleton height={180} />
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
      <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{clientName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProgress} tintColor={PRIMARY_GREEN} />}
      >
        {!data ? (
          <View style={styles.emptyContainer}>
            <TrendingUp size={48} color="rgba(180,240,78,0.3)" />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('clientManagement.noProgressData')}</Text>
          </View>
        ) : (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Flame size={24} color={PRIMARY_GREEN} />
                <Text style={styles.statValue}>{data.streak}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('clientManagement.streak')}</Text>
              </View>
              <View style={styles.statCard}>
                <Target size={24} color={PRIMARY_GREEN} />
                <Text style={styles.statValue}>{data.total_workouts}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('clientManagement.totalWorkouts')}</Text>
              </View>
              <View style={styles.statCard}>
                <Calendar size={24} color={PRIMARY_GREEN} />
                <Text style={styles.statValue}>{data.weekly_consistency}/{t('clientManagement.weekAbbr')}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('clientManagement.consistency')}</Text>
              </View>
            </View>

            {/* Chart */}
            {chartData && chartData.labels.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('clientManagement.recentActivity')}</Text>
                <View style={[styles.chartContainer, { backgroundColor: getGlassBg(isDark) }]}>
                  <BarChart
                    data={chartData}
                    width={Dimensions.get('window').width - 64}
                    height={180}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={chartConfig}
                    style={styles.chart}
                    withInnerLines={false}
                    fromZero
                  />
                </View>
              </View>
            )}

            {/* Sessions List */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('clientManagement.workoutHistory')}</Text>
              {data.sessions?.length ? (
                data.sessions.slice(0, 15).map((s) => (
                  <View key={s.id} style={[styles.sessionRow, { backgroundColor: getGlassBg(isDark) }]}>
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionName, { color: colors.text }]}>{s.workout_name}</Text>
                      <Text style={[styles.sessionDate, { color: colors.textLight }]}>{formatDate(s.started_at)}</Text>
                    </View>
                    {s.duration_minutes != null && (
                      <Text style={styles.sessionDuration}>{s.duration_minutes} {t('clientManagement.minutesAbbr')}</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('clientManagement.noWorkoutsYet')}</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backButton: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF', textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(180,240,78,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(180,240,78,0.15)',
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  statValue: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(22), color: PRIMARY_GREEN },
  statLabel: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(11), color: 'rgba(255,255,255,0.5)' },
  chartSection: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(14),
    color: '#FFFFFF',
    marginBottom: 12,
  },
  chartContainer: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 12 },
  chart: { borderRadius: 12 },
  section: { marginBottom: 24 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  sessionInfo: { flex: 1 },
  sessionName: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: '#FFFFFF' },
  sessionDate: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  sessionDuration: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(12), color: PRIMARY_GREEN },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)' },
});
