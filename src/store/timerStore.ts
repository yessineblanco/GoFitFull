import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RestTimerPreferences {
  audio_enabled: boolean;
  haptics_enabled: boolean;
  auto_advance: boolean;
  warnings: number[]; // Array of seconds to show warnings at (e.g., [30, 10, 5])
  default_rest_seconds: number;
}

interface TimerStore {
  preferences: RestTimerPreferences;
  isActive: boolean;
  currentSeconds: number;
  initialSeconds: number;
  isPaused: boolean;
  timerSessionId: number;
  setPreferences: (prefs: Partial<RestTimerPreferences>) => void;
  setTimerActive: (active: boolean) => void;
  setCurrentSeconds: (seconds: number) => void;
  setInitialSeconds: (seconds: number) => void;
  setPaused: (paused: boolean) => void;
  incrementSession: () => void;
  resetTimer: () => void;
}

const defaultPreferences: RestTimerPreferences = {
  audio_enabled: true,
  haptics_enabled: true,
  auto_advance: false,
  warnings: [30, 10, 5],
  default_rest_seconds: 60,
};

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      isActive: false,
      currentSeconds: 0,
      initialSeconds: 60,
      isPaused: false,
      timerSessionId: 0,

      setPreferences: (prefs) => {
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        }));
      },

      setTimerActive: (active) => {
        set({ isActive: active });
      },

      setCurrentSeconds: (seconds) => {
        set({ currentSeconds: seconds });
      },

      setInitialSeconds: (seconds) => {
        set({ initialSeconds: seconds });
      },

      setPaused: (paused) => {
        set({ isPaused: paused });
      },

      incrementSession: () => {
        set((state) => ({ timerSessionId: state.timerSessionId + 1 }));
      },

      resetTimer: () => {
        set({
          isActive: false,
          currentSeconds: 0,
          isPaused: false,
        });
      },
    }),
    {
      name: 'timer-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ preferences: state.preferences }),
    }
  )
);

