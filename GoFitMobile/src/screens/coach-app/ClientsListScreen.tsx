import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, MessageCircle, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useClientManagementStore } from '@/store/clientManagementStore';
import { useCoachStore } from '@/store/coachStore';
import type { CoachClient } from '@/services/clientManagement';
import { getResponsiveFontSize } from '@/utils/responsive';
import { SkeletonClientRow } from '@/components/shared/Shimmer';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#B4F04E';

export const ClientsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile } = useCoachStore();
  const { clients, loading, loadClients } = useClientManagementStore();

  useEffect(() => {
    if (profile?.id) loadClients(profile.id);
  }, [profile?.id]);

  const handleRefresh = useCallback(() => {
    if (profile?.id) loadClients(profile.id);
  }, [profile?.id]);

  const getInitials = (client: CoachClient) => {
    const name = client.display_name?.trim() || '';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name[0] || '?').toUpperCase();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderClient = ({ item }: { item: CoachClient }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('ClientDetail', { clientId: item.client_id, clientName: item.display_name });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarInitials}>{getInitials(item)}</Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.display_name}</Text>
        <View style={styles.badgesRow}>
          {item.has_active_pack && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('clientManagement.activePack')}</Text>
            </View>
          )}
          {item.last_session_at && (
            <Text style={styles.lastSession}>
              {t('clientManagement.lastSession')}: {formatDate(item.last_session_at)}
            </Text>
          )}
        </View>
      </View>
      <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Users size={48} color="rgba(180,240,78,0.3)" />
      <Text style={styles.emptyTitle}>{t('clientManagement.noClients')}</Text>
      <Text style={styles.emptySubtitle}>{t('clientManagement.noClientsDesc')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>{t('coachApp.clients')}</Text>
      </View>
      <FlatList
        data={clients}
        keyExtractor={(item) => item.client_id}
        renderItem={renderClient}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={PRIMARY_GREEN} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonList}>
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonClientRow key={i} />
              ))}
            </View>
          ) : (
            renderEmpty()
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
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(180,240,78,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(18),
    color: PRIMARY_GREEN,
  },
  clientInfo: { flex: 1 },
  clientName: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(16), color: '#FFFFFF' },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  badge: {
    backgroundColor: 'rgba(180,240,78,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(10),
    color: PRIMARY_GREEN,
  },
  lastSession: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.4)',
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF' },
  emptySubtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    maxWidth: 260,
  },
});
