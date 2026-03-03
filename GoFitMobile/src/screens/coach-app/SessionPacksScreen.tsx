import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Switch, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Package, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { usePacksStore } from '@/store/packsStore';
import { useCoachStore } from '@/store/coachStore';
import type { SessionPack } from '@/services/sessionPacks';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';

const PRIMARY_GREEN = '#B4F04E';

export const SessionPacksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile } = useCoachStore();
  const { myPacks, loading, loadMyPacks, updatePack, deletePack } = usePacksStore();

  useEffect(() => {
    if (profile?.id) loadMyPacks(profile.id);
  }, [profile?.id]);

  const handleRefresh = useCallback(() => {
    if (profile?.id) loadMyPacks(profile.id);
  }, [profile?.id]);

  const handleToggleActive = async (pack: SessionPack) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updatePack(pack.id, { is_active: !pack.is_active });
    } catch {
      dialogManager.error(t('common.error'), t('sessionPacks.failedToUpdatePack'));
    }
  };

  const handleDelete = (pack: SessionPack) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dialogManager.show(
      t('sessionPacks.deletePack'),
      t('sessionPacks.deletePackConfirm'),
      'warning',
      {
        showCancel: true,
        confirmText: t('sessionPacks.deletePack'),
        cancelText: t('common.cancel'),
        onConfirm: async () => {
          try {
            await deletePack(pack.id, profile?.id || '');
            dialogManager.success(t('common.success'), t('sessionPacks.packDeleted'));
          } catch {
            dialogManager.error(t('common.error'), t('sessionPacks.failedToDeletePack'));
          }
        },
      }
    );
  };

  const renderPack = ({ item }: { item: SessionPack }) => (
    <View style={[styles.packCard, !item.is_active && styles.packInactive]}>
      <View style={styles.packHeader}>
        <View style={styles.packInfo}>
          <Text style={styles.packName}>{item.name}</Text>
          <Text style={styles.packSessions}>{item.session_count} {t('sessionPacks.sessions')}</Text>
        </View>
        <Text style={styles.packPrice}>€{item.price.toFixed(2)}</Text>
      </View>
      {item.description ? <Text style={styles.packDesc}>{item.description}</Text> : null}
      <View style={styles.packActions}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{item.is_active ? t('sessionPacks.active') : t('sessionPacks.inactive')}</Text>
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggleActive(item)}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(180,240,78,0.3)' }}
            thumbColor={item.is_active ? PRIMARY_GREEN : 'rgba(255,255,255,0.4)'}
          />
        </View>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
          <Trash2 size={18} color="#EF5350" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Package size={48} color="rgba(180,240,78,0.3)" />
      <Text style={styles.emptyTitle}>{t('sessionPacks.noPacks')}</Text>
      <Text style={styles.emptySubtitle}>{t('sessionPacks.noPacksDesc')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('sessionPacks.title')}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('CreatePack'); }}
          style={styles.addButton}
        >
          <Plus size={22} color="#000000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={myPacks}
        keyExtractor={(item) => item.id}
        renderItem={renderPack}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={loading ? null : renderEmpty}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={PRIMARY_GREEN} />}
        ListFooterComponent={loading ? <ActivityIndicator color={PRIMARY_GREEN} style={{ marginVertical: 20 }} /> : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backButton: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20), color: '#FFFFFF', textAlign: 'center' },
  addButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: PRIMARY_GREEN, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20, paddingTop: 12 },
  packCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', padding: 16, marginBottom: 12,
  },
  packInactive: { opacity: 0.6 },
  packHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  packInfo: { flex: 1 },
  packName: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(16), color: '#FFFFFF' },
  packSessions: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(13), color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  packPrice: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20), color: PRIMARY_GREEN },
  packDesc: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(13), color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  packActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.5)' },
  deleteBtn: { padding: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF' },
  emptySubtitle: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 260 },
});
