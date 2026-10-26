import { stepAvailabilityTime } from '../availabilityTime';

describe('availability time controls', () => {
  test.each([
    ['10:00', 1, '10:30'],
    ['10:00', -1, '09:30'],
    ['10:00:00', 1, '10:30'],
    ['10:00:00', -1, '09:30'],
    ['14:00:00', 1, '14:30'],
    ['14:00:00', -1, '13:30'],
    ['10:30:00.000000', 1, '11:00'],
    ['06:00:00', -1, '06:00'],
    ['22:30:00', 1, '22:30'],
  ] as const)('steps %s by %i to %s', (time, direction, expected) => {
    expect(stepAvailabilityTime(time, direction)).toBe(expected);
  });

  test.each(['10:15:00', '10:00:30', '23:00:00', 'invalid'])('preserves unsupported stored value %s rather than jumping to 06:00', time => {
    expect(stepAvailabilityTime(time, 1)).toBe(time);
    expect(stepAvailabilityTime(time, -1)).toBe(time);
  });
});
