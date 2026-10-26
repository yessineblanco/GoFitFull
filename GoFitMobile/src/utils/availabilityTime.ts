const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

export function stepAvailabilityTime(time: string, direction: 1 | -1): string {
  if (!/^\d{2}:\d{2}(?::00(?:\.0+)?)?$/.test(time)) return time;
  const currentIdx = TIME_OPTIONS.indexOf(time.slice(0, 5));
  if (currentIdx === -1) return time;
  const newIdx = Math.max(0, Math.min(TIME_OPTIONS.length - 1, currentIdx + direction));
  return TIME_OPTIONS[newIdx];
}
