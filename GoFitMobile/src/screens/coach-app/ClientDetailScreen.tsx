import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SkeletonCoachDetail } from '@/components/shared/Shimmer';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, MessageCircle, FileText, TrendingUp, Calendar, StickyNote, ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useClientManagementStore } from '@/store/clientManagementStore';
import { useCoachStore } from '@/store/coachStore';
import { useChatStore } from '@/store/chatStore';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';

const PRIMARY_GREEN = '#B4F04E';

export const ClientDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { profile } = useCoachStore();
  const { selectedClientDetail, loadingDetail, loadClientDetail, clearSelectedClient } = useClientManagementStore();
  const { getOrCreateConversation, setActiveConversation } = useChatStore();

  const clientId = route.params?.clientId;
  const clientName = route.params?.clientName || '';

  useEffect(() => {
    if (clientId && profile?.id) loadClientDetail(clientId, profile.id);
    return () => clearSelectedClient();
  }, [clientId, profile?.id]);

  const handleRefresh = useCallback(() => {
    if (clientId && profile?.id) loadClientDetail(clientId, profile.id);
  }, [clientId, profile?.id]);

  const handleMessage = async () => {
    if (!profile?.id || !clientId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const convo = await getOrCreateConversation(profile.id, clientId);
      if (convo) {
        setActiveConversation(convo);
        navigation.navigate('ChatScreen', {
          conversationId: convo.id,
          recipientName: clientName || convo.other_user_name,
          recipientPictureUrl: client?.profile_picture_url ?? null,
        });
      }
    } catch {}
  };

  const handleCreateProgram = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('ProgramBuilder', { clientId });
  };

  const handleViewProgress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('ClientProgress', { clientId, clientName });
  };

  const handleNotes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ClientNotes', { clientId, clientName });
  };

  if (loadingDetail && !selectedClientDetail) {
    return (
      <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
        <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{clientName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <SkeletonCoachDetail />
      </View>
    );
  }

  const detail = selectedClientDetail;
  const client = detail?.client;

  if (!client) {
    return (
      <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
        <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{clientName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{t('common.error')}</Text>
        </View>
      </View>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
      <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{client.display_name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loadingDetail} onRefresh={handleRefresh} tintColor={PRIMARY_GREEN} />}
      >
        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleMessage}>
            <MessageCircle size={20} color={PRIMARY_GREEN} />
            <Text style={styles.actionText}>{t('clientManagement.message')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCreateProgram}>
            <FileText size={20} color={PRIMARY_GREEN} />
            <Text style={styles.actionText}>{t('clientManagement.createProgram')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleViewProgress}>
            <TrendingUp size={20} color={PRIMARY_GREEN} />
            <Text style={styles.actionText}>{t('clientManagement.viewProgress')}</Text>
          </TouchableOpacity>
        </View>

        {/* Active Programs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('clientManagement.activePrograms')}</Text>
          {detail?.activePrograms && detail.activePrograms.length > 0 ? (
            detail.activePrograms.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.listItem, { backgroundColor: getGlassBg(isDark) }]}
                onPress={() => navigation.navigate('ProgramDetail', { programId: p.id })}
              >
                <Text style={[styles.listItemText, { color: colors.text }]}>{p.title}</Text>
                <ChevronRight size={16} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'} />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('programs.noPrograms')}</Text>
          )}
        </View>

        {/* Upcoming Bookings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('clientManagement.upcomingBookings')}</Text>
          {detail?.upcomingBookings && detail.upcomingBookings.length > 0 ? (
            detail.upcomingBookings.map((b) => (
              <View key={b.id} style={[styles.listItem, { backgroundColor: getGlassBg(isDark) }]}>
                <Calendar size={14} color={PRIMARY_GREEN} />
                <Text style={[styles.listItemText, { color: colors.text }]}>{formatDate(b.scheduled_at)}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('booking.noBookings')}</Text>
          )}
        </View>

        {/* Private Notes */}
        <TouchableOpacity style={styles.notesCard} onPress={handleNotes}>
          <StickyNote size={20} color={PRIMARY_GREEN} />
          <View style={styles.notesCardContent}>
            <Text style={[styles.notesCardTitle, { color: colors.text }]}>{t('clientManagement.privateNotes')}</Text>
            <Text style={[styles.notesCardSubtitle, { color: colors.textSecondary }]}>{t('clientManagement.addNote')}</Text>
          </View>
          <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backButton: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF', textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    backgroundColor: 'rgba(180,240,78,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(180,240,78,0.2)',
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(11),
    color: PRIMARY_GREEN,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(14),
    color: '#FFFFFF',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  listItemText: {
    flex: 1,
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(14),
    color: '#FFFFFF',
  },
  emptyText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  notesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(180,240,78,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(180,240,78,0.15)',
    padding: 16,
    gap: 12,
  },
  notesCardContent: { flex: 1 },
  notesCardTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(15),
    color: '#FFFFFF',
  },
  notesCardSubtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  errorText: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)' },
});
