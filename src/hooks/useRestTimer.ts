import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useTimerStore } from '@/store/timerStore';
import { initializeAudio, playStartBeep, playWarningBeep, playCompletionSound, playHaptic } from '@/utils/audioManager';

interface UseRestTimerOptions {
  onComplete: () => void;
  enabled?: boolean;
}

export const useRestTimer = ({ onComplete, enabled = true }: UseRestTimerOptions) => {
  const {
    isActive,
    currentSeconds,
    initialSeconds,
    isPaused,
    preferences,
    setCurrentSeconds,
    setTimerActive,
    setPaused,
    setInitialSeconds,
    timerSessionId,
    incrementSession,
  } = useTimerStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimeRef = useRef<Date | null>(null);
  const warnedAtRef = useRef<Set<number>>(new Set());
  const currentSecondsRef = useRef(currentSeconds);
  const preferencesRef = useRef(preferences);
  const onCompleteRef = useRef(onComplete);

  // Keep refs in sync with latest values
  useEffect(() => {
    currentSecondsRef.current = currentSeconds;
  }, [currentSeconds]);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Initialize audio on mount
  useEffect(() => {
    initializeAudio();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle app state changes for background timer
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        if (backgroundTimeRef.current && isActive && !isPaused) {
          const backgroundDuration = Math.floor(
            (new Date().getTime() - backgroundTimeRef.current.getTime()) / 1000
          );
          const newValue = Math.max(0, currentSecondsRef.current - backgroundDuration);
          setCurrentSeconds(newValue);
          currentSecondsRef.current = newValue;
          backgroundTimeRef.current = null;
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        if (isActive && !isPaused) {
          backgroundTimeRef.current = new Date();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isActive, isPaused, setCurrentSeconds]);

  // Main timer logic - only depends on isActive, isPaused, enabled
  useEffect(() => {
    // If interval already exists and conditions haven't changed, don't restart
    if (intervalRef.current && isActive && !isPaused && enabled) {
      return;
    }

    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isActive || isPaused || !enabled) {
      return;
    }

    // Check if we have valid seconds (use ref which is always up-to-date)
    const secondsToUse = currentSecondsRef.current > 0 ? currentSecondsRef.current : currentSeconds;

    if (secondsToUse <= 0) {
      return;
    }

    // Sync ref if needed
    if (currentSecondsRef.current !== secondsToUse) {
      currentSecondsRef.current = secondsToUse;
    }

    // Start interval and assign to ref immediately
    const intervalId = setInterval(() => {
      const current = currentSecondsRef.current;

      // Safety check
      if (isNaN(current) || current < 0) {
        currentSecondsRef.current = 0;
        setCurrentSeconds(0);
        return;
      }

      const newValue = Math.max(0, current - 1);

      // Update state and ref
      setCurrentSeconds(newValue);
      currentSecondsRef.current = newValue;

      // Check warnings
      preferencesRef.current.warnings.forEach((warningTime) => {
        if (newValue === warningTime && !warnedAtRef.current.has(warningTime)) {
          warnedAtRef.current.add(warningTime);
          playWarningBeep(preferencesRef.current.audio_enabled);

          if (warningTime <= 10) {
            playHaptic('medium', preferencesRef.current.haptics_enabled);
          } else {
            playHaptic('light', preferencesRef.current.haptics_enabled);
          }
        }
      });

      // Check completion
      if (newValue <= 0) {
        playCompletionSound(preferencesRef.current.audio_enabled);
        playHaptic('heavy', preferencesRef.current.haptics_enabled);
        setTimerActive(false);
        setCurrentSeconds(0);
        currentSecondsRef.current = 0;
        warnedAtRef.current.clear();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onCompleteRef.current();
      }
    }, 1000);

    intervalRef.current = intervalId;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isPaused, enabled, setCurrentSeconds, setTimerActive, timerSessionId]);

  const start = useCallback((seconds: number) => {
    const safeSeconds = Math.max(1, Math.floor(seconds || 60));
    warnedAtRef.current.clear();

    // Set ref FIRST (synchronous, immediate) - this is critical!
    currentSecondsRef.current = safeSeconds;

    // Then set state (async, but ref is already set so effect can use it)
    setInitialSeconds(safeSeconds);
    setCurrentSeconds(safeSeconds);
    setPaused(false);

    // Set active LAST - this triggers the useEffect which will see the ref value
    setTimerActive(true);
    incrementSession();

    playStartBeep(preferencesRef.current.audio_enabled);
    playHaptic('light', preferencesRef.current.haptics_enabled);
  }, [setInitialSeconds, setCurrentSeconds, setTimerActive, setPaused]);

  const stop = useCallback(() => {
    setTimerActive(false);
    setCurrentSeconds(0);
    currentSecondsRef.current = 0;
    setPaused(false);
    warnedAtRef.current.clear();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [setTimerActive, setCurrentSeconds, setPaused]);

  const pause = useCallback(() => {
    setPaused(true);
  }, [setPaused]);

  const resume = useCallback(() => {
    setPaused(false);
  }, [setPaused]);

  const addTime = useCallback((seconds: number) => {
    const current = isNaN(currentSecondsRef.current) ? 0 : currentSecondsRef.current;
    const newValue = current + seconds;
    setCurrentSeconds(newValue);
    currentSecondsRef.current = newValue;
    // Remove warnings that are no longer relevant
    warnedAtRef.current.forEach((warnTime) => {
      if (newValue > warnTime) {
        warnedAtRef.current.delete(warnTime);
      }
    });
    playHaptic('light', preferencesRef.current.haptics_enabled);
  }, [setCurrentSeconds]);

  const reduceTime = useCallback((seconds: number) => {
    const current = isNaN(currentSecondsRef.current) ? 0 : currentSecondsRef.current;
    const newValue = Math.max(0, current - seconds);
    setCurrentSeconds(newValue);
    currentSecondsRef.current = newValue;
    playHaptic('light', preferencesRef.current.haptics_enabled);
  }, [setCurrentSeconds]);

  return {
    isActive,
    currentSeconds,
    initialSeconds,
    isPaused,
    start,
    stop,
    pause,
    resume,
    addTime,
    reduceTime,
  };
};
