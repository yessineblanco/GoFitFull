import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Pressable,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';
import { useTextSizeStore, getScaledFontSize } from '@/store/textSizeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';
import { StackNavigationProp } from '@react-navigation/stack';
import type { LibraryStackParamList } from '@/types';
import { Plus, Edit2, Trash2, Clock, Dumbbell, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { workoutService } from '@/services/workouts';
import { useAuthStore } from '@/store/authStore';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { Alert } from 'react-native';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { logger } from '@/utils/logger';
import { EmptyState } from '@/components/shared/EmptyState';
import { Shimmer, StatCardSkeleton } from '@/components/shared/Shimmer';
import { ErrorState } from '@/components/shared/ErrorState';
import { useUIStore } from '@/store/uiStore';
import { AppText } from '@/components/shared/AppText';
import { getSurfaceColor, getTextLightColor } from '@/utils/colorUtils';
import { ScreenHeader } from '@/components/shared/ScreenHeader';

// Native workouts are now loaded from the database

type NavigationProp = StackNavigationProp<LibraryStackParamList, 'LibraryMain'>;

interface LibraryScreenProps {
  navigation: NavigationProp;
}

export const LibraryScreen: React.FC<LibraryScreenProps & { route: any }> = ({ navigation, route }) => {
  const dateToSchedule = route.params?.date;
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { textSize } = useTextSizeStore();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { setTabBarVisible } = useUIStore();
  const scrollViewRef = useRef<ScrollView>(null);

  // Ensure tab bar is visible when focusing this screen
  useFocusEffect(
    React.useCallback(() => {
      setTabBarVisible(true);
    }, [setTabBarVisible])
  );

  const [selectedTab, setSelectedTab] = useState<'native' | 'custom'>('native');
  const [peekingWorkout, setPeekingWorkout] = useState<any | null>(null);

  // Tab indicator animation
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  // Animate tab indicator position
  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: selectedTab === 'native' ? 0 : 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [selectedTab, tabIndicatorAnim]);

  // Use workouts store for cached data (instant display)
  const {
    nativeWorkouts,
    customWorkouts,
    loading,
    latestIncompleteSession,
    latestSessionWorkout,
    loadWorkouts,
    loadLatestIncompleteSession,
    setLatestIncompleteSession,
    prefetchWorkout,
  } = useWorkoutsStore();

  // Track prefetched workouts to avoid duplicate prefetches
  const prefetchedWorkoutIdsRef = useRef<Set<string>>(new Set());
  const prefetchedImageUrlsRef = useRef<Set<string>>(new Set());

  // Card entrance animations (stagger effect)
  const cardAnimsRef = useRef<Map<string, { opacity: Animated.Value; translateX: Animated.Value; scale: Animated.Value }>>(new Map());

  // Filter workouts based on selected tab (must be declared before use)
  const filteredWorkouts = React.useMemo(() => {
    if (selectedTab === 'native') {
      return nativeWorkouts;
    } else {
      return customWorkouts;
    }
  }, [selectedTab, nativeWorkouts, customWorkouts]);

  // Initialize card animations when workouts change
  useEffect(() => {
    const workoutsToAnimate = filteredWorkouts.slice(0, 5); // Animate first 5 cards

    workoutsToAnimate.forEach((workout, index) => {
      if (!cardAnimsRef.current.has(workout.id)) {
        cardAnimsRef.current.set(workout.id, {
          opacity: new Animated.Value(0),
          translateX: new Animated.Value(30), // Reduced from 50 for smoother animation
          scale: new Animated.Value(0.95), // Less dramatic scale
        });
      }
    });

    // Reset animations for cards that are no longer visible
    cardAnimsRef.current.forEach((anim, workoutId) => {
      if (!filteredWorkouts.find(w => w.id === workoutId)) {
        cardAnimsRef.current.delete(workoutId);
      }
    });

    // Animate cards in with stagger - smoother animation
    const animations = workoutsToAnimate.map((workout, index) => {
      const anim = cardAnimsRef.current.get(workout.id);
      if (!anim) return null;

      // Reset values for re-animation
      anim.opacity.setValue(0);
      anim.translateX.setValue(30);
      anim.scale.setValue(0.95);

      return Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 300, // Faster
          delay: index * 80, // Less delay
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateX, {
          toValue: 0,
          duration: 300,
          delay: index * 80,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim.scale, {
          toValue: 1,
          duration: 300,
          delay: index * 80,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]);
    }).filter(Boolean) as Animated.CompositeAnimation[];

    if (animations.length > 0) {
      Animated.stagger(80, animations).start();
    }
  }, [filteredWorkouts.length, selectedTab]);

  // Reset scroll position when switching tabs
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
  }, [selectedTab]);

  // Prefetch workouts and images for visible items on scroll
  const handleScroll = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = scaleWidth(299) + getResponsiveSpacing(16);

    // Calculate which workouts are visible (current + next 2)
    const currentIndex = Math.floor(scrollX / cardWidth);
    const visibleIndices = [currentIndex, currentIndex + 1, currentIndex + 2];

    filteredWorkouts.forEach((workout, index) => {
      if (visibleIndices.includes(index)) {
        // Prefetch workout data if not already prefetched
        if (!prefetchedWorkoutIdsRef.current.has(workout.id)) {
          prefetchedWorkoutIdsRef.current.add(workout.id);
          prefetchWorkout(workout.id);
        }

        // Prefetch workout image if not already prefetched
        if (workout.image && !prefetchedImageUrlsRef.current.has(workout.image)) {
          prefetchedImageUrlsRef.current.add(workout.image);
          ExpoImage.prefetch(workout.image, {
            cachePolicy: 'memory-disk',
          }).catch(() => {
            // Silently fail - prefetch is best effort
          });
        }
      }
    });
  };

  // Initial prefetch for first visible workouts
  useEffect(() => {
    if (filteredWorkouts.length > 0) {
      // Prefetch first 3 workouts and their images
      filteredWorkouts.slice(0, 3).forEach((workout) => {
        if (!prefetchedWorkoutIdsRef.current.has(workout.id)) {
          prefetchedWorkoutIdsRef.current.add(workout.id);
          prefetchWorkout(workout.id);
        }

        if (workout.image && !prefetchedImageUrlsRef.current.has(workout.image)) {
          prefetchedImageUrlsRef.current.add(workout.image);
          ExpoImage.prefetch(workout.image, {
            cachePolicy: 'memory-disk',
          }).catch(() => {
            // Silently fail
          });
        }
      });
    }
  }, [filteredWorkouts, prefetchWorkout]);

  // Refresh workouts when screen is focused (only if cache is stale - store handles caching)
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if we have a user - stores will check cache and skip if fresh
      // This prevents unnecessary calls while still refreshing stale data
      if (user?.id) {
        // These functions check cache internally and skip if fresh (5 min cache)
        loadWorkouts(user.id);
        // Force reload incomplete session to ensure we have latest state after workout completion
        loadLatestIncompleteSession(user.id, true);
      } else {
        loadWorkouts(null);
      }
    }, [user?.id, loadWorkouts, loadLatestIncompleteSession])
  );

  // Handle edit workout - loads exercises on demand for better performance
  const handleEditWorkout = async (workoutId: string) => {
    try {
      // Load full workout with exercises on demand
      const workout = await workoutService.getWorkoutById(workoutId);
      if (!workout || !workout.exercises) {
        dialogManager.error(t('common.error'), t('library.workoutSession.couldNotLoadExercises'));
        return;
      }

      navigation.navigate('WorkoutBuilder', {
        workoutId: workout.id,
        workoutName: workout.name,
        workoutExercises: workout.exercises.map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          sets: ex.sets?.toString() || '3',
          reps: ex.reps?.toString() || '10',
          restTime: ex.restTime?.toString() || '60',
        })),
      });
    } catch (error) {
      console.error('Error loading workout for editing:', error);
      dialogManager.error(t('common.error'), t('library.workoutSession.couldNotLoadExercises'));
    }
  };

  // Handle delete workout
  const handleDeleteWorkout = (workoutId: string, workoutName: string) => {
    if (!user?.id) return;

    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${workoutName}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await workoutService.deleteCustomWorkout(workoutId, user.id);
              // Refresh workouts cache forcefully
              await loadWorkouts(user.id, true);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete workout');
            }
          },
        },
      ]
    );
  };


  // Calculate available height for cards (screen height - header - tabs - bottom bar - padding)
  const screenHeight = Dimensions.get('window').height;
  const headerHeight = insets.top + getResponsiveSpacing(8) + getResponsiveSpacing(12) + getResponsiveSpacing(20); // Header + title
  const tabHeight = getResponsiveSpacing(60); // Tab selector
  const bottomBarHeight = insets.bottom + getResponsiveSpacing(100); // Bottom navigation bar (adjusted for floating bar)
  const gapBetweenTabAndCards = getResponsiveSpacing(24); // Gap between tab selector and cards (for card height calculation)
  const bottomPadding = getResponsiveSpacing(24); // Bottom padding to respect bottom bar
  const availableHeight = screenHeight - headerHeight - tabHeight - gapBetweenTabAndCards - bottomBarHeight - bottomPadding;
  const cardHeight = Math.min(availableHeight * 0.9, scaleHeight(650)); // Use 90% of available space, max 650px

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
    headerContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingTop: insets.top + getResponsiveSpacing(8),
      paddingBottom: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(24),
    },
    headerTitle: {
      fontSize: getResponsiveFontSize(22),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
      letterSpacing: 0.2,
      flex: 1,
    },
    // Compact Play Button for Header
    compactPlayButton: {
      width: scaleWidth(44),
      height: scaleHeight(44),
      borderRadius: scaleWidth(22),
      overflow: 'hidden' as const,
      shadowColor: '#84c440',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 6,
    },
    compactPlayGradient: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    compactPlayIcon: {
      color: '#FFF',
      fontSize: getScaledFontSize(16),
      fontWeight: '900' as const,
      marginLeft: 3, // Optical alignment for play icon
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    tabContainer: {
      backgroundColor: getSurfaceColor(isDark),
      borderRadius: getResponsiveSpacing(12),
      padding: getResponsiveSpacing(4),
      marginHorizontal: getResponsiveSpacing(16),
      marginTop: getResponsiveSpacing(8),
      marginBottom: getResponsiveSpacing(0), // Spacing handled by ScrollView marginTop
      position: 'relative' as const,
      height: scaleHeight(56),
    },
    tabIndicator: {
      position: 'absolute' as const,
      height: scaleHeight(48),
      backgroundColor: BRAND_PRIMARY,
      borderRadius: getResponsiveSpacing(8),
      top: getResponsiveSpacing(4),
      left: getResponsiveSpacing(4),
    },
    tabRow: {
      flexDirection: 'row' as const,
    },
    tabButton: {
      flex: 1,
      paddingVertical: getResponsiveSpacing(12),
      borderRadius: getResponsiveSpacing(8),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    tabButtonActive: {
      backgroundColor: 'transparent', // Rely on animated indicator
    },
    tabButtonInactive: {
      backgroundColor: 'transparent', // Transparent for inactive tab (shows dark container)
    },
    tabText: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600' as const,
      fontFamily: 'Barlow_600SemiBold',
    },
    tabTextActive: {
      color: '#030303', // Dark text on green background
    },
    tabTextInactive: {
      color: getTextLightColor(isDark),
    },
    horizontalScroll: {
      flex: 1,
      marginTop: getResponsiveSpacing(24), // Spacing between tabs and cards
    },
    scrollContent: {
      paddingLeft: (Dimensions.get('window').width - scaleWidth(299)) / 2, // Center first card
      paddingRight: (Dimensions.get('window').width - scaleWidth(299)) / 2, // Center last card
      paddingTop: 0, // No padding, spacing handled by ScrollView marginTop
    },
    workoutCard: {
      width: scaleWidth(299),
      height: cardHeight,
      borderRadius: getResponsiveSpacing(16),
      marginRight: getResponsiveSpacing(24), // Increased from 16 for better separation
      backgroundColor: isDark ? '#1a1a1a' : getTextColorWithOpacity(false, 0.1),
      overflow: 'visible' as const,
      borderWidth: 1.5,
      borderColor: BRAND_PRIMARY,
      shadowColor: BRAND_PRIMARY,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 8,
    },
    cardInner: {
      flex: 1,
      borderRadius: getResponsiveSpacing(14), // Slightly less than container to avoid gap
      overflow: 'hidden' as const,
    },
    cardImage: {
      width: '100%',
      height: '100%',
      position: 'absolute' as const,
    },
    imageEdgeBlur: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: '20%',
    },
    gradientOverlay: {
      position: 'absolute' as const,
      width: '100%',
      height: '100%',
    },
    cardContent: {
      flex: 1,
      padding: getResponsiveSpacing(16),
      justifyContent: 'space-between' as const,
    },
    badgeContainer: {
      alignSelf: 'flex-start' as const,
      backgroundColor: 'rgba(255, 255, 255, 0.2)', // Glassy
      borderRadius: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(10),
      paddingVertical: getResponsiveSpacing(4),
      overflow: 'hidden' as const,
    },
    cardTopSection: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
    },
    actionButtons: {
      flexDirection: 'row' as const,
      gap: getResponsiveSpacing(8),
    },
    actionButton: {
      width: scaleWidth(32),
      height: scaleHeight(32),
      borderRadius: scaleWidth(16),
      backgroundColor: getTextColorWithOpacity(isDark, 0.2),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    deleteButton: {
      backgroundColor: 'rgba(255, 59, 48, 0.3)', // Red tint for delete
    },
    badgeText: {
      fontSize: getScaledFontSize(10),
      fontWeight: '700' as const,
      color: '#FFFFFF',
      fontFamily: 'Barlow_700Bold',
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    workoutTitle: {
      fontSize: getScaledFontSize(18), // Smaller size
      color: BRAND_WHITE,
      fontFamily: 'Barlow_800ExtraBold',
      letterSpacing: -0.28,
      lineHeight: getScaledFontSize(22),
      marginBottom: getResponsiveSpacing(16),
    },
    openButton: {
      borderRadius: getResponsiveSpacing(30), // Pill shape
      alignSelf: 'center' as const,

      // Deep Glass Effect
      backgroundColor: 'rgba(20, 20, 20, 0.6)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      borderBottomColor: 'rgba(255,255,255,0.2)', // Rim light

      // Shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    openButtonBlur: {
      paddingVertical: getResponsiveSpacing(10),
      paddingHorizontal: getResponsiveSpacing(20),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: getResponsiveSpacing(30), // Match parent
      overflow: 'hidden', // Clip blur content
    },
    openButtonText: {
      fontSize: getScaledFontSize(13),
      fontWeight: '700' as const,
      color: '#FFFFFF',
      fontFamily: 'Barlow_700Bold',
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    emptyState: {
      width: scaleWidth(299),
      height: cardHeight,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: getResponsiveSpacing(24),
    },
    emptyStateText: {
      color: getTextColorWithOpacity(isDark, 0.6),
      fontSize: getScaledFontSize(16),
      fontFamily: 'Barlow_400Regular',
      textAlign: 'center' as const,
    },
    createWorkoutCard: {
      width: scaleWidth(299),
      height: cardHeight,
      borderRadius: getResponsiveSpacing(16), // Match card radius
      marginRight: getResponsiveSpacing(16), // Space between cards
      backgroundColor: isDark ? '#373737' : getTextColorWithOpacity(false, 0.1),
      borderWidth: 2,
      borderColor: BRAND_PRIMARY,
      borderStyle: 'dashed' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: getResponsiveSpacing(24),
    },
    createWorkoutContent: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    createWorkoutIconContainer: {
      width: scaleWidth(64),
      height: scaleHeight(64),
      borderRadius: scaleWidth(32),
      backgroundColor: getPrimaryWithOpacity(0.15),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginBottom: getResponsiveSpacing(16),
    },
    createWorkoutTitle: {
      fontSize: getScaledFontSize(20),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
      textAlign: 'center' as const,
      marginBottom: getResponsiveSpacing(8),
    },
    createWorkoutSubtitle: {
      fontSize: getScaledFontSize(14),
      color: getTextColorWithOpacity(isDark, 0.6),
      fontFamily: 'Barlow_400Regular',
      textAlign: 'center' as const,
      lineHeight: getScaledFontSize(20),
    },
  }), [isDark, textSize, BRAND_BLACK, BRAND_WHITE, BRAND_PRIMARY, insets.top, cardHeight]);

  return (
    <View style={dynamicStyles.container}>
      {/* Compact Header with Title and Continue Button */}
      <ScreenHeader
        title={t('library.title')}
        rightElement={(() => {
          const shouldShow = latestIncompleteSession?.id &&
            latestIncompleteSession?.workout_id &&
            (!latestIncompleteSession.completed_at || latestIncompleteSession.completed_at === '');
          if (__DEV__) {
            logger.debug('LibraryScreen - Continue button check:', {
              hasSession: !!latestIncompleteSession,
              sessionId: latestIncompleteSession?.id,
              workoutId: latestIncompleteSession?.workout_id,
              completedAt: latestIncompleteSession?.completed_at,
              shouldShow,
            });
          }

          return shouldShow ? (
            <TouchableOpacity
              style={dynamicStyles.compactPlayButton}
              onPress={async () => {
                try {
                  const session = latestIncompleteSession;
                  if (!session || !session.id) return;

                  // 1. Snapshot First: Trust the saved session data
                  const savedExercises = session.exercises_completed || [];

                  // 2. Metadata Handling: Try to fetch fresh metadata but don't block
                  let workoutName = session.workout_name || 'Workout';
                  let workoutType = session.workout_type || 'custom';

                  try {
                    if (session.workout_id) {
                      const workout = await workoutService.getWorkoutById(session.workout_id);
                      if (workout) {
                        workoutName = workout.name;
                        workoutType = workout.workout_type;
                      }
                    }
                  } catch (e) {
                    // Ignore metadata fetch errors - session data is what matters
                    console.warn('Could not fetch workout metadata, using session defaults');
                  }

                  // 3. Resume with Saved Snapshot (Preferred)
                  if (savedExercises.length > 0) {
                    navigation.navigate('WorkoutSession', {
                      workoutId: session.workout_id,
                      workoutName: workoutName,
                      workoutType: workoutType,
                      sessionId: session.id,
                      exercises: savedExercises
                    });
                    return;
                  }

                  // 4. Fallback: If no saved progress, try to load from template
                  if (session.workout_id) {
                    try {
                      const workout = await workoutService.getWorkoutById(session.workout_id);
                      if (workout && workout.exercises && workout.exercises.length > 0) {
                        navigation.navigate('WorkoutSession', {
                          workoutId: session.workout_id,
                          workoutName: workout.name,
                          workoutType: workout.workout_type,
                          sessionId: session.id,
                          exercises: workout.exercises.map((ex: any) => ({
                            id: ex.id,
                            name: ex.name,
                            sets: ex.sets?.toString() || '3',
                            reps: ex.reps?.toString() || '10',
                            restTime: ex.restTime?.toString() || '60',
                            image_url: ex.image || ex.image_url,
                            completedSets: [],
                            weights: [],
                            completed: false
                          }))
                        });
                        return;
                      }
                    } catch (e) {
                      console.error('Failed to load workout template for fresh session', e);
                    }
                  }

                  // 5. Dead End: Safe Failure (Do NOT auto-complete)
                  dialogManager.error(
                    t('common.error'),
                    "Cannot resume this session. The workout data seems missing or empty."
                  );

                } catch (error) {
                  console.error('Error navigating to continue workout:', error);
                  dialogManager.error(t('common.error'), "Failed to resume session.");
                }
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#95d650', '#84c440']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={dynamicStyles.compactPlayGradient}
              >
                <Text style={dynamicStyles.compactPlayIcon}>▶</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : null;
        })()}
      />

      {/* Tab Selector with Sliding Indicator */}
      <View style={[dynamicStyles.tabContainer, { marginTop: insets.top + 70 + 16 }]}>
        {/* Animated green indicator */}
        <Animated.View
          style={[
            dynamicStyles.tabIndicator,
            {
              width: (Dimensions.get('window').width - getResponsiveSpacing(32) - getResponsiveSpacing(8)) / 2,
              transform: [
                {
                  translateX: tabIndicatorAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (Dimensions.get('window').width - getResponsiveSpacing(32) - getResponsiveSpacing(8)) / 2],
                  }),
                },
              ],
            },
          ]}
        />

        <View style={dynamicStyles.tabRow}>
          <Pressable
            style={[
              dynamicStyles.tabButton,
              selectedTab === 'native' ? dynamicStyles.tabButtonActive : dynamicStyles.tabButtonInactive
            ]}
            onPress={() => setSelectedTab('native')}
          >
            <Text style={[
              dynamicStyles.tabText,
              selectedTab === 'native' ? dynamicStyles.tabTextActive : dynamicStyles.tabTextInactive
            ]}>
              {t('library.native')}
            </Text>
          </Pressable>

          <Pressable
            style={[
              dynamicStyles.tabButton,
              selectedTab === 'custom' ? dynamicStyles.tabButtonActive : dynamicStyles.tabButtonInactive
            ]}
            onPress={() => setSelectedTab('custom')}
          >
            <Text style={[
              dynamicStyles.tabText,
              selectedTab === 'custom' ? dynamicStyles.tabTextActive : dynamicStyles.tabTextInactive
            ]}>
              {t('library.custom')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Horizontal ScrollView for Workout Cards */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          dynamicStyles.scrollContent,
          { paddingBottom: getResponsiveSpacing(100) }, // Bottom padding to clear floating tab bar
        ]}
        style={styles.horizontalScroll}
        snapToInterval={scaleWidth(299) + getResponsiveSpacing(24)} // Card width + new margin
        decelerationRate={0.9} // Smoother deceleration
        snapToAlignment="start" // Better for consistent snapping
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {/* Create Custom Workout Card (only in Custom tab) */}
        {selectedTab === 'custom' && (
          <TouchableOpacity
            style={dynamicStyles.createWorkoutCard}
            onPress={() => navigation.navigate('ExerciseSelection')}
            activeOpacity={0.8}
          >
            <View style={dynamicStyles.createWorkoutContent}>
              <View style={dynamicStyles.createWorkoutIconContainer}>
                <Plus size={32} color={BRAND_PRIMARY} />
              </View>
              <Text style={dynamicStyles.createWorkoutTitle}>{t('library.createCustomWorkout')}</Text>
              <Text style={dynamicStyles.createWorkoutSubtitle}>
                {t('library.createCustomWorkoutSubtitle')}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Existing Workouts */}
        {filteredWorkouts.length > 0 ? (
          filteredWorkouts.map((workout, index) => {
            const cardAnim = cardAnimsRef.current.get(workout.id);
            const shouldAnimate = index < 5 && cardAnim;

            return (
              <Animated.View
                key={workout.id}
                style={shouldAnimate ? {
                  opacity: cardAnim.opacity,
                  transform: [
                    { translateX: cardAnim.translateX },
                    { scale: cardAnim.scale },
                  ],
                } : undefined}
              >
                <WorkoutCard
                  workout={workout}
                  isDark={isDark}
                  BRAND_WHITE={BRAND_WHITE}
                  BRAND_BLACK={BRAND_BLACK}
                  BRAND_PRIMARY={BRAND_PRIMARY}
                  dynamicStyles={dynamicStyles}
                  navigation={navigation}
                  isCustom={selectedTab === 'custom'}
                  onEdit={selectedTab === 'custom' ? () => handleEditWorkout(workout.id) : undefined}
                  onDelete={selectedTab === 'custom' ? () => handleDeleteWorkout(workout.id, workout.name) : undefined}
                  t={t}
                  prefetchWorkout={prefetchWorkout}
                  dateToSchedule={dateToSchedule}
                  onPeekBegin={setPeekingWorkout}
                  onPeekEnd={() => setPeekingWorkout(null)}
                />
              </Animated.View>
            );
          })
        ) : selectedTab === 'native' ? (
          <View style={{ width: scaleWidth(299), height: cardHeight, justifyContent: 'center', alignItems: 'center' }}>
            <EmptyState
              type="workouts"
              title={t('library.noNativeWorkouts')}
              message={t('library.noNativeWorkoutsMessage') || 'Explore our pre-built workout plans to get started.'}
            />
          </View>
        ) : selectedTab === 'custom' && filteredWorkouts.length === 0 ? (
          <View style={{ width: scaleWidth(299), height: cardHeight, justifyContent: 'center', alignItems: 'center' }}>
            <EmptyState
              type="workouts"
              title={t('library.noCustomWorkouts') || 'No Custom Workouts'}
              message={t('library.createCustomWorkoutSubtitle')}
              onAction={() => navigation.navigate('ExerciseSelection')}
              actionText={t('library.createCustomWorkout')}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Quick Peek Overlay */}
      {peekingWorkout && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BlurView intensity={isDark ? 20 : 40} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        </View>
      )}

      {peekingWorkout && (
        <QuickPeekOverlay
          workout={peekingWorkout}
          isDark={isDark}
          t={t}
          onClose={() => setPeekingWorkout(null)}
          onStart={() => {
            setPeekingWorkout(null);
            navigation.navigate('WorkoutDetail', {
              workoutId: peekingWorkout.id,
              workoutName: peekingWorkout.name,
              workoutDifficulty: peekingWorkout.difficulty,
              workoutImage: peekingWorkout.image,
            } as any);
          }}
        />
      )}
    </View>
  );
};

// Workout Card Component
interface WorkoutCardProps {
  workout: {
    id: string;
    name: string;
    difficulty: string;
    image: string;
  };
  isDark: boolean;
  BRAND_WHITE: string;
  BRAND_BLACK: string;
  BRAND_PRIMARY: string;
  dynamicStyles: any;
  navigation: any;
  isCustom?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  t: any;
  dateToSchedule?: string;
  onPeekBegin: (workout: any) => void;
  onPeekEnd: () => void;
}

const QuickPeekOverlay: React.FC<{
  workout: any;
  isDark: boolean;
  t: any;
  onClose: () => void;
  onStart: () => void;
}> = ({ workout, isDark, t, onClose, onStart }) => {
  const { getPrefetchedWorkout } = useWorkoutsStore();
  const detailedWorkout = getPrefetchedWorkout(workout.id);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
    }).start();
  }, []);

  const BRAND_PRIMARY = theme.colors.primary;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.quickPeekContainer,
          {
            opacity: anim,
            transform: [
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
            ]
          }
        ]}
      >
        <BlurView intensity={isDark ? 100 : 80} tint={isDark ? "dark" : "light"} style={styles.quickPeekBlur}>
          {/* Semi-opaque background layer */}
          <View style={styles.quickPeekBackground} />

          {/* Header with Image */}
          <View style={styles.quickPeekImageContainer}>
            <ExpoImage
              source={{ uri: workout.image }}
              style={styles.quickPeekImage}
              contentFit="cover"
              placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
              placeholderContentFit="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.98)']}
              style={styles.quickPeekGradient}
            />
          </View>

          {/* Content */}
          <View style={styles.quickPeekContent}>
            {/* Title */}
            <AppText variant="h2" style={styles.quickPeekTitle} numberOfLines={2}>
              {workout.name}
            </AppText>

            {/* Stats Row */}
            <View style={styles.quickPeekStatsRow}>
              <View style={styles.quickPeekStatItem}>
                <Clock size={16} color={BRAND_PRIMARY} strokeWidth={2.5} />
                <AppText variant="bodyBold" style={styles.quickPeekStatText}>45 min</AppText>
              </View>
              <View style={styles.quickPeekDivider} />
              <View style={styles.quickPeekStatItem}>
                <Dumbbell size={16} color={BRAND_PRIMARY} strokeWidth={2.5} />
                <AppText variant="bodyBold" style={styles.quickPeekStatText}>
                  {t('library.exerciseCount', { count: detailedWorkout?.exercises?.length || 0 })}
                </AppText>
              </View>
            </View>

            {/* Exercises List */}
            {detailedWorkout?.exercises ? (
              <View style={styles.exerciseListContainer}>
                {detailedWorkout.exercises.slice(0, 4).map((ex: any, idx: number) => (
                  <View key={ex.id || idx} style={styles.exerciseRow}>
                    <View style={styles.exerciseNumber}>
                      <AppText variant="captionBold" style={styles.exerciseNumberText}>{idx + 1}</AppText>
                    </View>
                    <AppText variant="body" style={styles.exerciseName} numberOfLines={1}>
                      {ex.name}
                    </AppText>
                  </View>
                ))}
                {detailedWorkout.exercises.length > 4 && (
                  <AppText variant="small" style={styles.moreExercisesText}>
                    +{detailedWorkout.exercises.length - 4} {t('common.more')}
                  </AppText>
                )}
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <Shimmer width={200} height={120} borderRadius={12} />
              </View>
            )}

            {/* Bottom Hint */}
            <View style={styles.peekHintContainer}>
              <View style={styles.peekHintDot} />
              <AppText variant="small" style={styles.peekHintText}>Release to close</AppText>
            </View>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
};

const WorkoutCard: React.FC<WorkoutCardProps & { t: any; prefetchWorkout?: (id: string) => void }> = React.memo(({
  workout,
  isDark,
  BRAND_WHITE,
  BRAND_BLACK,
  BRAND_PRIMARY,
  dynamicStyles,
  navigation,
  isCustom = false,
  onEdit,
  onDelete,
  t,
  prefetchWorkout,
  dateToSchedule,
  onPeekBegin,
  onPeekEnd,
}) => {
  // Press animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Neon Glow Animation
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2500, // Slower pulse (2.5s)
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const glowShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8], // Slightly subtler max opacity
  });

  const glowShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 15], // Tighter radius to avoid overlap
  });

  const glowElevation = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20], // Higher elevation
  });

  /* Removed breatheScale as user only wants glow animation */

  const handleOpenWorkout = () => {
    navigation.navigate('WorkoutDetail', {
      workoutId: workout.id,
      workoutName: workout.name,
      workoutDifficulty: workout.difficulty,
      workoutImage: workout.image,
      dateToSchedule: dateToSchedule,
    });
  };

  // Prefetch workout data when user starts pressing (onPressIn)
  const handlePressIn = () => {
    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 150,
      friction: 10,
      useNativeDriver: false,
    }).start();

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (prefetchWorkout) {
      prefetchWorkout(workout.id);
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 150,
      friction: 10,
      useNativeDriver: false,
    }).start();
  };

  const handleEdit = (e: any) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDelete = (e: any) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <Animated.View
      style={[
        dynamicStyles.workoutCard,
        {
          transform: [{ scale: scaleAnim }], // Just touch feedback
          shadowOpacity: glowShadowOpacity,
          shadowRadius: glowShadowRadius,
          elevation: glowElevation,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={() => {
          handlePressOut();
          onPeekEnd();
        }}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onPeekBegin(workout);
        }}
        delayLongPress={300}
        onPress={handleOpenWorkout}
        accessibilityRole="button"
        accessibilityLabel={`${workout.name} workout. ${isCustom ? 'Custom workout' : 'Pre-built workout'}`}
        accessibilityHint="Double tap to view workout details and start session"
        style={styles.cardPressable}
      >
        <View style={dynamicStyles.cardInner}>
          {/* Background Image - Using ExpoImage for better caching and prefetching */}
          <ExpoImage
            source={{ uri: workout.image }}
            style={dynamicStyles.cardImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
            placeholderContentFit="cover"
            recyclingKey={workout.id}
          />

          {/* Image edge blur at bottom for smoother text overlay transition */}
          <BlurView
            intensity={isDark ? 20 : 40}
            tint={isDark ? "dark" : "light"}
            style={dynamicStyles.imageEdgeBlur}
          />

          {/* Gradient Overlay - Dark gradient at bottom for better text readability */}
          <LinearGradient
            colors={[
              'transparent',
              'rgba(3, 3, 3, 0.4)',
              'rgba(3, 3, 3, 0.8)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={dynamicStyles.gradientOverlay}
          />

          {/* Card Content */}
          <View style={dynamicStyles.cardContent}>
            {/* Top Section: Badge and Action Buttons */}
            <View style={dynamicStyles.cardTopSection}>
              <BlurView intensity={30} tint="light" style={dynamicStyles.badgeContainer}>
                <Text style={dynamicStyles.badgeText}>
                  {workout.difficulty === 'Beginner' ? t('library.difficulty.beginner') :
                    workout.difficulty === 'Intermediate' ? t('library.difficulty.intermediate') :
                      workout.difficulty === 'Advanced' ? t('library.difficulty.advanced') :
                        workout.difficulty === 'Custom' ? t('library.difficulty.custom') :
                          workout.difficulty}
                </Text>
              </BlurView>

              {/* Edit/Delete Buttons (only for custom workouts) */}
              {isCustom && (
                <View style={dynamicStyles.actionButtons}>
                  <TouchableOpacity
                    style={dynamicStyles.actionButton}
                    onPress={handleEdit}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={16} color={BRAND_WHITE} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[dynamicStyles.actionButton, dynamicStyles.deleteButton]}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color={BRAND_WHITE} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Bottom Section */}
            <View>
              {/* Workout Title */}
              <Text style={dynamicStyles.workoutTitle} numberOfLines={2}>
                {workout.name}
              </Text>

              {/* Open Button (Secondary trigger) */}
              <View
                style={dynamicStyles.openButton}
              >
                <BlurView intensity={30} tint="light" style={dynamicStyles.openButtonBlur}>
                  <Text style={dynamicStyles.openButtonText}>{t('library.openWorkout')}</Text>
                </BlurView>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View >
  );
});

const styles = StyleSheet.create({
  horizontalScroll: {
    flex: 1,
  },
  cardPressable: {
    flex: 1,
  },
  quickPeekContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSpacing(20),
  },
  quickPeekBlur: {
    width: '100%',
    maxWidth: scaleWidth(300),
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.3)',
    position: 'relative',
  },
  quickPeekBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  quickPeekImageContainer: {
    width: '100%',
    height: scaleHeight(160),
    position: 'relative',
  },
  quickPeekImage: {
    width: '100%',
    height: '100%',
  },
  quickPeekGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  quickPeekContent: {
    padding: getResponsiveSpacing(20),
  },
  quickPeekTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: getResponsiveSpacing(14),
    fontFamily: 'Barlow_800ExtraBold',
  },
  quickPeekStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: getResponsiveSpacing(18),
    gap: getResponsiveSpacing(14),
  },
  quickPeekStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickPeekStatText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(14),
  },
  quickPeekDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  exerciseListContainer: {
    gap: getResponsiveSpacing(10),
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 195, 74, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    color: theme.colors.primary,
    fontSize: getResponsiveFontSize(11),
  },
  exerciseName: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: getResponsiveFontSize(14),
  },
  moreExercisesText: {
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: getResponsiveSpacing(8),
    fontSize: getResponsiveFontSize(12),
  },
  loadingContainer: {
    paddingVertical: getResponsiveSpacing(24),
    alignItems: 'center',
  },
  peekHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: getResponsiveSpacing(20),
    opacity: 0.4,
  },
  peekHintDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
  },
  peekHintText: {
    color: '#FFF',
    fontSize: getResponsiveFontSize(10),
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  }
});
