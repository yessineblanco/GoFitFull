import { create } from 'zustand';
import { workoutService } from '@/services/workouts';
import { logger } from '@/utils/logger';

interface WorkoutListItem {
  id: string;
  name: string;
  difficulty: string;
  wellness_category?: string;
  image: string;
  type: 'native' | 'custom';
}

interface WorkoutsStore {
  // Cached workout lists (lightweight, no exercises)
  nativeWorkouts: WorkoutListItem[];
  customWorkouts: WorkoutListItem[];

  // Loading states
  loading: boolean;
  lastFetched: number | null; // timestamp of last successful fetch

  // Latest incomplete session cache
  latestIncompleteSession: any | null;
  latestSessionWorkout: any | null;
  recentlyCompletedSessionId: string | null; // Track recently completed session to prevent reload

  // Prefetch cache for workout details
  prefetchedWorkouts: Map<string, { data: any; timestamp: number }>;

  // Actions
  setNativeWorkouts: (workouts: WorkoutListItem[]) => void;
  setCustomWorkouts: (workouts: WorkoutListItem[]) => void;
  setLoading: (loading: boolean) => void;
  setLatestIncompleteSession: (session: any | null, workout: any | null, completedSessionId?: string | null) => void;
  loadWorkouts: (userId: string | null, force?: boolean) => Promise<void>;
  loadLatestIncompleteSession: (userId: string, force?: boolean) => Promise<void>;
  prefetchWorkout: (workoutId: string) => Promise<void>;
  getPrefetchedWorkout: (workoutId: string) => any | null;
  clearWorkouts: () => void;
}

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache
const PREFETCH_CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes for prefetched workouts

export const useWorkoutsStore = create<WorkoutsStore>((set, get) => ({
  nativeWorkouts: [],
  customWorkouts: [],
  loading: false,
  lastFetched: null,
  latestIncompleteSession: null,
  latestSessionWorkout: null,
  recentlyCompletedSessionId: null,
  prefetchedWorkouts: new Map(),

  setNativeWorkouts: (workouts) => set({ nativeWorkouts: workouts }),
  setCustomWorkouts: (workouts) => set({ customWorkouts: workouts }),
  setLoading: (loading) => set({ loading }),
  setLatestIncompleteSession: (session, workout, completedSessionId) =>
    set({
      latestIncompleteSession: session,
      latestSessionWorkout: workout,
      recentlyCompletedSessionId: completedSessionId || null,
    }),

  loadWorkouts: async (userId, force = false) => {
    const state = get();

    // If we have cached data that's still fresh and not forced, skip loading
    const now = Date.now();
    if (!force && state.lastFetched && (now - state.lastFetched) < CACHE_DURATION_MS &&
      state.nativeWorkouts.length > 0) {
      logger.info('Using cached workouts data');
      return;
    }

    set({ loading: true });

    try {
      // Load native and custom workouts in parallel
      const [nativeWorkouts, customWorkoutsResult] = await Promise.all([
        workoutService.getNativeWorkouts(),
        userId ? workoutService.getCustomWorkouts(userId) : Promise.resolve([]),
      ]);

      // Transform native workouts for display
      const transformedNative = nativeWorkouts.map(workout => ({
        id: workout.id,
        name: workout.name,
        difficulty: workout.difficulty,
        wellness_category: workout.wellness_category,
        image: workout.image_url || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
        type: 'native' as const,
      }));

      // Transform custom workouts for display
      const transformedCustom = customWorkoutsResult.map(workout => ({
        id: workout.id,
        name: workout.name,
        difficulty: workout.difficulty,
        wellness_category: workout.wellness_category,
        image: workout.image_url || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
        type: 'custom' as const,
      }));

      set({
        nativeWorkouts: transformedNative,
        customWorkouts: transformedCustom,
        loading: false,
        lastFetched: now,
      });

      logger.info(`Loaded ${transformedNative.length} native and ${transformedCustom.length} custom workouts`);
    } catch (error) {
      logger.error('Error loading workouts:', error);
      set({ loading: false });
      // Don't clear existing data on error - keep showing cached data
    }
  },

  loadLatestIncompleteSession: async (userId, force = false) => {
    try {
      if (__DEV__) {
        logger.debug('loadLatestIncompleteSession called', { userId, force });
      }

      // If store is already cleared and we're not forcing, skip reload
      const currentState = get();
      if (__DEV__) {
        logger.debug('Current store state:', {
          hasSession: !!currentState.latestIncompleteSession,
          sessionId: currentState.latestIncompleteSession?.id,
          recentlyCompletedId: currentState.recentlyCompletedSessionId,
        });
      }

      if (!force && currentState.latestIncompleteSession === null && currentState.latestSessionWorkout === null) {
        // Double-check with database if we're forcing or if it's been a while
        // For now, always fetch to ensure we have the latest state
      }

      const session = await workoutService.getLatestIncompleteWorkoutSession(userId);
      if (__DEV__) {
        logger.debug('Database returned session:', {
          hasSession: !!session,
          sessionId: session?.id,
          completedAt: session?.completed_at,
          workoutId: session?.workout_id,
        });
      }

      if (!session || !session.id) {
        if (__DEV__) {
          logger.debug('No session found, clearing store');
        }
        set({ latestIncompleteSession: null, latestSessionWorkout: null, recentlyCompletedSessionId: null });
        return;
      }

      // If this session was just completed, don't load it
      const storeState = get();
      if (__DEV__) {
        logger.debug('Checking if session was recently completed:', {
          sessionId: session.id,
          recentlyCompletedId: storeState.recentlyCompletedSessionId,
          matches: storeState.recentlyCompletedSessionId === session.id,
        });
      }

      if (storeState.recentlyCompletedSessionId === session.id) {
        if (__DEV__) {
          logger.debug('Session was recently completed, clearing instead of loading');
        }
        set({ latestIncompleteSession: null, latestSessionWorkout: null, recentlyCompletedSessionId: null });
        return;
      }

      const isIncomplete = session.completed_at === null ||
        session.completed_at === undefined ||
        session.completed_at === '';

      if (__DEV__) {
        logger.debug('Session completeness check:', {
          completedAt: session.completed_at,
          isIncomplete,
          hasWorkoutId: !!session.workout_id,
        });
      }

      if (isIncomplete && session.workout_id) {
        if (__DEV__) {
          logger.debug('Loading incomplete session into store');
        }
        // Load workout details for the session
        let workout: any = null;
        try {
          workout = await workoutService.getWorkoutById(session.workout_id);
        } catch (err) {
          logger.error('Error loading workout for session:', err);
        }

        set({
          latestIncompleteSession: session,
          latestSessionWorkout: workout
        });
        if (__DEV__) {
          logger.debug('Session loaded into store');
        }
      } else {
        if (__DEV__) {
          logger.debug('Session is completed, clearing store');
        }
        // Session is completed, clear it
        set({ latestIncompleteSession: null, latestSessionWorkout: null, recentlyCompletedSessionId: null });
      }
    } catch (error) {
      logger.error('Error loading latest incomplete session:', error);
      set({ latestIncompleteSession: null, latestSessionWorkout: null, recentlyCompletedSessionId: null });
    }
  },

  prefetchWorkout: async (workoutId: string) => {
    const state = get();
    const now = Date.now();

    // Check if already prefetched and still fresh
    const cached = state.prefetchedWorkouts.get(workoutId);
    if (cached && (now - cached.timestamp) < PREFETCH_CACHE_DURATION_MS) {
      logger.info(`Using prefetched workout: ${workoutId}`);
      return;
    }

    // Prefetch in background (don't block UI)
    workoutService.getWorkoutById(workoutId)
      .then((workout) => {
        const newMap = new Map(state.prefetchedWorkouts);
        newMap.set(workoutId, { data: workout, timestamp: Date.now() });
        set({ prefetchedWorkouts: newMap });
        logger.info(`Prefetched workout: ${workoutId}`);
      })
      .catch((error) => {
        logger.warn(`Failed to prefetch workout ${workoutId}:`, error);
        // Fail silently - don't block user experience
      });
  },

  getPrefetchedWorkout: (workoutId: string) => {
    const state = get();
    const cached = state.prefetchedWorkouts.get(workoutId);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < PREFETCH_CACHE_DURATION_MS) {
      return cached.data;
    }

    return null;
  },

  clearWorkouts: () => {
    set({
      nativeWorkouts: [],
      customWorkouts: [],
      loading: false,
      lastFetched: null,
      latestIncompleteSession: null,
      latestSessionWorkout: null,
      prefetchedWorkouts: new Map(),
    });
  },
}));

