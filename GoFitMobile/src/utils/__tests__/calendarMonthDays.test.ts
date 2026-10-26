import { getCalendarMonthDays } from '../calendarMonthDays';

describe('calendar month dates', () => {
  test.each([
    [2026, 9, 31], // Berlin autumn clock change: previously duplicated 25 and omitted 31.
    [2026, 2, 31], // Berlin spring clock change.
    [2024, 1, 29],
    [2025, 1, 28],
    [2026, 3, 30],
    [2026, 11, 31],
    [2027, 0, 31],
  ])('includes each local date exactly once in %i, month index %i', (year, month, count) => {
    const days = getCalendarMonthDays(new Date(year, month, 23, 14, 30));
    expect(days.map(day => day.getDate())).toEqual(Array.from({ length: count }, (_, i) => i + 1));
    expect(new Set(days.map(day => day.toISOString())).size).toBe(count);
    for (const day of days) {
      expect(day.getFullYear()).toBe(year);
      expect(day.getMonth()).toBe(month);
      expect(day.getHours()).toBe(0);
    }
  });
});
