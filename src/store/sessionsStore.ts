import { create } from "zustand";
import { supabase } from "@/api/client";
import { getSessions, addSession, updateSession, deleteSession } from "@/services/workoutSessions";
import { useAuthStore } from "./authStore";

type Session = any;

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
  getTotalWorkouts: () => number;
}

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
    const { sessions } = get();
    if (!sessions || sessions.length === 0) return 0;

    // Get unique dates (YYYY-MM-DD)
    const dates = Array.from(new Set(sessions.map((s: any) => {
      const d = s.date || s.started_at || s.created_at;
      return d ? d.split('T')[0] : null;
    })))
      .filter((d): d is string => d !== null)
      .sort((a, b) => b.localeCompare(a));

    if (dates.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    // If no workout today or yesterday, streak is broken
    if (dates[0] !== today && dates[0] !== yesterday) return 0;

    let streak = 0;
    let currentDate = new Date(dates[0]);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
      const dateObj = new Date(dates[i]);
      dateObj.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(currentDate.getTime() - dateObj.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        if (diffDays === 1 || i === 0) {
          streak++;
        }
        currentDate = dateObj;
      } else {
        break;
      }
    }

    return streak;
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
