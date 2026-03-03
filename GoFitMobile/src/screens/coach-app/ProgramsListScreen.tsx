import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, FileText, Dumbbell, UtensilsCrossed } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useProgramsStore } from '@/store/programsStore';
import { useCoachStore } from '@/store/coachStore';
import type { CustomProgram } from '@/services/programs';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#B4F04E';

const typeIcons = {
  workout: Dumbbell,
  meal: UtensilsCrossed,
  both: FileText,
};

const statusColors: Record<string, string> = {
  active: PRIMARY_GREEN,
  completed: '#4CAF50',
  archived: 'rgba(255,255,255,0.3)',
};

export const ProgramsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile } = useCoachStore();
  const { coachPrograms, loading, loadCoachPrograms } = useProgramsStore();

  useEffect(() => {
    if (profile?.id) loadCoachPrograms(profile.id);
  }, [profile?.id]);

  const handleRefresh = useCallback(() => {
    if (profile?.id) loadCoachPrograms(profile.id);
  }, [profile?.id]);

  const renderProgram = ({ item }: { item: CustomProgram }) => {
    const TypeIcon = typeIcons[item.type] || FileText;
    const days = Array.isArray(item.program_data) ? item.program_data.length : 0;

    return (
      <TouchableOpacity style={styles.programCard} activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('ProgramBuilder', { programId: item.id }); }}>
        <View style={styles.programHeader}>
          <View style={styles.typeIcon}>
            <TypeIcon size={18} color={PRIMARY_GREEN} />
          </View>
          <View style={styles.programInfo}>
            <Text style={styles.programTitle}>{item.title}</Text>
            <Text style={styles.programMeta}>
              {days} {t('programs.day')}{days !== 1 ? 's' : ''} · {t(`programs.${item.type}`)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColors[item.status] || 'rgba(255,255,255,0.2)'}15` }]}>
            <Text style={[styles.statusText, { color: statusColors[item.status] || 'rgba(255,255,255,0.4)' }]}>
              {t(`programs.${item.status}`)}
            </Text>
          </View>
        </View>
        {item.description ? <Text style={styles.programDesc} numberOfLines={2}>{item.description}</Text> : null}
        <Text style={styles.programDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FileText size={48} color="rgba(180,240,78,0.3)" />
      <Text style={styles.emptyTitle}>{t('programs.noPrograms')}</Text>
      <Text style={styles.emptySubtitle}>{t('programs.noProgramsCoachDesc')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('programs.title')}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('ProgramBuilder'); }}
          style={styles.addButton}
        >
          <Plus size={22} color="#000000" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={coachPrograms}
        keyExtractor={(item) => item.id}
        renderItem={renderProgram}
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
  programCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 16, marginBottom: 12 },
  programHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  typeIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(180,240,78,0.08)', alignItems: 'center', justifyContent: 'center' },
  programInfo: { flex: 1 },
  programTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(15), color: '#FFFFFF' },
  programMeta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: 'Barlow_600SemiBold', fontSize: 11, textTransform: 'capitalize' },
  programDesc: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(13), color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  programDate: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), color: 'rgba(255,255,255,0.3)' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF' },
  emptySubtitle: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 260 },
});
