import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, Clock, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBookingsStore } from '@/store/bookingsStore';
import { useAuthStore } from '@/store/authStore';
import type { AvailabilitySlot } from '@/services/bookings';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';

const PRIMARY_GREEN = '#B4F04E';
const DAY_KEYS = ['daySunday', 'dayMonday', 'dayTuesday', 'dayWednesday', 'dayThursday', 'dayFriday', 'daySaturday'] as const;

export const BookSessionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { availability, loadingAvailability, loadAvailability, createBooking } = useBookingsStore();

  const coachId = route.params?.coachId;
  const coachName = route.params?.coachName || 'Coach';

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (coachId) loadAvailability(coachId);
  }, [coachId]);

  const availableDays = useMemo(() => {
    const days = new Set(availability.map((s) => s.day_of_week));
    return Array.from(days).sort((a, b) => a - b);
  }, [availability]);

  const slotsForDay = useMemo(() => {
    if (selectedDay === null) return [];
    return availability.filter((s) => s.day_of_week === selectedDay);
  }, [availability, selectedDay]);

  const generateHours = (startTime: string, endTime: string): string[] => {
    const hours: string[] = [];
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let current = sh * 60 + sm;
    const end = eh * 60 + em;
    while (current < end) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      hours.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      current += 60;
    }
    return hours;
  };

  const getNextDateForDay = (dayOfWeek: number): Date => {
    const now = new Date();
    const today = now.getDay();
    let daysAhead = dayOfWeek - today;
    if (daysAhead <= 0) daysAhead += 7;
    const date = new Date(now);
    date.setDate(date.getDate() + daysAhead);
    return date;
  };

  const handleBook = async () => {
    if (!selectedDay || !selectedHour || !user?.id || !coachId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBooking(true);

    try {
      const date = getNextDateForDay(selectedDay);
      const [h, m] = selectedHour.split(':').map(Number);
      date.setHours(h, m, 0, 0);

      await createBooking({
        coach_id: coachId,
        client_id: user.id,
        scheduled_at: date.toISOString(),
        duration_minutes: 60,
      });
      dialogManager.success(t('common.success'), t('booking.bookingCreated'));
      navigation.goBack();
    } catch {
      dialogManager.error(t('common.error'), t('booking.failedToBook'));
    } finally {
      setBooking(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('booking.bookSession')}</Text>
          <Text style={styles.headerSub}>{coachName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loadingAvailability ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY_GREEN} /></View>
      ) : availability.length === 0 ? (
        <View style={styles.centered}>
          <Calendar size={48} color="rgba(180,240,78,0.3)" />
          <Text style={styles.emptyTitle}>{t('booking.noSlots')}</Text>
          <Text style={styles.emptySubtitle}>{t('booking.noSlotsDesc')}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>{t('booking.selectSlot')}</Text>

          <View style={styles.daysRow}>
            {availableDays.map((day) => (
              <TouchableOpacity
                key={day}
                style={[styles.dayChip, selectedDay === day && styles.dayChipActive]}
                onPress={() => { setSelectedDay(day); setSelectedSlot(null); setSelectedHour(null); }}
              >
                <Text style={[styles.dayChipText, selectedDay === day && styles.dayChipTextActive]}>{t(`booking.${DAY_KEYS[day]}`).slice(0, 3)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedDay !== null && slotsForDay.length > 0 && (
            <View style={styles.timeSection}>
              {slotsForDay.map((slot, idx) => {
                const hours = generateHours(slot.start_time, slot.end_time);
                return (
                  <View key={idx}>
                    <Text style={styles.slotRange}>{slot.start_time} - {slot.end_time}</Text>
                    <View style={styles.hoursGrid}>
                      {hours.map((hour) => (
                        <TouchableOpacity
                          key={hour}
                          style={[styles.hourChip, selectedHour === hour && styles.hourChipActive]}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedSlot(slot); setSelectedHour(hour); }}
                        >
                          <Clock size={12} color={selectedHour === hour ? '#000000' : 'rgba(180,240,78,0.5)'} />
                          <Text style={[styles.hourChipText, selectedHour === hour && styles.hourChipTextActive]}>{hour}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {selectedHour && (
            <TouchableOpacity style={[styles.bookButton, booking && styles.bookButtonDisabled]} onPress={handleBook} disabled={booking}>
              {booking ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <Check size={18} color="#000000" />
                  <Text style={styles.bookButtonText}>{t('booking.bookSession')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { padding: 8, width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF' },
  headerSub: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF' },
  emptySubtitle: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 260 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  sectionLabel: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(13), color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  dayChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  dayChipActive: { backgroundColor: PRIMARY_GREEN, borderColor: PRIMARY_GREEN },
  dayChipText: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(13), color: 'rgba(255,255,255,0.6)' },
  dayChipTextActive: { color: '#000000' },
  timeSection: { marginBottom: 20 },
  slotRange: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  hoursGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  hourChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  hourChipActive: { backgroundColor: PRIMARY_GREEN, borderColor: PRIMARY_GREEN },
  hourChipText: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(13), color: 'rgba(255,255,255,0.6)' },
  hourChipTextActive: { color: '#000000' },
  bookButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY_GREEN, borderRadius: 14, paddingVertical: 16, marginTop: 12,
  },
  bookButtonDisabled: { backgroundColor: 'rgba(180,240,78,0.3)' },
  bookButtonText: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16), color: '#000000' },
});
