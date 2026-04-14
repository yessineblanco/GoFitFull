import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Appearance, Platform } from 'react-native';
import { getSecureItem, saveSecureItem, deleteSecureItem } from '@/utils/secureStorage';

interface ThemeStore {
  isDark: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setIsDark: (isDark: boolean) => void;
  updateSystemTheme: () => void;
}

// Helper to get system color scheme
const getSystemColorScheme = (): boolean => {
  const systemColorScheme = Appearance.getColorScheme();
  return systemColorScheme === 'dark';
};

// Custom storage for Zustand persistence with chunking support
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await getSecureItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await saveSecureItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await deleteSecureItem(name);
  },
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      isDark: true,
      theme: 'dark',
      toggleTheme: () => set((state) => {
        const newIsDark = !state.isDark;
        return { 
          isDark: newIsDark,
          theme: newIsDark ? 'dark' : 'light'
        };
      }),
      setTheme: (theme) => {
        let isDark: boolean;
        if (theme === 'system') {
          isDark = getSystemColorScheme();
        } else {
          isDark = theme === 'dark';
        }
        // Explicitly set both theme and isDark to ensure they're saved together
        set({ 
        theme,
          isDark
        });
      },
      setIsDark: (isDark) => set({ 
        isDark,
        theme: isDark ? 'dark' : 'light'
      }),
      updateSystemTheme: () => {
        const state = get();
        if (state.theme === 'system') {
          const systemIsDark = getSystemColorScheme();
          set({ isDark: systemIsDark });
        }
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => secureStorage),
      // Ensure theme preference is always saved
      partialize: (state) => ({ 
        theme: state.theme,
        isDark: state.isDark,
      }),
      // Properly restore state on rehydration - ensure isDark matches theme
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Error rehydrating theme store:', error);
            return;
          }
          // Use a small delay to ensure rehydration is complete
          setTimeout(() => {
            if (state) {
              const currentState = useThemeStore.getState();
              // Ensure isDark matches the saved theme preference
              if (currentState.theme === 'system') {
                // For system theme, update based on current system color scheme
                const systemIsDark = getSystemColorScheme();
                if (currentState.isDark !== systemIsDark) {
                  useThemeStore.setState({ isDark: systemIsDark });
                }
              } else if (currentState.theme === 'light') {
                // For light theme, ensure isDark is false
                if (currentState.isDark !== false) {
                  useThemeStore.setState({ isDark: false });
                }
              } else if (currentState.theme === 'dark') {
                // For dark theme, ensure isDark is true
                if (currentState.isDark !== true) {
                  useThemeStore.setState({ isDark: true });
                }
              }
            }
          }, 100);
        };
      },
    }
  )
);

// Listen to system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  const store = useThemeStore.getState();
  if (store.theme === 'system') {
    store.updateSystemTheme();
  }
});



