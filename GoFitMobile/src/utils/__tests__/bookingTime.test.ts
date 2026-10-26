import { getNextBookingDate, overlapsBookedTime } from '../bookingTime';

test.each([
  ['2026-01-10T23:30:00Z', 0, '10:00', '2026-01-18T09:00:00.000Z'],
  ['2026-03-28T12:00:00Z', 0, '10:00', '2026-03-29T08:00:00.000Z'],
  ['2026-10-24T12:00:00Z', 0, '10:00', '2026-10-25T09:00:00.000Z'],
])('uses the Berlin calendar/offset from %s', (now, day, hour, expected) => {
  expect(getNextBookingDate(day, hour, new Date(now)).toISOString()).toBe(expected);
});

test('rejects a nonexistent Berlin spring-change time', () => {
  expect(() => getNextBookingDate(0, '02:30', new Date('2026-03-28T12:00:00Z'))).toThrow('does not exist');
});

test('overlap checks include partial overlap and allow adjacent sessions', () => {
  const busy = [{ scheduled_at: '2026-10-26T09:00:00Z', duration_minutes: 60 }];
  expect(overlapsBookedTime(new Date('2026-10-26T09:30:00Z'), 60, busy)).toBe(true);
  expect(overlapsBookedTime(new Date('2026-10-26T10:00:00Z'), 60, busy)).toBe(false);
});
