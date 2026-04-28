import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, ActivityIndicator,
} from 'react-native';
import { SkeletonCoachDetail } from '@/components/shared/Shimmer';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, MessageCircle, FileText, TrendingUp, Calendar, StickyNote, ChevronRight, Sparkles, X, RefreshCw, ClipboardCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useClientManagementStore } from '@/store/clientManagementStore';
import { useCoachStore } from '@/store/coachStore';
import { useChatStore } from '@/store/chatStore';
import { aiSessionNotesService, type AISessionNote } from '@/services/aiSessionNotes';
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
  const [briefingVisible, setBriefingVisible] = useState(false);
  const [briefing, setBriefing] = useState<AISessionNote | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

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

  const handleCheckIns = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ClientCheckIns', { clientId, clientName: selectedClientDetail?.client?.display_name || clientName });
  };

  const handleGenerateBriefing = async (force = false) => {
    if (!clientId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBriefingVisible(true);
    setBriefingLoading(true);
    setBriefingError(null);
    try {
      const note = await aiSessionNotesService.generateBriefing(clientId, force);
      setBriefing(note);
    } catch (error) {
      setBriefingError(error instanceof Error ? error.message : t('clientManagement.aiBriefingFailed'));
    } finally {
      setBriefingLoading(false);
    }
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

        <TouchableOpacity style={styles.briefingCard} onPress={() => handleGenerateBriefing(false)} activeOpacity={0.75}>
          <View style={styles.briefingIcon}>
            <Sparkles size={20} color={PRIMARY_GREEN} />
          </View>
          <View style={styles.notesCardContent}>
            <Text style={[styles.notesCardTitle, { color: colors.text }]}>{t('clientManagement.aiBriefing')}</Text>
            <Text style={[styles.notesCardSubtitle, { color: colors.textSecondary }]}>{t('clientManagement.aiBriefingSubtitle')}</Text>
          </View>
          <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.briefingCard} onPress={handleCheckIns} activeOpacity={0.75}>
          <View style={styles.briefingIcon}>
            <ClipboardCheck size={20} color={PRIMARY_GREEN} />
          </View>
          <View style={styles.notesCardContent}>
            <Text style={[styles.notesCardTitle, { color: colors.text }]}>{t('checkIns.coachCardTitle')}</Text>
            <Text style={[styles.notesCardSubtitle, { color: colors.textSecondary }]}>{t('checkIns.coachCardSubtitle')}</Text>
          </View>
          <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'} />
        </TouchableOpacity>

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

      <Modal visible={briefingVisible} animationType="slide" transparent onRequestClose={() => setBriefingVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.briefingModal, { backgroundColor: isDark ? '#0a0a0a' : colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
            <LinearGradient colors={isDark ? ['#0a0a0a', '#0d1a0d', '#0a0a0a'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('clientManagement.aiBriefing')}</Text>
                {briefing?.created_at ? (
                  <Text style={[styles.modalSubtitle, { color: colors.textLight }]}>
                    {new Date(briefing.created_at).toLocaleString()}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setBriefingVisible(false)} style={styles.modalIconButton}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.briefingBody} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {briefingLoading ? (
                <View style={styles.briefingLoading}>
                  <ActivityIndicator color={PRIMARY_GREEN} />
                  <Text style={[styles.notesCardSubtitle, { color: colors.textSecondary }]}>{t('clientManagement.aiBriefingLoading')}</Text>
                </View>
              ) : briefingError ? (
                <Text style={[styles.errorText, { color: '#EF5350' }]}>{briefingError}</Text>
              ) : briefing?.summary ? (
                <Text style={[styles.briefingText, { color: colors.text }]}>{briefing.summary}</Text>
              ) : null}
            </ScrollView>

            <TouchableOpacity style={styles.regenerateButton} onPress={() => handleGenerateBriefing(true)} disabled={briefingLoading}>
              <RefreshCw size={16} color="#000000" />
              <Text style={styles.regenerateText}>{t('clientManagement.regenerateBriefing')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  briefingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(180,240,78,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(180,240,78,0.15)',
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  briefingIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,240,78,0.08)' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  briefingModal: { maxHeight: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', paddingHorizontal: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 },
  modalTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20), color: '#FFFFFF' },
  modalSubtitle: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  modalIconButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  briefingBody: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 16 },
  briefingLoading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  briefingText: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), lineHeight: 22, color: '#FFFFFF' },
  regenerateButton: { marginTop: 14, height: 48, borderRadius: 14, backgroundColor: PRIMARY_GREEN, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  regenerateText: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(14), color: '#000000' },
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
