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
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  CalendarDays,
  Wallet,
  TrendingUp,
  Timer,
  ShieldCheck,
  Settings,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import { useCoachStore } from '@/store/coachStore';
import { useBookingsStore } from '@/store/bookingsStore';
import { usePacksStore } from '@/store/packsStore';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor } from '@/utils/colorUtils';
import { resolvePublicAvatarUrl } from '@/utils/avatarUrl';
import { supabase } from '@/config/supabase';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { Shimmer } from '@/components/shared/Shimmer';
import { useWalletStore } from '@/stores/walletStore';
import { COACH_UI } from '@/theme/coachStitch';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_H = 148;
const RING_SIZE = 120;
const RING_STROKE = 9;
const R = (RING_SIZE - RING_STROKE) / 2;
const CIRC = 2 * Math.PI * R;

/** Reference UI: neon lime on near-black (Lucide icons only — no emoji). */
const DASH = {
  bg: '#000000',
  card: '#161616',
  neon: '#a3e635',
  gridLine: 'rgba(255,255,255,0.06)',
  tile: {
    clients: '#22c55e',
    sessions: '#a855f7',
    revenue: '#ea580c',
    load: '#dc2626',
    hours: '#404040',
    retention: '#22c55e',
  },
} as const;

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

const GRID_GAP = 12;
const H_PAD = 22;
const CARD_RADIUS = 26;
const CARD_W = (SCREEN_WIDTH - H_PAD * 2 - GRID_GAP) / 2;

const DashboardSkeleton: React.FC<{ cardH: number }> = ({ cardH }) => (
  <View style={{ gap: 14, paddingHorizontal: H_PAD }}>
    <Shimmer width="100%" height={52} borderRadius={14} />
    <Shimmer width="70%" height={36} borderRadius={10} />
    <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
      <Shimmer width={CARD_W} height={cardH} borderRadius={CARD_RADIUS} />
      <Shimmer width={CARD_W} height={cardH} borderRadius={CARD_RADIUS} />
    </View>
    <Shimmer width="100%" height={210} borderRadius={CARD_RADIUS} />
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

type TileIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface KpiTile {
  Icon: TileIcon;
  val: string;
  label: string;
  circleBg: string;
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

  const scrollY = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;

  const u = isDark;
  const dashBg = u ? DASH.bg : getBackgroundColor(isDark);
  const dashCard = u ? DASH.card : colors.surface;
  const textPri = u ? COACH_UI.textPrimary : colors.text;
  const textSec = u ? COACH_UI.textSecondary : colors.textLight;
  const neon = u ? DASH.neon : colors.primary;
  const border = u ? '#262626' : colors.border;
  const barMuted = u ? '#2a2a2a' : String(colors.border);
  const headerAvatarUri = resolvePublicAvatarUrl(profilePictureUri ?? null);

  const meta = (user?.user_metadata || {}) as Record<string, unknown>;
  const coachRaw =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
    (userProfile?.display_name && String(userProfile.display_name).trim()) ||
    t('coachApp.coachNameFallback', { defaultValue: 'Coach' });
  const coachFallback = t('coachApp.coachNameFallback', { defaultValue: 'Coach' });
  const coachDisplayName =
    coachRaw === coachFallback
      ? coachRaw
      : coachRaw.toLowerCase().startsWith('coach')
        ? coachRaw
        : `Coach ${coachRaw}`;

  const weeklyMonSun = useMemo(() => {
    const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const start = startOfWeekMonday(new Date());
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days.map((day, i) => {
      const key = day.toDateString();
      const n = coachBookings.filter(b => {
        const sd = new Date(b.scheduled_at);
        return sd.toDateString() === key && b.status !== 'cancelled';
      }).length;
      return { label: labels[i], value: n, date: day };
    });
  }, [coachBookings]);

  const highlightBarIdx = useMemo(() => {
    const vals = weeklyMonSun.map(d => d.value);
    const maxV = Math.max(...vals, 0);
    if (maxV <= 0) return new Set<number>();
    const idxs = vals.map((v, i) => (v === maxV ? i : -1)).filter(i => i >= 0);
    if (idxs.length <= 2) return new Set(idxs);
    return new Set(idxs.slice(0, 2));
  }, [weeklyMonSun]);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    try {
      await Promise.all([
        loadCoachBookings(profile.id),
        loadMyPacks(profile.id),
        useWalletStore.getState().loadEarningsSummary(),
      ]);
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

  const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const revStr =
    stats.monthlyRev >= 1000 ? `$${formatK(stats.monthlyRev)}` : `$${Math.round(stats.monthlyRev)}`;

  const kpiTiles: KpiTile[] = useMemo(
    () => [
      {
        Icon: Users,
        val: String(stats.clients),
        label: t('coachApp.kpiActiveClients', { defaultValue: 'Active Clients' }),
        circleBg: DASH.tile.clients,
      },
      {
        Icon: CalendarDays,
        val: String(stats.weekSessions),
        label: t('coachApp.kpiSessionsWeekly', { defaultValue: 'Sessions Weekly' }),
        circleBg: DASH.tile.sessions,
      },
      {
        Icon: Wallet,
        val: revStr,
        label: t('coachApp.kpiMonthlyRev', { defaultValue: 'Monthly Rev' }),
        circleBg: DASH.tile.revenue,
      },
      {
        Icon: TrendingUp,
        val: `${stats.loadFactor}%`,
        label: t('coachApp.kpiLoadFactor', { defaultValue: 'Load Factor' }),
        circleBg: DASH.tile.load,
      },
      {
        Icon: Timer,
        val: String(stats.hoursMonth),
        label: t('coachApp.kpiHoursOnDeck', { defaultValue: 'Hours on Deck' }),
        circleBg: DASH.tile.hours,
      },
      {
        Icon: ShieldCheck,
        val: `${stats.retention}%`,
        label: t('coachApp.kpiRetention', { defaultValue: 'Retention' }),
        circleBg: DASH.tile.retention,
      },
    ],
    [stats, revStr, t],
  );

  const maxBar = Math.max(...weeklyMonSun.map(d => d.value), 1);
  const aEnter = {
    opacity: enterAnim,
    transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };

  const ringOffset = CIRC * (1 - completionPct / 100);

  const avatarLetter = coachRaw.charAt(0).toUpperCase() || 'C';
  const statCardMinH = 128;

  const openProfile = () => nav.getParent()?.navigate('CoachProfile');
  const openSettings = () => nav.getParent()?.navigate('CoachProfile', { screen: 'CoachSettings' });

  return (
    <View style={[s.root, { backgroundColor: dashBg }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 110 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={neon} />}
      >
        {loading ? (
          <DashboardSkeleton cardH={statCardMinH} />
        ) : (
          <>
            {/* Top bar: avatar | GOFIT COACH | settings (reference layout) */}
            <Animated.View style={[s.navBar, { paddingHorizontal: H_PAD }, aEnter]}>
              <View style={s.navSide}>
                <TouchableOpacity
                  onPress={openProfile}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t('coachApp.openProfile', { defaultValue: 'Profile' })}
                >
                  <View style={[s.navAvatarRing, { borderColor: neon }]}>
                    {headerAvatarUri ? (
                      <ExpoImage source={{ uri: headerAvatarUri }} style={s.navAvatarImg} contentFit="cover" />
                    ) : (
                      <View style={[s.navAvatarFallback, { backgroundColor: dashCard }]}>
                        <Text style={[s.navAvatarLetter, { color: neon }]}>{avatarLetter}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
              <Text style={[s.brandMark, { color: neon }]} numberOfLines={1}>
                GOFIT COACH
              </Text>
              <View style={[s.navSide, s.navSideRight]}>
                <TouchableOpacity
                  onPress={openSettings}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t('coachApp.settings', { defaultValue: 'Settings' })}
                >
                  <Settings size={26} color={neon} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View style={[{ paddingHorizontal: H_PAD, marginBottom: 22 }, aEnter]}>
              <Text style={[s.welcomeLbl, { color: textSec }]}>
                {t('coachApp.welcomeBack', { defaultValue: 'Welcome back,' }).toUpperCase()}
              </Text>
              <Text style={[s.heroName, { color: textPri }]} numberOfLines={2}>
                {coachDisplayName}
              </Text>
            </Animated.View>

            <Animated.View style={[s.grid, { paddingHorizontal: H_PAD }, aEnter]}>
              {kpiTiles.map((tile, i) => {
                const Icon = tile.Icon;
                return (
                  <View
                    key={i}
                    style={[
                      s.statCard,
                      {
                        backgroundColor: dashCard,
                        borderColor: border,
                        minHeight: statCardMinH,
                      },
                    ]}
                  >
                    <View style={[s.statIconCircle, { backgroundColor: tile.circleBg }]}>
                      <Icon size={20} color="#ffffff" strokeWidth={2.2} />
                    </View>
                    <Text style={[s.statVal, { color: textPri }]}>{tile.val}</Text>
                    <Text style={[s.statLbl, { color: textSec }]}>{tile.label.toUpperCase()}</Text>
                  </View>
                );
              })}
            </Animated.View>

            <Animated.View
              style={[
                s.chartCard,
                { backgroundColor: dashCard, borderColor: border, marginHorizontal: H_PAD },
                aEnter,
              ]}
            >
              <View style={s.sectionTitleRow}>
                <View style={[s.titleAccentPill, { backgroundColor: neon }]} />
                <Text style={[s.sectionTitle, { color: textPri }]}>
                  {t('coachApp.weeklyActivity', { defaultValue: 'Weekly Activity' })}
                </Text>
              </View>
              <View style={[s.chartArea, { height: CHART_H }]}>
                <View style={s.chartGrid} pointerEvents="none">
                  {[0, 1, 2, 3].map(i => (
                    <View key={i} style={[s.gridHLine, { backgroundColor: u ? DASH.gridLine : 'rgba(0,0,0,0.06)' }]} />
                  ))}
                </View>
                <View style={s.barsRow}>
                  {weeklyMonSun.map((d, i) => {
                    const h = (d.value / maxBar) * (CHART_H - 36);
                    const isHi = highlightBarIdx.has(i) && d.value > 0;
                    return (
                      <View key={i} style={s.barCol}>
                        <View
                          style={[
                            s.bar,
                            {
                              height: Math.max(10, h),
                              backgroundColor: isHi ? neon : barMuted,
                            },
                          ]}
                        />
                        <Text style={[s.barLbl, { color: textSec }]}>{d.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Animated.View>

            <Animated.View
              style={[
                s.summaryCard,
                { backgroundColor: dashCard, borderColor: border, marginHorizontal: H_PAD },
                aEnter,
              ]}
            >
              <View style={s.ringWrap}>
                <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={R}
                    stroke={border}
                    strokeWidth={RING_STROKE}
                    fill="none"
                  />
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={R}
                    stroke={neon}
                    strokeWidth={RING_STROKE}
                    fill="none"
                    strokeDasharray={`${CIRC}`}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                  />
                </Svg>
                <View style={s.ringCenter} pointerEvents="none">
                  <Text style={[s.ringPct, { color: textPri }]}>
                    {completionPct}
                    <Text style={s.ringPctSmall}>%</Text>
                  </Text>
                </View>
              </View>
              <View style={s.summaryRight}>
                <Text style={[s.summaryLbl, { color: textSec }]}>
                  {t('coachApp.totalSessions', { defaultValue: 'Total Sessions' }).toUpperCase()}
                </Text>
                <Text style={[s.summaryBig, { color: textPri }]}>
                  {stats.completed.toLocaleString()}
                </Text>
              </View>
            </Animated.View>
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  navSide: { width: 48, alignItems: 'flex-start' },
  navSideRight: { alignItems: 'flex-end' },
  navAvatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    overflow: 'hidden',
  },
  navAvatarImg: { width: '100%', height: '100%' },
  navAvatarFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navAvatarLetter: { fontFamily: 'Barlow_800ExtraBold', fontSize: 18 },
  brandMark: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(14),
    letterSpacing: 2.5,
  },
  welcomeLbl: { fontFamily: 'Barlow_600SemiBold', fontSize: 12, letterSpacing: 1.4, marginBottom: 6 },
  heroName: { fontFamily: 'Barlow_800ExtraBold', fontSize: getResponsiveFontSize(34), letterSpacing: -0.8, lineHeight: 40 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    width: CARD_W,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statVal: { fontFamily: 'Barlow_800ExtraBold', fontSize: 32, letterSpacing: -1.2, lineHeight: 36, marginTop: 10 },
  statLbl: { fontFamily: 'Barlow_700Bold', fontSize: 10, letterSpacing: 1.4, marginTop: 6 },

  chartCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    padding: 22,
    marginBottom: 16,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 12 },
  titleAccentPill: { width: 4, height: 20, borderRadius: 2 },
  sectionTitle: { fontFamily: 'Barlow_800ExtraBold', fontSize: getResponsiveFontSize(17), letterSpacing: 0.3 },
  chartArea: { position: 'relative', justifyContent: 'flex-end' },
  chartGrid: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 28,
    justifyContent: 'space-between',
  },
  gridHLine: { height: StyleSheet.hairlineWidth, minHeight: 1, width: '100%' },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barCol: { alignItems: 'center', gap: 10, flex: 1 },
  bar: { width: 14, borderRadius: 7, minHeight: 10 },
  barLbl: { fontFamily: 'Barlow_700Bold', fontSize: 10, letterSpacing: 0.2 },

  summaryCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  ringCenter: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  ringPct: { fontFamily: 'Barlow_800ExtraBold', fontSize: 30 },
  ringPctSmall: { fontSize: 14, opacity: 0.55 },
  summaryRight: { alignItems: 'flex-end', flex: 1, paddingLeft: 16 },
  summaryLbl: { fontFamily: 'Barlow_700Bold', fontSize: 10, letterSpacing: 1.5, marginBottom: 6 },
  summaryBig: { fontFamily: 'Barlow_800ExtraBold', fontSize: 38, letterSpacing: -1.2, lineHeight: 40 },
});
