import React, { useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Animated,
} from 'react-native';
import { Shimmer } from '@/components/shared/Shimmer';
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
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';

const PRIMARY_GREEN = '#B4F04E';

const typeIcons = {
  workout: Dumbbell,
  meal: UtensilsCrossed,
  both: FileText,
};

const getStatusColors = (isDark: boolean): Record<string, string> => ({
  active: PRIMARY_GREEN,
  completed: '#4CAF50',
  archived: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
});

export const ProgramsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { profile } = useCoachStore();
  const { coachPrograms, loading, loadCoachPrograms } = useProgramsStore();
  const fadeAnims = useRef([...Array(30)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (profile?.id) loadCoachPrograms(profile.id);
  }, [profile?.id]);

  useEffect(() => {
    if (!loading && coachPrograms.length > 0) {
      fadeAnims.forEach(a => a.setValue(0));
      Animated.stagger(50, fadeAnims.slice(0, coachPrograms.length).map(anim =>
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 })
      )).start();
    }
  }, [loading, coachPrograms.length]);

  const handleRefresh = useCallback(() => {
    if (profile?.id) loadCoachPrograms(profile.id);
  }, [profile?.id]);

  const renderProgram = ({ item, index }: { item: CustomProgram; index: number }) => {
    const TypeIcon = typeIcons[item.type] || FileText;
    const days = Array.isArray(item.program_data) ? item.program_data.length : 0;
    const statusColorsMap = getStatusColors(isDark);
    const anim = fadeAnims[index] || new Animated.Value(1);

    return (
      <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
        <TouchableOpacity style={[styles.programCard, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]} activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('ProgramBuilder', { programId: item.id }); }}>
          <View style={styles.programHeader}>
            <View style={[styles.typeIcon, { backgroundColor: isDark ? 'rgba(180,240,78,0.08)' : 'rgba(132,196,65,0.1)' }]}>
              <TypeIcon size={18} color={PRIMARY_GREEN} />
            </View>
            <View style={styles.programInfo}>
              <Text style={[styles.programTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.programMeta, { color: colors.textLight }]}>
                {days} {t('programs.day')}{days !== 1 ? 's' : ''} · {t(`programs.${item.type}`)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColorsMap[item.status] || (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)')}15` }]}>
              <Text style={[styles.statusText, { color: statusColorsMap[item.status] || (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)') }]}>
                {t(`programs.${item.status}`)}
              </Text>
            </View>
          </View>
          {item.description ? <Text style={[styles.programDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text> : null}
          <Text style={[styles.programDate, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FileText size={48} color="rgba(180,240,78,0.3)" />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('programs.noPrograms')}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textLight }]}>{t('programs.noProgramsCoachDesc')}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
      <LinearGradient colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('programs.title')}</Text>
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
        ListFooterComponent={loading ? (
          <View style={{ gap: 12, paddingTop: 8 }}>
            {[...Array(3)].map((_, i) => (
              <View key={i} style={{ backgroundColor: getGlassBg(isDark), borderRadius: 16, borderWidth: 1, borderColor: getGlassBorder(isDark), padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <Shimmer width={36} height={36} borderRadius={12} />
                  <View style={{ flex: 1 }}>
                    <Shimmer width="60%" height={16} style={{ marginBottom: 4 }} />
                    <Shimmer width="40%" height={12} />
                  </View>
                  <Shimmer width={60} height={22} borderRadius={10} />
                </View>
                <Shimmer width="75%" height={12} style={{ marginBottom: 8 }} />
                <Shimmer width={80} height={11} />
              </View>
            ))}
          </View>
        ) : null}
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
