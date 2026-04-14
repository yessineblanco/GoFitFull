import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
} from 'react-native';
import { Shimmer } from '@/components/shared/Shimmer';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Plus, Trash2, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useBookingsStore } from '@/store/bookingsStore';
import { useCoachStore } from '@/store/coachStore';
import { useAuthStore } from '@/store/authStore';
import type { AvailabilitySlot } from '@/services/bookings';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';

const PRIMARY_GREEN = '#B4F04E';

const DAY_KEYS = ['daySunday', 'dayMonday', 'dayTuesday', 'dayWednesday', 'dayThursday', 'dayFriday', 'daySaturday'] as const;
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

interface LocalSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export const CoachAvailabilityScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { profile, loadProfile } = useCoachStore();
  const { availability, loadingAvailability, loadAvailability, saveAvailability } = useBookingsStore();

  const [slots, setSlots] = useState<LocalSlot[]>([]);
  const [enabledDays, setEnabledDays] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) loadProfile();
  }, []);

  useEffect(() => {
    if (profile?.id) loadAvailability(profile.id);
  }, [profile?.id]);

  useEffect(() => {
    if (availability.length > 0) {
      const localSlots = availability.map((s) => ({
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
      }));
      setSlots(localSlots);
      setEnabledDays(new Set(localSlots.map((s) => s.day_of_week)));
    }
  }, [availability]);

  const toggleDay = (day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newEnabled = new Set(enabledDays);
    if (newEnabled.has(day)) {
      newEnabled.delete(day);
      setSlots(slots.filter((s) => s.day_of_week !== day));
    } else {
      newEnabled.add(day);
      setSlots([...slots, { day_of_week: day, start_time: '09:00', end_time: '17:00' }]);
    }
    setEnabledDays(newEnabled);
  };

  const addSlotForDay = (day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSlots([...slots, { day_of_week: day, start_time: '09:00', end_time: '17:00' }]);
  };

  const removeSlot = (day: number, index: number) => {
    const daySlots = slots.filter((s) => s.day_of_week === day);
    const otherSlots = slots.filter((s) => s.day_of_week !== day);
    daySlots.splice(index, 1);
    if (daySlots.length === 0) {
      const newEnabled = new Set(enabledDays);
      newEnabled.delete(day);
      setEnabledDays(newEnabled);
    }
    setSlots([...otherSlots, ...daySlots]);
  };

  const updateSlotTime = (day: number, slotIndex: number, field: 'start_time' | 'end_time', direction: 1 | -1) => {
    const daySlots = slots.filter((s) => s.day_of_week === day);
    const otherSlots = slots.filter((s) => s.day_of_week !== day);
    const slot = daySlots[slotIndex];
    const currentIdx = TIME_OPTIONS.indexOf(slot[field]);
    const newIdx = Math.max(0, Math.min(TIME_OPTIONS.length - 1, currentIdx + direction));
    daySlots[slotIndex] = { ...slot, [field]: TIME_OPTIONS[newIdx] };
    setSlots([...otherSlots, ...daySlots]);
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await saveAvailability(profile.id, slots);
      dialogManager.success(t('common.success'), t('booking.availabilitySaved'));
      navigation.goBack();
    } catch {
      dialogManager.error(t('common.error'), t('booking.failedToSaveAvailability'));
    } finally {
      setSaving(false);
    }
  };

  if (loadingAvailability) {
    return (
      <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
        <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('booking.availability')}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 10 }}>
          {[...Array(7)].map((_, i) => (
            <View key={i} style={{ backgroundColor: getGlassBg(isDark), borderRadius: 16, borderWidth: 1, borderColor: getGlassBorder(isDark), padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Shimmer width={80} height={16} style={{ marginBottom: 4 }} />
                  <Shimmer width={50} height={12} />
                </View>
                <Shimmer width={44} height={26} borderRadius={13} />
              </View>
              {i % 2 === 0 && (
                <View style={{ marginTop: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Shimmer width={14} height={14} borderRadius={4} />
                    <Shimmer width={60} height={20} borderRadius={6} />
                    <Shimmer width={30} height={12} />
                    <Shimmer width={60} height={20} borderRadius={6} />
                  </View>
                </View>
              )}
            </View>
          ))}
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('booking.availability')}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
          <Check size={22} color={saving ? 'rgba(0,0,0,0.3)' : '#000000'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const isEnabled = enabledDays.has(day);
          const daySlots = slots.filter((s) => s.day_of_week === day);

          return (
            <View key={day} style={[styles.dayCard, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
              <View style={styles.dayHeader}>
                <View style={styles.dayLabelRow}>
                  <Text style={[styles.dayName, { color: colors.textSecondary }, isEnabled && { color: colors.text }]}>{t(`booking.${DAY_KEYS[day]}`)}</Text>
                  <Text style={[styles.slotCount, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }]}>{daySlots.length} {daySlots.length !== 1 ? t('booking.slots') : t('booking.slot')}</Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => toggleDay(day)}
                  trackColor={{ false: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', true: 'rgba(180,240,78,0.3)' }}
                  thumbColor={isEnabled ? PRIMARY_GREEN : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)')}
                />
              </View>

              {isEnabled && (
                <View style={styles.slotsContainer}>
                  {daySlots.map((slot, idx) => (
                    <View key={idx} style={styles.slotRow}>
                      <Clock size={14} color="rgba(180,240,78,0.5)" />
                      <TouchableOpacity onPress={() => updateSlotTime(day, idx, 'start_time', -1)} style={[styles.timeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.timeBtnText, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.timeText, { color: colors.primary }]}>{slot.start_time}</Text>
                      <TouchableOpacity onPress={() => updateSlotTime(day, idx, 'start_time', 1)} style={[styles.timeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.timeBtnText, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>+</Text>
                      </TouchableOpacity>

                      <Text style={[styles.timeSeparator, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }]}>{t('booking.timeTo')}</Text>

                      <TouchableOpacity onPress={() => updateSlotTime(day, idx, 'end_time', -1)} style={[styles.timeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.timeBtnText, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.timeText, { color: colors.primary }]}>{slot.end_time}</Text>
                      <TouchableOpacity onPress={() => updateSlotTime(day, idx, 'end_time', 1)} style={[styles.timeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.timeBtnText, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>+</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => removeSlot(day, idx)} style={styles.removeSlotBtn}>
                        <Trash2 size={14} color="#EF5350" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addSlotBtn} onPress={() => addSlotForDay(day)}>
                    <Plus size={14} color={colors.primary} />
                    <Text style={[styles.addSlotText, { color: colors.primary }]}>{t('booking.addSlot')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backButton: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20), color: '#FFFFFF', textAlign: 'center' },
  saveButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: PRIMARY_GREEN, alignItems: 'center', justifyContent: 'center' },
  saveButtonDisabled: { backgroundColor: 'rgba(180,240,78,0.3)' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  dayCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 16, marginBottom: 10 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabelRow: { flex: 1 },
  dayName: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(15), color: 'rgba(255,255,255,0.4)' },
  dayNameEnabled: { color: '#FFFFFF' },
  slotCount: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  slotsContainer: { marginTop: 12 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  timeBtn: { width: 24, height: 24, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  timeBtnText: { fontFamily: 'Barlow_600SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  timeText: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: PRIMARY_GREEN, minWidth: 44, textAlign: 'center' },
  timeSeparator: { fontFamily: 'Barlow_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  removeSlotBtn: { marginLeft: 'auto', padding: 4 },
  addSlotBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  addSlotText: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(12), color: PRIMARY_GREEN },
});
