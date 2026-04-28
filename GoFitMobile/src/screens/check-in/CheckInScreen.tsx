import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, ClipboardCheck } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { checkInsService, type CheckInSchedule } from '@/services/checkIns';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';
import { getResponsiveFontSize } from '@/utils/responsive';
import { dialogManager } from '@/components/shared/CustomDialog';

const PRIMARY_GREEN = '#B4F04E';
const VALUES = [1, 2, 3, 4, 5];

type MetricKey = 'mood' | 'energy' | 'soreness' | 'sleep_quality';

const MetricPicker = ({
  label,
  value,
  onChange,
  isDark,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  isDark: boolean;
}) => (
  <View style={styles.metricBlock}>
    <Text style={styles.metricLabel}>{label}</Text>
    <View style={styles.valueRow}>
      {VALUES.map((option) => {
        const active = option === value;
        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.82}
            onPress={() => onChange(option)}
            style={[
              styles.valueButton,
              {
                backgroundColor: active ? PRIMARY_GREEN : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                borderColor: active ? PRIMARY_GREEN : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <Text style={[styles.valueText, { color: active ? '#000000' : isDark ? '#FFFFFF' : '#1A1D21' }]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

export const CheckInScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dueSchedules, setDueSchedules] = useState<CheckInSchedule[]>([]);
  const [saved, setSaved] = useState(false);
  const [notes, setNotes] = useState('');
  const [metrics, setMetrics] = useState<Record<MetricKey, number>>({
    mood: 3,
    energy: 3,
    soreness: 3,
    sleep_quality: 3,
  });

  const scheduleId = route.params?.scheduleId as string | undefined;
  const activeSchedule = dueSchedules[0] || null;

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const state = await checkInsService.getClientCheckInState(scheduleId);
      setDueSchedules(state.dueSchedules);
    } catch {
      setDueSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const resetForm = () => {
    setMetrics({ mood: 3, energy: 3, soreness: 3, sleep_quality: 3 });
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!activeSchedule || saving) return;
    setSaving(true);
    try {
      await checkInsService.submitClientResponse(activeSchedule, { ...metrics, notes });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      setSaved(true);
      await loadState();
    } catch {
      dialogManager.error(t('common.error'), t('checkIns.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={PRIMARY_GREEN} />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>{t('checkIns.loading')}</Text>
        </View>
      );
    }

    if (!activeSchedule) {
      return (
        <View style={styles.centerState}>
          <CheckCircle2 size={52} color={PRIMARY_GREEN} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {saved ? t('checkIns.saved') : t('checkIns.allCaughtUp')}
          </Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {saved ? t('checkIns.savedSubtitle') : t('checkIns.allCaughtUpSubtitle')}
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>{t('checkIns.backHome')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <View style={[styles.promptCard, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
          <View style={styles.promptIcon}>
            <ClipboardCheck size={22} color={PRIMARY_GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.promptTitle, { color: colors.text }]}>{t('checkIns.title')}</Text>
            <Text style={[styles.promptSubtitle, { color: colors.textSecondary }]}>{t('checkIns.subtitle')}</Text>
          </View>
        </View>

        <View style={[styles.formCard, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
          <MetricPicker label={t('checkIns.mood')} value={metrics.mood} onChange={(value) => setMetrics((prev) => ({ ...prev, mood: value }))} isDark={isDark} />
          <MetricPicker label={t('checkIns.energy')} value={metrics.energy} onChange={(value) => setMetrics((prev) => ({ ...prev, energy: value }))} isDark={isDark} />
          <MetricPicker label={t('checkIns.soreness')} value={metrics.soreness} onChange={(value) => setMetrics((prev) => ({ ...prev, soreness: value }))} isDark={isDark} />
          <MetricPicker label={t('checkIns.sleepQuality')} value={metrics.sleep_quality} onChange={(value) => setMetrics((prev) => ({ ...prev, sleep_quality: value }))} isDark={isDark} />

          <Text style={styles.metricLabel}>{t('checkIns.notes')}</Text>
          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                color: colors.text,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('checkIns.notesPlaceholder')}
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.32)'}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={[styles.primaryButton, saving && { opacity: 0.65 }]} onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#000000" /> : <Text style={styles.primaryButtonText}>{t('checkIns.submit')}</Text>}
        </TouchableOpacity>
      </>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
      <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('checkIns.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderBody()}
      </ScrollView>
    </KeyboardAvoidingView>
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
  centerState: { alignItems: 'center', justifyContent: 'center', paddingTop: 120, gap: 14 },
  stateText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  emptyTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(22), marginTop: 4 },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  promptIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(180,240,78,0.08)',
  },
  promptTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16) },
  promptSubtitle: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), marginTop: 3, lineHeight: 18 },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  metricBlock: { gap: 8 },
  metricLabel: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(13),
    color: PRIMARY_GREEN,
  },
  valueRow: { flexDirection: 'row', gap: 8 },
  valueButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(15) },
  notesInput: {
    minHeight: 104,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: PRIMARY_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingHorizontal: 18,
  },
  primaryButtonText: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(15), color: '#000000' },
});
