import { create } from "zustand";
import { WorkoutPlan } from "@/types/workoutPlan";
import { getWorkoutPlans, createWorkoutPlan, deleteWorkoutPlan, updateWorkoutPlanTime } from "@/services/workoutPlans";
import { useAuthStore } from "./authStore";

interface WorkoutPlansState {
  plans: WorkoutPlan[];
  loading: boolean;
  fetch: () => Promise<void>;
  addPlan: (workoutId: string, date: string, day?: number) => Promise<void>;
  removePlan: (planId: string) => Promise<void>;
  updatePlanTime: (planId: string, time: string) => Promise<void>;
}

export const useWorkoutPlansStore = create<WorkoutPlansState>((set) => ({
  plans: [],
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;

      if (!user) {
        set({ plans: [] });
        return;
      }

      const plans = await getWorkoutPlans(user.id);
      set({ plans });
    } catch (error) {
      console.error("Failed to fetch workout plans:", error);
      set({ plans: [] });
    } finally {
      /** ✅ IMPORTANT : loading toujours réinitialisé */
      set({ loading: false });
    }
  },

  addPlan: async (workoutId: string, date: string, day?: number) => {
    try {
      const user = useAuthStore.getState().user;

      if (!user) throw new Error("Not authenticated");

      const newPlan = await createWorkoutPlan(user.id, workoutId, date, day);

      if (newPlan) {
        set((state) => ({
          plans: [...state.plans, newPlan],
        }));
      }
    } catch (error) {
      console.error("Failed to add plan:", error);
      throw error;
    }
  },

  removePlan: async (planId: string) => {
    try {
      await deleteWorkoutPlan(planId);
      set((state) => ({
        plans: state.plans.filter((p) => p.id !== planId),
      }));
    } catch (error) {
      console.error("Failed to remove plan:", error);
      throw error;
    }
  },

  updatePlanTime: async (planId: string, time: string) => {
    try {
      await updateWorkoutPlanTime(planId, time);
      set((state) => ({
        plans: state.plans.map((p) =>
          p.id === planId ? { ...p, planned_time: time } : p
        ),
      }));
    } catch (error) {
      console.error("Failed to update plan time:", error);
      throw error;
    }
  },
}));
