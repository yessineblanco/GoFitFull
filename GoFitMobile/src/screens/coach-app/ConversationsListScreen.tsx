import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Search, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useCoachStore } from '@/store/coachStore';
import type { Conversation } from '@/services/chat';
import { getResponsiveFontSize } from '@/utils/responsive';
import { SkeletonConversationRow } from '@/components/shared/Shimmer';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor } from '@/utils/colorUtils';
import { COACH_STITCH, coachStitchOr } from '@/theme/coachStitch';
import { CoachSubScreenBar } from '@/components/coach/CoachSubScreenBar';
import { resolvePublicAvatarUrl } from '@/utils/avatarUrl';

const AVATAR_COLORS = ['#a3e635', '#29B6F6', '#FFA726', '#AB47BC', '#26A69A', '#5C6BC0', '#EC407A', '#8D6E63'];
const pickColor = (s: string) => AVATAR_COLORS[Math.abs([...s].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

function fmtRelTime(d: string | null, t: (k: string, o?: { defaultValue?: string }) => string) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const sec = Math.floor((now.getTime() - dt.getTime()) / 1000);
  if (sec < 60) return t('time.justNow', { defaultValue: 'Just now' });
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (dt.toDateString() === now.toDateString()) return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dt.toDateString() === yesterday.toDateString()) return t('time.yesterday', { defaultValue: 'Yesterday' });
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isPhotoPreview(msg: string | null | undefined) {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return m.includes('photo') || m.includes('image') || /^https?:\/\//.test(msg.trim());
}

export const ConversationsListScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { user, userType } = useAuthStore();
  const { profile: coachProfile } = useCoachStore();
  const { conversations, loading, loadConversationsForClient, loadConversationsForCoach, setActiveConversation } = useChatStore();
  const fadeAnims = useRef([...Array(30)].map(() => new Animated.Value(0))).current;
  const [search, setSearch] = useState('');

  const bg = coachStitchOr(isDark, COACH_STITCH.bg, getBackgroundColor(isDark));
  const surfaceLow = coachStitchOr(isDark, COACH_STITCH.surfaceLow, colors.surface);
  const onSurface = coachStitchOr(isDark, COACH_STITCH.onSurface, colors.text);
  const onVar = coachStitchOr(isDark, COACH_STITCH.onSurfaceVariant, colors.textLight);
  const primaryC = coachStitchOr(isDark, COACH_STITCH.primaryContainer, colors.primary);
  const onPrimary = coachStitchOr(isDark, COACH_STITCH.onPrimary, '#030303');
  const searchBg = coachStitchOr(isDark, `${COACH_STITCH.surfaceHighest}66`, colors.surfaceVariant);

  const loadConvos = useCallback(() => {
    if (userType === 'coach' && coachProfile?.id) loadConversationsForCoach(coachProfile.id);
    else if (user?.id) loadConversationsForClient(user.id);
  }, [userType, coachProfile?.id, user?.id]);

  useEffect(() => {
    loadConvos();
  }, [loadConvos]);

  useEffect(() => {
    if (!loading && conversations.length > 0) {
      fadeAnims.forEach(a => a.setValue(0));
      Animated.stagger(
        40,
        fadeAnims.slice(0, conversations.length).map(a =>
          Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        ),
      ).start();
    }
  }, [loading, conversations.length]);

  const resolveName = useCallback(
    (c: Conversation) => {
      if (c.other_user_name) return c.other_user_name;
      return userType === 'coach' ? t('chat.fallbackClient') : t('chat.fallbackCoach');
    },
    [t, userType],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c => resolveName(c).toLowerCase().includes(q));
  }, [conversations, search, resolveName]);

  const openChat = (c: Conversation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveConversation(c);
    const screen = userType === 'coach' ? 'ChatScreen' : 'ClientChatScreen';
    nav.navigate(screen, {
      conversationId: c.id,
      recipientName: resolveName(c),
      recipientPictureUrl: c.other_user_picture ?? null,
    });
  };

  const initials = (c: Conversation) => {
    const n = resolveName(c).trim().split(/\s+/);
    return n.length >= 2 ? (n[0][0] + n[n.length - 1][0]).toUpperCase() : (n[0]?.[0] || '?').toUpperCase();
  };

  const renderConvo = ({ item, index }: { item: Conversation; index: number }) => {
    const anim = fadeAnims[index] || new Animated.Value(1);
    const ac = pickColor(resolveName(item));
    const hasUnread = item.unread_count && item.unread_count > 0;
    const photo = isPhotoPreview(item.last_message);
    const avatarUri = resolvePublicAvatarUrl(item.other_user_picture);
    const rowBg = hasUnread ? surfaceLow : `${surfaceLow}80`;
    const borderCol = 'transparent';

    return (
      <Animated.View
        style={{
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}
      >
        <TouchableOpacity
          style={[
            st.row,
            {
              backgroundColor: rowBg,
              borderColor: borderCol,
            },
          ]}
          onPress={() => openChat(item)}
          activeOpacity={0.85}
        >
          <View style={st.avatarWrap}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={[st.avatarImg, !hasUnread && st.avatarDim]}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[st.avatarFallback, { backgroundColor: `${ac}22` }]}>
                <Text style={[st.avatarText, { color: ac }]}>{initials(item)}</Text>
              </View>
            )}
            <View style={[st.onlineDot, { borderColor: bg, backgroundColor: primaryC }]} />
          </View>
          <View style={st.info}>
            <View style={st.nameRow}>
              <Text
                style={[
                  st.name,
                  { color: hasUnread ? onSurface : `${onSurface}${hasUnread ? '' : '99'}` },
                ]}
                numberOfLines={1}
              >
                  {resolveName(item)}
              </Text>
              <Text style={[st.time, { color: hasUnread ? primaryC : onVar }]}>{fmtRelTime(item.last_message_at, t)}</Text>
            </View>
            {photo ? (
              <View style={st.photoRow}>
                <Camera size={16} color={COACH_STITCH.tertiaryFixedDim} />
                <Text style={[st.photoLbl, { color: COACH_STITCH.tertiaryFixedDim }]}>{t('chat.photoMessage', { defaultValue: 'Photo' })}</Text>
              </View>
            ) : (
              <View style={st.msgRow}>
                <Text
                  style={[
                    st.msg,
                    hasUnread ? st.msgBold : undefined,
                    { color: hasUnread ? onSurface : `${onVar}${hasUnread ? '' : '99'}` },
                  ]}
                  numberOfLines={2}
                >
                  {item.last_message || t('chat.noConversationsDesc')}
                </Text>
                {hasUnread && (
                  <View style={[st.badge, { backgroundColor: primaryC }]}>
                    <Text style={[st.badgeText, { color: onPrimary }]}>{item.unread_count}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const ListHeader = (
    <>
      <CoachSubScreenBar title={t('chat.messagesTitle', { defaultValue: 'Messages' })} />
      <View style={st.titleBlock}>
        <View style={[st.searchWrap, { backgroundColor: searchBg }]}>
          <Search size={22} color={onVar} style={st.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              userType === 'coach'
                ? t('coachApp.searchAthletes', { defaultValue: 'Search athletes...' })
                : t('chat.searchConversations', { defaultValue: 'Search...' })
            }
            placeholderTextColor={isDark ? `${onVar}88` : colors.textLight}
            style={[st.searchInput, { color: onSurface }]}
          />
        </View>
      </View>
    </>
  );

  return (
    <View style={[st.root, { backgroundColor: bg }]}>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderConvo}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[st.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadConvos} tintColor={primaryC} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <SkeletonConversationRow key={i} />
              ))}
            </View>
          ) : (
            <View style={st.empty}>
              <Text style={[st.emptyTitle, { color: onSurface }]}>{t('chat.noConversations')}</Text>
              <Text style={[st.emptySub, { color: onVar }]}>{t('chat.noConversationsDesc')}</Text>
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
  titleBlock: { marginBottom: 20, gap: 0 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingVertical: 14, paddingHorizontal: 6 },
  searchIcon: { marginLeft: 12, marginRight: 8 },
  searchInput: { flex: 1, fontFamily: 'Barlow_500Medium', fontSize: 16, paddingVertical: 0 },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderRadius: 12, borderWidth: 0, padding: 18, marginBottom: 12 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  avatarDim: { opacity: 0.55 },
  avatarFallback: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: 'Barlow_700Bold', fontSize: 18 },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  name: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16), flex: 1 },
  time: { fontFamily: 'Barlow_700Bold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end' },
  msg: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(13), flex: 1, lineHeight: 20 },
  msgBold: { fontFamily: 'Barlow_600SemiBold' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoLbl: { fontFamily: 'Barlow_500Medium', fontSize: 14, fontStyle: 'italic' },
  badge: { minWidth: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 7, marginLeft: 8 },
  badgeText: { fontFamily: 'Barlow_700Bold', fontSize: 11 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18) },
  emptySub: { fontFamily: 'Barlow_400Regular', fontSize: 14, textAlign: 'center', maxWidth: 260 },
});
