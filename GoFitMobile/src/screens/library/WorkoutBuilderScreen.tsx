import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert, // Keep for fallback if needed, or remove if fully replaced
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp as RNRouteProp, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Trash2, Save, Plus, GripVertical, Clock, Hash, Repeat } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';
import { useTextSizeStore, getScaledFontSize } from '@/store/textSizeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';
import type { LibraryStackParamList } from '@/types';
import { workoutService } from '@/services/workouts';
import { useAuthStore } from '@/store/authStore';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { useTranslation } from 'react-i18next';
import { getTranslatedExerciseName } from '@/utils/exerciseTranslations';
import { toastManager } from '@/components/shared/Toast';
import { useUIStore } from '@/store/uiStore';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NavigationProp = StackNavigationProp<LibraryStackParamList, 'WorkoutBuilder'>;
type RouteProp = RNRouteProp<LibraryStackParamList, 'WorkoutBuilder'>;

interface WorkoutBuilderScreenProps {
  navigation: NavigationProp;
  route: RouteProp;
}

interface ExerciseConfig {
  id: string;
  name: string;
  sets: string;
  reps: string;
  restTime: string;
  day?: number;
  image?: string;
}

export const WorkoutBuilderScreen: React.FC<WorkoutBuilderScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { textSize } = useTextSizeStore();
  const { user } = useAuthStore();
  const { loadWorkouts } = useWorkoutsStore();
  const { t } = useTranslation();
  const { setTabBarVisible, tabBarVisible } = useUIStore(); // Access UI store for tab bar visibility
  const isLeavingRef = useRef(false); // Track if we're intentionally leaving

  const isEditMode = !!route.params.workoutId;
  const [workoutName, setWorkoutName] = useState(route.params.workoutName || '');

  // Initialize exercises
  const [exercises, setExercises] = useState<ExerciseConfig[]>(
    route.params.workoutExercises
      ? route.params.workoutExercises.map((ex: ExerciseConfig) => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        restTime: ex.restTime,
        day: (ex as any).day || 1,
      }))
      : route.params.selectedExercises?.map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        sets: ex.default_sets?.toString() || '3',
        reps: ex.default_reps?.toString() || '12',
        restTime: ex.default_rest_time?.toString() || '60',
        day: 1,
      })) || []
  );

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Handle Tab Bar visibility - hide completely on this screen
  useFocusEffect(
    React.useCallback(() => {
      isLeavingRef.current = false;
      setTabBarVisible(false);
      return () => {
        // Only restore if not intentionally leaving (e.g., saving workout)
        if (!isLeavingRef.current) {
          setTabBarVisible(true);
        }
      };
    }, [setTabBarVisible])
  );

  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  // Staggered Entrance Animation
  const fadeAnims = useRef(exercises.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(50,
      fadeAnims.map(anim =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  const updateExercise = (id: string, field: keyof ExerciseConfig, value: string | number) => {
    setExercises(prev =>
      prev.map((ex: ExerciseConfig) =>
        ex.id === id ? { ...ex, [field]: value } : ex
      )
    );
  };

  const removeExercise = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExercises(prev => prev.filter((ex: ExerciseConfig) => ex.id !== id));
  };

  // Handle new exercises from selection screen
  useEffect(() => {
    if (route.params?.addedExercises) {
      const newExercises = route.params.addedExercises;
      // Filter out duplicates
      const currentIds = new Set(exercises.map(e => e.id));
      const toAdd = newExercises
        .filter(e => !currentIds.has(e.id))
        .map(e => ({
          id: e.id,
          name: e.name,
          sets: e.default_sets?.toString() || '3',
          reps: e.default_reps?.toString() || '12',
          restTime: e.default_rest_time?.toString() || '60',
          day: 1, // Default to day 1, user can change
          image: e.image,
        }));

      if (toAdd.length > 0) {
        setExercises(prev => [...prev, ...toAdd]);
      }

      // Clear params to avoid re-processing
      navigation.setParams({ addedExercises: undefined });
    }
  }, [route.params?.addedExercises]);

  const handleAddExercise = () => {
    navigation.navigate('ExerciseSelection', {
      initialSelection: exercises.map(e => e.id),
    });
  };

  // Group exercises by day
  const exercisesByDay = React.useMemo(() => {
    const grouped: Record<number, ExerciseConfig[]> = {};
    exercises.forEach((ex: ExerciseConfig) => {
      const day = ex.day || 1;
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(ex);
    });
    return grouped;
  }, [exercises]);

  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      toastManager.error(t('library.workoutNameRequired') || 'Please enter a workout name');
      return;
    }

    if (exercises.length === 0) {
      toastManager.error(t('library.addExercises') || 'Please add exercises to your workout');
      return;
    }

    if (!user?.id) {
      toastManager.error(t('library.mustBeLoggedIn') || 'You must be logged in to save workouts');
      return;
    }

    try {
      const exerciseConfigs = exercises.map((ex: ExerciseConfig) => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        restTime: ex.restTime,
        day: ex.day || 1,
      }));

      const imageUrl = (exercises[0] as any)?.image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800';

      if (isEditMode && route.params.workoutId) {
        await workoutService.updateCustomWorkout(route.params.workoutId, user.id, {
          name: workoutName.trim(),
          difficulty: 'Custom',
          image_url: imageUrl,
          exercises: exerciseConfigs,
        });
        // Force refresh workouts
        await loadWorkouts(user.id, true);
        toastManager.success(t('library.workoutUpdated') || 'Workout updated successfully');
        // Mark that we're intentionally leaving and restore tab bar
        isLeavingRef.current = true;
        setTabBarVisible(true);
        // Use popToTop to reset the stack to LibraryMain (index 0)
        navigation.popToTop();
      } else {
        await workoutService.createCustomWorkout(user.id, {
          name: workoutName.trim(),
          difficulty: 'Custom',
          image_url: imageUrl,
          exercises: exerciseConfigs,
        });
        // Force refresh workouts
        await loadWorkouts(user.id, true);
        toastManager.success(t('library.workoutSaved') || 'Workout saved successfully');
        // Mark that we're intentionally leaving and restore tab bar
        isLeavingRef.current = true;
        setTabBarVisible(true);
        // Use popToTop to reset the stack to LibraryMain (index 0)
        navigation.popToTop();
      }
    } catch (error: any) {
      console.error('Error saving workout:', error);
      toastManager.error(error.message || t('library.failedToSave') || 'Failed to save workout');
    }
  };

  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
      backgroundColor: BRAND_BLACK,
    },
    header: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      paddingTop: insets.top + getResponsiveSpacing(12),
      paddingBottom: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(24),
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      zIndex: 10,
    },
    backButton: {
      width: scaleWidth(40),
      height: scaleHeight(40),
      borderRadius: scaleWidth(20),
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: getResponsiveSpacing(16),
    },
    titleInput: {
      flex: 1,
      fontSize: getResponsiveFontSize(24),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_700Bold',
      padding: 0,
    },
    content: {
      paddingTop: insets.top + getResponsiveSpacing(80),
      paddingHorizontal: getResponsiveSpacing(20),
      paddingBottom: insets.bottom + getResponsiveSpacing(100),
    },
    section: {
      marginBottom: getResponsiveSpacing(32),
    },
    dayHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: getResponsiveSpacing(16),
      paddingHorizontal: getResponsiveSpacing(4),
    },
    dayBadge: {
      backgroundColor: getPrimaryWithOpacity(0.15),
      paddingHorizontal: getResponsiveSpacing(12),
      paddingVertical: getResponsiveSpacing(6),
      borderRadius: getResponsiveSpacing(12),
      marginRight: getResponsiveSpacing(12),
      borderWidth: 1,
      borderColor: BRAND_PRIMARY,
    },
    dayBadgeText: {
      color: BRAND_PRIMARY,
      fontSize: getScaledFontSize(14),
      fontWeight: '700' as const,
      fontFamily: 'Barlow_700Bold',
    },
    dayTitle: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
    },
    exerciseItem: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      backgroundColor: isDark ? getPrimaryWithOpacity(0.05) : getPrimaryWithOpacity(0.08),
      padding: getResponsiveSpacing(16),
      borderRadius: getResponsiveSpacing(16),
      marginBottom: getResponsiveSpacing(12),
      borderWidth: 1,
      borderColor: isDark ? getPrimaryWithOpacity(0.1) : getPrimaryWithOpacity(0.15),
    },
    exerciseNumber: {
      width: scaleWidth(28),
      height: scaleHeight(28),
      borderRadius: scaleWidth(14),
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: getResponsiveSpacing(12),
      marginTop: getResponsiveSpacing(2),
    },
    exerciseNumberText: {
      fontSize: getScaledFontSize(12),
      fontWeight: '700' as const,
      color: getTextColorWithOpacity(isDark, 0.7),
      fontFamily: 'Barlow_700Bold',
    },
    exerciseContent: {
      flex: 1,
      gap: getResponsiveSpacing(12),
    },
    exerciseHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    exerciseName: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
      flex: 1,
      marginRight: getResponsiveSpacing(8),
    },
    inputRow: {
      flexDirection: 'row' as const,
      gap: getResponsiveSpacing(12),
    },
    inputContainer: {
      flex: 1,
    },
    inputLabelContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: getResponsiveSpacing(4),
      gap: getResponsiveSpacing(4),
    },
    inputLabel: {
      fontSize: getScaledFontSize(10),
      color: getTextColorWithOpacity(isDark, 0.5),
      fontFamily: 'Barlow_500Medium',
      textTransform: 'uppercase' as const,
    },
    inputField: {
      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)',
      borderRadius: getResponsiveSpacing(8),
      paddingVertical: getResponsiveSpacing(8),
      paddingHorizontal: getResponsiveSpacing(12),
      color: BRAND_WHITE,
      fontSize: getScaledFontSize(14),
      fontFamily: 'Barlow_600SemiBold',
      textAlign: 'center' as const,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    dayPickerContainer: {
      flexDirection: 'row' as const,
      gap: getResponsiveSpacing(8),
      flexWrap: 'wrap' as const,
      marginBottom: getResponsiveSpacing(8),
    },
    dayButton: {
      width: scaleWidth(28),
      height: scaleHeight(28),
      borderRadius: scaleWidth(14),
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    dayButtonActive: {
      backgroundColor: BRAND_PRIMARY,
      borderColor: BRAND_PRIMARY,
    },
    dayButtonText: {
      fontSize: getScaledFontSize(12),
      fontWeight: '600' as const,
      color: getTextColorWithOpacity(isDark, 0.6),
      fontFamily: 'Barlow_600SemiBold',
    },
    dayButtonTextActive: {
      color: BRAND_BLACK,
    },
    dayLabel: {
      fontSize: getScaledFontSize(10),
      color: getTextColorWithOpacity(isDark, 0.5),
      fontFamily: 'Barlow_500Medium',
      marginBottom: getResponsiveSpacing(4),
      textTransform: 'uppercase' as const,
    },
    deleteButton: {
      padding: getResponsiveSpacing(8),
      backgroundColor: 'rgba(255,59,48,0.1)',
      borderRadius: getResponsiveSpacing(8),
    },
    saveButton: {
      position: 'absolute' as const,
      bottom: insets.bottom + getResponsiveSpacing(24),
      left: getResponsiveSpacing(24),
      right: getResponsiveSpacing(24),
    },
    saveButtonGradient: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: getResponsiveSpacing(16),
      borderRadius: getResponsiveSpacing(16),
      gap: getResponsiveSpacing(8),
    },
    addExerciseButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: getResponsiveSpacing(16),
      borderWidth: 1,
      borderColor: BRAND_PRIMARY,
      borderStyle: 'dashed' as const,
      borderRadius: getResponsiveSpacing(16),
      marginTop: getResponsiveSpacing(16),
      marginBottom: getResponsiveSpacing(32),
      backgroundColor: isDark ? 'rgba(74, 222, 128, 0.05)' : 'rgba(74, 222, 128, 0.05)',
    },
    addExerciseText: {
      color: BRAND_PRIMARY,
      fontWeight: '600' as const,
      fontSize: getScaledFontSize(16),
      marginLeft: getResponsiveSpacing(8),
      fontFamily: 'Barlow_600SemiBold',
    }
  }), [isDark, textSize, BRAND_BLACK, BRAND_WHITE, BRAND_PRIMARY, insets]);

  // Render logic for a single exercise item
  const renderExerciseItem = (exercise: ExerciseConfig, index: number) => {
    // Dynamic fade key based on index to ensure staggering visual
    // Note: In a real large list we'd want stable IDs for animations, but this works for builder
    const anim = fadeAnims[index] || new Animated.Value(1);

    return (
      <Animated.View
        key={exercise.id}
        style={[dynamicStyles.exerciseItem, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}
      >
        <View style={dynamicStyles.exerciseNumber}>
          <Text style={dynamicStyles.exerciseNumberText}>{index + 1}</Text>
        </View>

        <View style={dynamicStyles.exerciseContent}>
          <View style={dynamicStyles.exerciseHeader}>
            <Text style={dynamicStyles.exerciseName} numberOfLines={2}>
              {getTranslatedExerciseName(exercise.name, t)}
            </Text>
            <TouchableOpacity
              onPress={() => removeExercise(exercise.id)}
              style={dynamicStyles.deleteButton}
            >
              <Trash2 size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>

          {/* Day Selection Picker */}
          <View>
            <Text style={dynamicStyles.dayLabel}>{t('library.daySelection.title') || 'Day'}</Text>
            <View style={dynamicStyles.dayPickerContainer}>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    dynamicStyles.dayButton,
                    (exercise.day || 1) === num && dynamicStyles.dayButtonActive
                  ]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    updateExercise(exercise.id, 'day', num);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    dynamicStyles.dayButtonText,
                    (exercise.day || 1) === num && dynamicStyles.dayButtonTextActive
                  ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={dynamicStyles.inputRow}>
            <View style={dynamicStyles.inputContainer}>
              <View style={dynamicStyles.inputLabelContainer}>
                <Hash size={10} color={getTextColorWithOpacity(isDark, 0.5)} />
                <Text style={dynamicStyles.inputLabel}>{t('library.sets')}</Text>
              </View>
              <TextInput
                style={dynamicStyles.inputField}
                value={exercise.sets}
                onChangeText={(v) => updateExercise(exercise.id, 'sets', v)}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>

            <View style={dynamicStyles.inputContainer}>
              <View style={dynamicStyles.inputLabelContainer}>
                <Repeat size={10} color={getTextColorWithOpacity(isDark, 0.5)} />
                <Text style={dynamicStyles.inputLabel}>{t('library.reps')}</Text>
              </View>
              <TextInput
                style={dynamicStyles.inputField}
                value={exercise.reps}
                onChangeText={(v) => updateExercise(exercise.id, 'reps', v)}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>

            <View style={dynamicStyles.inputContainer}>
              <View style={dynamicStyles.inputLabelContainer}>
                <Clock size={10} color={getTextColorWithOpacity(isDark, 0.5)} />
                <Text style={dynamicStyles.inputLabel}>{t('library.restTime')}</Text>
              </View>
              <TextInput
                style={dynamicStyles.inputField}
                value={exercise.restTime}
                onChangeText={(v) => updateExercise(exercise.id, 'restTime', v)}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={dynamicStyles.container}>
      {/* Animated Blur Header Background */}
      <Animated.View style={[
        StyleSheet.absoluteFillObject,
        {
          height: insets.top + 70,
          zIndex: 5,
          opacity: headerOpacity
        }
      ]}>
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
        }} />
      </Animated.View>

      <View style={dynamicStyles.header}>
        <TouchableOpacity
          style={dynamicStyles.backButton}
          onPress={() => {
            isLeavingRef.current = true;
            setTabBarVisible(true);
            navigation.goBack();
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={BRAND_WHITE} />
        </TouchableOpacity>
        <TextInput
          style={dynamicStyles.titleInput}
          placeholder={t('library.enterWorkoutName')}
          placeholderTextColor={getTextColorWithOpacity(isDark, 0.3)}
          value={workoutName}
          onChangeText={setWorkoutName}
        />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={dynamicStyles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {Object.keys(exercisesByDay).length > 0 ? (
          Object.keys(exercisesByDay)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(dayStr => {
              const day = parseInt(dayStr);
              return (
                <View key={day} style={dynamicStyles.section}>
                  <View style={dynamicStyles.dayHeader}>
                    <View style={dynamicStyles.dayBadge}>
                      <Text style={dynamicStyles.dayBadgeText}>Day {day}</Text>
                    </View>
                    <Text style={dynamicStyles.dayTitle}>
                      {t('library.daySelection.day', { number: day }).split(' ')[0]} {day}
                    </Text>
                  </View>

                  {exercisesByDay[day].map((exercise, index) =>
                    renderExerciseItem(exercise, index)
                  )}
                </View>
              );
            })
        ) : (
          <View style={{ alignItems: 'center', marginTop: 100, opacity: 0.5 }}>
            <Text style={{ color: BRAND_WHITE, fontFamily: 'Barlow_500Medium' }}>
              {t('library.addExercises')}
            </Text>
          </View>
        )}

        {/* Add Exercise Button */}
        <TouchableOpacity
          style={dynamicStyles.addExerciseButton}
          onPress={handleAddExercise}
          activeOpacity={0.7}
        >
          <Plus size={20} color={BRAND_PRIMARY} />
          <Text style={dynamicStyles.addExerciseText}>{t('library.addExercise') || 'Add Exercise'}</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      {/* Save Button */}
      <TouchableOpacity
        style={dynamicStyles.saveButton}
        onPress={saveWorkout}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[BRAND_PRIMARY, getPrimaryWithOpacity(0.8)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={dynamicStyles.saveButtonGradient}
        >
          <Save size={20} color={BRAND_BLACK} />
          <Text style={{
            fontSize: getScaledFontSize(16),
            fontWeight: '700',
            color: BRAND_BLACK,
            fontFamily: 'Barlow_700Bold',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {isEditMode ? t('library.updateWorkout') : t('library.saveWorkout')}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

