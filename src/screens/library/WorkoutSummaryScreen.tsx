import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  type DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp as RNRouteProp, StackActions } from '@react-navigation/native';
import { CheckCircle, Clock, Award, Target, TrendingUp, ArrowLeft, Trophy, Sparkles, Zap, Flame } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';
import { useTextSizeStore, getScaledFontSize } from '@/store/textSizeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';
import type { LibraryStackParamList } from '@/types';
import { useTranslation } from 'react-i18next';
import { getTranslatedExerciseName } from '@/utils/exerciseTranslations';
import { Easing120Hz } from '@/utils/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = StackNavigationProp<LibraryStackParamList, 'WorkoutSummary'>;
type RouteProp = RNRouteProp<LibraryStackParamList, 'WorkoutSummary'>;

interface WorkoutSummaryScreenProps {
  navigation: NavigationProp;
  route: RouteProp;
}

interface ExerciseSummary {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weights?: (number | null)[];
  completedSets?: boolean[];
  completed?: boolean;
}

export const WorkoutSummaryScreen: React.FC<WorkoutSummaryScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { textSize } = useTextSizeStore();
  const { t } = useTranslation();

  const workoutName = route.params.workoutName;
  const durationMinutes = route.params.durationMinutes || 0;
  const exercises = route.params.exercises || [];
  const completedAt = route.params.completedAt;

  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  // Animation values
  const headerScale = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const statsY = useRef(new Animated.Value(30)).current;
  const exercisesOpacity = useRef(new Animated.Value(0)).current;
  const exercisesY = useRef(new Animated.Value(30)).current;
  const trophyRotation = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;

  // Animate on mount
  useEffect(() => {
    // Header animation
    Animated.parallel([
      Animated.spring(headerScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing120Hz.easeOut,
        useNativeDriver: true,
      }),
    ]).start();

    // Trophy rotation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(trophyRotation, {
          toValue: 1,
          duration: 2000,
          easing: Easing120Hz.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(trophyRotation, {
          toValue: 0,
          duration: 2000,
          easing: Easing120Hz.easeInOut,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sparkle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing120Hz.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleOpacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing120Hz.easeInOut,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Stats animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(statsOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing120Hz.easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(statsY, {
          toValue: 0,
          duration: 400,
          easing: Easing120Hz.spring,
          useNativeDriver: true,
        }),
      ]).start();
    }, 200);

    // Exercises animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(exercisesOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing120Hz.easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(exercisesY, {
          toValue: 0,
          duration: 400,
          easing: Easing120Hz.spring,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);
  }, []);

  // Calculate statistics
  const totalExercises = exercises.length;
  const completedExercises = exercises.filter((ex: ExerciseSummary) => ex.completed).length;
  const totalSets = exercises.reduce((sum: number, ex: ExerciseSummary) => {
    const completedCount = (ex.completedSets || []).filter((completed: boolean) => completed).length;
    return sum + completedCount;
  }, 0);

  // Calculate total volume (weight × reps × sets)
  const totalVolume = exercises.reduce((sum: number, ex: ExerciseSummary) => {
    const weights = ex.weights || [];
    const repsArray = (ex.reps || '').split(',').map((r: string) => r.trim());
    const completedSets = ex.completedSets || [];

    return completedSets.reduce((exerciseSum: number, completed: boolean, setIndex: number) => {
      if (completed && weights[setIndex] !== null && weights[setIndex] !== undefined) {
        const repsForSet = parseInt(repsArray[setIndex] || repsArray[0] || '0') || 0;
        return exerciseSum + (weights[setIndex]! * repsForSet);
      }
      return exerciseSum;
    }, sum);
  }, 0);

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const trophyRotate = trophyRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
      backgroundColor: BRAND_BLACK,
    },
    header: {
      paddingTop: insets.top + getResponsiveSpacing(8),
      paddingBottom: getResponsiveSpacing(16),
      paddingHorizontal: getResponsiveSpacing(24),
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: getResponsiveSpacing(16),
      position: 'relative' as const,
      zIndex: 10,
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
      fontSize: getResponsiveFontSize(20),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
    },
    content: {
      flex: 1,
    },
    // Hero Section - Celebratory Header
    heroSection: {
      marginTop: getResponsiveSpacing(-20),
      paddingTop: getResponsiveSpacing(40),
      paddingBottom: getResponsiveSpacing(32),
      paddingHorizontal: getResponsiveSpacing(24),
      alignItems: 'center' as const,
      position: 'relative' as const,
      overflow: 'visible' as const,
    },
    heroBackground: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: getResponsiveSpacing(32),
      overflow: 'hidden' as const,
    },
    heroContent: {
      position: 'relative' as const,
      zIndex: 2,
      alignItems: 'center' as const,
      width: '100%' as DimensionValue,
    },
    trophyContainer: {
      position: 'relative' as const,
      marginBottom: getResponsiveSpacing(16),
    },
    trophyIcon: {
      width: scaleWidth(100),
      height: scaleHeight(100),
      borderRadius: scaleWidth(50),
      backgroundColor: getPrimaryWithOpacity(0.15),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 4,
      borderColor: BRAND_PRIMARY,
    },
    sparkleContainer: {
      position: 'absolute' as const,
      top: -10,
      right: -10,
    },
    sparkleContainer2: {
      position: 'absolute' as const,
      bottom: -5,
      left: -15,
    },
    heroTitle: {
      fontSize: getResponsiveFontSize(32),
      fontWeight: '800' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_800ExtraBold',
      textAlign: 'center' as const,
      marginBottom: getResponsiveSpacing(8),
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: getScaledFontSize(18),
      color: getTextColorWithOpacity(isDark, 0.8),
      fontFamily: 'Barlow_500Medium',
      textAlign: 'center' as const,
      marginBottom: getResponsiveSpacing(4),
    },
    heroDate: {
      fontSize: getScaledFontSize(13),
      color: getTextColorWithOpacity(isDark, 0.5),
      fontFamily: 'Barlow_400Regular',
      textAlign: 'center' as const,
    },
    // Stats Grid
    statsContainer: {
      paddingHorizontal: getResponsiveSpacing(20),
      marginTop: getResponsiveSpacing(24),
      marginBottom: getResponsiveSpacing(24),
    },
    statsGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: getResponsiveSpacing(12),
    },
    statCard: {
      width: (SCREEN_WIDTH - getResponsiveSpacing(52)) / 2,
      backgroundColor: isDark ? '#1a1a1a' : getTextColorWithOpacity(false, 0.05),
      borderRadius: getResponsiveSpacing(20),
      padding: getResponsiveSpacing(20),
      borderWidth: 1.5,
      borderColor: isDark ? getPrimaryWithOpacity(0.25) : getPrimaryWithOpacity(0.2),
      overflow: 'hidden' as const,
    },
    statCardFullWidth: {
      width: '100%' as DimensionValue,
      backgroundColor: isDark ? '#1a1a1a' : getTextColorWithOpacity(false, 0.05),
      borderRadius: getResponsiveSpacing(20),
      padding: getResponsiveSpacing(20),
      borderWidth: 1.5,
      borderColor: isDark ? getPrimaryWithOpacity(0.25) : getPrimaryWithOpacity(0.2),
      overflow: 'hidden' as const,
    },
    statIconContainer: {
      width: scaleWidth(56),
      height: scaleHeight(56),
      borderRadius: scaleWidth(28),
      backgroundColor: getPrimaryWithOpacity(0.2),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginBottom: getResponsiveSpacing(12),
    },
    statValue: {
      fontSize: getResponsiveFontSize(28),
      fontWeight: '800' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_800ExtraBold',
      marginBottom: getResponsiveSpacing(4),
      letterSpacing: -0.5,
    },
    statLabel: {
      fontSize: getScaledFontSize(12),
      color: getTextColorWithOpacity(isDark, 0.6),
      fontFamily: 'Barlow_500Medium',
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
    },
    statUnit: {
      fontSize: getScaledFontSize(14),
      color: getTextColorWithOpacity(isDark, 0.5),
      fontFamily: 'Barlow_400Regular',
      marginLeft: getResponsiveSpacing(4),
    },
    // Volume card - full width
    volumeCard: {
      width: '100%' as DimensionValue,
      marginTop: getResponsiveSpacing(12),
      backgroundColor: isDark ? '#1a1a1a' : getTextColorWithOpacity(false, 0.05),
      borderRadius: getResponsiveSpacing(20),
      padding: getResponsiveSpacing(24),
      borderWidth: 2,
      borderColor: BRAND_PRIMARY,
      overflow: 'hidden' as const,
      position: 'relative' as const,
    },
    volumeContent: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    volumeLeft: {
      flex: 1,
    },
    volumeLabel: {
      fontSize: getScaledFontSize(12),
      color: getTextColorWithOpacity(isDark, 0.6),
      fontFamily: 'Barlow_500Medium',
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
      marginBottom: getResponsiveSpacing(8),
    },
    volumeValue: {
      fontSize: getResponsiveFontSize(36),
      fontWeight: '800' as const,
      color: BRAND_PRIMARY,
      fontFamily: 'Barlow_800ExtraBold',
      letterSpacing: -1,
    },
    volumeIcon: {
      width: scaleWidth(64),
      height: scaleHeight(64),
      borderRadius: scaleWidth(32),
      backgroundColor: getPrimaryWithOpacity(0.2),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    // Exercises Section
    exercisesSection: {
      paddingHorizontal: getResponsiveSpacing(20),
      marginBottom: getResponsiveSpacing(24),
    },
    exercisesHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: getResponsiveSpacing(16),
      paddingHorizontal: getResponsiveSpacing(4),
    },
    exercisesTitle: {
      fontSize: getResponsiveFontSize(24),
      fontWeight: '800' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_800ExtraBold',
      letterSpacing: -0.5,
    },
    exercisesCount: {
      fontSize: getScaledFontSize(14),
      color: getTextColorWithOpacity(isDark, 0.6),
      fontFamily: 'Barlow_500Medium',
      backgroundColor: getPrimaryWithOpacity(0.15),
      paddingHorizontal: getResponsiveSpacing(12),
      paddingVertical: getResponsiveSpacing(6),
      borderRadius: getResponsiveSpacing(12),
    },
    exercisesList: {
      gap: getResponsiveSpacing(12),
    },
    exerciseCard: {
      backgroundColor: isDark ? '#1a1a1a' : getTextColorWithOpacity(false, 0.05),
      borderRadius: getResponsiveSpacing(18),
      padding: getResponsiveSpacing(18),
      borderWidth: 1,
      borderColor: isDark ? getPrimaryWithOpacity(0.2) : getPrimaryWithOpacity(0.15),
      overflow: 'hidden' as const,
    },
    exerciseHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: getResponsiveSpacing(12),
      marginBottom: getResponsiveSpacing(14),
    },
    exerciseIcon: {
      width: scaleWidth(40),
      height: scaleHeight(40),
      borderRadius: scaleWidth(20),
      backgroundColor: getPrimaryWithOpacity(0.15),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    exerciseName: {
      flex: 1,
      fontSize: getScaledFontSize(17),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_700Bold',
    },
    exerciseSets: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: getResponsiveSpacing(8),
    },
    setBadge: {
      paddingHorizontal: getResponsiveSpacing(12),
      paddingVertical: getResponsiveSpacing(8),
      borderRadius: getResponsiveSpacing(10),
      backgroundColor: getPrimaryWithOpacity(0.15),
      borderWidth: 1,
      borderColor: getPrimaryWithOpacity(0.3),
    },
    setBadgeText: {
      fontSize: getScaledFontSize(13),
      fontWeight: '600' as const,
      color: BRAND_PRIMARY,
      fontFamily: 'Barlow_600SemiBold',
    },
    notCompletedText: {
      fontSize: getScaledFontSize(13),
      color: getTextColorWithOpacity(isDark, 0.4),
      fontFamily: 'Barlow_400Regular',
      fontStyle: 'italic' as const,
    },
    // Done Button
    doneButton: {
      marginHorizontal: getResponsiveSpacing(20),
      marginBottom: insets.bottom + getResponsiveSpacing(24),
      borderRadius: getResponsiveSpacing(18),
      paddingVertical: getResponsiveSpacing(20),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
      shadowColor: BRAND_PRIMARY,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    doneButtonText: {
      fontSize: getScaledFontSize(18),
      fontWeight: '700' as const,
      color: BRAND_BLACK,
      fontFamily: 'Barlow_700Bold',
      textTransform: 'uppercase' as const,
      letterSpacing: 2,
    },
  }), [isDark, textSize, BRAND_BLACK, BRAND_WHITE, BRAND_PRIMARY, insets.top, insets.bottom]);

  return (
    <View style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          style={dynamicStyles.backButton}
          onPress={() => {
            if (route.params?.returnTo === 'Plan') {
              // Navigation warning fix: popToTop handled automatically or unnecessary
              navigation.navigate('Workouts' as any, { screen: 'WorkoutsMain' });
            } else {
              navigation.navigate('LibraryMain');
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={BRAND_WHITE} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle} numberOfLines={1}>
          {t('library.workoutSummary.title')}
        </Text>
      </View>

      <ScrollView
        style={dynamicStyles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + getResponsiveSpacing(120) }}
      >
        {/* Hero Section - Celebratory Header */}
        <Animated.View
          style={[
            dynamicStyles.heroSection,
            {
              opacity: headerOpacity,
              transform: [{ scale: headerScale }],
            },
          ]}
        >
          <LinearGradient
            colors={isDark
              ? [getPrimaryWithOpacity(0.15), getPrimaryWithOpacity(0.05), 'transparent']
              : [getPrimaryWithOpacity(0.1), getPrimaryWithOpacity(0.03), 'transparent']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={dynamicStyles.heroBackground}
          />
          <View style={dynamicStyles.heroContent}>
            <View style={dynamicStyles.trophyContainer}>
              <Animated.View
                style={[
                  dynamicStyles.trophyIcon,
                  { transform: [{ rotate: trophyRotate }] },
                ]}
              >
                <Trophy size={56} color={BRAND_PRIMARY} fill={BRAND_PRIMARY} />
              </Animated.View>
              <Animated.View
                style={[
                  dynamicStyles.sparkleContainer,
                  { opacity: sparkleOpacity },
                ]}
              >
                <Sparkles size={24} color={BRAND_PRIMARY} />
              </Animated.View>
              <Animated.View
                style={[
                  dynamicStyles.sparkleContainer2,
                  { opacity: sparkleOpacity },
                ]}
              >
                <Zap size={20} color={BRAND_PRIMARY} />
              </Animated.View>
            </View>
            <Text style={dynamicStyles.heroTitle}>
              {t('library.workoutSummary.workoutCompleted')}
            </Text>
            <Text style={dynamicStyles.heroSubtitle}>
              {workoutName}
            </Text>
            {completedAt && (
              <Text style={dynamicStyles.heroDate}>
                {formatDate(completedAt)}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View
          style={[
            dynamicStyles.statsContainer,
            {
              opacity: statsOpacity,
              transform: [{ translateY: statsY }],
            },
          ]}
        >
          <View style={dynamicStyles.statsGrid}>
            {/* Duration */}
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={dynamicStyles.statCard}>
              <LinearGradient
                colors={isDark
                  ? [getPrimaryWithOpacity(0.1), 'transparent']
                  : [getPrimaryWithOpacity(0.05), 'transparent']
                }
                style={StyleSheet.absoluteFill}
              />
              <View style={dynamicStyles.statIconContainer}>
                <Clock size={28} color={BRAND_PRIMARY} />
              </View>
              <Text style={dynamicStyles.statValue}>
                {formatDuration(durationMinutes)}
              </Text>
              <Text style={dynamicStyles.statLabel}>
                {t('library.workoutSummary.duration')}
              </Text>
            </BlurView>

            {/* Exercises */}
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={dynamicStyles.statCard}>
              <LinearGradient
                colors={isDark
                  ? [getPrimaryWithOpacity(0.1), 'transparent']
                  : [getPrimaryWithOpacity(0.05), 'transparent']
                }
                style={StyleSheet.absoluteFill}
              />
              <View style={dynamicStyles.statIconContainer}>
                <Target size={28} color={BRAND_PRIMARY} />
              </View>
              <Text style={dynamicStyles.statValue}>
                {completedExercises}
                <Text style={dynamicStyles.statUnit}>/{totalExercises}</Text>
              </Text>
              <Text style={dynamicStyles.statLabel}>
                {t('library.workoutSummary.exercises')}
              </Text>
            </BlurView>

            {/* Sets - Full Width */}
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={dynamicStyles.statCardFullWidth}>
              <LinearGradient
                colors={isDark
                  ? [getPrimaryWithOpacity(0.1), 'transparent']
                  : [getPrimaryWithOpacity(0.05), 'transparent']
                }
                style={StyleSheet.absoluteFill}
              />
              <View style={dynamicStyles.statIconContainer}>
                <Award size={28} color={BRAND_PRIMARY} />
              </View>
              <Text style={dynamicStyles.statValue}>
                {totalSets}
              </Text>
              <Text style={dynamicStyles.statLabel}>
                {t('library.workoutSummary.totalSets')}
              </Text>
            </BlurView>
          </View>

          {/* Total Volume - Full Width */}
          {totalVolume > 0 && (
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={dynamicStyles.volumeCard}>
              <LinearGradient
                colors={[getPrimaryWithOpacity(0.2), getPrimaryWithOpacity(0.05)]}
                style={StyleSheet.absoluteFill}
              />
              <View style={dynamicStyles.volumeContent}>
                <View style={dynamicStyles.volumeLeft}>
                  <Text style={dynamicStyles.volumeLabel}>
                    {t('library.workoutSummary.totalVolume')}
                  </Text>
                  <Text style={dynamicStyles.volumeValue}>
                    {totalVolume.toFixed(0)} <Text style={{ fontSize: getScaledFontSize(20) }}>{t('library.weightKg')}</Text>
                  </Text>
                </View>
                <View style={dynamicStyles.volumeIcon}>
                  <Flame size={36} color={BRAND_PRIMARY} />
                </View>
              </View>
            </BlurView>
          )}
        </Animated.View>

        {/* Exercises List */}
        {exercises.length > 0 && (
          <Animated.View
            style={[
              dynamicStyles.exercisesSection,
              {
                opacity: exercisesOpacity,
                transform: [{ translateY: exercisesY }],
              },
            ]}
          >
            <View style={dynamicStyles.exercisesHeader}>
              <Text style={dynamicStyles.exercisesTitle}>
                {t('library.workoutSummary.exercisesList')}
              </Text>
              <Text style={dynamicStyles.exercisesCount}>
                {completedExercises}
              </Text>
            </View>
            <View style={dynamicStyles.exercisesList}>
              {exercises.map((exercise: ExerciseSummary, index: number) => {
                const weights = exercise.weights || [];
                const repsArray = (exercise.reps || '').split(',').map((r: string) => r.trim());
                const completedSets = exercise.completedSets || [];
                const completedCount = completedSets.filter((c: boolean) => c).length;

                return (
                  <BlurView
                    key={exercise.id || index}
                    intensity={15}
                    tint={isDark ? "dark" : "light"}
                    style={dynamicStyles.exerciseCard}
                  >
                    <LinearGradient
                      colors={isDark
                        ? [getPrimaryWithOpacity(0.08), 'transparent']
                        : [getPrimaryWithOpacity(0.03), 'transparent']
                      }
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={dynamicStyles.exerciseHeader}>
                      <View style={dynamicStyles.exerciseIcon}>
                        <Target size={20} color={BRAND_PRIMARY} />
                      </View>
                      <Text style={dynamicStyles.exerciseName} numberOfLines={2}>
                        {getTranslatedExerciseName(exercise.name, t)}
                      </Text>
                    </View>
                    <View style={dynamicStyles.exerciseSets}>
                      {completedSets.map((completed: boolean, setIndex: number) => {
                        if (!completed) return null;
                        const weight = weights[setIndex];
                        const reps = repsArray[setIndex] || repsArray[0] || '0';
                        return (
                          <View key={setIndex} style={dynamicStyles.setBadge}>
                            <Text style={dynamicStyles.setBadgeText}>
                              {t('library.workoutSession.set', { number: setIndex + 1 })}{' '}
                              {weight !== null && weight !== undefined ? `${weight}${t('library.weightKg')} × ` : ''}
                              {reps} {t('library.reps').toLowerCase()}
                            </Text>
                          </View>
                        );
                      })}
                      {completedCount === 0 && (
                        <Text style={dynamicStyles.notCompletedText}>
                          {t('library.workoutSummary.notCompleted')}
                        </Text>
                      )}
                    </View>
                  </BlurView>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Done Button */}
        <TouchableOpacity
          style={dynamicStyles.doneButton}
          onPress={() => {
            if (route.params?.returnTo === 'Plan') {
              // Navigation warning fix: popToTop handled automatically or unnecessary
              navigation.navigate('Workouts' as any, { screen: 'WorkoutsMain' });
            } else {
              navigation.navigate('LibraryMain');
            }
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[BRAND_PRIMARY, theme.colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={dynamicStyles.doneButtonText}>
            {t('library.workoutSummary.done')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
