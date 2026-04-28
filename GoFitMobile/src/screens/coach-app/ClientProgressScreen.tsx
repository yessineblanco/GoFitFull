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

const getMuscleGroups = (name = '') => {
  const normalized = name.toLowerCase();
  if (normalized.includes('squat') || normalized.includes('lunge') || normalized.includes('leg') || normalized.includes('calf')) return ['Legs'];
  if (normalized.includes('row') || normalized.includes('pull') || normalized.includes('lat') || normalized.includes('deadlift')) return ['Back'];
  if (normalized.includes('shoulder') || normalized.includes('overhead') || normalized.includes('lateral') || normalized.includes('raise')) return ['Shoulders'];
  if (normalized.includes('curl') || normalized.includes('tricep') || normalized.includes('chin')) return ['Arms'];
  if (normalized.includes('plank') || normalized.includes('crunch') || normalized.includes('sit up') || normalized.includes('twist')) return ['Core'];
  if (normalized.includes('press') || normalized.includes('fly') || normalized.includes('push')) return ['Chest'];
  return ['Other'];
};

const parseReps = (reps?: string) => (reps || '').split(',').map((value) => Number.parseInt(value.trim(), 10) || 0);

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

  const enhancedStats = useMemo(() => {
    const sessions = data?.sessions || [];
    const volumeByDate: Record<string, number> = {};
    const trainedDates = new Set<string>();
    const prs: Record<string, { exercise: string; weight: number; reps: number; date: string }> = {};
    const muscleCounts: Record<string, number> = {};

    sessions.forEach((session) => {
      const dateKey = new Date(session.completed_at || session.started_at).toISOString().split('T')[0];
      trainedDates.add(dateKey);

      (session.exercises_completed || []).forEach((exercise) => {
        const weights = exercise.weights || [];
        const reps = parseReps(exercise.reps);
        const completedSets = exercise.completedSets || [];
        const exerciseName = exercise.name || 'Exercise';
        let exerciseVolume = 0;
        let bestWeight = 0;
        let bestReps = 0;

        weights.forEach((rawWeight, index) => {
          if (completedSets.length > 0 && !completedSets[index]) return;
          const weight = Number.parseFloat(String(rawWeight)) || 0;
          const repCount = reps[index] || 0;
          exerciseVolume += weight * repCount;
          if (weight > bestWeight) {
            bestWeight = weight;
            bestReps = repCount;
          }
        });

        volumeByDate[dateKey] = (volumeByDate[dateKey] || 0) + exerciseVolume;
        getMuscleGroups(exerciseName).forEach((group) => {
          muscleCounts[group] = (muscleCounts[group] || 0) + 1;
        });

        if (bestWeight > 0 && (!prs[exerciseName] || bestWeight > prs[exerciseName].weight)) {
          prs[exerciseName] = { exercise: exerciseName, weight: bestWeight, reps: bestReps, date: dateKey };
        }
      });
    });

    const recentDays = Array.from({ length: 28 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (27 - index));
      const key = date.toISOString().split('T')[0];
      return { key, label: date.getDate(), trained: trainedDates.has(key), volume: volumeByDate[key] || 0 };
    });

    const volumeEntries = Object.entries(volumeByDate)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-7);

    const totalMuscleHits = Object.values(muscleCounts).reduce((sum, count) => sum + count, 0);

    return {
      recentDays,
      volumeChart: volumeEntries.length ? {
        labels: volumeEntries.map(([date]) => new Date(date).toLocaleDateString(undefined, { weekday: 'short' })),
        datasets: [{ data: volumeEntries.map(([, volume]) => Math.max(0, Math.round(volume))) }],
      } : null,
      prs: Object.values(prs).sort((a, b) => b.weight - a.weight).slice(0, 6),
      muscleGroups: Object.entries(muscleCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count, percentage: totalMuscleHits > 0 ? Math.round((count / totalMuscleHits) * 100) : 0 })),
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

            {enhancedStats.volumeChart && (
              <View style={styles.chartSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Training volume</Text>
                <View style={[styles.chartContainer, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
                  <BarChart
                    data={enhancedStats.volumeChart}
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

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Consistency</Text>
              <View style={[styles.consistencyCard, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
                {enhancedStats.recentDays.map((day) => (
                  <View
                    key={day.key}
                    style={[
                      styles.dayCell,
                      { backgroundColor: day.trained ? PRIMARY_GREEN : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') },
                    ]}
                  >
                    <Text style={[styles.dayCellText, { color: day.trained ? '#000000' : colors.textLight }]}>{day.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {enhancedStats.prs.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal records</Text>
                {enhancedStats.prs.map((pr) => (
                  <View key={`${pr.exercise}-${pr.date}`} style={[styles.prRow, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>{pr.exercise}</Text>
                      <Text style={[styles.sessionDate, { color: colors.textLight }]}>{new Date(pr.date).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.sessionDuration}>{pr.weight} x {pr.reps || 1}</Text>
                  </View>
                ))}
              </View>
            )}

            {enhancedStats.muscleGroups.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Workout split</Text>
                <View style={[styles.splitCard, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
                  {enhancedStats.muscleGroups.map((group) => (
                    <View key={group.name} style={styles.splitRow}>
                      <Text style={[styles.splitLabel, { color: colors.textSecondary }]}>{group.name}</Text>
                      <View style={styles.splitTrack}>
                        <View style={[styles.splitFill, { width: `${group.percentage}%` }]} />
                      </View>
                      <Text style={styles.splitValue}>{group.percentage}%</Text>
                    </View>
                  ))}
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
  chartContainer: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 12 },
  chart: { borderRadius: 12 },
  section: { marginBottom: 24 },
  consistencyCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 12 },
  dayCell: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  dayCellText: { fontFamily: 'Barlow_600SemiBold', fontSize: 10 },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    marginBottom: 6,
  },
  splitCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 14, gap: 12 },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  splitLabel: { width: 76, fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.6)' },
  splitTrack: { flex: 1, height: 7, borderRadius: 7, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)' },
  splitFill: { height: 7, borderRadius: 7, backgroundColor: PRIMARY_GREEN },
  splitValue: { width: 36, textAlign: 'right', fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(12), color: PRIMARY_GREEN },
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
