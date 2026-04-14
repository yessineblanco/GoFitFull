import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Shimmer } from '@/components/shared/Shimmer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, Video } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import { useBookingsStore } from '@/store/bookingsStore';
import { useCoachStore } from '@/store/coachStore';
import type { Booking } from '@/services/bookings';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';
import { videoCallService } from '@/services/videoCall';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor } from '@/utils/colorUtils';
import { COACH_STITCH, coachStitchOr } from '@/theme/coachStitch';
import { CoachSubScreenBar } from '@/components/coach/CoachSubScreenBar';
import { resolvePublicAvatarUrl } from '@/utils/avatarUrl';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAY_MS = 86400000;

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export const CoachCalendarScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { profile } = useCoachStore();
  const { coachBookings, loading, loadCoachBookings, cancelBooking } = useBookingsStore();

  const [cursor, setCursor] = useState(() => stripTime(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => stripTime(new Date()));
  const [pastOpen, setPastOpen] = useState(false);

  const bg = coachStitchOr(isDark, COACH_STITCH.bg, getBackgroundColor(isDark));
  const surfaceLow = coachStitchOr(isDark, COACH_STITCH.surfaceLow, colors.surface);
  const surfaceHi = coachStitchOr(isDark, COACH_STITCH.surfaceHighest, colors.surfaceVariant);
  const onSurface = coachStitchOr(isDark, COACH_STITCH.onSurface, colors.text);
  const onVar = coachStitchOr(isDark, COACH_STITCH.onSurfaceVariant, colors.textLight);
  const primaryC = coachStitchOr(isDark, COACH_STITCH.primaryContainer, colors.primary);
  const onPrimary = coachStitchOr(isDark, COACH_STITCH.onPrimary, '#030303');
  const borderSubtle = coachStitchOr(isDark, 'rgba(66,73,54,0.35)', colors.border);
  useEffect(() => {
    if (profile?.id) loadCoachBookings(profile.id);
  }, [profile?.id]);

  const onRefresh = useCallback(() => {
    if (profile?.id) loadCoachBookings(profile.id);
  }, [profile?.id]);

  const dayStrip = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + DAY_MS)) {
      days.push(stripTime(d));
    }
    return days;
  }, [cursor]);

  const bookingsForDay = useCallback(
    (day: Date) => {
      const key = day.toDateString();
      return coachBookings
        .filter(b => new Date(b.scheduled_at).toDateString() === key && b.status !== 'cancelled')
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    },
    [coachBookings],
  );

  const upcomingAll = useMemo(() => {
    const now = new Date();
    return coachBookings
      .filter(b => new Date(b.scheduled_at) >= now && b.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [coachBookings]);

  const upcomingForSelected = useMemo(() => {
    const list = bookingsForDay(selectedDay);
    const now = new Date();
    return list.filter(b => new Date(b.scheduled_at) >= now);
  }, [bookingsForDay, selectedDay]);

  const pastList = useMemo(() => {
    const now = new Date();
    return coachBookings
      .filter(b => new Date(b.scheduled_at) < now || b.status === 'cancelled')
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
      .slice(0, 25);
  }, [coachBookings]);

  const hasDot = (day: Date) => bookingsForDay(day).some(b => new Date(b.scheduled_at) > new Date());

  const shiftMonth = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const d = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    setCursor(d);
  };

  const handleCancel = (b: Booking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dialogManager.show(t('booking.cancelBooking'), t('booking.cancelBookingConfirm'), 'warning', {
      showCancel: true,
      confirmText: t('booking.cancelBooking'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        try {
          await cancelBooking(b.id, 'Coach cancelled');
        } catch {
          /* ignore */
        }
      },
    });
  };

  const handleJoin = async (b: Booking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let rid = b.video_room_id;
    if (!rid) rid = await videoCallService.createVideoRoom(b.id);
    if (rid) nav.navigate('VideoCall', { bookingId: b.id, videoRoomId: rid });
  };

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sessionTag = (b: Booking) => {
    const n = (b.notes || '').trim();
    if (n) return n.split('\n')[0].slice(0, 18).toUpperCase();
    return t('coachApp.sessionDefaultTag', { defaultValue: 'SESSION' });
  };

  const initials = (name: string | null | undefined) => {
    const p = (name || '?').trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : (p[0]?.[0] || '?').toUpperCase();
  };

  const startsInLabel = (scheduledAt: string) => {
    const ms = new Date(scheduledAt).getTime() - Date.now();
    if (ms <= 0) return t('coachApp.readyToStart', { defaultValue: 'Ready to Start' });
    const h = Math.floor(ms / 3600000);
    if (h < 1) return t('coachApp.startsInMins', { defaultValue: 'Starts soon' });
    return t('coachApp.startsInHours', { count: h, defaultValue: `Starts in ${h}h` });
  };

  const renderSessionCard = (item: Booking) => {
    const canJoin = item.status === 'confirmed' && videoCallService.isWithinCallWindow(item.scheduled_at);
    const soon = new Date(item.scheduled_at).getTime() - Date.now() < 3600000 * 2;
    const clientPic = resolvePublicAvatarUrl(item.client_profile_picture_url);

    return (
      <View
        key={item.id}
        style={[st.sessionShell, { backgroundColor: surfaceHi, borderColor: borderSubtle }, st.sessionShadow]}
      >
        <View style={st.sessionInner}>
          <View style={st.sessionTop}>
            <Text style={[st.sessionTime, { color: `${onSurface}99` }]}>{fmtTime(item.scheduled_at)}</Text>
            <View style={st.tagRow}>
              <View style={[st.tag, { backgroundColor: `${primaryC}22`, borderColor: `${primaryC}44` }]}>
                <Text style={[st.tagTxt, { color: primaryC }]}>{sessionTag(item)}</Text>
              </View>
              <View style={[st.tag, { backgroundColor: surfaceLow }]}>
                <Text style={[st.tagTxtMuted, { color: onVar }]}>{item.duration_minutes} MIN</Text>
              </View>
            </View>
          </View>
          <View style={st.clientRow}>
            {clientPic ? (
              <ExpoImage source={{ uri: clientPic }} style={st.miniAvatar} contentFit="cover" />
            ) : (
              <View style={[st.miniAvatar, { backgroundColor: `${primaryC}28` }]}>
                <Text style={[st.miniAvTxt, { color: primaryC }]}>{initials(item.client_name)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[st.clientTitle, { color: onSurface }]} numberOfLines={1}>
                {(item.client_name || 'Client').toUpperCase()}
              </Text>
              <View style={st.statusRow}>
                {canJoin || soon ? (
                  <>
                    <View style={[st.dot, { backgroundColor: primaryC }]} />
                    <Text style={[st.statusLive, { color: primaryC }]}>{startsInLabel(item.scheduled_at)}</Text>
                  </>
                ) : (
                  <>
                    <Text style={[st.statusMuted, { color: `${onVar}99` }]}>{startsInLabel(item.scheduled_at)}</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
        {canJoin && (
          <TouchableOpacity style={[st.joinFull, { backgroundColor: primaryC }]} onPress={() => handleJoin(item)} activeOpacity={0.9}>
            <Video size={18} color={onPrimary} />
            <Text style={[st.joinFullTxt, { color: onPrimary }]}>{t('videoCall.joinCall').toUpperCase()}</Text>
          </TouchableOpacity>
        )}
        {!canJoin && new Date(item.scheduled_at) > new Date() && (
          <TouchableOpacity onPress={() => handleCancel(item)} style={st.cancelLink}>
            <Text style={{ color: colors.error, fontFamily: 'Barlow_600SemiBold', fontSize: 12 }}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={[st.root, { backgroundColor: bg }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={primaryC} />}
    >
      <CoachSubScreenBar showTitle={false} />
      <View style={{ paddingHorizontal: 24, marginTop: 4 }}>
        <View style={st.headRow}>
          <View>
            <Text style={[st.manageLbl, { color: onVar }]}>{t('coachApp.manage', { defaultValue: 'Manage' }).toUpperCase()}</Text>
            <Text style={[st.scheduleTitle, { color: onSurface }]}>{t('coachApp.coachingSchedule', { defaultValue: 'Coaching Schedule' })}</Text>
          </View>
          <TouchableOpacity
            style={[st.availBtn, { borderColor: borderSubtle }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              nav.navigate('Availability');
            }}
          >
            <Calendar size={18} color={onSurface} />
            <Text style={[st.availBtnTxt, { color: onSurface }]}>{t('booking.setAvailability').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        <View style={st.monthRow}>
          <Text style={[st.monthTitle, { color: onSurface }]}>
            {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <View style={st.monthNav}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={8}>
              <ChevronLeft size={22} color={onVar} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={8}>
              <ChevronRight size={22} color={onVar} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.strip}>
          {dayStrip.map(day => {
            const sel = day.toDateString() === selectedDay.toDateString();
            const dot = hasDot(day);
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  st.dayPill,
                  {
                    backgroundColor: sel ? primaryC : surfaceLow,
                    borderColor: borderSubtle,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDay(day);
                }}
              >
                <Text style={[st.dayWeek, { color: sel ? onPrimary : onVar }]}>
                  {day.toLocaleString(undefined, { weekday: 'short' }).toUpperCase()}
                </Text>
                <Text style={[st.dayNum, { color: sel ? onPrimary : onSurface }]}>{day.getDate()}</Text>
                {dot && !sel && <View style={[st.dayDot, { backgroundColor: primaryC }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[st.secLbl, { color: onVar }]}>{t('booking.upcoming', { defaultValue: 'Upcoming Sessions' }).toUpperCase()}</Text>

        {loading ? (
          <View style={{ gap: 12, marginTop: 8 }}>
            {[1, 2, 3].map(i => (
              <Shimmer key={i} width="100%" height={140} borderRadius={16} />
            ))}
          </View>
        ) : upcomingForSelected.length > 0 ? (
          <View style={{ gap: 16, marginTop: 8 }}>{upcomingForSelected.map(b => renderSessionCard(b))}</View>
        ) : upcomingAll.length > 0 ? (
          <View style={{ marginTop: 8, gap: 8 }}>
            <Text style={[st.hint, { color: onVar }]}>{t('coachApp.pickDayWithSessions', { defaultValue: 'No sessions this day — showing next bookings.' })}</Text>
            {upcomingAll.slice(0, 4).map(b => renderSessionCard(b))}
          </View>
        ) : (
          <View style={st.empty}>
            <Text style={[st.emptyTitle, { color: onSurface }]}>{t('booking.noBookings')}</Text>
            <Text style={[st.emptySub, { color: onVar }]}>{t('booking.noBookingsCoachDesc')}</Text>
          </View>
        )}

        {pastList.length > 0 && (
          <>
            <TouchableOpacity
              style={[st.pastToggle, { borderColor: borderSubtle }]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setPastOpen(o => !o);
              }}
            >
              <Text style={[st.secLbl, { color: onVar }]}>
                {t('coachApp.pastSessions', { defaultValue: 'Past' })} ({pastList.length})
              </Text>
              <ChevronDown size={22} color={onVar} style={{ transform: [{ rotate: pastOpen ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>
            {pastOpen && (
              <View style={{ gap: 10 }}>
                {pastList.slice(0, 12).map(b => (
                  <View key={b.id} style={[st.pastRow, { backgroundColor: `${surfaceLow}88`, borderColor: borderSubtle }]}>
                    <View style={st.pastLeft}>
                      <Text style={[st.pastTime, { color: `${onVar}88` }]}>{fmtTime(b.scheduled_at)}</Text>
                      <Text style={[st.pastName, { color: `${onSurface}cc` }]} numberOfLines={1}>
                        {(b.client_name || '').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[st.pastStatus, { color: `${onVar}99` }]}>
                      {b.status === 'cancelled' ? t('booking.cancelled', { defaultValue: 'Cancelled' }) : t('booking.completed', { defaultValue: 'Completed' })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const st = StyleSheet.create({
  root: { flex: 1 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 },
  manageLbl: { fontFamily: 'Barlow_700Bold', fontSize: 10, letterSpacing: 2, marginBottom: 4 },
  scheduleTitle: { fontFamily: 'Barlow_800ExtraBold', fontSize: getResponsiveFontSize(26), letterSpacing: -0.5 },
  availBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  availBtnTxt: { fontFamily: 'Barlow_700Bold', fontSize: 11, letterSpacing: 0.8 },

  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  monthTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(17) },
  monthNav: { flexDirection: 'row', gap: 4 },
  strip: { gap: 12, paddingBottom: 10 },
  dayPill: {
    width: 56,
    height: 80,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    position: 'relative',
  },
  dayWeek: { fontFamily: 'Barlow_600SemiBold', fontSize: 10, marginBottom: 4 },
  dayNum: { fontFamily: 'Barlow_800ExtraBold', fontSize: 18 },
  dayDot: { position: 'absolute', bottom: 10, width: 4, height: 4, borderRadius: 2 },

  secLbl: { fontFamily: 'Barlow_700Bold', fontSize: 10, letterSpacing: 2, marginTop: 20, marginBottom: 8 },
  sessionShell: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  sessionShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  sessionInner: { padding: 22, paddingBottom: 16 },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sessionTime: { fontFamily: 'Barlow_600SemiBold', fontSize: 20 },
  tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '58%' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  tagTxt: { fontFamily: 'Barlow_700Bold', fontSize: 10 },
  tagTxtMuted: { fontFamily: 'Barlow_700Bold', fontSize: 10 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  miniAvatar: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  miniAvTxt: { fontFamily: 'Barlow_700Bold', fontSize: 16 },
  clientTitle: { fontFamily: 'Barlow_800ExtraBold', fontSize: 20, letterSpacing: -0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusLive: { fontFamily: 'Barlow_700Bold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  statusMuted: { fontFamily: 'Barlow_600SemiBold', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  joinFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  joinFullTxt: { fontFamily: 'Barlow_800ExtraBold', fontSize: 15, letterSpacing: 2 },
  cancelLink: { alignItems: 'center', paddingBottom: 12 },
  hint: { fontFamily: 'Barlow_400Regular', fontSize: 13, marginBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(17) },
  emptySub: { fontFamily: 'Barlow_400Regular', fontSize: 14, textAlign: 'center' },

  pastToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: 1,
  },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  pastLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pastTime: { fontFamily: 'Barlow_600SemiBold', fontSize: 13, width: 52 },
  pastName: { fontFamily: 'Barlow_700Bold', fontSize: 14, flex: 1 },
  pastStatus: { fontFamily: 'Barlow_600SemiBold', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
});
