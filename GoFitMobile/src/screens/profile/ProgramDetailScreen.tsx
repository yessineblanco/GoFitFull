import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Dumbbell, UtensilsCrossed, Play, Clock, ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useProgramsStore } from '@/store/programsStore';
import { workoutService, type Exercise } from '@/services/workouts';
import type { ProgramDay, ProgramExercise } from '@/services/programs';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';

const PRIMARY_GREEN = '#B4F04E';

export const ProgramDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { selectedProgram, loading, loadProgram, clearSelected } = useProgramsStore();

  const programId = route.params?.programId;

  const [exerciseMap, setExerciseMap] = useState<Record<string, Exercise>>({});
  const [exercisesLoading, setExercisesLoading] = useState(true);

  useEffect(() => {
    if (programId) loadProgram(programId);
    return () => clearSelected();
  }, [programId]);

  const handleRefresh = useCallback(() => {
    if (programId) loadProgram(programId);
  }, [programId, loadProgram]);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        setExercisesLoading(true);
        const all = await workoutService.getExercises();
        const map: Record<string, Exercise> = {};
        all.forEach((ex) => { map[ex.id] = ex; });
        setExerciseMap(map);
      } catch (error) {
        logger.error('Failed to load exercises for program detail:', error);
      } finally {
        setExercisesLoading(false);
      }
    };
    loadExercises();
  }, []);

  const program = selectedProgram;
  const days: ProgramDay[] = useMemo(
    () => (Array.isArray(program?.program_data) ? program!.program_data : []),
    [program],
  );

  const handleStartDay = (day: ProgramDay) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const exercises = (day.exercises || []).map((ex) => {
      const dbEx = ex.id ? exerciseMap[ex.id] : undefined;
      return {
        id: ex.id || ex.name,
        name: ex.name,
        sets: String(ex.sets),
        reps: String(ex.reps),
        restTime: String(ex.rest_seconds || 60),
      };
    });
    navigation.navigate('WorkoutSession', {
      workoutName: `${program?.title} – ${t('programs.day')} ${day.day_number}`,
      workoutType: 'custom' as const,
      exercises,
      returnTo: 'ProgramDetail',
    });
  };

  const handleExerciseTap = (ex: ProgramExercise) => {
    if (!ex.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ExerciseDetail', {
      exerciseId: ex.id,
      exerciseName: ex.name,
    });
  };

  if (loading || !program) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={PRIMARY_GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{program.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={PRIMARY_GREEN} />}
      >
        {/* Program Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.typeBadgeContainer}>
              <Text style={styles.typeBadge}>{t(`programs.${program.type}`)}</Text>
            </View>
            <View style={[styles.statusBadgeContainer, { backgroundColor: program.status === 'active' ? 'rgba(180,240,78,0.12)' : 'rgba(255,255,255,0.06)' }]}>
              <Text style={[styles.statusBadgeText, { color: program.status === 'active' ? PRIMARY_GREEN : 'rgba(255,255,255,0.4)' }]}>
                {t(`programs.${program.status}`)}
              </Text>
            </View>
          </View>
          <Text style={styles.dayCount}>
            {t('programs.dayXofY', { current: days.length, total: days.length })}
          </Text>
          {program.description ? <Text style={styles.description}>{program.description}</Text> : null}
        </View>

        {/* Days */}
        {days.map((day, dayIndex) => (
          <View key={dayIndex} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <View style={styles.dayNumberBadge}>
                <Text style={styles.dayNumberText}>{day.day_number}</Text>
              </View>
              <Text style={styles.dayTitle}>{t('programs.day')} {day.day_number}</Text>
              {day.exercises && day.exercises.length > 0 && (
                <Text style={styles.exerciseCountText}>
                  {t('programs.exerciseCount', { count: day.exercises.length })}
                </Text>
              )}
            </View>

            {/* Exercises */}
            {day.exercises && day.exercises.length > 0 && (
              <View style={styles.exercisesList}>
                {day.exercises.map((ex, exIdx) => {
                  const dbEx = ex.id ? exerciseMap[ex.id] : undefined;
                  const imageUrl = dbEx?.image_url;
                  const muscleGroups = dbEx?.muscle_groups;

                  return (
                    <TouchableOpacity
                      key={exIdx}
                      style={styles.exerciseRow}
                      activeOpacity={ex.id ? 0.7 : 1}
                      onPress={() => handleExerciseTap(ex)}
                    >
                      {imageUrl ? (
                        <ExpoImage source={{ uri: imageUrl }} style={styles.exerciseImage} contentFit="cover" />
                      ) : (
                        <View style={styles.exerciseImagePlaceholder}>
                          <Dumbbell size={18} color="rgba(180,240,78,0.4)" />
                        </View>
                      )}
                      <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName} numberOfLines={1}>{ex.name}</Text>
                        <View style={styles.exerciseMeta}>
                          <Text style={styles.exerciseDetail}>{ex.sets} x {ex.reps}</Text>
                          {ex.rest_seconds > 0 && (
                            <>
                              <View style={styles.metaDot} />
                              <Clock size={11} color="rgba(255,255,255,0.35)" />
                              <Text style={styles.exerciseRest}>
                                {t('programs.restSeconds', { seconds: ex.rest_seconds })}
                              </Text>
                            </>
                          )}
                        </View>
                        {muscleGroups && muscleGroups.length > 0 && (
                          <View style={styles.muscleGroupRow}>
                            {muscleGroups.slice(0, 3).map((mg, mgIdx) => (
                              <View key={mgIdx} style={styles.muscleGroupBadge}>
                                <Text style={styles.muscleGroupText}>{mg}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                      {ex.id && <ChevronRight size={16} color="rgba(255,255,255,0.2)" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Meals */}
            {day.meals && day.meals.length > 0 && (
              <View style={styles.mealsSection}>
                {day.meals.map((meal, mealIdx) => (
                  <View key={mealIdx} style={styles.mealItem}>
                    <UtensilsCrossed size={14} color={PRIMARY_GREEN} />
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>{meal.name || t('common.unnamed')}</Text>
                      <Text style={styles.macros}>
                        {meal.calories}cal · P{meal.protein}g · C{meal.carbs}g · F{meal.fat}g
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Start Day Button */}
            {day.exercises && day.exercises.length > 0 && (
              <TouchableOpacity
                style={styles.startDayButton}
                activeOpacity={0.8}
                onPress={() => handleStartDay(day)}
              >
                <LinearGradient
                  colors={[PRIMARY_GREEN, '#8AD435']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startDayGradient}
                >
                  <Play size={16} color="#000000" fill="#000000" />
                  <Text style={styles.startDayText}>{t('programs.startDay')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backButton: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18), color: '#FFFFFF', textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  infoCard: {
    backgroundColor: 'rgba(180,240,78,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(180,240,78,0.1)',
    padding: 20,
    marginBottom: 20,
    gap: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadgeContainer: {
    backgroundColor: 'rgba(180,240,78,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadge: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(11),
    color: PRIMARY_GREEN,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusBadgeContainer: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(11),
    textTransform: 'capitalize',
  },
  dayCount: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255,255,255,0.5)',
  },
  description: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
  },

  dayCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginBottom: 14,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  dayNumberBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(180,240,78,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(14),
    color: PRIMARY_GREEN,
  },
  dayTitle: {
    flex: 1,
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(16),
    color: '#FFFFFF',
  },
  exerciseCountText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.35)',
  },

  exercisesList: { gap: 8, marginBottom: 12 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 10,
    gap: 12,
  },
  exerciseImage: { width: 52, height: 52, borderRadius: 10 },
  exerciseImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: 'rgba(180,240,78,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: { flex: 1, gap: 4 },
  exerciseName: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(14),
    color: '#FFFFFF',
  },
  exerciseMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exerciseDetail: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.5)',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  exerciseRest: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.35)',
  },
  muscleGroupRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 2 },
  muscleGroupBadge: {
    backgroundColor: 'rgba(180,240,78,0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  muscleGroupText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(10),
    color: 'rgba(180,240,78,0.7)',
    textTransform: 'capitalize',
  },

  mealsSection: { gap: 8, marginBottom: 12 },
  mealItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  mealInfo: { flex: 1 },
  mealName: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(14), color: '#FFFFFF' },
  macros: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  startDayButton: { borderRadius: 12, overflow: 'hidden' },
  startDayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  startDayText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(14),
    color: '#000000',
  },
});
