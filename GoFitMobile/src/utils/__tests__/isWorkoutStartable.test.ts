import { isWorkoutStartable } from '../isWorkoutStartable';

describe('isWorkoutStartable', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-11T12:00:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('allows workouts scheduled today or later', () => {
    expect(isWorkoutStartable('2026-06-11T00:00:00')).toBe(true);
    expect(isWorkoutStartable('2026-06-12T08:30:00')).toBe(true);
  });

  test('rejects past, missing, and invalid dates', () => {
    expect(isWorkoutStartable('2026-06-10T23:59:59')).toBe(false);
    expect(isWorkoutStartable(null)).toBe(false);
    expect(isWorkoutStartable()).toBe(false);
    expect(isWorkoutStartable('not-a-date')).toBe(false);
  });
});
