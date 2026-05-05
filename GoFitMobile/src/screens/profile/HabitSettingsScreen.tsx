import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CheckCircle2, Circle, Edit3, Plus, Trash2 } from 'lucide-react-native';
import { GradientBackground } from '@/components/shared/GradientBackground';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import type { DailyHabit, HabitType, HabitUpsertInput } from '@/services/habits';
import { useDailyCoachStore } from '@/stores/dailyCoachStore';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getGlassBg, getGlassBorder, getTextColor, getTextSecondaryColor } from '@/utils/colorUtils';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';

const BRAND = theme.colors.primary;

const HABIT_TYPES: Array<{ label: string; value: HabitType; unit: string | null }> = [
  { label: 'Water', value: 'hydration', unit: 'L' },
  { label: 'Protein', value: 'protein', unit: 'g' },
  { label: 'Steps', value: 'steps', unit: 'steps' },
  { label: 'Sleep', value: 'sleep', unit: 'h' },
  { label: 'Mobility', value: 'mobility', unit: 'min' },
  { label: 'Nutrition', value: 'nutrition', unit: null },
  { label: 'Photo', value: 'progress_photo', unit: null },
  { label: 'Weigh-in', value: 'weigh_in', unit: null },
  { label: 'Custom', value: 'custom', unit: null },
];

type HabitDraft = {
  id?: string;
  title: string;
  type: HabitType;
  targetValue: string;
  unit: string;
  isActive: boolean;
  sortOrder: number;
};

function createDraft(habit?: DailyHabit): HabitDraft {
  return {
    id: habit?.id,
    title: habit?.title ?? '',
    type: habit?.type ?? 'custom',
    targetValue: habit?.target_value == null ? '' : String(habit.target_value),
    unit: habit?.unit ?? '',
    isActive: habit?.is_active ?? true,
    sortOrder: habit?.sort_order ?? 100,
  };
}

function formatTarget(habit: DailyHabit) {
  if (habit.target_value == null) return 'No target';
  const value = Number.isInteger(habit.target_value) ? habit.target_value.toLocaleString() : String(habit.target_value);
  return habit.unit ? `${value} ${habit.unit}` : value;
}

export function HabitSettingsScreen() {
  const { isDark } = useThemeStore();
  const { habits, habitsUnavailable, isLoadingHabits, error, loadAllHabits, toggleHabit, saveHabit, setHabitActive, deleteHabit } =
    useDailyCoachStore();
  const [draft, setDraft] = useState<HabitDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadAllHabits();
  }, [loadAllHabits]);

  const text = getTextColor(isDark);
  const muted = getTextSecondaryColor(isDark);
  const glass = getGlassBg(isDark);
  const border = getGlassBorder(isDark);
  const activeCount = useMemo(() => habits.filter((habit) => habit.is_active).length, [habits]);

  const openDraft = (habit?: DailyHabit) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft(createDraft(habit));
  };

  const updateDraftType = (type: HabitType) => {
    const selected = HABIT_TYPES.find((item) => item.value === type);
    setDraft((current) =>
      current
        ? {
            ...current,
            type,
            unit: current.unit || selected?.unit || '',
          }
        : current,
    );
  };

  const handleSave = async () => {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      Alert.alert('Habit name required', 'Give this habit a short name.');
      return;
    }

    const parsedTarget = draft.targetValue.trim() ? Number(draft.targetValue) : null;
    if (parsedTarget !== null && (!Number.isFinite(parsedTarget) || parsedTarget < 0)) {
      Alert.alert('Target looks off', 'Use a positive number or leave the target blank.');
      return;
    }

    const payload: HabitUpsertInput = {
      id: draft.id,
      title,
      type: draft.type,
      target_value: parsedTarget,
      unit: draft.unit.trim() || null,
      is_active: draft.isActive,
      sort_order: draft.sortOrder,
    };

    setSaving(true);
    try {
      await saveHabit(payload);
      setDraft(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (habit: DailyHabit) => {
    Alert.alert('Delete habit?', `"${habit.title}" will be removed from your daily coach loop.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteHabit(habit);
        },
      },
    ]);
  };

  return (
    <GradientBackground style={styles.container}>
      <ScreenHeader
        title="HABITS"
        showBack
        rightElement={
          <TouchableOpacity
            onPress={() => openDraft()}
            style={[styles.headerButton, { borderColor: border, backgroundColor: glass }]}
            accessibilityRole="button"
            accessibilityLabel="Add habit"
          >
            <Plus size={20} color={BRAND} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={isDark ? ['rgba(132,196,65,0.14)', 'rgba(255,255,255,0.035)'] : ['rgba(132,196,65,0.1)', 'rgba(255,255,255,0.75)']}
          style={[styles.summary, { borderColor: border }]}
        >
          <Text style={[styles.summaryValue, { color: text }]}>{activeCount}</Text>
          <Text style={[styles.summaryLabel, { color: muted }]}>active daily habits</Text>
          <Text style={[styles.summaryCopy, { color: muted }]}>
            These appear in Today's coach and count toward readiness.
          </Text>
        </LinearGradient>

        {habitsUnavailable ? (
          <View style={[styles.notice, { borderColor: border, backgroundColor: glass }]}>
            <Text style={[styles.noticeText, { color: muted }]}>Habit tables are not available yet.</Text>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.notice, { borderColor: border, backgroundColor: glass }]}>
            <Text style={[styles.noticeText, { color: muted }]}>{error}</Text>
          </View>
        ) : null}

        {isLoadingHabits ? (
          <ActivityIndicator color={BRAND} style={styles.loading} />
        ) : (
          habits.map((habit) => (
            <View key={habit.id} style={[styles.habitCard, { backgroundColor: glass, borderColor: border }]}>
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void toggleHabit(habit);
                }}
                accessibilityRole="button"
                accessibilityLabel={habit.completed ? 'Mark habit incomplete' : 'Mark habit complete'}
              >
                {habit.completed ? <CheckCircle2 size={22} color={BRAND} /> : <Circle size={22} color={muted} />}
              </TouchableOpacity>

              <View style={styles.habitBody}>
                <Text style={[styles.habitTitle, { color: text }]} numberOfLines={1}>
                  {habit.title}
                </Text>
                <Text style={[styles.habitMeta, { color: muted }]} numberOfLines={1}>
                  {formatTarget(habit)} - {habit.type.replace(/_/g, ' ')}
                </Text>
              </View>

              <Switch
                value={habit.is_active}
                onValueChange={(value) => setHabitActive(habit, value)}
                disabled={habit.id.startsWith('local-')}
                trackColor={{ false: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)', true: BRAND }}
                thumbColor={isDark ? '#fff' : '#f8f8f8'}
              />

              <TouchableOpacity style={styles.iconButton} onPress={() => openDraft(habit)} accessibilityRole="button" accessibilityLabel="Edit habit">
                <Edit3 size={18} color={muted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => confirmDelete(habit)}
                disabled={habit.id.startsWith('local-')}
                accessibilityRole="button"
                accessibilityLabel="Delete habit"
              >
                <Trash2 size={18} color={habit.id.startsWith('local-') ? 'rgba(128,128,128,0.45)' : '#EF5350'} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={draft !== null} animationType="slide" transparent onRequestClose={() => setDraft(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#101510' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: text }]}>{draft?.id ? 'Edit habit' : 'New habit'}</Text>

            <TextInput
              value={draft?.title ?? ''}
              onChangeText={(value) => setDraft((current) => (current ? { ...current, title: value } : current))}
              placeholder="Habit name"
              placeholderTextColor={muted}
              style={[styles.input, { borderColor: border, color: text, backgroundColor: glass }]}
            />

            <View style={styles.typeGrid}>
              {HABIT_TYPES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => updateDraftType(item.value)}
                  style={[
                    styles.typeChip,
                    {
                      borderColor: draft?.type === item.value ? BRAND : border,
                      backgroundColor: draft?.type === item.value ? 'rgba(132,196,65,0.18)' : glass,
                    },
                  ]}
                >
                  <Text style={[styles.typeChipText, { color: draft?.type === item.value ? BRAND : muted }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputRow}>
              <TextInput
                value={draft?.targetValue ?? ''}
                onChangeText={(value) => setDraft((current) => (current ? { ...current, targetValue: value } : current))}
                placeholder="Target"
                placeholderTextColor={muted}
                keyboardType="decimal-pad"
                style={[styles.input, styles.inputHalf, { borderColor: border, color: text, backgroundColor: glass }]}
              />
              <TextInput
                value={draft?.unit ?? ''}
                onChangeText={(value) => setDraft((current) => (current ? { ...current, unit: value } : current))}
                placeholder="Unit"
                placeholderTextColor={muted}
                style={[styles.input, styles.inputHalf, { borderColor: border, color: text, backgroundColor: glass }]}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, { borderColor: border }]} onPress={() => setDraft(null)}>
                <Text style={[styles.secondaryButtonText, { color: text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} disabled={saving} onPress={handleSave}>
                {saving ? <ActivityIndicator color="#10140D" /> : <Text style={styles.primaryButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: 112,
    paddingHorizontal: getResponsiveSpacing(20),
    paddingBottom: 120,
    gap: 12,
  },
  summary: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  summaryValue: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(30),
  },
  summaryLabel: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(12),
    textTransform: 'uppercase',
    marginTop: 4,
  },
  summaryCopy: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(13),
    marginTop: 8,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  noticeText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(13),
  },
  loading: {
    marginTop: 32,
  },
  habitCard: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitBody: {
    flex: 1,
    minWidth: 0,
  },
  habitTitle: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(15),
  },
  habitMeta: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(12),
    marginTop: 4,
    textTransform: 'capitalize',
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    gap: 14,
  },
  modalTitle: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(20),
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(14),
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputHalf: {
    flex: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  typeChipText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(12),
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(13),
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,
  },
  primaryButtonText: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(13),
    color: '#10140D',
  },
});
