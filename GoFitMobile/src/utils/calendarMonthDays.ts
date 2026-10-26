export function getCalendarMonthDays(cursor: Date): Date[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  const days: Date[] = [];
  for (let day = 1; day <= count; day++) {
    days.push(new Date(year, month, day));
  }
  return days;
}
