import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, XCircle, Video } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useBookingsStore } from '@/store/bookingsStore';
import { useAuthStore } from '@/store/authStore';
import type { Booking } from '@/services/bookings';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';
import { videoCallService } from '@/services/videoCall';

const PRIMARY_GREEN = '#B4F04E';

const statusColors: Record<string, string> = {
  confirmed: PRIMARY_GREEN,
  pending: '#FFC107',
  completed: '#4CAF50',
  cancelled: '#EF5350',
};

export const MyBookingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { clientBookings, loading, loadClientBookings, cancelBooking } = useBookingsStore();

  useEffect(() => {
    if (user?.id) loadClientBookings(user.id);
  }, [user?.id]);

  const handleRefresh = useCallback(() => {
    if (user?.id) loadClientBookings(user.id);
  }, [user?.id]);

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
          try { await cancelBooking(booking.id, 'Client cancelled'); } catch {}
        },
      }
    );
  };

  const handleJoinCall = async (booking: Booking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let roomId = booking.video_room_id;
    if (!roomId) {
      roomId = await videoCallService.createVideoRoom(booking.id);
    }
    if (roomId) {
      (navigation as any).navigate('VideoCall', { bookingId: booking.id, videoRoomId: roomId });
    }
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const date = new Date(item.scheduled_at);
    const isUpcoming = date > new Date() && item.status !== 'cancelled';
    const canJoinCall = item.status === 'confirmed' && videoCallService.isWithinCallWindow(item.scheduled_at);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[item.status] || 'rgba(255,255,255,0.3)' }]} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardDate}>{date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            <Text style={styles.cardMeta}>{item.duration_minutes} {t('booking.minutes')} · {t(`booking.${item.status}`)}</Text>
          </View>
          {isUpcoming && (
            <TouchableOpacity onPress={() => handleCancel(item)}>
              <XCircle size={20} color="#EF5350" />
            </TouchableOpacity>
          )}
        </View>
        {canJoinCall && (
          <TouchableOpacity style={styles.joinCallBtn} onPress={() => handleJoinCall(item)} activeOpacity={0.7}>
            <Video size={16} color="#000000" />
            <Text style={styles.joinCallText}>{t('videoCall.joinCall')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('booking.myBookings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={clientBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={PRIMARY_GREEN} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={PRIMARY_GREEN} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Calendar size={48} color="rgba(180,240,78,0.3)" />
              <Text style={styles.emptyTitle}>{t('booking.noBookings')}</Text>
              <Text style={styles.emptySubtitle}>{t('booking.noBookingsClientDesc')}</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20), color: '#FFFFFF', textAlign: 'center' },
  listContent: { paddingHorizontal: 20, paddingTop: 12 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 14, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardInfo: { flex: 1 },
  cardDate: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: '#FFFFFF' },
  cardMeta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF' },
  emptySubtitle: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 260 },
  joinCallBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    backgroundColor: PRIMARY_GREEN, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 10,
  },
  joinCallText: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(13), color: '#000000' },
});
