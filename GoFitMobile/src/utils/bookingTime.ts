const berlin = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function wallTime(date: Date): number {
  const parts = Object.fromEntries(berlin.formatToParts(date).map(p => [p.type, p.value]));
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
}

// Availability is defined in Europe/Berlin, independently of the phone timezone.
export function getNextBookingDate(dayOfWeek: number, hour: string, now = new Date()): Date {
  const today = new Date(wallTime(now));
  const daysAhead = (dayOfWeek - today.getUTCDay() + 7) % 7 || 7;
  const [h, m] = hour.split(':').map(Number);
  const target = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + daysAhead, h, m);
  let candidate = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    candidate = target - (wallTime(new Date(candidate)) - candidate);
  }
  if (wallTime(new Date(candidate)) !== target) throw new Error('This time does not exist in Europe/Berlin');
  return new Date(candidate);
}

export function overlapsBookedTime(start: Date, duration: number, busy: { scheduled_at: string; duration_minutes: number }[]): boolean {
  return busy.some(slot => start.getTime() < Date.parse(slot.scheduled_at) + slot.duration_minutes * 60000 &&
    start.getTime() + duration * 60000 > Date.parse(slot.scheduled_at));
}
