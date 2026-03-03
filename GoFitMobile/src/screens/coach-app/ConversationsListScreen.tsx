import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MessageCircle, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useCoachStore } from '@/store/coachStore';
import type { Conversation } from '@/services/chat';
import { getResponsiveFontSize } from '@/utils/responsive';
import { SkeletonConversationRow } from '@/components/shared/Shimmer';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#B4F04E';

export const ConversationsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user, userType } = useAuthStore();
  const { profile: coachProfile } = useCoachStore();
  const { conversations, loading, loadConversationsForClient, loadConversationsForCoach, setActiveConversation } = useChatStore();

  const loadConvos = useCallback(() => {
    if (userType === 'coach' && coachProfile?.id) {
      loadConversationsForCoach(coachProfile.id);
    } else if (user?.id) {
      loadConversationsForClient(user.id);
    }
  }, [userType, coachProfile?.id, user?.id]);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  const handleRefresh = loadConvos;

  const openChat = (convo: Conversation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveConversation(convo);
    navigation.navigate('ChatScreen', { conversationId: convo.id, recipientName: getOtherName(convo) });
  };

  const getOtherName = (convo: Conversation) => {
    return convo.other_user_name || (convo.coach_id === user?.id ? t('chat.fallbackClient') : t('chat.fallbackCoach'));
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (convo: Conversation) => {
    const name = getOtherName(convo);
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name[0] || '?').toUpperCase();
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity style={styles.convoCard} onPress={() => openChat(item)} activeOpacity={0.7}>
      <View style={styles.avatar}>
        {item.other_user_picture ? (
          <Image
            source={{ uri: item.other_user_picture }}
            style={styles.avatarImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Text style={styles.avatarInitials}>{getInitials(item)}</Text>
        )}
      </View>
      <View style={styles.convoInfo}>
        <Text style={styles.convoName}>{getOtherName(item)}</Text>
        {item.last_message ? (
          <Text style={styles.lastMessage} numberOfLines={1}>{item.last_message}</Text>
        ) : (
          <Text style={styles.lastMessage}>{t('chat.noConversationsDesc')}</Text>
        )}
      </View>
      <Text style={styles.convoTime}>{formatTime(item.last_message_at)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>{t('chat.conversations')}</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={PRIMARY_GREEN} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonList}>
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonConversationRow key={i} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MessageCircle size={48} color="rgba(180,240,78,0.3)" />
              <Text style={styles.emptyTitle}>{t('chat.noConversations')}</Text>
              <Text style={styles.emptySubtitle}>{t('chat.noConversationsDesc')}</Text>
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
  title: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(24), color: '#FFFFFF' },
  listContent: { paddingHorizontal: 20, paddingTop: 12 },
  skeletonList: { paddingTop: 8 },
  convoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 14, marginBottom: 6,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(180,240,78,0.08)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(16),
    color: PRIMARY_GREEN,
  },
  convoInfo: { flex: 1 },
  convoName: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(15), color: '#FFFFFF' },
  lastMessage: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  convoTime: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), color: 'rgba(255,255,255,0.3)' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF' },
  emptySubtitle: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 260 },
});
