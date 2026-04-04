import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Bell, MessageCircle, Calendar, Star, Dumbbell, CheckCircle, XCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { notificationInboxService, type AppNotification } from '@/services/notificationInbox';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#B4F04E';

const NOTIF_ICONS: Record<string, { Icon: any; color: string }> = {
  new_message: { Icon: MessageCircle, color: '#64B5F6' },
  booking_confirmed: { Icon: Calendar, color: PRIMARY_GREEN },
  booking_cancelled: { Icon: XCircle, color: '#EF5350' },
  booking_reminder: { Icon: Calendar, color: '#FFC107' },
  new_review: { Icon: Star, color: '#FFD700' },
  program_received: { Icon: Dumbbell, color: '#CE93D8' },
  coach_verified: { Icon: CheckCircle, color: PRIMARY_GREEN },
};

export const NotificationInboxScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await notificationInboxService.getNotifications(user.id);
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationPress = async (item: AppNotification) => {
    if (!item.read_at) {
      await notificationInboxService.markAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    }
    const data = item.data as { screen?: string; id?: string };
    if (data?.screen === 'CoachDetail' && data?.id) {
      navigation.navigate('CoachDetail', { coachId: data.id });
    } else if (data?.screen === 'Chat' && data?.id) {
      navigation.navigate('ClientChat', { conversationId: data.id });
    } else if (data?.screen === 'ProgramDetail' && data?.id) {
      navigation.navigate('ProgramDetail', { programId: data.id });
    }
  };

  const sections = React.useMemo(() => {
    const groups: Record<string, AppNotification[]> = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    notifications.forEach((item) => {
      const d = new Date(item.created_at).toDateString();
      const key = d === today ? 'today' : d === yesterday ? 'yesterday' : d;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return Object.entries(groups).map(([key, items]) => ({
      title: key === 'today'
        ? t('chat.today')
        : key === 'yesterday'
          ? t('chat.yesterday')
          : new Date(key).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
      data: items,
    }));
  }, [notifications, t]);

  const getNotifIcon = (type: string, isRead: boolean) => {
    const entry = NOTIF_ICONS[type] || { Icon: Bell, color: PRIMARY_GREEN };
    const { Icon, color } = entry;
    return <Icon size={18} color={isRead ? 'rgba(255,255,255,0.3)' : color} />;
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.notifRow, !item.read_at && styles.notifUnread]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notifIcon}>
        {getNotifIcon(item.type, !!item.read_at)}
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.read_at && styles.notifTitleUnread]} numberOfLines={1}>{item.title}</Text>
        {item.body ? <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text> : null}
        <Text style={styles.notifTime}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <Text style={styles.sectionLabel}>{section.title}</Text>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadNotifications} tintColor={PRIMARY_GREEN} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={PRIMARY_GREEN} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Bell size={48} color="rgba(180,240,78,0.3)" />
              <Text style={styles.emptyText}>{t('notifications.inboxEmpty')}</Text>
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
  backButton: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF', textAlign: 'center' },
  listContent: { paddingHorizontal: 20, paddingTop: 12 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  notifUnread: { backgroundColor: 'rgba(180,240,78,0.06)' },
  notifIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(180,240,78,0.1)', alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1 },
  notifTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.8)' },
  notifTitleUnread: { color: '#FFFFFF' },
  notifBody: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  notifTime: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), color: 'rgba(255,255,255,0.35)', marginTop: 6 },
  sectionLabel: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 10,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(15), color: 'rgba(255,255,255,0.5)' },
});
