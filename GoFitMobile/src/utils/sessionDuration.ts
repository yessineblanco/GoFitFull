export const SESSION_DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;

export function isSessionDuration(value: number): boolean {
  return SESSION_DURATION_OPTIONS.some(duration => duration === value);
}

export function getSessionStartTimes(start: string, end: string, duration: number): string[] {
  if (!isSessionDuration(duration)) return [];
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const finish = endHour * 60 + endMinute;
  const times: string[] = [];
  for (let minute = startHour * 60 + startMinute; minute + duration <= finish; minute += duration) {
    times.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
  }
  return times;
}
