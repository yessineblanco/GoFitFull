import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, Settings, User, XCircle, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useBookingsStore } from '@/store/bookingsStore';
import { useCoachStore } from '@/store/coachStore';
import type { Booking } from '@/services/bookings';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';

const PRIMARY_GREEN = '#B4F04E';

const statusColors: Record<string, string> = {
  confirmed: PRIMARY_GREEN,
  pending: '#FFC107',
  completed: '#4CAF50',
  cancelled: '#EF5350',
};

export const CoachCalendarScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile } = useCoachStore();
  const { coachBookings, loading, loadCoachBookings, cancelBooking } = useBookingsStore();

  useEffect(() => {
    if (profile?.id) loadCoachBookings(profile.id);
  }, [profile?.id]);

  const handleRefresh = useCallback(() => {
    if (profile?.id) loadCoachBookings(profile.id);
  }, [profile?.id]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const up: Booking[] = [];
    const pa: Booking[] = [];
    coachBookings.forEach((b) => {
      if (new Date(b.scheduled_at) > now && b.status !== 'cancelled') up.push(b);
      else pa.push(b);
    });
    return { upcoming: up, past: pa };
  }, [coachBookings]);

  const handleCancel = (booking: Booking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dialogManager.show(
      t('booking.cancelBooking'),
      t('booking.cancelBookingConfirm'),
      'warning',
      {
        showCancel: true,
        confirmText: t('booking.cancelBooking'),
        cancelText: t('common.cancel'),
        onConfirm: async () => {
          try { await cancelBooking(booking.id, 'Coach cancelled'); } catch {}
        },
      }
    );
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const date = new Date(item.scheduled_at);
    const isUpcoming = date > new Date() && item.status !== 'cancelled';

    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[item.status] || 'rgba(255,255,255,0.3)' }]} />
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingDate}>{date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            <Text style={styles.bookingDuration}>{item.duration_minutes} min · {item.status}</Text>
          </View>
          {isUpcoming && (
            <TouchableOpacity onPress={() => handleCancel(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <XCircle size={20} color="#EF5350" />
            </TouchableOpacity>
          )}
        </View>
        {item.notes ? <Text style={styles.bookingNotes}>{item.notes}</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>{t('booking.calendar')}</Text>
        <TouchableOpacity
          style={styles.availabilityBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Availability'); }}
        >
          <Settings size={16} color="#000000" />
          <Text style={styles.availabilityBtnText}>{t('booking.setAvailability')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...upcoming, ...past]}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={PRIMARY_GREEN} />}
        ListHeaderComponent={
          upcoming.length > 0 ? <Text style={styles.sectionLabel}>{t('booking.upcoming')} ({upcoming.length})</Text> : null
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Calendar size={48} color="rgba(180,240,78,0.3)" />
              <Text style={styles.emptyTitle}>{t('booking.noBookings')}</Text>
              <Text style={styles.emptySubtitle}>{t('booking.noBookingsCoachDesc')}</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(24), color: '#FFFFFF', marginBottom: 12 },
  availabilityBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    backgroundColor: PRIMARY_GREEN, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  availabilityBtnText: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(13), color: '#000000' },
  listContent: { paddingHorizontal: 20, paddingTop: 12 },
  sectionLabel: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(13), color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  bookingCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 14, marginBottom: 8 },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  bookingInfo: { flex: 1 },
  bookingDate: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: '#FFFFFF' },
  bookingDuration: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  bookingNotes: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.5)', marginTop: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF' },
  emptySubtitle: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 260 },
});
