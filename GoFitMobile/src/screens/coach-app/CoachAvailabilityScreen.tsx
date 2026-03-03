import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
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
      <View style={[styles.container, styles.centered]}>
        <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={PRIMARY_GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('booking.availability')}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
          <Check size={22} color={saving ? 'rgba(0,0,0,0.3)' : '#000000'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const isEnabled = enabledDays.has(day);
          const daySlots = slots.filter((s) => s.day_of_week === day);

          return (
            <View key={day} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dayLabelRow}>
                  <Text style={[styles.dayName, isEnabled && styles.dayNameEnabled]}>{t(`booking.${DAY_KEYS[day]}`)}</Text>
                  <Text style={styles.slotCount}>{daySlots.length} {daySlots.length !== 1 ? t('booking.slots') : t('booking.slot')}</Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => toggleDay(day)}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(180,240,78,0.3)' }}
                  thumbColor={isEnabled ? PRIMARY_GREEN : 'rgba(255,255,255,0.4)'}
                />
              </View>

              {isEnabled && (
                <View style={styles.slotsContainer}>
                  {daySlots.map((slot, idx) => (
                    <View key={idx} style={styles.slotRow}>
                      <Clock size={14} color="rgba(180,240,78,0.5)" />
                      <TouchableOpacity onPress={() => updateSlotTime(day, idx, 'start_time', -1)} style={styles.timeBtn}>
                        <Text style={styles.timeBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeText}>{slot.start_time}</Text>
                      <TouchableOpacity onPress={() => updateSlotTime(day, idx, 'start_time', 1)} style={styles.timeBtn}>
                        <Text style={styles.timeBtnText}>+</Text>
                      </TouchableOpacity>

                      <Text style={styles.timeSeparator}>{t('booking.timeTo')}</Text>

                      <TouchableOpacity onPress={() => updateSlotTime(day, idx, 'end_time', -1)} style={styles.timeBtn}>
                        <Text style={styles.timeBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeText}>{slot.end_time}</Text>
                      <TouchableOpacity onPress={() => updateSlotTime(day, idx, 'end_time', 1)} style={styles.timeBtn}>
                        <Text style={styles.timeBtnText}>+</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => removeSlot(day, idx)} style={styles.removeSlotBtn}>
                        <Trash2 size={14} color="#EF5350" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addSlotBtn} onPress={() => addSlotForDay(day)}>
                    <Plus size={14} color={PRIMARY_GREEN} />
                    <Text style={styles.addSlotText}>{t('booking.addSlot')}</Text>
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
