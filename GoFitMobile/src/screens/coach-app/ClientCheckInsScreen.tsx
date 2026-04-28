import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ClipboardCheck, TrendingUp } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { checkInsService, type CheckInFrequency, type CheckInResponse, type CheckInSchedule } from '@/services/checkIns';
import { useCoachStore } from '@/store/coachStore';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';
import { getResponsiveFontSize } from '@/utils/responsive';
import { dialogManager } from '@/components/shared/CustomDialog';

const PRIMARY_GREEN = '#B4F04E';

const average = (responses: CheckInResponse[], key: keyof Pick<CheckInResponse, 'mood' | 'energy' | 'soreness' | 'sleep_quality'>) => {
  if (!responses.length) return null;
  const total = responses.reduce((sum, response) => sum + response[key], 0);
  return (total / responses.length).toFixed(1);
};

export const ClientCheckInsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { profile } = useCoachStore();
  const [schedule, setSchedule] = useState<CheckInSchedule | null>(null);
  const [responses, setResponses] = useState<CheckInResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const clientId = route.params?.clientId as string | undefined;
  const clientName = route.params?.clientName || '';

  const load = useCallback(async () => {
    if (!profile?.id || !clientId) return;
    setLoading(true);
    try {
      const [nextSchedule, nextResponses] = await Promise.all([
        checkInsService.getCoachClientSchedule(profile.id, clientId),
        checkInsService.getCoachClientResponses(profile.id, clientId),
      ]);
      setSchedule(nextSchedule);
      setResponses(nextResponses);
    } catch {
      setSchedule(null);
      setResponses([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, profile?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSchedule = async (updates: Partial<Pick<CheckInSchedule, 'enabled' | 'frequency'>>) => {
    if (!profile?.id || !clientId || saving) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const frequency = updates.frequency || schedule?.frequency || 'weekly';
      const saved = await checkInsService.saveCoachClientSchedule({
        coach_id: profile.id,
        client_id: clientId,
        enabled: updates.enabled ?? schedule?.enabled ?? true,
        frequency,
        check_in_days: [1],
        check_in_time: schedule?.check_in_time || '09:00',
      });
      setSchedule(saved);
    } catch {
      dialogManager.error(t('common.error'), t('checkIns.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    const recent = responses.slice(0, 7);
    return [
      { label: t('checkIns.mood'), value: average(recent, 'mood') },
      { label: t('checkIns.energy'), value: average(recent, 'energy') },
      { label: t('checkIns.soreness'), value: average(recent, 'soreness') },
      { label: t('checkIns.sleepQuality'), value: average(recent, 'sleep_quality') },
    ];
  }, [responses, t]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderFrequencyButton = (frequency: CheckInFrequency) => {
    const active = (schedule?.frequency || 'weekly') === frequency;
    return (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => saveSchedule({ frequency, enabled: schedule?.enabled ?? true })}
        style={[
          styles.segmentButton,
          {
            backgroundColor: active ? PRIMARY_GREEN : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            borderColor: active ? PRIMARY_GREEN : getGlassBorder(isDark),
          },
        ]}
        disabled={saving}
      >
        <Text style={[styles.segmentText, { color: active ? '#000000' : colors.text }]}>
          {frequency === 'daily' ? t('checkIns.daily') : t('checkIns.weekly')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
      <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{clientName || t('checkIns.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 44 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={PRIMARY_GREEN} />}
      >
        {loading && !schedule && responses.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={PRIMARY_GREEN} />
            <Text style={[styles.mutedText, { color: colors.textSecondary }]}>{t('checkIns.loading')}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <ClipboardCheck size={20} color={PRIMARY_GREEN} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('checkIns.scheduleTitle')}</Text>
                </View>
                {saving ? (
                  <ActivityIndicator color={PRIMARY_GREEN} />
                ) : (
                  <Switch
                    value={schedule?.enabled ?? false}
                    onValueChange={(enabled) => saveSchedule({ enabled })}
                    trackColor={{ false: 'rgba(255,255,255,0.18)', true: 'rgba(180,240,78,0.45)' }}
                    thumbColor={schedule?.enabled ? PRIMARY_GREEN : isDark ? '#666666' : '#FFFFFF'}
                  />
                )}
              </View>
              <Text style={[styles.mutedText, { color: colors.textSecondary }]}>
                {schedule?.enabled ? t('checkIns.enabled') : t('checkIns.disabled')}
              </Text>
              <View style={styles.segmentRow}>
                {renderFrequencyButton('weekly')}
                {renderFrequencyButton('daily')}
              </View>
              <Text style={[styles.hintText, { color: colors.textLight }]}>
                {(schedule?.frequency || 'weekly') === 'daily' ? t('checkIns.dailyDesc') : t('checkIns.weeklyDesc')}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
              <View style={styles.cardTitleRow}>
                <TrendingUp size={20} color={PRIMARY_GREEN} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('checkIns.averages')}</Text>
              </View>
              <View style={styles.statsGrid}>
                {stats.map((stat) => (
                  <View key={stat.label} style={[styles.statBox, { borderColor: getGlassBorder(isDark) }]}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{stat.value ?? '-'}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('checkIns.recentResponses')}</Text>
            </View>

            {responses.length === 0 ? (
              <View style={styles.centerState}>
                <ClipboardCheck size={46} color="rgba(180,240,78,0.32)" />
                <Text style={[styles.mutedText, { color: colors.textSecondary }]}>{t('checkIns.noResponses')}</Text>
              </View>
            ) : (
              responses.map((response) => (
                <View key={response.id} style={[styles.responseCard, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
                  <Text style={[styles.responseDate, { color: colors.text }]}>{formatDate(response.responded_at)}</Text>
                  <View style={styles.responseMetrics}>
                    <Text style={[styles.metricChip, { color: colors.textSecondary }]}>{t('checkIns.mood')}: {response.mood}</Text>
                    <Text style={[styles.metricChip, { color: colors.textSecondary }]}>{t('checkIns.energy')}: {response.energy}</Text>
                    <Text style={[styles.metricChip, { color: colors.textSecondary }]}>{t('checkIns.soreness')}: {response.soreness}</Text>
                    <Text style={[styles.metricChip, { color: colors.textSecondary }]}>{t('checkIns.sleepQuality')}: {response.sleep_quality}</Text>
                  </View>
                  {response.notes ? <Text style={[styles.notes, { color: colors.textSecondary }]}>{response.notes}</Text> : null}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backButton: { padding: 8, width: 40 },
  headerTitle: {
    flex: 1,
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(18),
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  centerState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 52, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16) },
  mutedText: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(13), lineHeight: 19 },
  hintText: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), marginTop: 10, lineHeight: 18 },
  segmentRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  segmentButton: {
    flex: 1,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(13) },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statBox: {
    width: '47%',
    minHeight: 74,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  statValue: { fontFamily: 'Designer', fontSize: getResponsiveFontSize(22) },
  statLabel: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(11), marginTop: 6 },
  sectionHeader: { marginTop: 8, marginBottom: 10 },
  responseCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  responseDate: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(14), marginBottom: 10 },
  responseMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricChip: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(11),
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  notes: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(13), lineHeight: 19, marginTop: 12 },
});
