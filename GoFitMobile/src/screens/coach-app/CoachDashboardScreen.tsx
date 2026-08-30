import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  Calendar,
  Bell,
  Clock,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Package,
  Sun,
  Cloud,
  Flame,
  CloudRain,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCoachStore } from '@/store/coachStore';
import { useBookingsStore } from '@/store/bookingsStore';
import { usePacksStore } from '@/store/packsStore';
import { checkInsService } from '@/services/checkIns';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor, getGlassBorder } from '@/utils/colorUtils';
import { resolvePublicAvatarUrl } from '@/utils/avatarUrl';
import { supabase } from '@/config/supabase';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { Shimmer } from '@/components/shared/Shimmer';
import { useWalletStore } from '@/stores/walletStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Matches Tailwind reference: background / surface / primary / muted / border-glow */
const REF = {
  background: '#0a0a0a',
  surface: '#161616',
  primary: '#a3e635',
  muted: '#6b7280',
  borderGlow: 'rgba(163, 230, 53, 0.30)',
  amber: '#fbbf24',
  amberBg: 'rgba(245, 158, 11, 0.1)',
  purple: '#c084fc',
  purpleBg: 'rgba(168, 85, 247, 0.1)',
  primaryTintBg: 'rgba(163, 230, 53, 0.1)',
} as const;

const GRID_GAP = 14;
const H_PAD = 22;
const CARD_RADIUS = 24;
const CONTENT_INNER = SCREEN_WIDTH - H_PAD * 2;
const CARD_W = Math.floor((CONTENT_INNER - GRID_GAP) / 2);
type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Stats {
  total: number;
  upcoming: number;
  completed: number;
  clients: number;
  packs: number;
  rating: number;
  reviews: number;
  weekSessions: number;
  monthlyRev: number;
  hoursMonth: number;
  loadFactor: number;
  retention: number;
}

const GlassPanel: React.FC<{
  children: React.ReactNode;
  isDark: boolean;
  style?: any;
  activeOpacity?: number;
  onPress?: () => void;
  accessibilityRole?: 'button';
  accessibilityLabel?: string;
}> = ({ children, isDark, style, activeOpacity = 0.88, onPress, accessibilityRole, accessibilityLabel }) => {
  const Shell: any = onPress ? TouchableOpacity : View;

  return (
    <Shell
      style={[
        s.glassShell,
        {
          backgroundColor: isDark ? 'rgba(10, 10, 10, 0.4)' : 'rgba(255, 255, 255, 0.7)',
          borderColor: getGlassBorder(isDark),
        },
        style,
      ]}
      activeOpacity={onPress ? activeOpacity : undefined}
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']
            : ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)']
        }
        style={StyleSheet.absoluteFill}
      />
      {children}
    </Shell>
  );
};

const DashboardSkeleton: React.FC<{ cardH: number }> = ({ cardH }) => (
  <View style={{ gap: 16, paddingHorizontal: H_PAD }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Shimmer width={200} height={72} borderRadius={16} />
      <Shimmer width={40} height={40} borderRadius={20} />
    </View>
    <View style={{ flexDirection: 'row', gap: GRID_GAP, justifyContent: 'center' }}>
      <Shimmer width={CARD_W} height={cardH} borderRadius={CARD_RADIUS} />
      <Shimmer width={CARD_W} height={cardH} borderRadius={CARD_RADIUS} />
    </View>
    <Shimmer width="100%" height={88} borderRadius={CARD_RADIUS} />
    <Shimmer width="100%" height={88} borderRadius={CARD_RADIUS} />
    <Shimmer width="100%" height={180} borderRadius={CARD_RADIUS} />
    <Shimmer width="100%" height={120} borderRadius={CARD_RADIUS} />
  </View>
);

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatK(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${Math.round(n)}`;
}

export const CoachDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const { profile, loadProfile } = useCoachStore();
  const { coachBookings, loadCoachBookings } = useBookingsStore();
  const { myPacks, loadMyPacks } = usePacksStore();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { profile: userProfile, profilePictureUri, loadProfile: loadUserProfile } = useProfileStore();

  const [stats, setStats] = useState<Stats>({
    total: 0,
    upcoming: 0,
    completed: 0,
    clients: 0,
    packs: 0,
    rating: 0,
    reviews: 0,
    weekSessions: 0,
    monthlyRev: 0,
    hoursMonth: 0,
    loadFactor: 0,
    retention: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [atRiskPacks, setAtRiskPacks] = useState<
    { clientId: string; name: string; sessionsLeft: number }[]
  >([]);
  const [lowCheckIns, setLowCheckIns] = useState<any[]>([]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;

  const u = isDark;
  const dashBg = u ? REF.background : getBackgroundColor(isDark);
  const dashCard = u ? REF.surface : colors.surface;
  const textPri = u ? '#ffffff' : colors.text;
  const textMuted = u ? REF.muted : colors.textLight;
  const neon = u ? REF.primary : colors.primary;
  const headerAvatarUri = resolvePublicAvatarUrl(profilePictureUri ?? null);

  const meta = (user?.user_metadata || {}) as Record<string, unknown>;
  const resolvedName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
    (userProfile?.display_name && String(userProfile.display_name).trim()) ||
    user?.email?.split('@')[0]?.trim() ||
    '';
  const firstName = resolvedName.split(' ')[0] || t('coachApp.coachNameFallback', { defaultValue: 'Coach' });

  const [weather, setWeather] = useState<{ temp: number; code: number; location: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
        );
        const data = await res.json();
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        const city = geocode[0]?.city || geocode[0]?.region || '';
        if (data.current_weather) {
          setWeather({
            temp: Math.round(data.current_weather.temperature),
            code: data.current_weather.weathercode,
            location: city,
          });
        }
      } catch { /* weather is optional */ }
    })();
  }, []);

  const getWeatherIcon = (code: number) => {
    const sz = 13;
    if (code === 0 || code === 1) return <Sun size={sz} color={neon} strokeWidth={2.2} />;
    if (code >= 51 && code <= 67) return <CloudRain size={sz} color={neon} strokeWidth={2.2} />;
    return <Cloud size={sz} color={neon} strokeWidth={2.2} />;
  };

  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const todaySessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return coachBookings
      .filter(b => {
        const d = new Date(b.scheduled_at);
        return d >= today && d < tomorrow && b.status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [coachBookings]);

  const pendingBookings = useMemo(
    () => coachBookings.filter(b => b.status === 'pending'),
    [coachBookings],
  );

  const nextSessionBooking = useMemo(() => {
    const now = new Date();
    return coachBookings
      .filter(b => b.status !== 'cancelled' && new Date(b.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0] ?? null;
  }, [coachBookings]);

  /** Client with the longest gap since last completed session (follow-up nudge). */
  const clientSpotlight = useMemo(() => {
    const now = new Date();
    const byClient = new Map<
      string,
      { name: string; picture: string | null | undefined; lastCompleted: number }
    >();
    for (const b of coachBookings) {
      if (b.status === 'cancelled' || b.status !== 'completed') continue;
      const t = new Date(b.scheduled_at).getTime();
      const prev = byClient.get(b.client_id);
      const name = (b.client_name && b.client_name.trim()) || prev?.name || 'Client';
      const lastCompleted = prev ? Math.max(prev.lastCompleted, t) : t;
      const picture = b.client_profile_picture_url ?? prev?.picture;
      byClient.set(b.client_id, { name, picture, lastCompleted });
    }
    let best: { clientId: string; name: string; picture: string | null | undefined; daysSince: number } | null =
      null;
    for (const [clientId, v] of byClient) {
      const daysSince = Math.floor((now.getTime() - v.lastCompleted) / 86400000);
      if (!best || daysSince > best.daysSince) {
        best = { clientId, name: v.name, picture: v.picture, daysSince };
      }
    }
    return best;
  }, [coachBookings]);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [_, __, ___, lowCheckInsRes] = await Promise.all([
        loadCoachBookings(profile.id),
        loadMyPacks(profile.id),
        useWalletStore.getState().loadEarningsSummary(),
        checkInsService.getRecentLowCheckInsForCoach(profile.id),
      ]);
      setLowCheckIns(lowCheckInsRes || []);
      const bookings = useBookingsStore.getState().coachBookings;
      const packs = usePacksStore.getState().myPacks;
      const earnings = useWalletStore.getState().earningsSummary;

      const { data: reviews } = await supabase.from('coach_reviews').select('rating').eq('coach_id', profile.id);
      const now = new Date();
      const sow = startOfWeekMonday(now);
      const eow = new Date(sow);
      eow.setDate(sow.getDate() + 7);

      const som = new Date(now.getFullYear(), now.getMonth(), 1);

      const weekCount = bookings.filter(b => {
        const d = new Date(b.scheduled_at);
        return d >= sow && d < eow && b.status !== 'cancelled';
      }).length;

      const hoursMonth = bookings
        .filter(b => b.status === 'completed' && new Date(b.scheduled_at) >= som)
        .reduce((s, b) => s + (b.duration_minutes || 0), 0);

      const all = bookings;
      const avg = reviews?.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;
      const completed = all.filter(b => b.status === 'completed').length;
      const totalNonCancelled = all.filter(b => b.status !== 'cancelled').length;
      const loadFactor =
        totalNonCancelled > 0 ? Math.min(100, Math.round((completed / totalNonCancelled) * 100)) : 0;
      const retention = avg > 0 ? Math.min(100, Math.round((avg / 5) * 100)) : loadFactor;

      setStats({
        total: all.length,
        upcoming: all.filter(b => new Date(b.scheduled_at) > now && b.status !== 'cancelled').length,
        completed,
        clients: new Set(all.filter(b => b.status !== 'cancelled').map(b => b.client_id)).size,
        packs: packs.filter(p => p.is_active).length,
        rating: Math.round(avg * 10) / 10,
        reviews: reviews?.length || 0,
        weekSessions: weekCount,
        monthlyRev: earnings?.thisMonth ?? 0,
        hoursMonth: Math.round(hoursMonth / 60),
        loadFactor,
        retention,
      });

      const { data: lowPacks } = await supabase
        .from('purchased_packs')
        .select('client_id, sessions_remaining')
        .eq('coach_id', profile.id)
        .eq('status', 'active')
        .lte('sessions_remaining', 2);

      if (lowPacks?.length) {
        const nameMap = new Map<string, string>();
        for (const b of bookings) {
          if (b.client_name) nameMap.set(b.client_id, b.client_name);
        }
        setAtRiskPacks(
          lowPacks.map(p => ({
            clientId: String(p.client_id),
            name: nameMap.get(String(p.client_id)) || 'Client',
            sessionsLeft: Number(p.sessions_remaining),
          })),
        );
      } else {
        setAtRiskPacks([]);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [profile?.id, loadCoachBookings, loadMyPacks]);

  useEffect(() => {
    loadProfile();
    loadUserProfile();
  }, []);
  useEffect(() => {
    if (profile?.id) load();
  }, [profile?.id]);
  useEffect(() => {
    if (!loading) Animated.spring(enterAnim, { toValue: 1, useNativeDriver: true, tension: 40, friction: 7 }).start();
  }, [loading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile(true);
    await loadUserProfile(true);
    await load();
    setRefreshing(false);
  };

  const revStr =
    stats.monthlyRev >= 1000 ? `$${formatK(stats.monthlyRev)}` : `$${Math.round(stats.monthlyRev)}`;

  const ratingStr = stats.rating > 0 ? stats.rating.toFixed(1) : 'N/A';

  const aEnter = {
    opacity: enterAnim,
    transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };

  const avatarLetter = firstName.charAt(0).toUpperCase() || 'C';
  const statCardMinH = 128;
  const earnings = useWalletStore((s) => s.earningsSummary);
  const commandStats = [
    {
      icon: 'calendar-week' as MaterialIconName,
      label: t('coachApp.kpiSessionsWeekly', { defaultValue: 'Sessions Weekly' }),
      value: String(stats.weekSessions),
      color: REF.primary,
      bg: REF.primaryTintBg,
    },
    {
      icon: 'account-group-outline' as MaterialIconName,
      label: t('coachApp.kpiActiveClients', { defaultValue: 'Active Clients' }),
      value: String(stats.clients),
      color: REF.primary,
      bg: REF.primaryTintBg,
    },
    {
      icon: 'chart-line-variant' as MaterialIconName,
      label: t('coachApp.kpiMonthlyRev', { defaultValue: 'Monthly Rev' }),
      value: revStr,
      color: REF.amber,
      bg: REF.amberBg,
    },
  ];
  const commandSignals = [
    {
      label: t('coachApp.kpiUpcoming', { defaultValue: 'Upcoming' }),
      value: String(stats.upcoming),
    },
    {
      label: t('coachApp.kpiAvgRating', { defaultValue: 'Avg Rating' }),
      value: ratingStr,
    },
    {
      label: t('coachApp.kpiTotalReviews', { defaultValue: 'Total Reviews' }),
      value: String(stats.reviews),
    },
  ];

  return (
    <View style={[s.root, { backgroundColor: dashBg }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 110,
          gap: 24,
        }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={neon} />}
      >
        {loading ? (
          <DashboardSkeleton cardH={statCardMinH} />
        ) : (
          <>
            {/* Header: client-style avatar, greeting, and bell */}
            <Animated.View style={[s.headerRow, { paddingHorizontal: H_PAD }, aEnter]}>
              <TouchableOpacity
                onPress={() => nav.getParent()?.navigate('CoachProfile')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('coachApp.openProfile', { defaultValue: 'Profile' })}
                style={s.avatarBtn}
              >
                <View style={u ? s.avatarGlow : s.avatarRingPlain}>
                  {headerAvatarUri ? (
                    <ExpoImage source={{ uri: headerAvatarUri }} style={s.avatarImg} contentFit="cover" />
                  ) : (
                    <View style={[s.avatarFallback, { backgroundColor: dashCard }]}>
                      <Text style={[s.avatarLetter, { color: neon }]}>{avatarLetter}</Text>
                    </View>
                  )}
                </View>
                <View style={[s.onlineIndicator, { borderColor: dashBg }]} />
              </TouchableOpacity>

              <View style={s.greetingBlock}>
                <Text
                  style={[s.helloText, { color: textPri }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {t('coachApp.hello', { defaultValue: 'Hello' })} {firstName}
                </Text>
                <Text style={[s.subGreeting, { color: textMuted }]}>
                  {t('coachApp.getReadyForToday', { defaultValue: 'Get ready for today' })}
                </Text>
              </View>

              <TouchableOpacity
                style={[s.bellBtn, { backgroundColor: dashCard, borderColor: u ? 'rgba(255,255,255,0.08)' : colors.border }]}
                onPress={() => nav.navigate('NotificationInbox')}
                accessibilityRole="button"
                accessibilityLabel={t('notifications.title', { defaultValue: 'Notifications' })}
              >
                <Bell size={20} color={textPri} strokeWidth={2} />
                <View style={s.notifDot} />
              </TouchableOpacity>
            </Animated.View>

            {/* Date + stat chips (like client home) */}
            <Animated.View style={[{ paddingHorizontal: H_PAD }, aEnter]}>
              <Text style={[s.dateText, { color: neon }]}>{currentDate}</Text>
              <View style={s.chipRow}>
                <View style={[s.chip, { backgroundColor: isDark ? 'rgba(10, 10, 10, 0.4)' : 'rgba(255, 255, 255, 0.7)', borderColor: getGlassBorder(isDark) }]}>
                  <Calendar size={13} color={neon} strokeWidth={2.2} />
                  <Text style={[s.chipText, { color: textMuted }]}>
                    {stats.weekSessions} {t('coachApp.sessions', { defaultValue: 'Sessions' })}
                  </Text>
                </View>
                <View style={[s.chip, { backgroundColor: isDark ? 'rgba(10, 10, 10, 0.4)' : 'rgba(255, 255, 255, 0.7)', borderColor: getGlassBorder(isDark) }]}>
                  <Users size={13} color={neon} strokeWidth={2.2} />
                  <Text style={[s.chipText, { color: textMuted }]}>
                    {stats.clients} {t('coachApp.clients', { defaultValue: 'Clients' })}
                  </Text>
                </View>
                {weather && (
                  <View style={[s.chip, { backgroundColor: isDark ? 'rgba(10, 10, 10, 0.4)' : 'rgba(255, 255, 255, 0.7)', borderColor: getGlassBorder(isDark) }]}>
                    {getWeatherIcon(weather.code)}
                    <Text style={[s.chipText, { color: textMuted }]} numberOfLines={1}>
                      {weather.temp} C {weather.location}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>

            <Animated.View style={[{ paddingHorizontal: H_PAD, gap: 24 }, aEnter]}>
              <GlassPanel isDark={isDark} style={s.commandCard}>
                <View style={s.commandHeader}>
                  <View style={s.commandTitleBlock}>
                    <Text style={[s.commandEyebrow, { color: textMuted }]}>
                      {t('coachApp.dashboard', { defaultValue: 'Dashboard' }).toUpperCase()}
                    </Text>
                    <Text style={[s.commandTitle, { color: textPri }]}>
                      {t('coachApp.todayOverview', { defaultValue: 'Today overview' })}
                    </Text>
                  </View>
                  <View style={[s.commandBadge, { borderColor: getGlassBorder(isDark), backgroundColor: REF.primaryTintBg }]}>
                    <MaterialCommunityIcons name="calendar-check-outline" size={15} color={neon} />
                    <Text style={[s.commandBadgeText, { color: neon }]}>
                      {todaySessions.length}
                    </Text>
                  </View>
                </View>

                <View style={s.commandStatsRow}>
                  {commandStats.map(({ icon, label, value, color, bg }) => (
                    <View key={label} style={s.commandStat}>
                      <View style={[s.commandIconWell, { backgroundColor: bg }]}>
                        <MaterialCommunityIcons name={icon} size={18} color={color} />
                      </View>
                      <Text style={[s.commandStatValue, { color: textPri }]} numberOfLines={1} adjustsFontSizeToFit>
                        {value}
                      </Text>
                      <Text style={[s.commandStatLabel, { color: textMuted }]} numberOfLines={1}>
                        {label.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={[s.commandDivider, { backgroundColor: getGlassBorder(isDark) }]} />

                <View style={s.commandSignalsRow}>
                  {commandSignals.map((signal) => (
                    <View key={signal.label} style={s.commandSignal}>
                      <Text style={[s.commandSignalValue, { color: textPri }]}>{signal.value}</Text>
                      <Text style={[s.commandSignalLabel, { color: textMuted }]} numberOfLines={1}>
                        {signal.label.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              </GlassPanel>

              {/* Next session */}
              <GlassPanel
                isDark={isDark}
                style={s.insightCard}
                onPress={() => nav.getParent()?.navigate('Calendar', { screen: 'CalendarMain' })}
                accessibilityRole="button"
                accessibilityLabel={t('coachApp.nextSession', { defaultValue: 'Next session' })}
              >
                <View style={[s.insightIconWell, { backgroundColor: REF.primaryTintBg }]}>
                  <Clock size={20} color={REF.primary} strokeWidth={2.2} />
                </View>
                <View style={s.insightBody}>
                  <Text style={[s.insightKicker, { color: textMuted }]}>
                    {t('coachApp.nextSession', { defaultValue: 'Next session' }).toUpperCase()}
                  </Text>
                  {nextSessionBooking ? (
                    <>
                      <Text style={[s.insightTitle, { color: textPri }]} numberOfLines={1}>
                        {nextSessionBooking.client_name?.trim() ||
                          t('coachApp.client', { defaultValue: 'Client' })}
                      </Text>
                      <Text style={[s.insightMeta, { color: textMuted }]} numberOfLines={1}>
                        {new Date(nextSessionBooking.scheduled_at).toLocaleString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {nextSessionBooking.duration_minutes
                          ? ` ${nextSessionBooking.duration_minutes} min`
                          : ''}
                      </Text>
                    </>
                  ) : (
                    <Text style={[s.insightTitle, { color: textMuted }]}>
                      {t('coachApp.noUpcomingSessions', { defaultValue: 'No upcoming sessions' })}
                    </Text>
                  )}
                </View>
                <ChevronRight size={22} color={textMuted} strokeWidth={2} />
              </GlassPanel>
              {/* Wellness Alerts */}
              {lowCheckIns.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: textPri, marginBottom: 12 }}>
                    Wellness Alerts
                  </Text>
                  {lowCheckIns.map(checkIn => (
                    <GlassPanel
                      key={checkIn.id}
                      isDark={isDark}
                      style={[s.insightCard, { marginBottom: 8, borderColor: '#FF4B4B' }]}
                      onPress={() => nav.navigate('ClientManagement', { screen: 'ClientDetail', params: { clientId: checkIn.client_id, clientName: checkIn.user_profiles?.display_name || 'Client' } })}
                    >
                      <View style={[s.insightIconWell, { backgroundColor: 'rgba(255, 75, 75, 0.15)' }]}>
                        <Flame size={20} color="#FF4B4B" strokeWidth={2.2} />
                      </View>
                      <View style={[s.insightBody, { marginLeft: 12 }]}>
                        <Text style={[s.insightTitle, { color: textPri }]} numberOfLines={1}>
                          {checkIn.user_profiles?.display_name || 'Client'}
                        </Text>
                        <Text style={[s.insightMeta, { color: '#FF4B4B' }]} numberOfLines={1}>
                          Low mood or energy reported recently
                        </Text>
                      </View>
                      <ChevronRight size={18} color={textMuted} />
                    </GlassPanel>
                  ))}
                </View>
              )}



              {/* Client spotlight: longest since last completed session */}
              {clientSpotlight ? (
                <GlassPanel
                  isDark={isDark}
                  style={s.insightCard}
                  onPress={() =>
                    nav.getParent()?.navigate('Clients', {
                      screen: 'ClientDetail',
                      params: {
                        clientId: clientSpotlight.clientId,
                        clientName: clientSpotlight.name,
                      },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={t('coachApp.clientSpotlight', { defaultValue: 'Client spotlight' })}
                >
                  <View style={[s.insightIconWell, { backgroundColor: REF.purpleBg }]}>
                    <Sparkles size={20} color={REF.purple} strokeWidth={2.2} />
                  </View>
                  <View style={s.insightBody}>
                    <Text style={[s.insightKicker, { color: textMuted }]}>
                      {t('coachApp.clientSpotlight', { defaultValue: 'Client spotlight' }).toUpperCase()}
                    </Text>
                    <Text style={[s.insightTitle, { color: textPri }]} numberOfLines={1}>
                      {clientSpotlight.name}
                    </Text>
                    <Text style={[s.insightMeta, { color: textMuted }]} numberOfLines={1}>
                      {clientSpotlight.daysSince === 0
                        ? t('coachApp.spotlightLastSessionToday', {
                            defaultValue: 'Last session today. Check in',
                          })
                        : t('coachApp.spotlightLastSessionDays', {
                            defaultValue: 'Last session {{days}} days ago. Check in',
                            days: clientSpotlight.daysSince,
                          })}
                    </Text>
                  </View>
                  <ChevronRight size={22} color={textMuted} strokeWidth={2} />
                </GlassPanel>
              ) : null}

              {/* Today's Schedule */}
              <GlassPanel isDark={isDark} style={s.sectionCard}>
                <View style={s.sectionTitleRow}>
                  <View style={[s.titlePill, { backgroundColor: neon }]} />
                  <Text style={[s.sectionTitle, { color: textPri }]}>
                    {t('coachApp.todaysSchedule', { defaultValue: "Today's Schedule" })}
                  </Text>
                  <Text style={[s.sectionCount, { color: textMuted }]}>
                    {todaySessions.length}
                  </Text>
                </View>
                {todaySessions.length === 0 ? (
                  <View style={s.emptyRow}>
                    <Calendar size={18} color={textMuted} strokeWidth={2} />
                    <Text style={[s.emptyText, { color: textMuted }]}>
                      {t('coachApp.noSessionsToday', {
                        defaultValue: 'No sessions today. Update availability?',
                      })}
                    </Text>
                  </View>
                ) : (
                  todaySessions.slice(0, 5).map((session, idx) => {
                    const time = new Date(session.scheduled_at).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    });
                    const isPending = session.status === 'pending';
                    return (
                      <TouchableOpacity
                        key={session.id}
                        style={[
                          s.scheduleRow,
                          idx < todaySessions.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: u ? 'rgba(255,255,255,0.04)' : colors.border,
                          },
                        ]}
                        activeOpacity={0.8}
                        onPress={() =>
                          nav.getParent()?.navigate('Calendar', { screen: 'CalendarMain' })
                        }
                      >
                        <Text style={[s.scheduleTime, { color: neon }]}>{time}</Text>
                        <View style={s.scheduleInfo}>
                          <Text style={[s.scheduleName, { color: textPri }]} numberOfLines={1}>
                            {session.client_name?.trim() ||
                              t('coachApp.client', { defaultValue: 'Client' })}
                          </Text>
                          {session.duration_minutes ? (
                            <Text style={[s.scheduleDur, { color: textMuted }]}>
                              {session.duration_minutes} min
                            </Text>
                          ) : null}
                        </View>
                        <View
                          style={[
                            s.statusPill,
                            {
                              backgroundColor: isPending ? REF.amberBg : REF.primaryTintBg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.statusPillText,
                              { color: isPending ? REF.amber : REF.primary },
                            ]}
                          >
                            {isPending
                              ? t('coachApp.pending', { defaultValue: 'Pending' })
                              : t('coachApp.confirmed', { defaultValue: 'Confirmed' })}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </GlassPanel>

              {/* Pending Requests */}
              {pendingBookings.length > 0 && (
                <GlassPanel
                  isDark={isDark}
                  style={s.insightCard}
                  onPress={() =>
                    nav.getParent()?.navigate('Calendar', { screen: 'CalendarMain' })
                  }
                  accessibilityRole="button"
                >
                  <View style={[s.insightIconWell, { backgroundColor: REF.amberBg }]}>
                    <AlertCircle size={20} color={REF.amber} strokeWidth={2.2} />
                  </View>
                  <View style={s.insightBody}>
                    <Text style={[s.insightKicker, { color: REF.amber }]}>
                      {t('coachApp.pendingRequests', {
                        defaultValue: 'PENDING REQUESTS',
                      })}
                    </Text>
                    <Text style={[s.insightTitle, { color: textPri }]}>
                      {pendingBookings.length}{' '}
                      {pendingBookings.length === 1
                        ? t('coachApp.bookingWaiting', {
                            defaultValue: 'booking waiting for confirmation',
                          })
                        : t('coachApp.bookingsWaiting', {
                            defaultValue: 'bookings waiting for confirmation',
                          })}
                    </Text>
                  </View>
                  <ChevronRight size={22} color={REF.amber} strokeWidth={2} />
                </GlassPanel>
              )}

              {/* Earnings Snapshot */}
              <GlassPanel isDark={isDark} style={s.earningsCard}>
                <View style={s.sectionTitleRow}>
                  <View style={[s.titlePill, { backgroundColor: REF.amber }]} />
                  <Text style={[s.sectionTitle, { color: textPri }]}>
                    {t('coachApp.earnings', { defaultValue: 'Earnings' })}
                  </Text>
                </View>
                <View style={s.earningsRow}>
                  <View style={s.earningsCol}>
                    <Text style={[s.earningsLabel, { color: textMuted }]}>
                      {t('coachApp.thisWeek', { defaultValue: 'This Week' }).toUpperCase()}
                    </Text>
                    <Text style={[s.earningsValue, { color: textPri }]}>
                      ${Math.round(earnings?.thisWeek ?? 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={[s.earningsDivider, { backgroundColor: u ? 'rgba(255,255,255,0.06)' : colors.border }]} />
                  <View style={s.earningsCol}>
                    <Text style={[s.earningsLabel, { color: textMuted }]}>
                      {t('coachApp.thisMonth', { defaultValue: 'This Month' }).toUpperCase()}
                    </Text>
                    <Text style={[s.earningsValue, { color: textPri }]}>
                      ${Math.round(earnings?.thisMonth ?? 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={[s.earningsDivider, { backgroundColor: u ? 'rgba(255,255,255,0.06)' : colors.border }]} />
                  <View style={s.earningsCol}>
                    <Text style={[s.earningsLabel, { color: textMuted }]}>
                      {t('coachApp.allTime', { defaultValue: 'All Time' }).toUpperCase()}
                    </Text>
                    <Text style={[s.earningsValue, { color: textPri }]}>
                      ${Math.round(earnings?.allTime ?? 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </GlassPanel>

              {/* At-Risk Clients: packs running low */}
              {atRiskPacks.length > 0 && (
                <GlassPanel
                  isDark={isDark}
                  style={s.insightCard}
                  onPress={() => nav.getParent()?.navigate('Clients', { screen: 'ClientsList' })}
                  accessibilityRole="button"
                >
                  <View style={[s.insightIconWell, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                    <Package size={20} color="#ef4444" strokeWidth={2.2} />
                  </View>
                  <View style={s.insightBody}>
                    <Text style={[s.insightKicker, { color: '#ef4444' }]}>
                      {t('coachApp.packsRunningLow', { defaultValue: 'PACKS RUNNING LOW' })}
                    </Text>
                    <Text style={[s.insightTitle, { color: textPri }]}>
                      {atRiskPacks.length}{' '}
                      {atRiskPacks.length === 1
                        ? t('coachApp.clientLowSessions', {
                            defaultValue: 'client has 1-2 sessions left',
                          })
                        : t('coachApp.clientsLowSessions', {
                            defaultValue: 'clients have 1-2 sessions left',
                          })}
                    </Text>
                    <Text style={[s.insightMeta, { color: textMuted }]} numberOfLines={1}>
                      {atRiskPacks
                        .slice(0, 3)
                        .map(p => p.name)
                        .join(', ')}
                    </Text>
                  </View>
                  <ChevronRight size={22} color="#ef4444" strokeWidth={2} />
                </GlassPanel>
              )}
            </Animated.View>
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  glassShell: {
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatarBtn: { marginRight: 14, position: 'relative' },
  avatarGlow: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: 'rgba(163, 230, 53, 0.4)',
    overflow: 'hidden',
    shadowColor: REF.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  avatarRingPlain: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: 'rgba(163, 230, 53, 0.4)',
    overflow: 'hidden',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4ade80',
    borderWidth: 2,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontFamily: 'Barlow_800ExtraBold', fontSize: 22 },
  greetingBlock: { flex: 1, justifyContent: 'center', paddingRight: 10 },
  helloText: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(28),
    letterSpacing: 0.5,
  },
  subGreeting: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    marginTop: 2,
  },
  bellBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 13,
    right: 13,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4757',
  },
  dateText: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: getResponsiveSpacing(8),
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  chipText: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(11),
  },

  commandCard: {
    borderRadius: CARD_RADIUS,
    padding: getResponsiveSpacing(20),
    gap: getResponsiveSpacing(18),
  },
  commandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  commandTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  commandEyebrow: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(10),
    letterSpacing: 0.5,
  },
  commandTitle: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(19),
    letterSpacing: 0.5,
    marginTop: 6,
  },
  commandBadge: {
    minWidth: 56,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  commandBadgeText: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(13),
  },
  commandStatsRow: {
    flexDirection: 'row',
    gap: getResponsiveSpacing(10),
  },
  commandStat: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  commandIconWell: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commandStatValue: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(21),
    lineHeight: getResponsiveFontSize(25),
    letterSpacing: 0,
  },
  commandStatLabel: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(9),
    letterSpacing: 0.5,
  },
  commandDivider: {
    height: 1,
    opacity: 0.8,
  },
  commandSignalsRow: {
    flexDirection: 'row',
    gap: getResponsiveSpacing(10),
  },
  commandSignal: {
    flex: 1,
    minWidth: 0,
  },
  commandSignalValue: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(14),
    letterSpacing: 0,
  },
  commandSignalLabel: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(9),
    letterSpacing: 0.5,
    marginTop: 5,
  },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: CARD_RADIUS,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 14,
  },
  insightIconWell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBody: { flex: 1, minWidth: 0, gap: 4 },
  insightKicker: { fontFamily: 'Designer', fontSize: getResponsiveFontSize(10), letterSpacing: 0.5 },
  insightTitle: { fontFamily: 'Designer', fontSize: getResponsiveFontSize(14), letterSpacing: 0 },
  insightMeta: { fontFamily: 'Designer', fontSize: getResponsiveFontSize(11) },
  sectionCard: {
    borderRadius: CARD_RADIUS,
    padding: getResponsiveSpacing(20),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  titlePill: { width: 3, height: 20, borderRadius: 99 },
  sectionTitle: { fontFamily: 'Designer', fontSize: getResponsiveFontSize(17), flex: 1, letterSpacing: 0.5 },
  sectionCount: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(12),
    backgroundColor: 'rgba(255,255,255,0.06)',
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },

  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  emptyText: { fontFamily: 'Designer', fontSize: getResponsiveFontSize(11), flex: 1 },

  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  scheduleTime: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(12),
    width: 64,
    letterSpacing: 0,
  },
  scheduleInfo: { flex: 1, minWidth: 0, gap: 2 },
  scheduleName: { fontFamily: 'Designer', fontSize: getResponsiveFontSize(12) },
  scheduleDur: { fontFamily: 'Designer', fontSize: getResponsiveFontSize(10) },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusPillText: { fontFamily: 'Designer', fontSize: getResponsiveFontSize(9), letterSpacing: 0.3 },

  earningsCard: {
    borderRadius: CARD_RADIUS,
    padding: getResponsiveSpacing(20),
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsCol: { flex: 1, alignItems: 'center', gap: 6 },
  earningsDivider: { width: 1, height: 40, borderRadius: 1 },
  earningsLabel: { fontFamily: 'Designer', fontSize: getResponsiveFontSize(9), letterSpacing: 0.5 },
  earningsValue: { fontFamily: 'Designer', fontSize: getResponsiveFontSize(18), letterSpacing: 0 },
});
