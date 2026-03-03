import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Dumbbell, UtensilsCrossed, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useProgramsStore } from '@/store/programsStore';
import { useAuthStore } from '@/store/authStore';
import { workoutService, type Exercise } from '@/services/workouts';
import type { CustomProgram, ProgramDay } from '@/services/programs';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';

const PRIMARY_GREEN = '#B4F04E';

const typeIcons = { workout: Dumbbell, meal: UtensilsCrossed, both: FileText };

export const MyProgramsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { clientPrograms, loading, loadClientPrograms } = useProgramsStore();

  const [exerciseMap, setExerciseMap] = useState<Record<string, Exercise>>({});

  useEffect(() => {
    if (user?.id) loadClientPrograms(user.id);
  }, [user?.id]);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const all = await workoutService.getExercises();
        const map: Record<string, Exercise> = {};
        all.forEach((ex) => { map[ex.id] = ex; });
        setExerciseMap(map);
      } catch (error) {
        logger.error('Failed to load exercises for programs list:', error);
      }
    };
    loadExercises();
  }, []);

  const handleRefresh = useCallback(() => {
    if (user?.id) loadClientPrograms(user.id);
  }, [user?.id]);

  const getFirstExerciseImage = (program: CustomProgram): string | undefined => {
    const days: ProgramDay[] = Array.isArray(program.program_data) ? program.program_data : [];
    for (const day of days) {
      for (const ex of day.exercises || []) {
        if (ex.id && exerciseMap[ex.id]?.image_url) {
          return exerciseMap[ex.id].image_url;
        }
      }
    }
    return undefined;
  };

  const getTotalExercises = (program: CustomProgram): number => {
    const days: ProgramDay[] = Array.isArray(program.program_data) ? program.program_data : [];
    return days.reduce((total, day) => total + (day.exercises?.length || 0), 0);
  };

  const renderProgram = ({ item }: { item: CustomProgram }) => {
    const TypeIcon = typeIcons[item.type] || FileText;
    const days = Array.isArray(item.program_data) ? item.program_data.length : 0;
    const thumbnailUrl = getFirstExerciseImage(item);
    const totalExercises = getTotalExercises(item);

    return (
      <TouchableOpacity
        style={styles.programCard}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('ProgramDetail', { programId: item.id });
        }}
      >
        <View style={styles.cardContent}>
          {/* Thumbnail */}
          {thumbnailUrl ? (
            <View style={styles.thumbnailContainer}>
              <ExpoImage source={{ uri: thumbnailUrl }} style={styles.thumbnail} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.thumbnailOverlay}
              />
            </View>
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <TypeIcon size={24} color="rgba(180,240,78,0.3)" />
            </View>
          )}

          {/* Info */}
          <View style={styles.programInfo}>
            <View style={styles.programTopRow}>
              <Text style={styles.programTitle} numberOfLines={1}>{item.title}</Text>
              <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
            </View>

            {item.description ? (
              <Text style={styles.programDesc} numberOfLines={1}>{item.description}</Text>
            ) : null}

            <View style={styles.programMetaRow}>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>
                  {days} {t('programs.day')}{days !== 1 ? 's' : ''}
                </Text>
              </View>
              {totalExercises > 0 && (
                <View style={styles.metaChip}>
                  <Dumbbell size={10} color="rgba(180,240,78,0.6)" />
                  <Text style={styles.metaChipText}>{totalExercises}</Text>
                </View>
              )}
              <View style={[styles.statusChip, {
                backgroundColor: item.status === 'active' ? 'rgba(180,240,78,0.1)' : 'rgba(255,255,255,0.05)',
              }]}>
                <Text style={[styles.statusChipText, {
                  color: item.status === 'active' ? PRIMARY_GREEN : 'rgba(255,255,255,0.4)',
                }]}>
                  {t(`programs.${item.status}`)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FileText size={48} color="rgba(180,240,78,0.3)" />
      <Text style={styles.emptyTitle}>{t('programs.noPrograms')}</Text>
      <Text style={styles.emptySubtitle}>{t('programs.noProgramsClientDesc')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('programs.myPrograms')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={clientPrograms}
        keyExtractor={(item) => item.id}
        renderItem={renderProgram}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={loading ? null : renderEmpty}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={PRIMARY_GREEN} />
        }
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

  programCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardContent: { flexDirection: 'row', alignItems: 'center' },

  thumbnailContainer: {
    width: 80,
    height: 90,
    position: 'relative',
  },
  thumbnail: { width: 80, height: 90 },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 90,
    backgroundColor: 'rgba(180,240,78,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  programInfo: { flex: 1, padding: 12, gap: 6 },
  programTopRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  programTitle: { flex: 1, fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(15), color: '#FFFFFF' },
  programDesc: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), color: 'rgba(255,255,255,0.45)' },

  programMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaChipText: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(10), color: 'rgba(255,255,255,0.5)' },
  statusChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  statusChipText: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(10), textTransform: 'capitalize' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF' },
  emptySubtitle: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 260 },
});
