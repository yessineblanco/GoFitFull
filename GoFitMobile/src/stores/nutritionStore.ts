import { create } from 'zustand';
import {
  nutritionService,
  type DayTotals,
  type MealLogWithFood,
  type MealType,
  type NutritionGoals,
} from '@/services/nutrition';
import { logger } from '@/utils/logger';

interface NutritionState {
  selectedDate: string;
  goals: NutritionGoals | null;
  logs: MealLogWithFood[];
  totals: DayTotals;
  isLoading: boolean;
  error: string | null;

  setSelectedDate: (isoDate: string) => void;
  refresh: (dateOverride?: string) => Promise<void>;
  addLog: (foodItemId: string, mealType: MealType, servings: number, loggedDate?: string) => Promise<void>;
  removeLog: (id: string) => Promise<void>;
  loadGoals: () => Promise<NutritionGoals | null>;
  saveGoals: (input: Partial<Pick<NutritionGoals, 'calories_goal' | 'protein_g' | 'carbs_g' | 'fat_g'>>) => Promise<NutritionGoals | null>;
}

const emptyTotals = (): DayTotals => ({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

export const useNutritionStore = create<NutritionState>((set, get) => ({
  selectedDate: new Date().toISOString().slice(0, 10),
  goals: null,
  logs: [],
  totals: emptyTotals(),
  isLoading: false,
  error: null,

  setSelectedDate: (isoDate) => set({ selectedDate: isoDate }),

  loadGoals: async () => {
    try {
      const goals = await nutritionService.getOrCreateGoals();
      set({ goals });
      return goals;
    } catch (e) {
      logger.error('loadGoals', e);
      return null;
    }
  },

  refresh: async (dateOverride?: string) => {
    const selectedDate = dateOverride ?? get().selectedDate;
    set({ isLoading: true, error: null });
    try {
      let goals = get().goals;
      if (!goals) {
        goals = await nutritionService.getOrCreateGoals();
      }
      const logs = await nutritionService.getLogsForDate(selectedDate);
      const totals = nutritionService.computeTotals(logs);
      set({ goals: goals ?? get().goals, logs, totals, isLoading: false });
    } catch (e: any) {
      logger.error('nutrition refresh', e);
      set({
        isLoading: false,
        error: e?.message || 'Could not load nutrition data.',
      });
    }
  },

  addLog: async (foodItemId, mealType, servings, loggedDate) => {
    const d = loggedDate ?? get().selectedDate;
    await nutritionService.addMealLog(foodItemId, mealType, servings, d);
    if (d !== get().selectedDate) {
      set({ selectedDate: d });
    }
    await get().refresh(d);
  },

  removeLog: async (id) => {
    await nutritionService.deleteMealLog(id);
    await get().refresh();
  },

  saveGoals: async (input) => {
    set({ error: null });
    try {
      const goals = await nutritionService.saveGoals(input);
      set({ goals });
      return goals;
    } catch (e: any) {
      logger.error('saveGoals', e);
      set({ error: e?.message || 'Could not save goals.' });
      return null;
    }
  },
}));
