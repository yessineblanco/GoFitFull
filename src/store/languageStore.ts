import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

export type Language = 'en' | 'fr';

interface LanguageStore {
  language: Language;
  setLanguage: (language: Language) => void;
}

// Custom storage using SecureStore with chunking for large values
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await SecureStore.getItemAsync(name);
      return value;
    } catch (error) {
      console.error('Error reading from SecureStore:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.error('Error writing to SecureStore:', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.error('Error removing from SecureStore:', error);
    }
  },
};

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language: Language) => {
        set({ language });
      },
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => secureStorage),
      version: 1,
    }
  )
);



