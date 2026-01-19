import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSecureItem, saveSecureItem, deleteSecureItem } from '@/utils/secureStorage';

export type TextSize = 'small' | 'medium' | 'large';

interface TextSizeStore {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  getScaleFactor: () => number;
}

// Custom storage for Zustand persistence
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

// Text size scale factors
const SCALE_FACTORS: Record<TextSize, number> = {
  small: 0.9,
  medium: 1.0,
  large: 1.15,
};

export const useTextSizeStore = create<TextSizeStore>()(
  persist(
    (set, get) => ({
      textSize: 'medium',
      setTextSize: (size) => {
        set({ textSize: size });
      },
      getScaleFactor: () => {
        const currentSize = get().textSize;
        return SCALE_FACTORS[currentSize];
      },
    }),
    {
      name: 'text-size-storage',
      storage: createJSONStorage(() => secureStorage),
      version: 1,
    }
  )
);

// Utility function to get scaled font size
export const getScaledFontSize = (baseSize: number): number => {
  const scaleFactor = useTextSizeStore.getState().getScaleFactor();
  return Math.round(baseSize * scaleFactor);
};

