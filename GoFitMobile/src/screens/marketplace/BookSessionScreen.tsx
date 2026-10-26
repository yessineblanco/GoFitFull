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
import { bookingsService, type AvailabilitySlot } from '@/services/bookings';
import { getSessionStartTimes } from '@/utils/sessionDuration';
import { getNextBookingDate, overlapsBookedTime } from '@/utils/bookingTime';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/config/supabase';
import { getStripePublishableKey } from '@/config/stripe';

const PRIMARY_GREEN = '#B4F04E';
const DAY_KEYS = ['daySunday', 'dayMonday', 'dayTuesday', 'dayWednesday', 'dayThursday', 'dayFriday', 'daySaturday'] as const;

export const BookSessionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { availability, loadingAvailability, loadAvailability, loadClientBookings } = useBookingsStore();

  const coachId = route.params?.coachId;
  const coachName = route.params?.coachName || 'Coach';

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [sessionAmount, setSessionAmount] = useState(0);
  const [busySlots, setBusySlots] = useState<{ scheduled_at: string; duration_minutes: number }[]>([]);
  const [loadingDuration, setLoadingDuration] = useState(true);
  const [durationError, setDurationError] = useState(false);
  const [durationRetry, setDurationRetry] = useState(0);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    if (coachId) loadAvailability(coachId);
  }, [coachId]);

  useEffect(() => {
    let active = true;
    setLoadingDuration(true);
    setDurationError(false);
    setSelectedHour(null);
    Promise.all([bookingsService.getSessionTerms(coachId), bookingsService.getBusySessionTimes(coachId)]).then(([terms, busy]) => {
      if (active) { setSessionDuration(terms.duration); setSessionAmount(terms.amount); setBusySlots(busy); }
    }).catch(() => {
      if (active) setDurationError(true);
    }).finally(() => {
      if (active) setLoadingDuration(false);
    });
    return () => { active = false; };
  }, [coachId, durationRetry]);

  const availableDays = useMemo(() => {
    const days = new Set(availability.map((s) => s.day_of_week));
    return Array.from(days).sort((a, b) => a - b);
  }, [availability]);

  const slotsForDay = useMemo(() => {
    if (selectedDay === null) return [];
    return availability.filter((s) => s.day_of_week === selectedDay);
  }, [availability, selectedDay]);

  const handleBook = async () => {
    if (selectedDay === null || !selectedHour || !user?.id || !coachId || loadingDuration || durationError) return;
    if (!getStripePublishableKey()) {
      dialogManager.error(t('payments.unavailableTitle'), t('payments.unavailableMessage'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBooking(true);

    let paymentIntentId: string | null = null;
    let confirmed = false;
    try {
      const terms = await bookingsService.getSessionTerms(coachId);
      if (terms.duration !== sessionDuration || terms.amount !== sessionAmount) {
        throw new Error('This coach changed their session price or duration. Please select a new time.');
      }
      // 1. Fetch Payment Intent from Edge Function
      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: {
          action: 'create_session', coachId,
          scheduledAt: getNextBookingDate(selectedDay, selectedHour).toISOString(),
          durationMinutes: sessionDuration, expectedAmount: sessionAmount,
        },
      });

      if (error || !data?.clientSecret) {
        throw new Error('Unable to reserve this time. Please reload and choose an available session.');
      }

      paymentIntentId = data.paymentIntentId;
      // 2. Initialize the Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'GoFit',
        paymentIntentClientSecret: data.clientSecret,
        defaultBillingDetails: {
          name: user.user_metadata?.display_name || 'Client',
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // 3. Present the Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // User cancelled or payment failed
        if (presentError.code !== 'Canceled') {
          dialogManager.error(t('common.error'), presentError.message);
        }
        setBooking(false);
        return; // Don't proceed to booking
      }

      // The server captures the authorized card only while our slot remains reserved.
      await bookingsService.confirmPaidSession(data.paymentIntentId);
      confirmed = true;
      await loadClientBookings(user.id);

      dialogManager.success(t('common.success'), t('booking.bookingCreated'));
      navigation.goBack();
    } catch (err: any) {
      dialogManager.error(t('common.error'), err.message || t('booking.failedToBook'));
    } finally {
      if (paymentIntentId && !confirmed) {
        try {
          await supabase.functions.invoke('stripe-payment', { body: { action: 'cancel_session', paymentIntentId } });
        } catch { /* An unconfirmed reservation expires on the server. */ }
      }
      if (!confirmed) setDurationRetry(retry => retry + 1);
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

      {durationError ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Unable to load session price or availability</Text>
          <TouchableOpacity onPress={() => setDurationRetry(retry => retry + 1)}>
            <Text style={styles.emptySubtitle}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : loadingAvailability || loadingDuration ? (
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
          <Text style={styles.slotRange}>€{sessionAmount.toFixed(2)} · {sessionDuration} min · Europe/Berlin</Text>

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
                const hours = getSessionStartTimes(slot.start_time, slot.end_time, sessionDuration).filter(hour => {
                  try { return !overlapsBookedTime(getNextBookingDate(selectedDay, hour), sessionDuration, busySlots); }
                  catch { return false; }
                });
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
