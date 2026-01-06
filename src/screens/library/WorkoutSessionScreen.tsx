import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  Image,
  Animated,
  Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp as RNRouteProp, CommonActions, StackActions } from '@react-navigation/native';
import { ArrowLeft, Check, Clock, Pause, Play, Square, Target, Zap, TrendingUp, Weight, Flame, FileText, Settings, Dumbbell, Layers, ArrowRight, SkipForward } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';
import { useTextSizeStore, getScaledFontSize } from '@/store/textSizeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';
import type { LibraryStackParamList } from '@/types';
import { workoutService, type ExerciseConfig } from '@/services/workouts';
import { useAuthStore } from '@/store/authStore';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { getTranslatedExerciseName } from '@/utils/exerciseTranslations';
import { EnhancedRestTimer } from '@/components/workout/EnhancedRestTimer';
import { RestTimerSettings } from '@/components/workout/RestTimerSettings';

type NavigationProp = StackNavigationProp<LibraryStackParamList, 'WorkoutSession'>;
type RouteProp = RNRouteProp<LibraryStackParamList, 'WorkoutSession'>;

interface WorkoutSessionScreenProps {
  navigation: NavigationProp;
  route: RouteProp;
}

interface ExerciseProgress {
  id: string;
  name: string;
  sets: string;
  reps: string;
  restTime: string;
  image_url?: string; // Exercise image URL
  completedSets: boolean[]; // Array of booleans for each set
  weights: (number | null)[]; // Array of weights for each set (null if not set)
  completed: boolean;
}

export const WorkoutSessionScreen: React.FC<WorkoutSessionScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { textSize } = useTextSizeStore();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const [exercises, setExercises] = useState<ExerciseProgress[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [previousWorkoutData, setPreviousWorkoutData] = useState<Map<string, any>>(new Map());

  // Grouped session state - related data updated together for better organization
  const [sessionState, setSessionState] = useState<{
    sessionStarted: boolean;
    sessionId: string | null;
    startTime: Date | null;
    elapsedTime: number;
  }>({
    sessionStarted: false,
    sessionId: null,
    startTime: null,
    elapsedTime: 0,
  });

  // Grouped pause state - related data updated together
  const [pauseState, setPauseState] = useState<{
    isPaused: boolean;
    pausedTime: Date | null;
    totalPausedDuration: number;
  }>({
    isPaused: false,
    pausedTime: null,
    totalPausedDuration: 0,
  });

  // Grouped rest timer state - related data updated together
  const [restTimerState, setRestTimerState] = useState<{
    restTimer: number;
    isResting: boolean;
  }>({
    restTimer: 0,
    isResting: false,
  });

  const [isBetweenExercises, setIsBetweenExercises] = useState(false);

  // Phase 1: Intro Animations
  const timeAnim = useRef(new Animated.Value(0)).current;
  const setsAnim = useRef(new Animated.Value(0)).current;
  const exercisesAnim = useRef(new Animated.Value(0)).current;
  const startButtonPulse = useRef(new Animated.Value(1)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const exerciseCardAnim = useRef(new Animated.Value(1)).current;
  const exerciseSlideAnim = useRef(new Animated.Value(0)).current;
  const setPopAnims = useRef<Animated.Value[]>([]).current;
  const progressGlowAnim = useRef(new Animated.Value(0.3)).current;

  // Destructure for easy access
  const { sessionStarted, sessionId, startTime, elapsedTime } = sessionState;
  const { isPaused, pausedTime, totalPausedDuration } = pauseState;
  const { restTimer, isResting } = restTimerState;

  // Initialize pop animations for sets based on count
  useEffect(() => {
    if (exercises.length > 0) {
      const maxSets = Math.max(...exercises.map(ex => parseInt(ex.sets) || 3));
      // Only re-initialize if needed
      if (setPopAnims.length < maxSets) {
        for (let i = setPopAnims.length; i < maxSets; i++) {
          setPopAnims.push(new Animated.Value(1));
        }
      }
    }
  }, [exercises]);

  // Initialize progress glow
  useEffect(() => {
    if (sessionStarted && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(progressGlowAnim, {
            toValue: 0.8,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(progressGlowAnim, {
            toValue: 0.3,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      progressGlowAnim.setValue(0.3);
    }
  }, [sessionStarted, isPaused]);

  const [displayStats, setDisplayStats] = useState({
    time: 0,
    sets: 0,
    exercises: 0
  });

  // Calculate workout stats for pre-workout screen
  const workoutStats = React.useMemo(() => {
    const totalEx = exercises.length;
    const totalSetsCount = exercises.reduce((sum, ex) => {
      const numSets = parseInt(ex.sets) || 3;
      return sum + numSets;
    }, 0);

    // Estimate time: assume 2 minutes per set + rest time
    const estimatedTimeMin = exercises.reduce((sum, ex) => {
      const sets = parseInt(ex.sets) || 3;
      const restSeconds = parseInt(ex.restTime.replace('s', '')) || 60;
      return sum + (sets * 2) + ((sets - 1) * (restSeconds / 60));
    }, 0);

    return {
      totalExercises: totalEx,
      totalSets: totalSetsCount,
      estimatedTimeMinutes: Math.round(estimatedTimeMin),
    };
  }, [exercises]);

  // Handle intro animations
  useEffect(() => {
    if (!sessionStarted && exercises.length > 0) {
      // 1. Fade in content
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      // 2. Count up stats
      const duration = 1500;
      const steps = 60;
      const interval = duration / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        // Simple linear interpolation
        setDisplayStats({
          time: Math.round(workoutStats.estimatedTimeMinutes * progress),
          sets: Math.round(workoutStats.totalSets * progress),
          exercises: Math.round(workoutStats.totalExercises * progress)
        });

        if (currentStep >= steps) {
          clearInterval(timer);
        }
      }, interval);

      // 3. Start Button Pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(startButtonPulse, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(startButtonPulse, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      return () => clearInterval(timer);
    }
  }, [sessionStarted, exercises.length, workoutStats]);


  // Refs to prevent stale closures
  const exercisesRef = useRef<ExerciseProgress[]>([]);
  const autoAdvanceRef = useRef(false);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  const workoutName = route.params.workoutName;
  const workoutType = route.params.workoutType;
  const workoutId = route.params.workoutId || (route.params as any).nativeWorkoutId; // Unified workout_id
  const selectedDay = route.params.selectedDay; // Selected day for split workouts (1-7)

  // Load previous workout data for progressive overload suggestions
  useEffect(() => {
    if (user?.id && exercises.length > 0) {
      loadPreviousWorkoutData();
    }
  }, [user?.id, exercises.length]);

  // Initialize exercises from route params
  useEffect(() => {
    // If resuming a session, load saved progress
    if (route.params.sessionId) {
      loadSessionProgress();
    } else {
      const initialExercises: ExerciseProgress[] = route.params.exercises.map((ex: ExerciseConfig) => {
        const numSets = parseInt(ex.sets) || 3;
        return {
          id: ex.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          restTime: ex.restTime,
          image_url: ex.image, // ExerciseConfig uses 'image', map to 'image_url'
          completedSets: new Array(numSets).fill(false),
          weights: new Array(numSets).fill(null) as (number | null)[],
          completed: false,
        };
      });
      setExercises(initialExercises);
    }
  }, [route.params.exercises, route.params.sessionId]);

  // Load saved session progress
  const loadSessionProgress = async () => {
    const resumeSessionId = route.params.sessionId;
    if (!resumeSessionId || !user?.id) return;

    try {
      const sessions = await workoutService.getWorkoutSessions(user.id);
      const session = sessions.find(s => s.id === resumeSessionId);

      if (session) {
        // Use saved exercises if available, otherwise use route params
        if (session.exercises_completed && session.exercises_completed.length > 0) {
          const savedExercises: ExerciseProgress[] = session.exercises_completed.map((ex: any) => {
            const numSets = parseInt(ex.sets) || 3;
            return {
              id: ex.id,
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              restTime: ex.restTime,
              image_url: ex.image_url, // Preserve image_url from saved session
              completedSets: ex.completedSets || new Array(numSets).fill(false),
              weights: ex.weights || new Array(numSets).fill(null) as (number | null)[],
              completed: ex.completed || false,
            };
          });
          setExercises(savedExercises);

          // Find first incomplete exercise
          const firstIncompleteIndex = savedExercises.findIndex(ex => !ex.completed);
          if (firstIncompleteIndex >= 0) {
            setCurrentExerciseIndex(firstIncompleteIndex);
          }
        } else {
          // No saved exercises, use route params
          const initialExercises: ExerciseProgress[] = route.params.exercises.map((ex: ExerciseConfig) => {
            const numSets = parseInt(ex.sets) || 3;
            return {
              id: ex.id,
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              restTime: ex.restTime,
              image_url: ex.image, // ExerciseConfig uses 'image', map to 'image_url'
              completedSets: new Array(numSets).fill(false),
              weights: new Array(numSets).fill(null) as (number | null)[],
              completed: false,
            };
          });
          setExercises(initialExercises);
        }

        const sessionStartTime = new Date(session.started_at);
        // Calculate elapsed time if session was already started
        const elapsed = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000);
        setSessionState({
          sessionId: resumeSessionId,
          startTime: sessionStartTime,
          elapsedTime: elapsed,
          sessionStarted: true,
        });
      }
    } catch (error) {
      console.error('Error loading session progress:', error);
      // Fallback to fresh start
      const initialExercises: ExerciseProgress[] = route.params.exercises.map((ex: ExerciseConfig) => {
        const numSets = parseInt(ex.sets) || 3;
        return {
          id: ex.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          restTime: ex.restTime,
          image_url: ex.image, // ExerciseConfig uses 'image', map to 'image_url'
          completedSets: new Array(numSets).fill(false),
          weights: new Array(numSets).fill(null) as (number | null)[],
          completed: false,
        };
      });
      setExercises(initialExercises);
    }
  };

  // Start workout session
  const startSession = async () => {
    if (!user?.id) {
      dialogManager.error('Error', 'You must be logged in to start a workout');
      return;
    }

    try {
      // Verify workout exists before setting foreign key (unified workouts table)
      let verifiedWorkoutId: string | undefined = undefined;
      if (workoutId) {
        const workout = await workoutService.getWorkoutById(workoutId);
        if (workout) {
          verifiedWorkoutId = workoutId;
        } else {
          console.warn('Workout not found in database:', workoutId);
        }
      }

      // Get workout details for denormalized data if needed
      const workout = verifiedWorkoutId ? await workoutService.getWorkoutById(verifiedWorkoutId) : null;

      // createWorkoutSession will auto-complete any existing incomplete sessions
      // Clear the store first to prevent continue button from showing
      const { setLatestIncompleteSession } = useWorkoutsStore.getState();
      setLatestIncompleteSession(null, null);

      const session = await workoutService.createWorkoutSession(user.id, {
        workout_id: verifiedWorkoutId, // Optional: unified workout_id
        workout_name: workoutName || workout?.name || 'Workout',
        workout_type: workoutType || (verifiedWorkoutId ? 'custom' : 'native'),
        exercises_completed: [],
      });

      // Ensure store is cleared after creating new session
      setLatestIncompleteSession(null, null);
      const now = new Date();
      setSessionState({
        sessionId: session.id,
        startTime: now,
        elapsedTime: 0,
        sessionStarted: true,
      });
    } catch (error: any) {
      dialogManager.error('Error', error.message || 'Failed to start workout session');
    }
  };

  // Save progress when leaving
  const saveProgress = async () => {
    if (!user?.id || !sessionId) {
      return;
    }

    try {
      const exercisesCompleted = exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: String(ex.sets), // Ensure sets is a string
        reps: String(ex.reps), // Ensure reps is a string (can be "12,10,8,6")
        restTime: String(ex.restTime), // Ensure restTime is a string
        image_url: ex.image_url, // Preserve image URL
        completedSets: ex.completedSets,
        weights: ex.weights,
        completed: ex.completed,
      }));

      await workoutService.updateWorkoutSession(sessionId, user.id, {
        exercises_completed: exercisesCompleted,
      });
    } catch (error: any) {
      console.error('Error saving progress:', error);
    }
  };

  // Load previous workout data for progressive overload
  const loadPreviousWorkoutData = async () => {
    if (!user?.id) return;

    try {
      const sessions = await workoutService.getWorkoutSessions(user.id, 10);
      const dataMap = new Map<string, any>();

      // Find the most recent completed session with the same exercises
      for (const session of sessions) {
        if (session.completed_at && session.exercises_completed) {
          for (const ex of session.exercises_completed) {
            if (ex.weights && ex.weights.length > 0) {
              const exerciseKey = ex.id || ex.name;
              if (!dataMap.has(exerciseKey)) {
                // Calculate average weight and max weight from previous session
                const validWeights = ex.weights.filter((w: any) => w !== null && w !== undefined) as number[];
                if (validWeights.length > 0) {
                  const avgWeight = validWeights.reduce((a, b) => a + b, 0) / validWeights.length;
                  const maxWeight = Math.max(...validWeights);
                  dataMap.set(exerciseKey, {
                    avgWeight,
                    maxWeight,
                    weights: validWeights,
                    reps: ex.reps,
                  });
                }
              }
            }
          }
        }
      }

      setPreviousWorkoutData(dataMap);
    } catch (error) {
      console.error('Error loading previous workout data:', error);
    }
  };

  // Get progressive overload suggestion for an exercise
  const getProgressiveOverloadSuggestion = (exerciseId: string, exerciseName: string): number | null => {
    const exerciseKey = exerciseId || exerciseName;
    const previousData = previousWorkoutData.get(exerciseKey);

    if (!previousData) return null;

    // Suggest 2.5-5% increase (typically 2.5kg or 5lbs)
    // For simplicity, we'll suggest +2.5kg (or +5lbs if using imperial)
    const increase = previousData.maxWeight * 0.025; // 2.5% increase
    const suggestedWeight = previousData.maxWeight + Math.max(increase, 2.5); // At least 2.5kg increase

    // Round to nearest 2.5kg (or 5lbs)
    return Math.round(suggestedWeight / 2.5) * 2.5;
  };

  // Update weight for a set
  const updateWeight = (exerciseIndex: number, setIndex: number, weight: string) => {
    setExercises(prev => {
      const updated = [...prev];
      const weightValue = weight === '' ? null : parseFloat(weight);
      updated[exerciseIndex].weights[setIndex] = weightValue;
      return updated;
    });
  };

  // Toggle set completion
  const toggleSet = (exerciseIndex: number, setIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIndex] };
      const completedSets = [...exercise.completedSets];

      const wasCompleted = completedSets[setIndex];
      completedSets[setIndex] = !wasCompleted;

      // If the exercise was not fully completed before but now it is
      const allSetsCompleted = completedSets.every(s => s === true);
      const exerciseJustFinished = !exercise.completed && allSetsCompleted;

      exercise.completedSets = completedSets;
      exercise.completed = allSetsCompleted;
      updated[exerciseIndex] = exercise;

      // Trigger animations and haptics
      if (!wasCompleted) {
        // Dopamine Feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (setPopAnims[setIndex]) {
          setPopAnims[setIndex].setValue(1);
          Animated.sequence([
            Animated.spring(setPopAnims[setIndex], {
              toValue: 1.15,
              useNativeDriver: true,
              tension: 100,
              friction: 3,
            }),
            Animated.spring(setPopAnims[setIndex], {
              toValue: 1,
              useNativeDriver: true,
              tension: 100,
              friction: 3,
            })
          ]).start();
        }

        // Handle rest timer logic
        if (!exerciseJustFinished) {
          const restTimeSeconds = parseInt(exercise.restTime.replace('s', '')) || 60;
          startRestTimer(restTimeSeconds);
        } else {
          // If exercise is finished, we might want to start a longer rest or auto-advance
          const restTimeSeconds = parseInt(exercise.restTime.replace('s', '')) || 60;
          startRestTimer(restTimeSeconds, true);
        }
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      exercisesRef.current = updated;
      return updated;
    });
  };

  // Start rest timer
  const startRestTimer = (seconds: number, autoAdvanceToNextExercise = false) => {
    setRestTimerState({ isResting: true, restTimer: seconds });
    autoAdvanceRef.current = autoAdvanceToNextExercise;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      setRestTimerState(prev => {
        if (prev.restTimer <= 1) {
          setRestTimerState({ isResting: false, restTimer: 0 });
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }

          if (autoAdvanceRef.current) {
            setTimeout(() => {
              setCurrentExerciseIndex(prevIndex => {
                if (prevIndex < exercisesRef.current.length - 1) {
                  const nextIndex = prevIndex + 1;
                  setExercises(prevExercises => {
                    const updated = [...prevExercises];
                    if (updated[nextIndex]) {
                      updated[nextIndex].completed = false;
                      const numSets = parseInt(updated[nextIndex].sets) || 3;
                      updated[nextIndex].completedSets = new Array(numSets).fill(false);
                    }
                    exercisesRef.current = updated;
                    return updated;
                  });
                  setIsBetweenExercises(false);
                  return nextIndex;
                }
                return prevIndex;
              });
            }, 0);
            autoAdvanceRef.current = false;
          }
          return { isResting: false, restTimer: 0 };
        }
        return { ...prev, restTimer: prev.restTimer - 1 };
      });
    }, 1000);
  };

  // Stop rest timer
  const stopRestTimer = () => {
    setRestTimerState({ isResting: false, restTimer: 0 });
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  // Pause workout
  const pauseWorkout = () => {
    setPauseState(prev => ({
      ...prev,
      isPaused: true,
      pausedTime: new Date(),
    }));
    // Pause rest timer if active
    if (isResting) {
      stopRestTimer();
    }
  };

  // Resume workout
  const resumeWorkout = () => {
    setPauseState(prev => {
      const pauseDuration = prev.pausedTime
        ? Math.floor((new Date().getTime() - prev.pausedTime.getTime()) / 1000)
        : 0;
      return {
        isPaused: false,
        pausedTime: null,
        totalPausedDuration: prev.totalPausedDuration + pauseDuration,
      };
    });
  };

  // Workout duration timer (only runs when not paused)
  useEffect(() => {
    if (!sessionStarted || !startTime) return;

    // Calculate initial elapsed time
    if (startTime) {
      const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000) - totalPausedDuration;
      setSessionState(prev => ({ ...prev, elapsedTime: Math.max(0, elapsed) }));
    }

    if (isPaused) return; // Don't update timer when paused

    const durationInterval = setInterval(() => {
      if (startTime && !isPaused) {
        // Subtract total paused duration to get accurate elapsed time
        const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000) - totalPausedDuration;
        setSessionState(prev => ({ ...prev, elapsedTime: Math.max(0, elapsed) }));
      }
    }, 1000);

    return () => clearInterval(durationInterval);
  }, [sessionStarted, startTime, isPaused, totalPausedDuration]);

  // Track paused duration
  useEffect(() => {
    if (!isPaused || !pausedTime) return;

    const pauseInterval = setInterval(() => {
      if (pausedTime) {
        // Update total paused duration
        setPauseState(prev => ({ ...prev, totalPausedDuration: prev.totalPausedDuration + 1 }));
      }
    }, 1000);

    return () => clearInterval(pauseInterval);
  }, [isPaused, pausedTime]);

  // Handle app state changes (pause timer when app goes to background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - recalculate elapsed time
        if (startTime) {
          const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
          setSessionState(prev => ({ ...prev, elapsedTime: elapsed }));
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [startTime]);

  // Finish workout
  const finishWorkout = async () => {
    if (!user?.id || !sessionId) {
      dialogManager.error(t('common.error'), t('library.workoutSession.sessionNotFound'));
      return;
    }

    dialogManager.show(
      t('library.workoutSession.finishWorkout'),
      t('library.workoutSession.finishConfirm'),
      'info',
      {
        showCancel: true,
        cancelText: t('library.workoutSession.cancel'),
        confirmText: t('library.workoutSession.finish'),
        onConfirm: async () => {
          try {
            const endTime = new Date();
            // Calculate duration accounting for paused time
            const totalSeconds = startTime
              ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) - totalPausedDuration
              : 0;
            const durationMinutes = Math.max(0, Math.floor(totalSeconds / 60));

            const exercisesCompleted = exercises.map(ex => ({
              id: ex.id,
              name: ex.name,
              sets: String(ex.sets), // Ensure sets is a string
              reps: String(ex.reps), // Ensure reps is a string (can be "12,10,8,6")
              restTime: String(ex.restTime), // Ensure restTime is a string
              completedSets: ex.completedSets,
              weights: ex.weights,
              completed: ex.completed,
            }));

            const updatedSession = await workoutService.updateWorkoutSession(sessionId, user.id, {
              completed_at: endTime.toISOString(),
              duration_minutes: durationMinutes,
              exercises_completed: exercisesCompleted,
            });

            if (__DEV__) {
              logger.debug('Workout completed - updated session:', {
                sessionId,
                completedAt: updatedSession.completed_at,
                hasCompletedAt: !!updatedSession.completed_at,
              });
            }

            // Verify the update succeeded (completed_at should be set)
            if (!updatedSession.completed_at) {
              throw new Error('Failed to mark session as completed');
            }

            // Clear the incomplete session from the store and mark this sessionId as recently completed
            const { setLatestIncompleteSession, loadLatestIncompleteSession } = useWorkoutsStore.getState();
            if (__DEV__) {
              logger.debug('Clearing store and marking session as recently completed:', sessionId);
            }
            setLatestIncompleteSession(null, null, sessionId);

            if (__DEV__) {
              const stateAfterClear = useWorkoutsStore.getState();
              logger.debug('Store state after clear:', {
                hasSession: !!stateAfterClear.latestIncompleteSession,
                recentlyCompletedId: stateAfterClear.recentlyCompletedSessionId,
              });
            }

            // After a short delay, reload to check for other incomplete sessions
            // This ensures any other incomplete sessions are properly handled
            setTimeout(() => {
              loadLatestIncompleteSession(user.id, true);
            }, 500);

            // Navigate to workout summary screen
            navigation.navigate('WorkoutSummary', {
              workoutName: workoutName,
              durationMinutes: durationMinutes,
              exercises: exercisesCompleted,
              completedAt: endTime.toISOString(),
              returnTo: route.params?.returnTo,
            });
          } catch (error: any) {
            dialogManager.error(t('common.error'), error.message || t('library.workoutSession.failedToFinish'));
          }
        },
      }
    );
  };

  const currentExercise = exercises[currentExerciseIndex] || null;
  const completedExercisesCount = exercises.filter(ex => ex.completed).length;
  const totalExercises = exercises.length;
  const progress = totalExercises > 0 ? (completedExercisesCount / totalExercises) * 100 : 0;

  // Ensure currentExerciseIndex is valid
  useEffect(() => {
    if (exercises.length > 0 && (currentExerciseIndex >= exercises.length || currentExerciseIndex < 0)) {
      setCurrentExerciseIndex(0);
    }
  }, [exercises.length, currentExerciseIndex]);

  // Handle back navigation (both button and gesture) with confirmation
  useEffect(() => {
    // Only show confirmation if session has started
    if (!sessionStarted) {
      return;
    }

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Show confirmation dialog
      dialogManager.show(
        t('library.workoutSession.leaveWarning'),
        t('library.workoutSession.leaveMessage'),
        'warning',
        {
          showCancel: true,
          cancelText: t('library.workoutSession.cancel'),
          confirmText: t('common.back'),
          onConfirm: async () => {
            // Save progress before leaving
            if (user?.id && sessionId) {
              try {
                const exercisesCompleted = exercises.map(ex => ({
                  id: ex.id,
                  name: ex.name,
                  sets: String(ex.sets), // Ensure sets is a string
                  reps: String(ex.reps), // Ensure reps is a string (can be "12,10,8,6")
                  restTime: String(ex.restTime), // Ensure restTime is a string
                  completedSets: ex.completedSets,
                  weights: ex.weights,
                  completed: ex.completed,
                }));

                await workoutService.updateWorkoutSession(sessionId, user.id, {
                  exercises_completed: exercisesCompleted,
                });
              } catch (error: any) {
                console.error('Error saving progress:', error);
              }
            }
            // Navigate away after confirming
            if (route.params?.returnTo === 'Plan') {
              navigation.navigate('Workouts' as any, { screen: 'WorkoutsMain' });
            } else {
              navigation.dispatch(e.data.action);
            }
          },
        }
      );
    });

    return unsubscribe;
  }, [navigation, sessionStarted, exercises, sessionId, user?.id, t]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      fontSize: getResponsiveFontSize(20),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
    },
    pauseButton: {
      width: scaleWidth(48),
      height: scaleHeight(48),
      borderRadius: scaleWidth(24),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 2,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    previousButton: {
      marginHorizontal: getResponsiveSpacing(24),
      marginTop: getResponsiveSpacing(20),
      borderRadius: getResponsiveSpacing(16),
      paddingVertical: getResponsiveSpacing(18),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
      borderWidth: 2,
      borderColor: isDark ? getPrimaryWithOpacity(0.3) : getPrimaryWithOpacity(0.4),
      backgroundColor: isDark ? '#2a2a2a' : getTextColorWithOpacity(false, 0.1),
      flexDirection: 'row' as const,
      gap: getResponsiveSpacing(12),
    },
    previousButtonText: {
      fontSize: getScaledFontSize(18),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_700Bold',
      textTransform: 'uppercase' as const,
      letterSpacing: 1.5,
    },
    progressContainer: {
      marginHorizontal: getResponsiveSpacing(24),
      marginBottom: getResponsiveSpacing(20),
    },
    progressText: {
      textAlign: 'center' as const,
      fontSize: getScaledFontSize(15),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
      marginBottom: getResponsiveSpacing(10),
    },
    durationContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: getResponsiveSpacing(8),
      marginBottom: getResponsiveSpacing(12),
    },
    durationText: {
      fontSize: getScaledFontSize(14),
      fontWeight: '600' as const,
      color: getTextColorWithOpacity(isDark, 0.7),
      fontFamily: 'Barlow_600SemiBold',
    },
    durationValue: {
      fontSize: getScaledFontSize(16),
      fontWeight: '700' as const,
      color: BRAND_PRIMARY,
      fontFamily: 'Barlow_700Bold',
    },
    progressBar: {
      height: scaleHeight(8),
      backgroundColor: isDark ? '#1a1a1a' : getTextColorWithOpacity(false, 0.1),
      borderRadius: scaleWidth(4),
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: isDark ? getPrimaryWithOpacity(0.2) : getPrimaryWithOpacity(0.1),
    },
    progressFill: {
      height: scaleHeight(8),
      borderRadius: scaleWidth(4),
    },
    restTimerContainer: {
      marginHorizontal: getResponsiveSpacing(24),
      marginBottom: getResponsiveSpacing(20),
      padding: getResponsiveSpacing(20),
      borderRadius: getResponsiveSpacing(16),
      overflow: 'hidden' as const,
      borderWidth: 2,
      borderColor: BRAND_PRIMARY,
    },
    restTimerContent: {
      alignItems: 'center' as const,
    },
    restTimerIcon: {
      marginBottom: getResponsiveSpacing(12),
    },
    restTimerText: {
      fontSize: getScaledFontSize(56),
      fontWeight: '700' as const,
      color: BRAND_PRIMARY,
      fontFamily: 'Barlow_700Bold',
      marginBottom: getResponsiveSpacing(8),
      letterSpacing: 2,
    },
    restTimerLabel: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600' as const,
      color: getTextColorWithOpacity(isDark, 0.8),
      fontFamily: 'Barlow_600SemiBold',
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
    },
    exerciseCard: {
      marginHorizontal: getResponsiveSpacing(24),
      marginBottom: getResponsiveSpacing(20),
      borderRadius: getResponsiveSpacing(20),
      overflow: 'hidden' as const,
      borderWidth: 2,
      borderColor: isDark ? getPrimaryWithOpacity(0.3) : getPrimaryWithOpacity(0.2),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    exerciseCardContent: {
      padding: getResponsiveSpacing(20),
    },
    exerciseHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: getResponsiveSpacing(12),
      marginBottom: getResponsiveSpacing(20),
      paddingBottom: getResponsiveSpacing(16),
      borderBottomWidth: 1,
      borderBottomColor: isDark ? getPrimaryWithOpacity(0.2) : getPrimaryWithOpacity(0.1),
    },
    exerciseIcon: {
      width: scaleWidth(44),
      height: scaleHeight(44),
      borderRadius: scaleWidth(22),
      backgroundColor: getPrimaryWithOpacity(0.2),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    exerciseName: {
      flex: 1,
      fontSize: getScaledFontSize(22),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_700Bold',
    },
    setsContainer: {
      gap: getResponsiveSpacing(14),
    },
    setRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: getResponsiveSpacing(12),
      paddingHorizontal: getResponsiveSpacing(14),
      borderRadius: getResponsiveSpacing(16),
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8f8f8',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      marginBottom: getResponsiveSpacing(8),
    },
    setRowCompleted: {
      backgroundColor: isDark ? getPrimaryWithOpacity(0.12) : getPrimaryWithOpacity(0.08),
      borderColor: BRAND_PRIMARY,
      borderWidth: 1.5,
    },
    setInfo: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: getResponsiveSpacing(14),
      flex: 1,
    },
    setNumberBadge: {
      width: scaleWidth(36),
      height: scaleHeight(36),
      borderRadius: scaleWidth(10),
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    setNumberBadgeCompleted: {
      backgroundColor: BRAND_PRIMARY,
      borderColor: BRAND_PRIMARY,
    },
    setNumber: {
      fontSize: getScaledFontSize(14),
      fontWeight: '700' as const,
      color: getTextColorWithOpacity(isDark, 0.6),
      fontFamily: 'Barlow_700Bold',
    },
    setNumberCompleted: {
      color: BRAND_BLACK,
    },
    setRepsContainer: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: getResponsiveSpacing(6),
    },
    setRepsLabel: {
      fontSize: getScaledFontSize(11),
      fontWeight: '600' as const,
      color: getTextColorWithOpacity(isDark, 0.4),
      fontFamily: 'Barlow_600SemiBold',
      textTransform: 'uppercase' as const,
    },
    setReps: {
      fontSize: getScaledFontSize(16),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_700Bold',
    },
    setWeightContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: getResponsiveSpacing(8),
    },
    setWeightInput: {
      width: scaleWidth(80),
      height: scaleHeight(42),
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
      borderRadius: getResponsiveSpacing(10),
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      paddingHorizontal: getResponsiveSpacing(8),
      fontSize: getScaledFontSize(16),
      fontWeight: '700' as const,
      color: isDark ? BRAND_WHITE : BRAND_BLACK,
      fontFamily: 'Barlow_700Bold',
      textAlign: 'center' as const,
    },
    setWeightUnit: {
      fontSize: getScaledFontSize(13),
      fontWeight: '600' as const,
      color: getTextColorWithOpacity(isDark, 0.4),
      fontFamily: 'Barlow_600SemiBold',
      textTransform: 'lowercase' as const,
    },
    suggestionBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: getResponsiveSpacing(6),
      paddingHorizontal: getResponsiveSpacing(10),
      paddingVertical: getResponsiveSpacing(6),
      borderRadius: getResponsiveSpacing(12),
      backgroundColor: getPrimaryWithOpacity(0.15),
      borderWidth: 1,
      borderColor: BRAND_PRIMARY,
      marginTop: getResponsiveSpacing(8),
    },
    suggestionText: {
      fontSize: getScaledFontSize(12),
      fontWeight: '600' as const,
      color: BRAND_PRIMARY,
      fontFamily: 'Barlow_600SemiBold',
    },
    setCheckbox: {
      width: scaleWidth(36),
      height: scaleHeight(36),
      borderRadius: scaleWidth(18),
      borderWidth: 3,
      borderColor: getTextColorWithOpacity(isDark, 0.4),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: 'transparent',
    },
    setCheckboxCompleted: {
      backgroundColor: BRAND_PRIMARY,
      borderColor: BRAND_PRIMARY,
    },
    finishButton: {
      position: 'absolute' as const,
      bottom: insets.bottom + getResponsiveSpacing(100) + getResponsiveSpacing(16),
      left: getResponsiveSpacing(24),
      right: getResponsiveSpacing(24),
      borderRadius: getResponsiveSpacing(16),
      paddingVertical: getResponsiveSpacing(18),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
      shadowColor: BRAND_PRIMARY,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
    finishButtonText: {
      fontSize: getScaledFontSize(18),
      fontWeight: '700' as const,
      color: BRAND_BLACK,
      fontFamily: 'Barlow_700Bold',
      textTransform: 'uppercase' as const,
      letterSpacing: 1.5,
    },
    startButton: {
      width: '100%' as any,
      borderRadius: getResponsiveSpacing(16),
      paddingVertical: getResponsiveSpacing(20),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
      shadowColor: BRAND_PRIMARY,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    startButtonText: {
      fontSize: getScaledFontSize(18),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_700Bold',
      textTransform: 'uppercase' as const,
      letterSpacing: 1.5,
    },
  }), [isDark, textSize, BRAND_BLACK, BRAND_WHITE, BRAND_PRIMARY, insets.top, insets.bottom]);


  // Calculate total days from exercises (get unique day values) - MUST be outside conditional
  const totalDays = React.useMemo(() => {
    if (route.params.exercises && route.params.exercises.length > 0) {
      const days = new Set<number>();
      route.params.exercises.forEach((ex: any) => {
        if (ex.day) {
          days.add(ex.day);
        }
      });
      return days.size > 0 ? days.size : 1;
    }
    return 1;
  }, [route.params.exercises]);

  // Get workout image from first exercise or workout data - MUST be outside conditional
  const workoutImage = React.useMemo(() => {
    // Try to get from route params first (if passed)
    if ((route.params as any).workoutImage) {
      return (route.params as any).workoutImage;
    }
    // Otherwise use first exercise image
    if (exercises.length > 0 && exercises[0].image_url) {
      return exercises[0].image_url;
    }
    // Default fallback
    return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800';
  }, [exercises, route.params]);

  if (!sessionStarted) {

    // Determine badge text based on selectedDay or total exercises
    const badgeText = selectedDay
      ? `DAY ${selectedDay} OF ${totalDays}`
      : `${workoutStats.totalExercises} EXERCISES`;

    return (
      <View style={dynamicStyles.container}>
        {/* Workout Image Background */}
        {workoutImage && (
          <Image
            source={{ uri: workoutImage }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}

        {/* Dark Gradient Overlay - Layered for depth */}
        <LinearGradient
          colors={['rgba(3, 3, 3, 0.4)', 'rgba(3, 3, 3, 0.8)']}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', 'rgba(3, 3, 3, 0.9)']}
          style={[StyleSheet.absoluteFill, { height: '50%', top: '50%' }]}
        />
        <LinearGradient
          colors={['rgba(3, 3, 3, 0.8)', 'transparent']}
          style={[StyleSheet.absoluteFill, { height: '30%' }]}
        />

        {/* Custom Header - No Title Text */}
        <View style={{
          position: 'absolute' as const,
          top: insets.top + getResponsiveSpacing(12),
          left: 0,
          right: 0,
          flexDirection: 'row' as const,
          justifyContent: 'space-between' as const,
          alignItems: 'center' as const,
          paddingHorizontal: getResponsiveSpacing(20),
          zIndex: 10,
        }}>
          <Pressable
            onPress={() => {
              if (!sessionStarted) {
                if (route.params?.returnTo === 'Plan') {
                  navigation.dispatch(StackActions.popToTop());
                  navigation.navigate('Workouts' as any, { screen: 'WorkoutsMain' });
                } else {
                  navigation.goBack();
                }
              } else {
                // beforeRemove listener will handle started sessions
                navigation.goBack();
              }
            }}
            style={{
              padding: getResponsiveSpacing(12),
            }}
          >
            <ArrowLeft size={24} color={BRAND_WHITE} />
          </Pressable>

          <Pressable
            onPress={() => setShowSettings(true)}
            style={{
              padding: getResponsiveSpacing(12),
            }}
          >
            <Settings size={24} color={BRAND_WHITE} />
          </Pressable>
        </View>

        {/* Content Container */}
        <Animated.View style={{
          flex: 1,
          justifyContent: 'space-between' as const,
          paddingTop: insets.top + getResponsiveSpacing(100),
          paddingBottom: insets.bottom + getResponsiveSpacing(40),
          paddingHorizontal: getResponsiveSpacing(24),
          opacity: contentFadeAnim,
          transform: [{
            translateY: contentFadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })
          }]
        }}>
          {/* Hero Section: Badge and Title */}
          <View style={{ alignItems: 'center' as const }}>
            {/* Day/Exercise Badge */}
            <View style={{
              backgroundColor: 'rgba(132, 196, 65, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(132, 196, 65, 0.5)',
              paddingHorizontal: getResponsiveSpacing(20),
              paddingVertical: getResponsiveSpacing(10),
              borderRadius: getResponsiveSpacing(24),
              marginBottom: getResponsiveSpacing(24),
            }}>
              <Text style={{
                fontSize: getScaledFontSize(13),
                fontWeight: '700' as const,
                color: BRAND_PRIMARY,
                fontFamily: 'Barlow_700Bold',
                letterSpacing: 1,
                textTransform: 'uppercase' as const,
              }}>
                {badgeText}
              </Text>
            </View>

            {/* Workout Title - Using Barlow Font */}
            <Text style={{
              fontSize: getResponsiveFontSize(36),
              fontWeight: 'normal' as const,
              color: BRAND_WHITE,
              fontFamily: 'Barlow_800ExtraBold',
              textAlign: 'center' as const,
              marginBottom: getResponsiveSpacing(40),
              letterSpacing: -0.5,
              lineHeight: getResponsiveFontSize(42),
              paddingHorizontal: getResponsiveSpacing(24),
            }}>
              {workoutName}
            </Text>
          </View>

          {/* Stats Section */}
          <View style={{
            flexDirection: 'row' as const,
            justifyContent: 'space-around' as const,
            marginBottom: getResponsiveSpacing(48),
            paddingHorizontal: getResponsiveSpacing(24),
          }}>
            {/* Time Stat */}
            <View style={{ alignItems: 'center' as const, flex: 1, gap: getResponsiveSpacing(12) }}>
              <BlurView intensity={30} tint="dark" style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(132, 196, 65, 0.1)',
                justifyContent: 'center' as const,
                alignItems: 'center' as const,
                marginBottom: getResponsiveSpacing(4),
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(132, 196, 65, 0.3)',
              }}>
                <Clock size={28} color={BRAND_PRIMARY} />
              </BlurView>
              <Text style={{
                fontSize: getScaledFontSize(28),
                fontWeight: '700' as const,
                color: BRAND_WHITE,
                fontFamily: 'Barlow_700Bold',
              }}>
                {displayStats.time}min
              </Text>
              <Text style={{
                fontSize: getScaledFontSize(14),
                color: 'rgba(255, 255, 255, 0.7)',
                fontFamily: 'Barlow_500Medium',
                fontWeight: '500' as const,
              }}>
                Time
              </Text>
            </View>

            {/* Sets Stat */}
            <View style={{ alignItems: 'center' as const, flex: 1, gap: getResponsiveSpacing(12) }}>
              <BlurView intensity={30} tint="dark" style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(132, 196, 65, 0.1)',
                justifyContent: 'center' as const,
                alignItems: 'center' as const,
                marginBottom: getResponsiveSpacing(4),
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(132, 196, 65, 0.3)',
              }}>
                <Layers size={28} color={BRAND_PRIMARY} />
              </BlurView>
              <Text style={{
                fontSize: getScaledFontSize(28),
                fontWeight: '700' as const,
                color: BRAND_WHITE,
                fontFamily: 'Barlow_700Bold',
              }}>
                {displayStats.sets}
              </Text>
              <Text style={{
                fontSize: getScaledFontSize(14),
                color: 'rgba(255, 255, 255, 0.7)',
                fontFamily: 'Barlow_500Medium',
                fontWeight: '500' as const,
              }}>
                Sets
              </Text>
            </View>

            {/* Exercises Stat */}
            <View style={{ alignItems: 'center' as const, flex: 1, gap: getResponsiveSpacing(12) }}>
              <BlurView intensity={30} tint="dark" style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(132, 196, 65, 0.1)',
                justifyContent: 'center' as const,
                alignItems: 'center' as const,
                marginBottom: getResponsiveSpacing(4),
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(132, 196, 65, 0.3)',
              }}>
                <Dumbbell size={28} color={BRAND_PRIMARY} />
              </BlurView>
              <Text style={{
                fontSize: getScaledFontSize(28),
                fontWeight: '700' as const,
                color: BRAND_WHITE,
                fontFamily: 'Barlow_700Bold',
              }}>
                {displayStats.exercises}
              </Text>
              <Text style={{
                fontSize: getScaledFontSize(14),
                color: 'rgba(255, 255, 255, 0.7)',
                fontFamily: 'Barlow_500Medium',
                fontWeight: '500' as const,
              }}>
                Exercises
              </Text>
            </View>
          </View>

          {/* Bottom Buttons */}
          <View style={{
            flexDirection: 'row' as const,
            gap: getResponsiveSpacing(12),
            paddingBottom: getResponsiveSpacing(40),
          }}>
            {/* Details Button - Premium Glass Style */}
            <Pressable
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row' as const,
                alignItems: 'center' as const,
                justifyContent: 'center' as const,
                paddingVertical: getResponsiveSpacing(18),
                borderRadius: getResponsiveSpacing(16),
                backgroundColor: pressed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                gap: getResponsiveSpacing(8),
                transform: [{ scale: pressed ? 0.98 : 1 }]
              })}
              onPress={() => setShowDetails(true)}
            >
              <FileText size={20} color={BRAND_WHITE} />
              <Text style={{
                fontSize: getScaledFontSize(16),
                fontWeight: '600' as const,
                color: BRAND_WHITE,
                fontFamily: 'Barlow_600SemiBold',
              }}>
                Details
              </Text>
            </Pressable>

            {/* START Button - Prominent Pulse Animation */}
            <Animated.View style={{
              flex: 1.5,
              transform: [{ scale: startButtonPulse }]
            }}>
              <Pressable
                style={({ pressed }) => ({
                  width: '100%',
                  flexDirection: 'row' as const,
                  alignItems: 'center' as const,
                  justifyContent: 'center' as const,
                  paddingVertical: getResponsiveSpacing(20),
                  borderRadius: getResponsiveSpacing(16),
                  backgroundColor: BRAND_PRIMARY,
                  gap: getResponsiveSpacing(10),
                  shadowColor: BRAND_PRIMARY,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 10,
                  opacity: pressed ? 0.9 : 1
                })}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  startSession();
                }}
              >
                <Text style={{
                  fontSize: getScaledFontSize(18),
                  fontWeight: '800' as const,
                  color: BRAND_BLACK,
                  fontFamily: 'Barlow_800ExtraBold',
                  letterSpacing: 2,
                }}>
                  START
                </Text>
                <ArrowRight size={24} color={BRAND_BLACK} strokeWidth={3} />
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Details Modal */}
        <Modal
          visible={showDetails}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDetails(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              justifyContent: 'center' as const,
              alignItems: 'center' as const,
              padding: getResponsiveSpacing(24),
            }}
            onPress={() => setShowDetails(false)}
          >
            <Pressable
              style={{
                backgroundColor: BRAND_BLACK,
                borderRadius: getResponsiveSpacing(20),
                padding: getResponsiveSpacing(24),
                width: '100%',
                maxHeight: '80%',
                borderWidth: 1,
                borderColor: getPrimaryWithOpacity(0.3),
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{
                flexDirection: 'row' as const,
                justifyContent: 'space-between' as const,
                alignItems: 'center' as const,
                marginBottom: getResponsiveSpacing(20),
              }}>
                <Text style={{
                  fontSize: getScaledFontSize(24),
                  fontWeight: '700' as const,
                  color: BRAND_WHITE,
                  fontFamily: 'Barlow_700Bold',
                }}>
                  {t('library.aboutWorkout')}
                </Text>
                <TouchableOpacity onPress={() => setShowDetails(false)}>
                  <Text style={{
                    fontSize: getScaledFontSize(18),
                    color: BRAND_PRIMARY,
                    fontFamily: 'Barlow_600SemiBold',
                  }}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{
                  fontSize: getScaledFontSize(15),
                  color: getTextColorWithOpacity(isDark, 0.7),
                  fontFamily: 'Barlow_400Regular',
                  marginBottom: getResponsiveSpacing(20),
                  lineHeight: getScaledFontSize(22),
                }}>
                  {t('library.exerciseDetails')}
                </Text>

                <Text style={{
                  fontSize: getScaledFontSize(18),
                  fontWeight: '600' as const,
                  color: BRAND_WHITE,
                  fontFamily: 'Barlow_600SemiBold',
                  marginBottom: getResponsiveSpacing(12),
                  marginTop: getResponsiveSpacing(8),
                }}>
                  Exercises ({exercises.length})
                </Text>

                {exercises.map((exercise, index) => (
                  <View key={exercise.id} style={{
                    paddingVertical: getResponsiveSpacing(12),
                    borderBottomWidth: index < exercises.length - 1 ? 1 : 0,
                    borderBottomColor: getPrimaryWithOpacity(0.1),
                  }}>
                    <Text style={{
                      fontSize: getScaledFontSize(16),
                      fontWeight: '600' as const,
                      color: BRAND_WHITE,
                      fontFamily: 'Barlow_600SemiBold',
                      marginBottom: getResponsiveSpacing(4),
                    }}>
                      {getTranslatedExerciseName(exercise.name, t)}
                    </Text>
                    <Text style={{
                      fontSize: getScaledFontSize(14),
                      color: getTextColorWithOpacity(isDark, 0.6),
                      fontFamily: 'Barlow_400Regular',
                    }}>
                      {exercise.sets} sets × {exercise.reps} reps
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Settings Modal */}
        <RestTimerSettings
          visible={showSettings}
          onClose={() => setShowSettings(false)}
        />
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
            // Let the beforeRemove listener handle the confirmation
            navigation.goBack();
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={BRAND_WHITE} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle} numberOfLines={1}>
          {workoutName}
        </Text>
        {sessionStarted && (
          <TouchableOpacity
            style={[
              dynamicStyles.pauseButton,
              {
                backgroundColor: isPaused ? getPrimaryWithOpacity(0.2) : (isDark ? '#373737' : getTextColorWithOpacity(false, 0.1)),
                borderColor: isPaused ? BRAND_PRIMARY : 'transparent',
                shadowColor: isPaused ? BRAND_PRIMARY : 'transparent',
              }
            ]}
            onPress={isPaused ? resumeWorkout : pauseWorkout}
            activeOpacity={0.8}
          >
            {isPaused ? (
              <Play size={18} color={BRAND_PRIMARY} fill={BRAND_PRIMARY} />
            ) : (
              <Pause size={18} color={BRAND_WHITE} fill={BRAND_WHITE} />
            )}
          </TouchableOpacity>
        )}

        {sessionStarted && (
          <TouchableOpacity
            style={{
              padding: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              marginLeft: 8,
            }}
            onPress={finishWorkout}
            activeOpacity={0.7}
          >
            <Square size={16} color="#FF4B4B" fill="#FF4B4B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Paused Overlay */}
      {isPaused && (
        <View style={{
          position: 'absolute' as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            borderRadius: getResponsiveSpacing(20),
            padding: getResponsiveSpacing(32),
            alignItems: 'center' as const,
            gap: getResponsiveSpacing(16),
          }}>
            <Pause size={64} color={BRAND_PRIMARY} />
            <Text style={{
              fontSize: getScaledFontSize(20),
              fontWeight: '700' as const,
              color: BRAND_WHITE,
              fontFamily: 'Barlow_700Bold',
            }}>
              {t('library.workoutSession.paused')}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: BRAND_PRIMARY,
                paddingVertical: getResponsiveSpacing(12),
                paddingHorizontal: getResponsiveSpacing(24),
                borderRadius: getResponsiveSpacing(12),
                marginTop: getResponsiveSpacing(8),
              }}
              onPress={resumeWorkout}
              activeOpacity={0.8}
            >
              <Text style={{
                fontSize: getScaledFontSize(16),
                fontWeight: '600' as const,
                color: BRAND_BLACK,
                fontFamily: 'Barlow_600SemiBold',
              }}>
                {t('library.workoutSession.resume')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Progress Bar */}
      <View style={dynamicStyles.progressContainer}>
        <Text style={dynamicStyles.progressText}>
          {t('library.workoutSession.exercisesCompleted', { completed: completedExercisesCount, total: totalExercises })}
        </Text>
        <View style={dynamicStyles.durationContainer}>
          <Clock size={16} color={BRAND_PRIMARY} />
          <Text style={dynamicStyles.durationText}>{t('library.workoutSession.duration')}:</Text>
          <Text style={dynamicStyles.durationValue}>{formatDuration(elapsedTime)}</Text>
        </View>
        <View style={dynamicStyles.progressBar}>
          <LinearGradient
            colors={[BRAND_PRIMARY, theme.colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              dynamicStyles.progressFill,
              { width: `${progress}%` as any }
            ]}
          />
          <Animated.View style={[
            StyleSheet.absoluteFill,
            { opacity: progressGlowAnim }
          ]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </View>

      {/* Enhanced Rest Timer */}
      {isResting && (
        <EnhancedRestTimer
          initialSeconds={restTimer > 0 ? restTimer : (exercises[currentExerciseIndex]?.restTime ? parseInt(exercises[currentExerciseIndex].restTime) : 60)}
          exerciseRestTime={exercises[currentExerciseIndex]?.restTime ? parseInt(exercises[currentExerciseIndex].restTime) : undefined}
          onComplete={() => {
            setRestTimerState({ isResting: false, restTimer: 0 });
            stopRestTimer();
          }}
          onSkip={() => {
            setRestTimerState({ isResting: false, restTimer: 0 });
            stopRestTimer();
          }}
          currentExercise={
            currentExercise
              ? {
                name: currentExercise.name,
                image_url: currentExercise.image_url,
                currentSet: (currentExercise.completedSets?.filter(Boolean).length || 0),
                totalSets: parseInt(currentExercise.sets || '3'),
              }
              : undefined
          }
          nextExercise={
            currentExerciseIndex < exercises.length - 1
              ? {
                id: exercises[currentExerciseIndex + 1].id,
                name: exercises[currentExerciseIndex + 1].name,
                image_url: exercises[currentExerciseIndex + 1].image_url,
                sets: exercises[currentExerciseIndex + 1].sets,
                reps: exercises[currentExerciseIndex + 1].reps,
              }
              : undefined
          }
          isBetweenExercises={isBetweenExercises}
        />
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + getResponsiveSpacing(100) + getResponsiveSpacing(80) }}
      >
        {/* Current Exercise */}
        {exercises.length === 0 ? (
          <View style={{ padding: getResponsiveSpacing(24), alignItems: 'center' }}>
            <Text style={{ color: BRAND_WHITE, fontSize: getScaledFontSize(16) }}>
              {t('library.workoutSession.couldNotLoadExercises')}
            </Text>
          </View>
        ) : currentExercise ? (
          <Animated.View style={[
            dynamicStyles.exerciseCard,
            {
              opacity: exerciseCardAnim,
              transform: [
                {
                  scale: exerciseCardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1]
                  })
                },
                { translateX: exerciseSlideAnim }
              ]
            }
          ]}>
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={isDark
                ? [getPrimaryWithOpacity(0.1), 'transparent']
                : [getPrimaryWithOpacity(0.05), 'transparent']
              }
              style={StyleSheet.absoluteFill}
            />
            <View style={dynamicStyles.exerciseCardContent}>
              <View style={dynamicStyles.exerciseHeader}>
                <View style={dynamicStyles.exerciseIcon}>
                  <Target size={24} color={BRAND_PRIMARY} />
                </View>
                <Text style={dynamicStyles.exerciseName}>{getTranslatedExerciseName(currentExercise?.name || '', t)}</Text>
              </View>

              {/* Progressive Overload Suggestion */}
              {currentExercise && (() => {
                const suggestion = getProgressiveOverloadSuggestion(currentExercise.id || '', currentExercise.name || '');
                const weights = currentExercise.weights || [];
                if (suggestion && weights.length > 0 && !weights.some(w => w !== null && w !== undefined)) {
                  return (
                    <TouchableOpacity
                      style={dynamicStyles.suggestionBadge}
                      onPress={() => {
                        // Auto-fill all sets with suggested weight
                        setExercises(prev => {
                          const updated = [...prev];
                          const numSets = parseInt(updated[currentExerciseIndex].sets) || 3;
                          updated[currentExerciseIndex].weights = new Array(numSets).fill(suggestion);
                          return updated;
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <TrendingUp size={16} color={BRAND_PRIMARY} />
                      <Text style={dynamicStyles.suggestionText}>
                        {t('library.suggestedWeight')}: {suggestion} {t('library.weightKg')}
                      </Text>
                      <Text style={[dynamicStyles.suggestionText, { fontSize: getScaledFontSize(10), opacity: 0.7 }]}>
                        ({t('library.progressiveOverload')})
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })()}

              <View style={dynamicStyles.setsContainer}>
                {(currentExercise.completedSets || []).map((completed, setIndex) => {
                  const numSets = parseInt(currentExercise.sets) || 3;
                  // Parse reps: if comma-separated, get the specific rep for this set
                  // Otherwise, use the same rep value for all sets
                  const repsArray = (currentExercise.reps || '').split(',').map(r => r.trim());
                  const repsForSet = repsArray[setIndex] || repsArray[0] || currentExercise.reps || '0';
                  const weights = currentExercise.weights || [];
                  const currentWeight = weights[setIndex] ?? null;

                  return (
                    <Animated.View
                      key={`${currentExercise.id}-set-${setIndex}`}
                      style={{
                        transform: [{ scale: setPopAnims[setIndex] || 1 }]
                      }}
                    >
                      <Pressable
                        style={({ pressed }) => [
                          dynamicStyles.setRow,
                          completed && dynamicStyles.setRowCompleted,
                          pressed && { opacity: 0.8 }
                        ]}
                        onPress={() => toggleSet(currentExerciseIndex, setIndex)}
                      >
                        <View style={dynamicStyles.setInfo}>
                          <View style={[
                            dynamicStyles.setNumberBadge,
                            completed && dynamicStyles.setNumberBadgeCompleted,
                          ]}>
                            <Text style={[
                              dynamicStyles.setNumber,
                              completed && dynamicStyles.setNumberCompleted,
                            ]}>
                              {setIndex + 1}
                            </Text>
                          </View>
                          <View style={dynamicStyles.setRepsContainer}>
                            <Text style={dynamicStyles.setRepsLabel}>{t('library.reps')}</Text>
                            <Text style={dynamicStyles.setReps}>{repsForSet}</Text>
                          </View>
                          <View style={dynamicStyles.setWeightContainer}>
                            <TextInput
                              style={dynamicStyles.setWeightInput}
                              value={currentWeight !== null ? String(currentWeight) : ''}
                              onChangeText={(text) => {
                                updateWeight(currentExerciseIndex, setIndex, text);
                              }}
                              placeholder="0"
                              placeholderTextColor={getTextColorWithOpacity(isDark, 0.2)}
                              keyboardType="numeric"
                              returnKeyType="done"
                            />
                            <Text style={dynamicStyles.setWeightUnit}>{t('library.weightKg')}</Text>
                          </View>
                        </View>
                        <View
                          style={[
                            dynamicStyles.setCheckbox,
                            {
                              width: scaleWidth(28),
                              height: scaleHeight(28),
                              borderRadius: scaleWidth(10),
                              borderWidth: 2,
                            },
                            completed && dynamicStyles.setCheckboxCompleted,
                          ]}
                        >
                          {completed && <Check size={16} color={BRAND_BLACK} strokeWidth={4} />}
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        ) : (
          <View style={{ padding: getResponsiveSpacing(24), alignItems: 'center' }}>
            <Text style={{ color: BRAND_WHITE, fontSize: getScaledFontSize(16) }}>
              {t('library.workoutSession.noExerciseAvailable')}
            </Text>
          </View>
        )}

      </ScrollView>

      {/* Elite Navigation Bar */}
      {sessionStarted && !isPaused && (
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + getResponsiveSpacing(16),
          left: getResponsiveSpacing(20),
          right: getResponsiveSpacing(20),
          zIndex: 100,
        }}>
          <BlurView intensity={40} tint="dark" style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: getResponsiveSpacing(14),
            borderRadius: getResponsiveSpacing(24),
            backgroundColor: isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.8)',
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 10,
            gap: getResponsiveSpacing(12),
          }}>
            {/* Previous Button */}
            <TouchableOpacity
              style={{
                width: scaleWidth(54),
                height: scaleHeight(54),
                borderRadius: getResponsiveSpacing(18),
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: currentExerciseIndex > 0 ? 1 : 0.4,
              }}
              onPress={() => {
                if (currentExerciseIndex > 0) {
                  Animated.parallel([
                    Animated.timing(exerciseCardAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
                    Animated.timing(exerciseSlideAnim, { toValue: 50, duration: 250, useNativeDriver: true })
                  ]).start(() => {
                    setCurrentExerciseIndex(prev => prev - 1);
                    setRestTimerState({ isResting: false, restTimer: 0 });
                    exerciseSlideAnim.setValue(-50);
                    Animated.parallel([
                      Animated.timing(exerciseCardAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
                      Animated.timing(exerciseSlideAnim, { toValue: 0, duration: 250, useNativeDriver: true })
                    ]).start();
                  });
                }
              }}
              disabled={currentExerciseIndex === 0}
            >
              <ArrowLeft size={24} color={currentExerciseIndex > 0 ? BRAND_PRIMARY : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')} />
            </TouchableOpacity>

            {/* Main Action (Next or Finish) */}
            <TouchableOpacity
              style={{
                flex: 1,
                height: scaleHeight(54),
                borderRadius: getResponsiveSpacing(18),
                overflow: 'hidden',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: (currentExerciseIndex < exercises.length - 1 && currentExercise?.completed) || exercises.every(ex => ex.completed) ? 1 : 0.5,
              }}
              onPress={() => {
                if (exercises.every(ex => ex.completed)) {
                  finishWorkout();
                } else if (currentExerciseIndex < exercises.length - 1 && currentExercise?.completed) {
                  Animated.parallel([
                    Animated.timing(exerciseCardAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
                    Animated.timing(exerciseSlideAnim, { toValue: -50, duration: 250, useNativeDriver: true })
                  ]).start(() => {
                    setCurrentExerciseIndex(prev => prev + 1);
                    setRestTimerState({ isResting: false, restTimer: 0 });
                    exerciseSlideAnim.setValue(50);
                    Animated.parallel([
                      Animated.timing(exerciseCardAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
                      Animated.timing(exerciseSlideAnim, { toValue: 0, duration: 250, useNativeDriver: true })
                    ]).start();
                  });
                }
              }}
              disabled={!(currentExerciseIndex < exercises.length - 1 && currentExercise?.completed) && !exercises.every(ex => ex.completed)}
            >
              <LinearGradient
                colors={exercises.every(ex => ex.completed) ? [BRAND_PRIMARY, '#4CAF50'] : [BRAND_PRIMARY, theme.colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{
                  color: BRAND_BLACK,
                  fontSize: getScaledFontSize(18),
                  fontWeight: '800',
                  fontFamily: 'Barlow_800ExtraBold',
                  textTransform: 'uppercase',
                }}>
                  {exercises.every(ex => ex.completed)
                    ? t('library.workoutSession.finishWorkout')
                    : t('library.workoutSession.next')}
                </Text>
                {exercises.every(ex => ex.completed) ? <Check size={20} color={BRAND_BLACK} /> : <ArrowRight size={20} color={BRAND_BLACK} />}
              </View>
            </TouchableOpacity>
          </BlurView>
        </View>
      )}

    </View>
  );
};
