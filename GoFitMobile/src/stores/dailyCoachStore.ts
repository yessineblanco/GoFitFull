import { create } from 'zustand';
import { habitsService, type DailyHabit, type HabitUpsertInput } from '@/services/habits';
import { logger } from '@/utils/logger';

type DailyCoachState = {
  habits: DailyHabit[];
  habitsUnavailable: boolean;
  isLoadingHabits: boolean;
  error: string | null;
  loadHabits: () => Promise<void>;
  loadAllHabits: () => Promise<void>;
  toggleHabit: (habit: DailyHabit) => Promise<void>;
  saveHabit: (input: HabitUpsertInput) => Promise<void>;
  setHabitActive: (habit: DailyHabit, isActive: boolean) => Promise<void>;
  deleteHabit: (habit: DailyHabit) => Promise<void>;
};

export const useDailyCoachStore = create<DailyCoachState>((set, get) => ({
  habits: [],
  habitsUnavailable: false,
  isLoadingHabits: false,
  error: null,

  loadHabits: async () => {
    set({ isLoadingHabits: true, error: null });
    try {
      const result = await habitsService.getTodayHabits();
      set({
        habits: result.habits,
        habitsUnavailable: result.unavailable,
        isLoadingHabits: false,
      });
    } catch (error: any) {
      logger.error('daily coach loadHabits', error);
      set({
        isLoadingHabits: false,
        error: error?.message || 'Could not load daily habits.',
      });
    }
  },

  loadAllHabits: async () => {
    set({ isLoadingHabits: true, error: null });
    try {
      const result = await habitsService.listHabits();
      set({
        habits: result.habits,
        habitsUnavailable: result.unavailable,
        isLoadingHabits: false,
      });
    } catch (error: any) {
      logger.error('daily coach loadAllHabits', error);
      set({
        isLoadingHabits: false,
        error: error?.message || 'Could not load habits.',
      });
    }
  },

  toggleHabit: async (habit) => {
    const nextCompleted = !habit.completed;
    set({
      habits: get().habits.map((item) =>
        item.id === habit.id
          ? {
              ...item,
              completed: nextCompleted,
              completed_at: nextCompleted ? new Date().toISOString() : null,
            }
          : item,
      ),
    });

    try {
      await habitsService.setHabitCompleted(habit, nextCompleted);
      await get().loadHabits();
    } catch (error: any) {
      logger.error('daily coach toggleHabit', error);
      set({
        habits: get().habits.map((item) =>
          item.id === habit.id
            ? {
                ...item,
                completed: habit.completed,
                completed_at: habit.completed_at,
              }
            : item,
        ),
        error: error?.message || 'Could not update habit.',
      });
    }
  },

  saveHabit: async (input) => {
    try {
      await habitsService.saveHabit(input);
      await get().loadAllHabits();
    } catch (error: any) {
      logger.error('daily coach saveHabit', error);
      set({ error: error?.message || 'Could not save habit.' });
      throw error;
    }
  },

  setHabitActive: async (habit, isActive) => {
    if (habit.id.startsWith('local-')) return;
    set({
      habits: get().habits.map((item) => (item.id === habit.id ? { ...item, is_active: isActive } : item)),
    });
    try {
      await habitsService.setHabitActive(habit.id, isActive);
      await get().loadAllHabits();
    } catch (error: any) {
      logger.error('daily coach setHabitActive', error);
      set({
        habits: get().habits.map((item) => (item.id === habit.id ? { ...item, is_active: habit.is_active } : item)),
        error: error?.message || 'Could not update habit.',
      });
    }
  },

  deleteHabit: async (habit) => {
    if (habit.id.startsWith('local-')) return;
    const previous = get().habits;
    set({ habits: previous.filter((item) => item.id !== habit.id) });
    try {
      await habitsService.deleteHabit(habit.id);
      await get().loadAllHabits();
    } catch (error: any) {
      logger.error('daily coach deleteHabit', error);
      set({ habits: previous, error: error?.message || 'Could not delete habit.' });
      throw error;
    }
  },
}));
