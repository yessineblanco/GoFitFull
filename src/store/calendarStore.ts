import { create } from "zustand";

interface CalendarState {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (d: string) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  selectedDate: (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })(),
  setSelectedDate: (d) => set({ selectedDate: d }),
}));
