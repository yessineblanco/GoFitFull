import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp as RNRouteProp, StackActions, CommonActions } from '@react-navigation/native';
import { ArrowLeft, Clock, Dumbbell, Play, Check, Calendar, ChevronRight, ChevronDown, Activity, TrendingUp, Zap, Target } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useWorkoutPlansStore } from '@/store/workoutPlansStore';
import { useThemeStore } from '@/store/themeStore';
import { useTextSizeStore, getScaledFontSize } from '@/store/textSizeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';
import type { LibraryStackParamList } from '@/types';
import { useTranslation } from 'react-i18next';
import { getTranslatedExerciseName } from '@/utils/exerciseTranslations';
import { workoutService } from '@/services/workouts';
import { createWorkoutPlan } from '@/services/workoutPlans';
import { useAuthStore } from '@/store/authStore';
import { dialogManager } from '@/components/shared/CustomDialog';

type NavigationProp = StackNavigationProp<LibraryStackParamList, 'WorkoutDetail'>;

interface WorkoutDetailScreenProps {
  navigation: NavigationProp;
  route: {
    params: {
      workoutId?: string;
      workoutName?: string;
      workoutDifficulty?: string;
      workoutImage?: string;
      dateToSchedule?: string;
      returnTo?: string;
      planId?: string;
    };
  };
}

export const WorkoutDetailScreen: React.FC<WorkoutDetailScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { textSize } = useTextSizeStore();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { addPlan } = useWorkoutPlansStore();

  // Get workout data from route params
  const workoutId = route.params?.workoutId;
  const workoutName = route.params?.workoutName || '';
  const workoutDifficulty = route.params?.workoutDifficulty || 'Beginner';
  const workoutImage = route.params?.workoutImage || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800';

  // State for exercises loaded from database
  const [exercises, setExercises] = React.useState<Array<{
    id: string;
    name: string;
    sets: number;
    reps: string;
    restTime: string;
    completed: boolean;
    day?: number;
    image?: string;
  }>>([]);
  const [exercisesByDay, setExercisesByDay] = React.useState<Record<number, typeof exercises>>({});
  const [loading, setLoading] = React.useState(true);
  const [detectedWorkoutType, setDetectedWorkoutType] = React.useState<'native' | 'custom' | null>(null);
  const [expandedDay, setExpandedDay] = React.useState<number | null>(1);
  // Removed unneeded refs for tabs
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  // Helper function to start workout for a specific day
  const startWorkoutForDay = React.useCallback((day: number) => {
    if (loading || !detectedWorkoutType || !workoutId) return;

    const dayExercises = exercisesByDay[day] || [];
    if (dayExercises.length === 0) return;

    navigation.navigate('WorkoutSession', {
      workoutId: workoutId,
      workoutName: workoutName,
      workoutType: detectedWorkoutType,
      selectedDay: day,
      exercises: dayExercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets.toString(),
        reps: ex.reps,
        restTime: ex.restTime.replace('s', ''), // Remove 's' suffix
        image: ex.image, // Include image URL
      })),
      returnTo: route.params?.returnTo,
      planId: route.params?.planId,
    });
  }, [loading, detectedWorkoutType, workoutId, workoutName, exercisesByDay, navigation, route.params?.returnTo, route.params?.planId]);

  // Ensure exercisesByDay always has at least day 1 if exercises exist
  React.useEffect(() => {
    if (exercises.length > 0 && Object.keys(exercisesByDay).length === 0) {
      // If exercises exist but not grouped, group them
      const grouped: Record<number, typeof exercises> = {};
      exercises.forEach(ex => {
        const day = ex.day || 1;
        if (!grouped[day]) {
          grouped[day] = [];
        }
        grouped[day].push(ex);
      });
      setExercisesByDay(grouped);

      // Set initial expanded day to the first available day
      const firstDay = Math.min(...Object.keys(grouped).map(d => parseInt(d)));
      setExpandedDay(firstDay);
    }
  }, [exercises]);

  // Animation logic for accordion can be added here if needed, but simple conditional rendering is often snappier for lists.

  // Load workout data from database
  React.useEffect(() => {
    const loadWorkout = async () => {
      if (!workoutId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Check if it's a native workout (UUID) or custom workout
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workoutId);

        if (isValidUUID) {
          // Use unified getWorkoutById (works for both native and custom)
          const workout = await workoutService.getWorkoutById(workoutId);
          if (workout && workout.exercises) {
            const loadedExercises = workout.exercises.map((ex: any) => ({
              id: ex.id || ex.name.toLowerCase().replace(/\s+/g, '-'),
              name: ex.name,
              sets: parseInt(ex.sets) || 3, // Convert to number to match type
              reps: ex.reps || '10',
              restTime: `${ex.restTime || 60}s`,
              image: ex.image, // Include image URL
              completed: false,
              day: ex.day || 1, // Include day field
            }));
            setExercises(loadedExercises);

            // Group exercises by day
            const grouped: Record<number, typeof loadedExercises> = {};
            loadedExercises.forEach(ex => {
              const day = ex.day || 1;
              if (!grouped[day]) {
                grouped[day] = [];
              }
              grouped[day].push(ex);
            });
            setExercisesByDay(grouped);

            setDetectedWorkoutType(workout.workout_type);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading workout:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkout();
  }, [workoutId]);

  // handle schedule workout
  const handleScheduleWorkout = async (day: number | undefined = undefined) => {
    if (!user?.id || !workoutId || !route.params?.dateToSchedule) return;

    try {
      await addPlan(
        workoutId,
        route.params.dateToSchedule,
        day // Pass the day parameter
      );

      // Reset Library stack to LibraryMain before navigating back to Plan
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'LibraryMain' }],
        })
      );
      // Navigate back to Plan tab (named 'Workouts' in AppNavigator)
      navigation.getParent()?.navigate('Workouts', { screen: 'WorkoutsMain' });

      // Optional: Show success message/toast
      dialogManager.success(t('common.success'), t('plan.workoutScheduled'));

    } catch (error: any) {
      console.error('Error scheduling workout:', error);

      if (error?.code === '23505') {
        dialogManager.error(t('common.error'), t('plan.alreadyScheduled'));
      } else {
        dialogManager.error(t('common.error'), t('plan.scheduleError'));
      }
    }
  };

  // Theme colors
  const BRAND_BLACK = getBackgroundColor(isDark);

  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  // Dynamic styles
  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
      backgroundColor: BRAND_BLACK,
    },
    heroImage: {
      width: '100%' as any,
      height: scaleHeight(280),
      borderTopLeftRadius: getResponsiveSpacing(8),
      borderTopRightRadius: getResponsiveSpacing(8),
    },
    heroGradient: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: '60%' as any,
      borderTopLeftRadius: getResponsiveSpacing(8),
      borderTopRightRadius: getResponsiveSpacing(8),
    },
    backButton: {
      position: 'absolute' as const,
      top: insets.top + getResponsiveSpacing(10),
      left: getResponsiveSpacing(16),
      zIndex: 10,
      width: scaleWidth(40),
      height: scaleHeight(40),
      borderRadius: scaleWidth(20),
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    contentCard: {
      backgroundColor: BRAND_BLACK,
      borderTopLeftRadius: getResponsiveSpacing(50),
      borderTopRightRadius: getResponsiveSpacing(50),
      marginTop: -getResponsiveSpacing(50),
      paddingTop: getResponsiveSpacing(50),
      paddingHorizontal: getResponsiveSpacing(24),
      paddingBottom: getResponsiveSpacing(100),
    },
    badgeContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: getResponsiveSpacing(20),
    },
    badgeIconContainer: {
      width: scaleWidth(32),
      height: scaleHeight(32),
      borderRadius: scaleWidth(16),
      backgroundColor: getPrimaryWithOpacity(0.15),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: getResponsiveSpacing(10),
    },
    difficultyBadge: {
      fontSize: getScaledFontSize(theme.typography.h4.fontSize),
      fontWeight: '500' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_500Medium',
      letterSpacing: 0.5,
    },
    workoutTitle: {
      fontSize: getScaledFontSize(theme.typography.h2.fontSize),
      color: BRAND_WHITE,
      fontFamily: "Barlow_800ExtraBold",
      marginBottom: getResponsiveSpacing(24),
    },
    infoCardsContainer: {
      flexDirection: 'row' as const,
      gap: getResponsiveSpacing(12),
      marginBottom: getResponsiveSpacing(28),
    },
    infoCard: {
      flex: 1,
      borderRadius: getResponsiveSpacing(12),
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: '#266637',
    },
    infoCardContent: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      padding: getResponsiveSpacing(16),
    },
    infoCardTextContainer: {
      marginLeft: getResponsiveSpacing(12),
      flex: 1,
    },
    infoCardLabel: {
      fontSize: getScaledFontSize(theme.typography.small.fontSize),
      color: getTextColorWithOpacity(isDark, 0.6),
      fontFamily: 'Barlow_400Regular',
      marginBottom: getResponsiveSpacing(4),
    },
    infoCardValue: {
      fontSize: getScaledFontSize(theme.typography.body.fontSize),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
    },
    descriptionContainer: {
      marginBottom: getResponsiveSpacing(32),
      padding: getResponsiveSpacing(20),
      backgroundColor: isDark ? getPrimaryWithOpacity(0.05) : getPrimaryWithOpacity(0.08),
      borderRadius: getResponsiveSpacing(16),
      borderWidth: 1,
      borderColor: isDark ? getPrimaryWithOpacity(0.1) : getPrimaryWithOpacity(0.15),
    },
    descriptionTitle: {
      fontSize: getScaledFontSize(theme.typography.h4.fontSize),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
      marginBottom: getResponsiveSpacing(12),
    },
    description: {
      fontSize: getScaledFontSize(theme.typography.body.fontSize),
      lineHeight: getScaledFontSize(22),
      color: getTextColorWithOpacity(isDark, 0.7),
      fontFamily: 'Barlow_400Regular',
    },
    startButton: {
      borderRadius: getResponsiveSpacing(12),
      overflow: 'hidden' as const,
      marginBottom: getResponsiveSpacing(32),
      ...(isDark ? {} : {
        shadowColor: BRAND_PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }),
    },
    startButtonGradient: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: getResponsiveSpacing(16),
      paddingHorizontal: getResponsiveSpacing(24),
      gap: getResponsiveSpacing(12),
    },
    startButtonText: {
      fontSize: getScaledFontSize(theme.typography.h4.fontSize),
      fontWeight: '600' as const,
      color: BRAND_BLACK,
      fontFamily: 'Barlow_600SemiBold',
      letterSpacing: 0.5,
    },
    exercisesSection: {
      marginTop: getResponsiveSpacing(8),
    },
    exercisesSectionTitle: {
      fontSize: getScaledFontSize(theme.typography.h2.fontSize),
      fontWeight: 'normal' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_800ExtraBold',
      marginBottom: getResponsiveSpacing(20),
      letterSpacing: 0.5,
    },
    exercisesList: {
      gap: getResponsiveSpacing(12),
    },
    daySection: {
      marginBottom: getResponsiveSpacing(24),
    },
    daySectionCard: {
      borderRadius: getResponsiveSpacing(20),
      overflow: 'hidden' as const,
      marginBottom: getResponsiveSpacing(16),
      backgroundColor: isDark ? getPrimaryWithOpacity(0.1) : getPrimaryWithOpacity(0.15),
      borderWidth: 1,
      borderColor: isDark ? getPrimaryWithOpacity(0.2) : getPrimaryWithOpacity(0.3),
      ...(isDark ? {} : {
        shadowColor: BRAND_PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }),
    },
    dayHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      padding: getResponsiveSpacing(16),
      backgroundColor: getPrimaryWithOpacity(0.1),
      borderBottomWidth: 1,
      borderBottomColor: getPrimaryWithOpacity(0.2),
    },
    dayHeaderLeft: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 1,
    },
    dayIconContainer: {
      width: scaleWidth(40),
      height: scaleHeight(40),
      borderRadius: scaleWidth(20),
      backgroundColor: BRAND_PRIMARY,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: getResponsiveSpacing(12),
    },
    dayTitle: {
      fontSize: getScaledFontSize(theme.typography.h3.fontSize),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_700Bold',
      flex: 1,
    },
    dayExerciseCount: {
      fontSize: getScaledFontSize(theme.typography.caption.fontSize),
      color: getTextColorWithOpacity(isDark, 0.7),
      fontFamily: 'Barlow_400Regular',
    },
    dayExercisesContainer: {
      padding: getResponsiveSpacing(12),
      gap: getResponsiveSpacing(10),
    },
    dayTabsContainer: {
      marginBottom: getResponsiveSpacing(28),
      paddingVertical: getResponsiveSpacing(16),
      paddingHorizontal: getResponsiveSpacing(4),
    },
    dayTabsScroll: {
      paddingHorizontal: getResponsiveSpacing(8),
    },
    dayTabRow: {
      flexDirection: 'row' as const,
      gap: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(4),
    },
    dayTab: {
      minWidth: scaleWidth(70),
      paddingVertical: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(16),
      borderRadius: getResponsiveSpacing(16),
      borderWidth: 0,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      position: 'relative' as const,
      overflow: 'visible' as const,
    },
    dayTabActive: {
      borderWidth: 0,
      ...(isDark ? {} : {
        shadowColor: BRAND_PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 10,
      }),
    },
    dayTabInactive: {
      borderWidth: 1,
      borderColor: isDark ? getPrimaryWithOpacity(0.15) : getPrimaryWithOpacity(0.25),
    },
    dayTabGradientActive: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: getResponsiveSpacing(20),
    },
    dayTabGradientInactive: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: getResponsiveSpacing(20),
    },
    dayTabContent: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      zIndex: 1,
      width: '100%' as any,
    },
    dayTabIconContainer: {
      width: scaleWidth(44),
      height: scaleHeight(44),
      borderRadius: scaleWidth(22),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginBottom: getResponsiveSpacing(8),
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
    },
    dayTabIconContainerInactive: {
      backgroundColor: isDark ? getPrimaryWithOpacity(0.1) : getPrimaryWithOpacity(0.15),
    },
    dayTabNumber: {
      fontSize: getScaledFontSize(theme.typography.h3.fontSize),
      fontWeight: '700' as const,
      fontFamily: 'Barlow_700Bold',
      marginBottom: getResponsiveSpacing(6),
    },
    dayTabNumberActive: {
      color: BRAND_BLACK,
    },
    dayTabNumberInactive: {
      color: getTextColorWithOpacity(isDark, 0.6),
    },
    dayTabLabel: {
      fontSize: getScaledFontSize(theme.typography.small.fontSize),
      fontWeight: '700' as const,
      fontFamily: 'Barlow_700Bold',
      textTransform: 'uppercase' as const,
      letterSpacing: 1.5,
      marginBottom: getResponsiveSpacing(4),
    },
    dayTabLabelActive: {
      color: BRAND_BLACK,
      opacity: 0.9,
    },
    dayTabLabelInactive: {
      color: getTextColorWithOpacity(isDark, 0.5),
    },
    dayTabBadge: {
      position: 'absolute' as const,
      top: -getResponsiveSpacing(6),
      right: -getResponsiveSpacing(6),
      backgroundColor: BRAND_PRIMARY,
      borderRadius: scaleWidth(14),
      minWidth: scaleWidth(28),
      height: scaleHeight(28),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: getResponsiveSpacing(8),
      borderWidth: 3,
      borderColor: BRAND_BLACK,
      zIndex: 10,
      ...(isDark ? {} : {
        shadowColor: BRAND_PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 6,
      }),
    },
    dayTabBadgeInactive: {
      backgroundColor: isDark ? getPrimaryWithOpacity(0.2) : getPrimaryWithOpacity(0.3),
      borderColor: getPrimaryWithOpacity(0.4),
    },
    dayTabBadgeText: {
      fontSize: getScaledFontSize(theme.typography.small.fontSize),
      fontWeight: '700' as const,
      color: BRAND_BLACK,
      fontFamily: 'Barlow_700Bold',
    },
    dayTabBadgeTextInactive: {
      color: getTextColorWithOpacity(isDark, 0.7),
    },
    dayHeaderBanner: {
      padding: getResponsiveSpacing(20),
      paddingBottom: getResponsiveSpacing(16),
      borderBottomWidth: 1,
      borderBottomColor: isDark ? getPrimaryWithOpacity(0.15) : getPrimaryWithOpacity(0.2),
    },
    dayHeaderBannerContent: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    dayHeaderBannerLeft: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 1,
    },
    dayHeaderIcon: {
      width: scaleWidth(52),
      height: scaleHeight(52),
      borderRadius: scaleWidth(26),
      backgroundColor: BRAND_PRIMARY,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: getResponsiveSpacing(16),
    },
    dayHeaderTitle: {
      fontSize: getScaledFontSize(theme.typography.h2.fontSize),
      fontWeight: 'normal' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_800ExtraBold',
      marginBottom: getResponsiveSpacing(4),
      letterSpacing: 0.5,
    },
    dayHeaderSubtitle: {
      fontSize: getScaledFontSize(theme.typography.caption.fontSize),
      color: getTextColorWithOpacity(isDark, 0.6),
      fontFamily: 'Barlow_400Regular',
    },
    dayContentContainer: {
      minHeight: scaleHeight(200),
    },
    emptyDayContainer: {
      padding: getResponsiveSpacing(40),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    emptyDayText: {
      fontSize: getScaledFontSize(theme.typography.body.fontSize),
      color: getTextColorWithOpacity(isDark, 0.5),
      fontFamily: 'Barlow_400Regular',
      textAlign: 'center' as const,
      marginTop: getResponsiveSpacing(12),
    },
    exerciseCard: {
      backgroundColor: 'transparent',
      marginBottom: 0,
    },
    exerciseDivider: {
      height: 1,
      backgroundColor: isDark ? getPrimaryWithOpacity(0.1) : getPrimaryWithOpacity(0.15),
      marginLeft: getResponsiveSpacing(56), // Align with text
    },
    exerciseCardContent: {
      padding: getResponsiveSpacing(18),
      backgroundColor: 'transparent',
    },
    exerciseHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: getResponsiveSpacing(12),
    },
    exerciseNameContainer: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    exerciseNumber: {
      width: scaleWidth(32),
      height: scaleHeight(32),
      borderRadius: scaleWidth(16),
      backgroundColor: getPrimaryWithOpacity(0.15),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: getResponsiveSpacing(12),
      borderWidth: 1,
      borderColor: BRAND_PRIMARY,
    },
    exerciseNumberText: {
      fontSize: getScaledFontSize(theme.typography.caption.fontSize),
      fontWeight: '600' as const,
      color: BRAND_PRIMARY,
      fontFamily: 'Barlow_700Bold',
    },
    exerciseName: {
      fontSize: getScaledFontSize(theme.typography.h4.fontSize),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
      flex: 1,
    },
    exerciseCheck: {
      width: scaleWidth(24),
      height: scaleHeight(24),
      borderRadius: scaleWidth(12),
      borderWidth: 2,
      borderColor: isDark ? getPrimaryWithOpacity(0.3) : getPrimaryWithOpacity(0.4),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    exerciseCheckCompleted: {
      backgroundColor: BRAND_PRIMARY,
      borderColor: BRAND_PRIMARY,
    },
    exerciseDetails: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      gap: getResponsiveSpacing(8),
    },
    exerciseDetailItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 0,
      flexShrink: 1,
    },
    exerciseDetailIcon: {
      marginRight: getResponsiveSpacing(6),
    },
    exerciseDetailText: {
      fontSize: getScaledFontSize(theme.typography.caption.fontSize),
      color: getTextColorWithOpacity(isDark, 0.7),
      fontFamily: 'Barlow_400Regular',
    },
    exerciseDetailValue: {
      fontSize: getScaledFontSize(theme.typography.caption.fontSize),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
      marginLeft: getResponsiveSpacing(4),
      flexShrink: 1,
      maxWidth: scaleWidth(80),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: getResponsiveSpacing(20),
    },
    modalContent: {
      width: '100%' as any,
      maxWidth: scaleWidth(400),
      backgroundColor: BRAND_BLACK,
      borderRadius: getResponsiveSpacing(24),
      padding: getResponsiveSpacing(24),
      borderWidth: 1,
      borderColor: isDark ? getPrimaryWithOpacity(0.2) : getPrimaryWithOpacity(0.3),
      ...(isDark ? {} : {
        shadowColor: BRAND_PRIMARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 16,
      }),
    },
    modalHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: getResponsiveSpacing(12),
    },
    modalTitle: {
      fontSize: getScaledFontSize(theme.typography.h2.fontSize),
      fontWeight: 'normal' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_800ExtraBold',
      marginLeft: getResponsiveSpacing(12),
      letterSpacing: 0.5,
    },
    modalMessage: {
      fontSize: getScaledFontSize(theme.typography.body.fontSize),
      color: getTextColorWithOpacity(isDark, 0.7),
      fontFamily: 'Barlow_400Regular',
      marginBottom: getResponsiveSpacing(24),
      lineHeight: getScaledFontSize(22),
    },
    modalDaysList: {
      maxHeight: scaleHeight(400),
      marginBottom: getResponsiveSpacing(20),
    },
    modalDayButton: {
      marginBottom: getResponsiveSpacing(12),
      borderRadius: getResponsiveSpacing(12),
      overflow: 'hidden' as const,
    },
    modalDayButtonGradient: {
      borderRadius: getResponsiveSpacing(12),
      borderWidth: 1,
      borderColor: getPrimaryWithOpacity(0.3),
    },
    modalDayButtonContent: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      padding: getResponsiveSpacing(16),
    },
    modalDayButtonLeft: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 1,
    },
    modalDayButtonNumber: {
      width: scaleWidth(48),
      height: scaleHeight(48),
      borderRadius: scaleWidth(24),
      backgroundColor: BRAND_PRIMARY,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: getResponsiveSpacing(16),
    },
    modalDayButtonNumberText: {
      fontSize: getScaledFontSize(theme.typography.h4.fontSize),
      fontWeight: '700' as const,
      color: BRAND_BLACK,
      fontFamily: 'Barlow_700Bold',
    },
    modalDayButtonTitle: {
      fontSize: getScaledFontSize(theme.typography.h4.fontSize),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
      marginBottom: getResponsiveSpacing(4),
    },
    modalDayButtonSubtitle: {
      fontSize: getScaledFontSize(theme.typography.caption.fontSize),
      color: getTextColorWithOpacity(isDark, 0.6),
      fontFamily: 'Barlow_400Regular',
    },
    modalCancelButton: {
      paddingVertical: getResponsiveSpacing(14),
      alignItems: 'center' as const,
      borderRadius: getResponsiveSpacing(12),
      backgroundColor: isDark ? getPrimaryWithOpacity(0.1) : getPrimaryWithOpacity(0.08),
      borderWidth: 1,
      borderColor: isDark ? getPrimaryWithOpacity(0.2) : getPrimaryWithOpacity(0.3),
    },
    modalCancelButtonText: {
      fontSize: getScaledFontSize(theme.typography.body.fontSize),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
    },
  }), [isDark, textSize, BRAND_BLACK, BRAND_WHITE, BRAND_PRIMARY, insets.top]);

  return (
    <View style={dynamicStyles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: workoutImage }}
            style={dynamicStyles.heroImage}
            resizeMode="cover"
          />

          {/* Gradient Overlay on Hero */}
          <LinearGradient
            colors={[
              'transparent',
              getPrimaryWithOpacity(0.3),
              getPrimaryWithOpacity(0.6),
            ]}
            style={dynamicStyles.heroGradient}
          />

          {/* Back Button */}
          <TouchableOpacity
            style={dynamicStyles.backButton}
            onPress={() => {
              if (route.params?.returnTo === 'Plan') {
                // Reset Library stack to LibraryMain before navigating to Plan
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'LibraryMain' }],
                  })
                );
                // Then navigate to Plan
                navigation.getParent()?.navigate('Workouts', { screen: 'WorkoutsMain' });
              } else {
                navigation.goBack();
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={BRAND_WHITE} />
          </TouchableOpacity>
        </View>

        {/* Content Card */}
        <View style={dynamicStyles.contentCard}>
          {/* Difficulty Badge with Icon */}
          <View style={dynamicStyles.badgeContainer}>
            <View style={dynamicStyles.badgeIconContainer}>
              <Dumbbell size={16} color={BRAND_PRIMARY} />
            </View>
            <Text style={dynamicStyles.difficultyBadge}>{workoutDifficulty}</Text>
          </View>

          {/* Workout Title with Barlow Font */}
          <Text style={dynamicStyles.workoutTitle}>{workoutName}</Text>

          {/* Workout Info Cards */}
          <View style={dynamicStyles.infoCardsContainer}>
            <LinearGradient
              colors={['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)']}
              style={dynamicStyles.infoCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={dynamicStyles.infoCardContent}>
                <Clock size={20} color={BRAND_PRIMARY} />
                <View style={dynamicStyles.infoCardTextContainer}>
                  <Text style={dynamicStyles.infoCardLabel}>Duration</Text>
                  <Text style={dynamicStyles.infoCardValue}>45 min</Text>
                </View>
              </View>
            </LinearGradient>

            <LinearGradient
              colors={['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)']}
              style={dynamicStyles.infoCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={dynamicStyles.infoCardContent}>
                <Dumbbell size={20} color={BRAND_PRIMARY} />
                <View style={dynamicStyles.infoCardTextContainer}>
                  <Text style={dynamicStyles.infoCardLabel}>Exercises</Text>
                  <Text style={dynamicStyles.infoCardValue}>8 exercises</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Description */}
          <View style={dynamicStyles.descriptionContainer}>
            <Text style={dynamicStyles.descriptionTitle}>{t('library.aboutWorkout')}</Text>
            <Text style={dynamicStyles.description}>
              {t('library.exerciseDetails')}
            </Text>
          </View>



          {/* Schedule Button (if routed from Plan AND only 1 day) */}
          {!loading && route.params?.dateToSchedule && Object.keys(exercisesByDay).length <= 1 && (
            <Pressable
              style={dynamicStyles.startButton}
              onPress={() => handleScheduleWorkout()}
            >
              <LinearGradient
                colors={[BRAND_PRIMARY, BRAND_PRIMARY]} // Solid color for now
                style={dynamicStyles.startButtonGradient}
              >
                <Calendar size={24} color={BRAND_BLACK} />
                <Text style={dynamicStyles.startButtonText}>
                  {t('plan.scheduleFor')} {route.params.dateToSchedule}
                </Text>
              </LinearGradient>
            </Pressable>
          )}


          <View style={dynamicStyles.exercisesSection}>
            <Text style={dynamicStyles.exercisesSectionTitle}>Exercises</Text>
            {loading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: BRAND_WHITE, opacity: 0.7 }}>Loading exercises...</Text>
              </View>
            ) : exercises.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: BRAND_WHITE, opacity: 0.7 }}>No exercises found</Text>
              </View>
            ) : (
              /* Vertical Accordion Layout */
              <View style={{ gap: getResponsiveSpacing(16) }}>
                {Object.keys(exercisesByDay)
                  .map(d => parseInt(d))
                  .sort((a, b) => a - b)
                  .map(day => {
                    const dayExercises = exercisesByDay[day];
                    const isExpanded = expandedDay === day;

                    return (
                      <View key={day} style={{
                        borderRadius: getResponsiveSpacing(16),
                        overflow: 'hidden',
                        backgroundColor: isDark ? getPrimaryWithOpacity(0.05) : getPrimaryWithOpacity(0.08),
                        borderWidth: 1,
                        borderColor: isExpanded ? BRAND_PRIMARY : (isDark ? getPrimaryWithOpacity(0.1) : getPrimaryWithOpacity(0.15)),
                      }}>
                        {/* Accordion Header */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setExpandedDay(isExpanded ? null : day)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: getResponsiveSpacing(16),
                            backgroundColor: isExpanded ? getPrimaryWithOpacity(0.1) : 'transparent',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                              width: scaleWidth(36),
                              height: scaleHeight(36),
                              borderRadius: scaleWidth(18),
                              backgroundColor: isExpanded ? BRAND_PRIMARY : getPrimaryWithOpacity(0.15),
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginRight: getResponsiveSpacing(12),
                            }}>
                              <Text style={{
                                fontSize: getScaledFontSize(theme.typography.body.fontSize),
                                fontWeight: '700',
                                color: isExpanded ? BRAND_BLACK : BRAND_WHITE,
                                fontFamily: 'Barlow_700Bold',
                              }}>{day}</Text>
                            </View>
                            <View>
                              <Text style={{
                                fontSize: getScaledFontSize(theme.typography.h4.fontSize),
                                fontWeight: '600',
                                color: BRAND_WHITE,
                                fontFamily: 'Barlow_600SemiBold',
                              }}>
                                {t('library.daySelection.day', { number: day }).split(' ')[0]} {day}
                              </Text>
                              <Text style={{
                                fontSize: getScaledFontSize(theme.typography.small.fontSize),
                                color: getTextColorWithOpacity(isDark, 0.6),
                                fontFamily: 'Barlow_400Regular',
                              }}>
                                {dayExercises.length} {t('library.daySelection.exercisesCount', { count: dayExercises.length }).split(' ')[1]}
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            {isExpanded && (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  if (route.params?.dateToSchedule) {
                                    handleScheduleWorkout(day);
                                  } else {
                                    startWorkoutForDay(day);
                                  }
                                }}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  backgroundColor: BRAND_PRIMARY,
                                  borderRadius: 20,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                {route.params?.dateToSchedule ? (
                                  <Calendar size={12} color={BRAND_BLACK} />
                                ) : (
                                  <Play size={12} color={BRAND_BLACK} fill={BRAND_BLACK} />
                                )}
                                <Text style={{
                                  fontSize: 12,
                                  fontWeight: '700',
                                  color: BRAND_BLACK,
                                  fontFamily: 'Barlow_700Bold'
                                }}>START</Text>
                              </TouchableOpacity>
                            )}
                            {isExpanded ? (
                              <ChevronDown size={20} color={BRAND_PRIMARY} />
                            ) : (
                              <ChevronRight size={20} color={getTextColorWithOpacity(isDark, 0.5)} />
                            )}
                          </View>
                        </TouchableOpacity>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <View style={{
                            padding: getResponsiveSpacing(12),
                            borderTopWidth: 1,
                            borderTopColor: isDark ? getPrimaryWithOpacity(0.1) : getPrimaryWithOpacity(0.15)
                          }}>
                            {dayExercises.length > 0 ? (
                              dayExercises.map((exercise, index) => (
                                <ExerciseCard
                                  key={exercise.id}
                                  exercise={exercise}
                                  index={index}
                                  isDark={isDark}
                                  BRAND_WHITE={BRAND_WHITE}
                                  BRAND_BLACK={BRAND_BLACK}
                                  BRAND_PRIMARY={BRAND_PRIMARY}
                                  dynamicStyles={dynamicStyles}
                                  t={t}
                                  navigation={navigation}
                                />
                              ))
                            ) : (
                              <Text style={dynamicStyles.emptyDayText}>{t('library.noExercisesFound')}</Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
              </View>
            )}
          </View>
        </View>
      </ScrollView >
    </View >
  );
};

// Exercise Card Component
interface ExerciseCardProps {
  exercise: {
    id: string;
    name: string;
    sets: number;
    reps: string;
    restTime: string;
    completed: boolean;
    image?: string;
  };
  index: number;
  isDark: boolean;
  BRAND_WHITE: string;
  BRAND_BLACK: string;
  BRAND_PRIMARY: string;
  dynamicStyles: any;
  t: any;
  navigation: StackNavigationProp<LibraryStackParamList>;
}

const ExerciseCard: React.FC<ExerciseCardProps> = React.memo(({
  exercise,
  index,
  isDark,
  BRAND_WHITE,
  BRAND_BLACK,
  BRAND_PRIMARY,
  dynamicStyles,
  t,
  navigation
}) => {
  // Staggered Entrance Animation
  const translateY = React.useRef(new Animated.Value(20)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay: index * 50, // Stagger effect
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const handleExercisePress = async () => {
    try {
      // Check if exercise.id is a valid UUID (custom workouts) or simple string (native workouts)
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exercise.id);

      let foundExercise: any = null;

      if (isValidUUID) {
        // Custom workout: try to find by UUID ID
        foundExercise = await workoutService.getExerciseById(exercise.id);
      }

      // If not found by ID (or it's a native workout), try to find by name
      if (!foundExercise) {
        foundExercise = await workoutService.getExerciseByName(exercise.name);
      }

      if (foundExercise) {
        // Found in database - navigate with the database UUID
        navigation.navigate('ExerciseDetail', {
          exerciseId: foundExercise.id,
          exerciseName: exercise.name
        });
      } else {
        // Exercise not in database (native workout exercise without database entry)
        // Navigate anyway - ExerciseDetailScreen will show empty state
        navigation.navigate('ExerciseDetail', {
          exerciseId: exercise.id,
          exerciseName: exercise.name
        });
      }
    } catch (error) {
      console.error('Error finding exercise:', error);
      // Still navigate, let ExerciseDetailScreen handle the error
      navigation.navigate('ExerciseDetail', {
        exerciseId: exercise.id,
        exerciseName: exercise.name
      });
    }
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity
        onPress={handleExercisePress}
        activeOpacity={0.7}
      >
        <View style={dynamicStyles.exerciseCard}>
          <View style={dynamicStyles.exerciseCardContent}>
            {/* Exercise Header - Clean Row Layout */}
            <View style={dynamicStyles.exerciseHeader}>
              <View style={dynamicStyles.exerciseNameContainer}>
                <View style={dynamicStyles.exerciseNumber}>
                  <Text style={dynamicStyles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={dynamicStyles.exerciseName} numberOfLines={1}>{getTranslatedExerciseName(exercise.name, t)}</Text>
                  {/* Stats Inline with Title for compact look */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 }}>
                    <Text style={dynamicStyles.exerciseDetailText}>{exercise.sets} Sets</Text>
                    <Text style={dynamicStyles.exerciseDetailText}>•</Text>
                    <Text style={dynamicStyles.exerciseDetailText}>{exercise.reps}</Text>
                    <Text style={dynamicStyles.exerciseDetailText}>•</Text>
                    <Text style={dynamicStyles.exerciseDetailText}>{exercise.restTime}</Text>
                  </View>
                </View>
              </View>
              <View style={[
                dynamicStyles.exerciseCheck,
                exercise.completed && dynamicStyles.exerciseCheckCompleted
              ]}>
                {exercise.completed && (
                  <Check size={12} color={BRAND_BLACK} />
                )}
              </View>
            </View>
          </View>
        </View>
        {/* Divider */}
        <View style={dynamicStyles.exerciseDivider} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroContainer: {
    position: 'relative',
    width: '100%' as any,
  },
});

