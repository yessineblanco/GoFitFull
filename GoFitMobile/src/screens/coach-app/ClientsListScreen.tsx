import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Search, SlidersHorizontal, MoreVertical } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useClientManagementStore } from '@/store/clientManagementStore';
import { useCoachStore } from '@/store/coachStore';
import { useBookingsStore } from '@/store/bookingsStore';
import type { CoachClient } from '@/services/clientManagement';
import type { Booking } from '@/services/bookings';
import { getResponsiveFontSize } from '@/utils/responsive';
import { SkeletonClientRow } from '@/components/shared/Shimmer';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor } from '@/utils/colorUtils';
import { COACH_STITCH, coachStitchOr } from '@/theme/coachStitch';
import { CoachSubScreenBar } from '@/components/coach/CoachSubScreenBar';
import { resolvePublicAvatarUrl } from '@/utils/avatarUrl';

const AVATAR_COLORS: [string, string][] = [
  ['#a3e635', '#446900'],
  ['#29B6F6', '#0288D1'],
  ['#FFA726', '#F57C00'],
  ['#AB47BC', '#7B1FA2'],
  ['#26A69A', '#00796B'],
  ['#ddb7ff', '#6f00be'],
];
const getColor = (name: string) =>
  AVATAR_COLORS[Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

export const ClientsListScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile } = useCoachStore();
  const { clients, loading, loadClients } = useClientManagementStore();
  const { coachBookings, loadCoachBookings } = useBookingsStore();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const fadeAnims = useRef([...Array(40)].map(() => new Animated.Value(0))).current;
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState(false);

  const bg = coachStitchOr(isDark, COACH_STITCH.bg, getBackgroundColor(isDark));
  const surfaceLow = coachStitchOr(isDark, COACH_STITCH.surfaceLow, colors.surface);
  const surfaceHi = coachStitchOr(isDark, COACH_STITCH.surfaceHighest, colors.surfaceVariant);
  const onSurface = coachStitchOr(isDark, COACH_STITCH.onSurface, colors.text);
  const onVar = coachStitchOr(isDark, COACH_STITCH.onSurfaceVariant, colors.textLight);
  const primaryC = coachStitchOr(isDark, COACH_STITCH.primaryContainer, colors.primary);
  const onPrimary = coachStitchOr(isDark, COACH_STITCH.onPrimary, '#030303');
  const outlineVar = coachStitchOr(isDark, COACH_STITCH.outlineVariant, colors.border);

  useEffect(() => {
    if (profile?.id) {
      loadClients(profile.id);
      loadCoachBookings(profile.id);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!loading && clients.length > 0) {
      fadeAnims.forEach(a => a.setValue(0));
      Animated.stagger(
        45,
        fadeAnims.slice(0, clients.length).map(a =>
          Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        ),
      ).start();
    }
  }, [loading, clients.length]);

  const nextByClient = useMemo(() => {
    const now = new Date();
    const map = new Map<string, Booking>();
    const future = coachBookings
      .filter(b => new Date(b.scheduled_at) > now && b.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    for (const b of future) {
      if (!map.has(b.client_id)) map.set(b.client_id, b);
    }
    return map;
  }, [coachBookings]);

  const onRefresh = useCallback(() => {
    if (profile?.id) {
      loadClients(profile.id);
      loadCoachBookings(profile.id);
    }
  }, [profile?.id]);

  const getInitials = (c: CoachClient) => {
    const p = (c.display_name || '').trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : (p[0]?.[0] || '?').toUpperCase();
  };

  const fmtLastSession = (d: string | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    const now = new Date();
    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    const tStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (dt.toDateString() === now.toDateString()) return `Today, ${tStr}`;
    if (dt.toDateString() === tom.toDateString()) return `Tomorrow, ${tStr}`;
    return `${dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${tStr}`;
  };

  const fmtNextSession = (b: Booking | undefined) => {
    if (!b) return '—';
    const dt = new Date(b.scheduled_at);
    const now = new Date();
    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    const tStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (dt.toDateString() === now.toDateString()) return `Today, ${tStr}`;
    if (dt.toDateString() === tom.toDateString()) return `Tomorrow, ${tStr}`;
    return `${dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${tStr}`;
  };

  const filtered = useMemo(() => {
    let list = clients;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(c => (c.display_name || '').toLowerCase().includes(q));
    if (filterActive) list = list.filter(c => c.has_active_pack);
    return list;
  }, [clients, search, filterActive]);

  const openClientMenu = (item: CoachClient) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg = t('chat.title', { defaultValue: 'Message' });
    const view = t('common.view', { defaultValue: 'View' });
    const cancel = t('common.cancel');
    if (Platform.OS === 'ios') {
      Alert.alert(item.display_name, undefined, [
        {
          text: msg,
          onPress: () =>
            nav.navigate('ChatScreen', {
              recipientId: item.client_id,
              recipientName: item.display_name,
              recipientPictureUrl: item.profile_picture_url ?? null,
            }),
        },
        { text: view, onPress: () => nav.navigate('ClientDetail', { clientId: item.client_id, clientName: item.display_name }) },
        { text: cancel, style: 'cancel' },
      ]);
    } else {
      Alert.alert(item.display_name, undefined, [
        {
          text: msg,
          onPress: () =>
            nav.navigate('ChatScreen', {
              recipientId: item.client_id,
              recipientName: item.display_name,
              recipientPictureUrl: item.profile_picture_url ?? null,
            }),
        },
        { text: view, onPress: () => nav.navigate('ClientDetail', { clientId: item.client_id, clientName: item.display_name }) },
        { text: cancel, style: 'cancel' },
      ]);
    }
  };

  const renderClient = ({ item, index }: { item: CoachClient; index: number }) => {
    const anim = fadeAnims[index] || new Animated.Value(1);
    const ac = getColor(item.display_name || '');
    const avatarUri = resolvePublicAvatarUrl(item.profile_picture_url);
    const next = nextByClient.get(item.client_id);
    const streakActive = item.has_active_pack;

    return (
      <Animated.View
        style={{
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }}
      >
        <TouchableOpacity
          style={[
            st.card,
            {
              backgroundColor: surfaceLow,
              borderColor: 'rgba(163,230,53,0.12)',
              shadowColor: isDark ? COACH_STITCH.primaryContainer : colors.primary,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            nav.navigate('ClientDetail', { clientId: item.client_id, clientName: item.display_name });
          }}
          activeOpacity={0.88}
        >
          <View style={st.cardTop}>
            <View style={st.cardTopLeft}>
              <LinearGradient colors={ac} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.avatarRing}>
                {avatarUri ? (
                  <ExpoImage source={{ uri: avatarUri }} style={st.avatarInner} contentFit="cover" />
                ) : (
                  <View style={[st.avatarInner, { backgroundColor: surfaceLow }]}>
                    <Text style={[st.avatarTxt, { color: primaryC }]}>{getInitials(item)}</Text>
                  </View>
                )}
              </LinearGradient>
              <View style={st.nameBlock}>
                <Text style={[st.clientName, { color: onSurface }]} numberOfLines={1}>
                  {item.display_name}
                </Text>
                <View
                  style={[
                    st.streakPill,
                    {
                      backgroundColor: streakActive ? primaryC : surfaceHi,
                    },
                  ]}
                >
                  <Flame size={12} color={streakActive ? onPrimary : onVar} />
                  <Text style={[st.streakTxt, { color: streakActive ? onPrimary : onVar }]}>
                    {streakActive ? t('coachApp.activePack', { defaultValue: 'Active pack' }) : t('coachApp.dayStreak', { count: 0, defaultValue: '0 Day Streak' })}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => openClientMenu(item)} hitSlop={12}>
              <MoreVertical size={22} color={onVar} />
            </TouchableOpacity>
          </View>
          <View style={st.rows}>
            <View style={st.rowLine}>
              <View style={st.rowLbl}>
                <Text style={[st.metaLbl, { color: onVar }]}>{t('coachApp.lastSession', { defaultValue: 'Last Session' }).toUpperCase()}</Text>
              </View>
              <Text style={[st.metaVal, { color: onSurface }]}>{fmtLastSession(item.last_session_at)}</Text>
            </View>
            <View style={st.rowLine}>
              <View style={st.rowLbl}>
                <Text style={[st.metaLbl, { color: primaryC }]}>{t('coachApp.nextSession', { defaultValue: 'Next Session' }).toUpperCase()}</Text>
              </View>
              <Text style={[st.metaVal, { color: primaryC, fontFamily: 'Barlow_700Bold' }]}>{fmtNextSession(next)}</Text>
            </View>
          </View>
                 </TouchableOpacity>
      </Animated.View>
    );
  };

  const ListHeader = (
    <>
      <CoachSubScreenBar title={t('coachApp.clients')} />
      <View style={st.hero}>
        <View style={st.searchRow}>
          <View style={[st.searchWrap, { backgroundColor: surfaceLow }]}>
            <Search size={20} color={onVar} style={st.searchIcon} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('coachApp.searchAthletes', { defaultValue: 'Search athletes...' })}
              placeholderTextColor={isDark ? `${COACH_STITCH.onSurfaceVariant}99` : colors.textLight}
              style={[st.searchInput, { color: onSurface }]}
            />
          </View>
          <TouchableOpacity
            style={[st.tuneBtn, { backgroundColor: surfaceLow }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilterActive(f => !f);
            }}
          >
            <SlidersHorizontal size={22} color={filterActive ? primaryC : primaryC} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const ListFooter = (
    <TouchableOpacity
      style={[st.addCard, { borderColor: `${outlineVar}55` }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        nav.getParent()?.navigate('CoachProfile', { screen: 'SessionPacks' });
      }}
      activeOpacity={0.85}
    >
      <View style={[st.addCircle, { backgroundColor: surfaceHi }]}>
        <Text style={[st.addPlus, { color: onSurface }]}>+</Text>
      </View>
      <Text style={[st.addTitle, { color: onSurface }]}>{t('coachApp.addClient', { defaultValue: 'Add Client' })}</Text>
      <Text style={[st.addSub, { color: onVar }]}>{t('coachApp.addClientHint', { defaultValue: 'Invite a new client to GoFit' })}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[st.root, { backgroundColor: bg }]}>
      <FlatList
        data={filtered}
        keyExtractor={i => i.client_id}
        renderItem={renderClient}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={[st.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={primaryC} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <SkeletonClientRow key={i} />
              ))}
            </View>
          ) : (
            <View style={st.empty}>
              <Text style={[st.emptyTitle, { color: onSurface }]}>{t('clientManagement.noClients')}</Text>
              <Text style={[st.emptySub, { color: onVar }]}>{t('clientManagement.noClientsDesc')}</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const st = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: 24, paddingTop: 4 },
  hero: { marginBottom: 20, gap: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingVertical: 14, paddingHorizontal: 4 },
  searchIcon: { marginLeft: 12, marginRight: 8 },
  searchInput: { flex: 1, fontFamily: 'Barlow_500Medium', fontSize: 16, paddingVertical: 0 },
  tuneBtn: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  card: {
    borderRadius: 16,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  avatarRing: { width: 64, height: 64, borderRadius: 16, padding: 2, overflow: 'hidden' },
  avatarInner: { flex: 1, borderRadius: 14, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarTxt: { fontFamily: 'Barlow_700Bold', fontSize: 20 },
  nameBlock: { flex: 1, gap: 6 },
  clientName: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18), letterSpacing: -0.3 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  streakTxt: { fontFamily: 'Barlow_700Bold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  rows: { marginTop: 14, gap: 12 },
  rowLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLbl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLbl: { fontFamily: 'Barlow_600SemiBold', fontSize: 10, letterSpacing: 1 },
  metaVal: { fontFamily: 'Barlow_600SemiBold', fontSize: 14 },
  addCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  addCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  addPlus: { fontFamily: 'Barlow_300Light', fontSize: 36, marginTop: -4 },
  addTitle: { fontFamily: 'Barlow_700Bold', fontSize: 18 },
  addSub: { fontFamily: 'Barlow_400Regular', fontSize: 14, marginTop: 4, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10, paddingHorizontal: 20 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18) },
  emptySub: { fontFamily: 'Barlow_400Regular', fontSize: 14, textAlign: 'center', maxWidth: 280 },
});
