import { create } from 'zustand';
import {
  nutritionService,
  type DayTotals,
  type MealLogWithFood,
  type MealType,
  type NutritionGoals,
  type RecentFoodLog,
  type SavedMeal,
  type WeeklyNutritionSummary,
} from '@/services/nutrition';
import { logger } from '@/utils/logger';

interface NutritionState {
  selectedDate: string;
  goals: NutritionGoals | null;
  logs: MealLogWithFood[];
  recentFoods: RecentFoodLog[];
  savedMeals: SavedMeal[];
  weeklySummary: WeeklyNutritionSummary | null;
  totals: DayTotals;
  isLoading: boolean;
  error: string | null;

  setSelectedDate: (isoDate: string) => void;
  refresh: (dateOverride?: string) => Promise<void>;
  loadRecentFoods: () => Promise<void>;
  loadSavedMeals: () => Promise<void>;
  addLog: (foodItemId: string, mealType: MealType, servings: number, loggedDate?: string) => Promise<void>;
  addSavedMeal: (savedMeal: SavedMeal, mealType: MealType, loggedDate?: string) => Promise<void>;
  saveMeal: (name: string, logs: MealLogWithFood[]) => Promise<void>;
  renameSavedMeal: (id: string, name: string) => Promise<void>;
  deleteSavedMeal: (id: string) => Promise<void>;
  updateSavedMealItemServings: (itemId: string, servings: number) => Promise<void>;
  deleteSavedMealItem: (itemId: string) => Promise<void>;
  removeLog: (id: string) => Promise<void>;
  loadGoals: () => Promise<NutritionGoals | null>;
  addWater: (amountMl: number, loggedDate?: string) => Promise<void>;
  saveGoals: (input: Partial<Pick<NutritionGoals, 'calories_goal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g' | 'water_ml_goal'>>) => Promise<NutritionGoals | null>;
}

const emptyTotals = (): DayTotals => ({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, water_ml: 0 });

export const useNutritionStore = create<NutritionState>((set, get) => ({
  selectedDate: new Date().toISOString().slice(0, 10),
  goals: null,
  logs: [],
  recentFoods: [],
  savedMeals: [],
  weeklySummary: null,
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
      const recentFoods = await nutritionService.getRecentFoods();
      const savedMeals = await nutritionService.getSavedMeals();
      const weeklySummary = await nutritionService.getWeeklySummary(selectedDate, goals);
      const totals = nutritionService.computeTotals(logs);
      const waterMl = await nutritionService.getWaterTotal(selectedDate);
      set({ goals: goals ?? get().goals, logs, recentFoods, savedMeals, weeklySummary, totals: { ...totals, water_ml: waterMl }, isLoading: false });
    } catch (e: any) {
      logger.error('nutrition refresh', e);
      set({
        isLoading: false,
        error: e?.message || 'Could not load nutrition data.',
      });
    }
  },

  loadRecentFoods: async () => {
    try {
      const recentFoods = await nutritionService.getRecentFoods();
      set({ recentFoods });
    } catch (e) {
      logger.error('loadRecentFoods', e);
    }
  },

  loadSavedMeals: async () => {
    try {
      const savedMeals = await nutritionService.getSavedMeals();
      set({ savedMeals });
    } catch (e) {
      logger.error('loadSavedMeals', e);
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

  addSavedMeal: async (savedMeal, mealType, loggedDate) => {
    const d = loggedDate ?? get().selectedDate;
    await nutritionService.addSavedMealLog(savedMeal, mealType, d);
    if (d !== get().selectedDate) {
      set({ selectedDate: d });
    }
    await get().refresh(d);
  },

  saveMeal: async (name, logs) => {
    await nutritionService.saveMealFromLogs(name, logs);
    await get().loadSavedMeals();
  },

  renameSavedMeal: async (id, name) => {
    await nutritionService.renameSavedMeal(id, name);
    await get().loadSavedMeals();
  },

  deleteSavedMeal: async (id) => {
    await nutritionService.deleteSavedMeal(id);
    await get().loadSavedMeals();
  },

  updateSavedMealItemServings: async (itemId, servings) => {
    await nutritionService.updateSavedMealItemServings(itemId, servings);
    await get().loadSavedMeals();
  },

  deleteSavedMealItem: async (itemId) => {
    await nutritionService.deleteSavedMealItem(itemId);
    await get().loadSavedMeals();
  },

  removeLog: async (id) => {
    await nutritionService.deleteMealLog(id);
    await get().refresh();
  },

  addWater: async (amountMl, loggedDate) => {
    const d = loggedDate ?? get().selectedDate;
    await nutritionService.addWaterLog(amountMl, d);
    if (d !== get().selectedDate) {
      set({ selectedDate: d });
    }
    await get().refresh(d);
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
