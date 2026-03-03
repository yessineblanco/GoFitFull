import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Package } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { usePacksStore } from '@/store/packsStore';
import { useAuthStore } from '@/store/authStore';
import type { PurchasedPack } from '@/services/sessionPacks';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#B4F04E';

export const MyPacksScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { purchasedPacks, loading, loadPurchasedPacks } = usePacksStore();

  useEffect(() => {
    if (user?.id) loadPurchasedPacks(user.id);
  }, [user?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return PRIMARY_GREEN;
      case 'exhausted': return '#FF9800';
      case 'expired': return '#EF5350';
      default: return 'rgba(255,255,255,0.4)';
    }
  };

  const renderPack = ({ item }: { item: PurchasedPack }) => (
    <View style={styles.packCard}>
      <View style={styles.packHeader}>
        <Package size={20} color={getStatusColor(item.status)} />
        <View style={styles.packInfo}>
          <Text style={styles.packName}>{item.pack_name}</Text>
          <Text style={styles.packDate}>{new Date(item.purchased_at).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status === 'active' ? `${item.sessions_remaining}/${item.sessions_total}` : t(`sessionPacks.${item.status}`)}
          </Text>
        </View>
      </View>
      {item.status === 'active' && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(item.sessions_remaining / item.sessions_total) * 100}%` }]} />
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Package size={48} color="rgba(180,240,78,0.3)" />
      <Text style={styles.emptyTitle}>{t('sessionPacks.noMyPacks')}</Text>
      <Text style={styles.emptySubtitle}>{t('sessionPacks.noMyPacksDesc')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('sessionPacks.myPacks')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={purchasedPacks}
        keyExtractor={(item) => item.id}
        renderItem={renderPack}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={loading ? null : renderEmpty}
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
  listContent: { paddingHorizontal: 20, paddingTop: 12 },
  packCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 16, marginBottom: 12 },
  packHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  packInfo: { flex: 1 },
  packName: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(15), color: '#FFFFFF' },
  packDate: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(12) },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: PRIMARY_GREEN, borderRadius: 2 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF' },
  emptySubtitle: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 260 },
});
