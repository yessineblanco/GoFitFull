import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  type DimensionValue,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useTextSizeStore, getScaledFontSize } from '@/store/textSizeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getTextColorWithOpacity } from '@/utils/colorUtils';
import type { LibraryStackParamList } from '@/types';
import { workoutService } from '@/services/workouts';
import { useTranslation } from 'react-i18next';
import { getTranslatedExerciseName } from '@/utils/exerciseTranslations';
import { useUIStore } from '@/store/uiStore';

import { RouteProp, useFocusEffect } from '@react-navigation/native';

type NavigationProp = StackNavigationProp<LibraryStackParamList, 'ExerciseSelection'>;
type ScreenRouteProp = RouteProp<LibraryStackParamList, 'ExerciseSelection'>;

interface ExerciseSelectionScreenProps {
  navigation: NavigationProp;
  route: ScreenRouteProp;
}

interface MuscleGroup {
  name: string;
  count: number;
  image?: string;
}

export const ExerciseSelectionScreen: React.FC<ExerciseSelectionScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { textSize } = useTextSizeStore();
  const { t } = useTranslation();
  const { setTabBarVisible, tabBarVisible } = useUIStore();
  const isLeavingRef = useRef(false); // Track if we're intentionally leaving
  const [selectedExercises, setSelectedExercises] = useState<string[]>(route.params?.initialSelection || []);
  const [exercises, setExercises] = useState<Array<{
    id: string;
    name: string;
    category: string;
    muscle_groups?: string[];
    equipment?: string[];
    difficulty?: string;
    image?: string;
    default_sets?: number;
    default_reps?: number;
    default_rest_time?: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [showMuscleGroups, setShowMuscleGroups] = useState(true);

  // Handle Tab Bar visibility - hide completely on this screen
  useFocusEffect(
    React.useCallback(() => {
      isLeavingRef.current = false;
      setTabBarVisible(false);
      return () => {
        // Only restore if not intentionally leaving (e.g., navigating to WorkoutBuilder)
        if (!isLeavingRef.current) {
          setTabBarVisible(true);
        }
      };
    }, [setTabBarVisible])
  );

  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  // Load exercises from Supabase
  React.useEffect(() => {
    const loadExercises = async () => {
      try {
        setLoading(true);
        const exercisesData = await workoutService.getExercises();
        // Transform to match expected format
        const transformedExercises = exercisesData.map(ex => ({
          id: ex.id,
          name: ex.name,
          category: ex.category,
          muscle_groups: ex.muscle_groups,
          equipment: ex.equipment,
          difficulty: ex.difficulty,
          image: ex.image_url,
          default_sets: ex.default_sets,
          default_reps: ex.default_reps,
          default_rest_time: ex.default_rest_time,
        }));
        setExercises(transformedExercises);
      } catch (error) {
        console.error('Error loading exercises:', error);
        setExercises([]);
      } finally {
        setLoading(false);
      }
    };

    loadExercises();
  }, []);

  // Group exercises by muscle group and count
  const muscleGroups = React.useMemo(() => {
    const groups: { [key: string]: MuscleGroup } = {};

    exercises.forEach(ex => {
      if (ex.muscle_groups && Array.isArray(ex.muscle_groups)) {
        ex.muscle_groups.forEach((mg: string) => {
          if (!groups[mg]) {
            groups[mg] = {
              name: mg,
              count: 0,
              image: ex.image, // Use first exercise image as thumbnail
            };
          }
          groups[mg].count++;
        });
      }
    });

    // Add "OTHERS" category for exercises without muscle groups
    const exercisesWithoutMuscleGroups = exercises.filter(
      ex => !ex.muscle_groups || ex.muscle_groups.length === 0
    );
    if (exercisesWithoutMuscleGroups.length > 0) {
      groups['OTHERS'] = {
        name: 'OTHERS',
        count: exercisesWithoutMuscleGroups.length,
      };
    }

    // Sort muscle groups: standard order first, then alphabetically
    const standardOrder = ['ABS', 'BACK', 'BICEPS', 'CALF', 'CHEST', 'FOREARMS', 'LEGS', 'SHOULDERS', 'TRICEPS', 'NECK', 'TRAPS', 'OTHERS'];
    const sorted = Object.values(groups).sort((a, b) => {
      const aIndex = standardOrder.indexOf(a.name.toUpperCase());
      const bIndex = standardOrder.indexOf(b.name.toUpperCase());

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [exercises]);

  const filteredExercises = React.useMemo(() => {
    if (!selectedMuscleGroup) return exercises;

    if (selectedMuscleGroup === 'OTHERS') {
      return exercises.filter(ex => !ex.muscle_groups || ex.muscle_groups.length === 0);
    }

    return exercises.filter(
      ex => ex.muscle_groups && ex.muscle_groups.includes(selectedMuscleGroup)
    );
  }, [exercises, selectedMuscleGroup]);

  const toggleExercise = (exerciseId: string) => {
    setSelectedExercises(prev =>
      prev.includes(exerciseId)
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handleMuscleGroupPress = (muscleGroup: string) => {
    setSelectedMuscleGroup(muscleGroup);
    setShowMuscleGroups(false);
  };

  const handleBackToMuscleGroups = () => {
    setShowMuscleGroups(true);
    setSelectedMuscleGroup(null);
  };

  const handleContinue = () => {
    const selectedExercisesData = exercises.filter(ex => selectedExercises.includes(ex.id));

    // Mark that we're intentionally leaving
    isLeavingRef.current = true;

    // If we have initialSelection, we are in "Add/Edit" mode
    if (route.params?.initialSelection) {
      navigation.navigate({
        name: 'WorkoutBuilder',
        params: {
          addedExercises: selectedExercisesData.map(ex => ({
            id: ex.id,
            name: ex.name,
            image: ex.image,
            default_sets: ex.default_sets,
            default_reps: ex.default_reps,
            default_rest_time: ex.default_rest_time,
          })),
        },
        merge: true,
      });
    } else {
      // "Create" mode
      navigation.navigate('WorkoutBuilder', {
        selectedExercises: selectedExercisesData.map(ex => ({
          id: ex.id,
          name: ex.name,
          image: ex.image,
          default_sets: ex.default_sets,
          default_reps: ex.default_reps,
          default_rest_time: ex.default_rest_time,
        })),
      });
    }
  };

  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
      backgroundColor: BRAND_BLACK,
    },
    header: {
      paddingTop: insets.top + getResponsiveSpacing(8),
      paddingBottom: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(24),
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: getResponsiveSpacing(16),
    },
    backButton: {
      width: scaleWidth(40),
      height: scaleHeight(40),
      borderRadius: scaleWidth(20),
      backgroundColor: isDark ? '#373737' : getTextColorWithOpacity(false, 0.1),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    headerTitle: {
      flex: 1,
      fontSize: getResponsiveFontSize(24),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_700Bold',
      textTransform: 'uppercase' as const,
    },
    muscleGroupsList: {
      paddingHorizontal: getResponsiveSpacing(24),
      paddingBottom: insets.bottom + getResponsiveSpacing(100),
    },
    muscleGroupRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: getResponsiveSpacing(16),
      gap: getResponsiveSpacing(16),
    },
    muscleGroupThumbnail: {
      width: scaleWidth(60),
      height: scaleHeight(60),
      borderRadius: getResponsiveSpacing(8),
      backgroundColor: isDark ? '#373737' : getTextColorWithOpacity(false, 0.1),
      overflow: 'hidden' as const,
    },
    muscleGroupThumbnailImage: {
      width: '100%' as DimensionValue,
      height: '100%' as DimensionValue,
    },
    muscleGroupInfo: {
      flex: 1,
    },
    muscleGroupName: {
      fontSize: getScaledFontSize(18),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_700Bold',
      marginBottom: getResponsiveSpacing(4),
    },
    muscleGroupCount: {
      fontSize: getScaledFontSize(14),
      color: getTextColorWithOpacity(isDark, 0.6),
      fontFamily: 'Barlow_400Regular',
    },
    muscleGroupArrow: {
      width: scaleWidth(24),
      height: scaleHeight(24),
    },
    exercisesList: {
      paddingHorizontal: getResponsiveSpacing(24),
      paddingBottom: insets.bottom + getResponsiveSpacing(100),
      gap: getResponsiveSpacing(12),
    },
    exerciseCard: {
      borderRadius: getResponsiveSpacing(12),
      borderWidth: 1,
      borderColor: isDark ? '#373737' : getTextColorWithOpacity(false, 0.2),
      backgroundColor: isDark ? '#1A1A1A' : '#FAFAFA',
    },
    exerciseCardSelected: {
      borderColor: BRAND_PRIMARY,
      borderWidth: 2,
    },
    exerciseCardContent: {
      padding: getResponsiveSpacing(16),
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: getResponsiveSpacing(12),
    },
    exerciseName: {
      flex: 1,
      fontSize: getScaledFontSize(16),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
    },
    exerciseCheck: {
      width: scaleWidth(24),
      height: scaleHeight(24),
      borderRadius: scaleWidth(12),
      borderWidth: 2,
      borderColor: BRAND_PRIMARY,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    exerciseCheckSelected: {
      backgroundColor: BRAND_PRIMARY,
    },
    continueButton: {
      position: 'absolute' as const,
      bottom: insets.bottom + getResponsiveSpacing(24),
      left: getResponsiveSpacing(24),
      right: getResponsiveSpacing(24),
      backgroundColor: BRAND_PRIMARY,
      borderRadius: getResponsiveSpacing(12),
      paddingVertical: getResponsiveSpacing(16),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      shadowColor: BRAND_BLACK,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    continueButtonDisabled: {
      backgroundColor: getTextColorWithOpacity(isDark, 0.3),
    },
    continueButtonText: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600' as const,
      color: BRAND_BLACK,
      fontFamily: 'Barlow_600SemiBold',
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
    },
  }), [isDark, textSize, BRAND_BLACK, BRAND_WHITE, BRAND_PRIMARY, insets.top, insets.bottom, selectedExercises.length]);

  if (loading) {
    return (
      <View style={dynamicStyles.container}>
        <View style={[dynamicStyles.header, { justifyContent: 'center' as const }]}>
          <Text style={dynamicStyles.headerTitle}>EXERCISES</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const }}>
          <Text style={{ color: BRAND_WHITE }}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          style={dynamicStyles.backButton}
          onPress={() => {
            if (showMuscleGroups) {
              isLeavingRef.current = true;
              setTabBarVisible(true);
              navigation.goBack();
            } else {
              handleBackToMuscleGroups();
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={BRAND_WHITE} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>EXERCISES</Text>
      </View>

      {/* Muscle Groups List or Exercises List */}
      {showMuscleGroups ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={dynamicStyles.muscleGroupsList}
        >
          {muscleGroups.map((group) => (
            <TouchableOpacity
              key={group.name}
              style={dynamicStyles.muscleGroupRow}
              onPress={() => handleMuscleGroupPress(group.name)}
              activeOpacity={0.7}
            >
              <View style={dynamicStyles.muscleGroupThumbnail}>
                {group.image ? (
                  <Image
                    source={{ uri: group.image }}
                    style={dynamicStyles.muscleGroupThumbnailImage}
                    contentFit="cover"
                  />
                ) : null}
              </View>
              <View style={dynamicStyles.muscleGroupInfo}>
                <Text style={dynamicStyles.muscleGroupName}>{group.name}</Text>
                <Text style={dynamicStyles.muscleGroupCount}>
                  {group.count} {group.count === 1 ? 'EXERCISE' : 'EXERCISES'}
                </Text>
              </View>
              <ChevronRight size={24} color={getTextColorWithOpacity(isDark, 0.6)} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={dynamicStyles.exercisesList}
        >
          {filteredExercises.length === 0 ? (
            <View style={{
              paddingVertical: getResponsiveSpacing(40),
              alignItems: 'center' as const,
            }}>
              <Text style={{
                fontSize: getScaledFontSize(16),
                color: getTextColorWithOpacity(isDark, 0.6),
                fontFamily: 'Barlow_400Regular',
              }}>
                {t('library.noExercisesFound')}
              </Text>
            </View>
          ) : (
            filteredExercises.map((exercise) => {
              const isSelected = selectedExercises.includes(exercise.id);
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    dynamicStyles.exerciseCard,
                    isSelected && dynamicStyles.exerciseCardSelected,
                  ]}
                  onPress={() => toggleExercise(exercise.id)}
                  activeOpacity={0.7}
                >
                  <View style={dynamicStyles.exerciseCardContent}>
                    <Text style={dynamicStyles.exerciseName}>
                      {getTranslatedExerciseName(exercise.name, t)}
                    </Text>
                    <View style={[
                      dynamicStyles.exerciseCheck,
                      isSelected && dynamicStyles.exerciseCheckSelected,
                    ]}>
                      {isSelected && (
                        <Check size={16} color={BRAND_BLACK} strokeWidth={3} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Continue Button */}
      {selectedExercises.length > 0 && (
        <TouchableOpacity
          style={dynamicStyles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={dynamicStyles.continueButtonText}>
            {t('library.continueButton')} ({selectedExercises.length})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

