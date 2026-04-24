import { create } from "zustand";
import { supabase } from "@/api/client";
import { getSessions, addSession, updateSession, deleteSession } from "@/services/workoutSessions";
import { useAuthStore } from "./authStore";

type Session = any;

export interface StreakMetrics {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
  daysSinceLastWorkout: number | null;
  workedOutToday: boolean;
}

interface SessionsState {
  sessions: Session[];
  loading: boolean;
  fetch: () => Promise<void>;
  add: (s: any) => Promise<any>;
  update: (id: string, patch: any) => Promise<any>;
  remove: (id: string) => Promise<any>;
  getWeeklySessionCount: () => number;
  getTodayCalories: () => number;
  getStreak: () => number;
  getStreakMetrics: () => StreakMetrics;
  getTotalWorkouts: () => number;
}

const toLocalDateKey = (value: string | Date): string => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getSessionDateKeys = (sessions: Session[]): string[] => {
  return Array.from(new Set(sessions.map((s: any) => {
    const d = s.completed_at || s.date || s.started_at || s.created_at;
    return d ? toLocalDateKey(d) : null;
  })))
    .filter((d): d is string => d !== null)
    .sort((a, b) => b.localeCompare(a));
};

const countConsecutiveDays = (dates: string[], startDate: string): number => {
  let streak = 0;
  let expectedDate = new Date(`${startDate}T00:00:00`);
  const dateSet = new Set(dates);

  while (dateSet.has(toLocalDateKey(expectedDate))) {
    streak++;
    expectedDate.setDate(expectedDate.getDate() - 1);
  }

  return streak;
};

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: [],
  loading: false,

  /** Fetch all sessions of the connected user */
  fetch: async () => {
    set({ loading: true });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ loading: false });
        return;
      }
      const data = await getSessions(user.id);
      // Sort sessions by date descending
      const sortedData = (data ?? []).sort((a: any, b: any) => {
        const dateA = a.date || a.started_at || a.created_at;
        const dateB = b.date || b.started_at || b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      set({ sessions: sortedData, loading: false });
    } catch (e) {
      console.error("fetch sessions error", e);
      set({ loading: false });
    }
  },

  /** Create a new session */
  add: async (s) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Not authenticated");

      // ALWAYS ensure date exists -> REQUIRED BY CALENDAR
      const todayISO = new Date().toISOString().split("T")[0];

      const payload = {
        ...s,
        user_id: user.id,
        date: s.date ?? todayISO,
        // Ensure started_at is set for statistics service compatibility
        started_at: s.started_at ?? (s.date ? new Date(s.date).toISOString() : new Date().toISOString()),
      };

      const inserted = await addSession(payload);

      // Refresh session list
      get().fetch();
      return inserted;

    } catch (e) {
      console.error("add session error", e);
      throw e;
    }
  },

  /** Update session */
  update: async (id, patch) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Not authenticated");
      const updated = await updateSession(id, patch, user.id);
      get().fetch();
      return updated;
    } catch (e) {
      console.error("update session error", e);
      throw e;
    }
  },

  /** Delete session */
  remove: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Not authenticated");
      await deleteSession(id, user.id);
      get().fetch();
      return true;
    } catch (e) {
      console.error("delete session error", e);
      throw e;
    }
  },

  getWeeklySessionCount: () => {
    const { sessions } = get();
    if (!sessions || sessions.length === 0) return 0;

    const now = new Date();
    const startOfWeek = new Date(now);
    // Adjust to Monday (assuming week starts on Monday)
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    return sessions.filter((s: any) => {
      const d = s.date || s.started_at || s.created_at;
      if (!d) return false;
      const sessionDate = new Date(d);
      return sessionDate >= startOfWeek;
    }).length;
  },

  getTodayCalories: () => {
    const { sessions } = get();
    const today = new Date().toISOString().split('T')[0];
    return sessions
      .filter((s: any) => {
        const d = s.date || s.started_at || s.created_at;
        return d && d.startsWith(today);
      })
      .reduce((sum: number, s: any) => sum + (Number(s.calories) || 0), 0);
  },

  getStreak: () => {
    return get().getStreakMetrics().currentStreak;
  },

  getStreakMetrics: () => {
    const { sessions } = get();
    const dates = getSessionDateKeys(sessions || []);

    if (dates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        daysSinceLastWorkout: null,
        workedOutToday: false,
      };
    }

    const today = toLocalDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toLocalDateKey(yesterdayDate);
    const lastWorkoutDate = dates[0];
    const workedOutToday = lastWorkoutDate === today;
    const currentStreak =
      lastWorkoutDate === today || lastWorkoutDate === yesterday
        ? countConsecutiveDays(dates, lastWorkoutDate)
        : 0;

    let longestStreak = 0;
    let previous: string | null = null;
    let currentRun = 0;

    dates.slice().reverse().forEach((date) => {
      if (!previous) {
        currentRun = 1;
      } else {
        const expected = new Date(`${previous}T00:00:00`);
        expected.setDate(expected.getDate() + 1);
        if (date === toLocalDateKey(expected)) {
          currentRun++;
        } else {
          longestStreak = Math.max(longestStreak, currentRun);
          currentRun = 1;
        }
      }
      previous = date;
    });

    longestStreak = Math.max(longestStreak, currentRun);

    const todayMidnight = new Date(`${today}T00:00:00`).getTime();
    const lastMidnight = new Date(`${lastWorkoutDate}T00:00:00`).getTime();
    const daysSinceLastWorkout = Math.max(0, Math.round((todayMidnight - lastMidnight) / 86400000));

    return {
      currentStreak,
      longestStreak,
      lastWorkoutDate,
      daysSinceLastWorkout,
      workedOutToday,
    };
  },

  getTotalWorkouts: () => {
    return get().sessions.length;
  },
}));

/** Realtime auto-refresh */
supabase
  .channel("public:workout_sessions")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "workout_sessions" },
    () => {
      useSessionsStore.getState().fetch();
    }
  )
  .subscribe();
