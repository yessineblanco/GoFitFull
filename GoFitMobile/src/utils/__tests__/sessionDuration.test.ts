import { getSessionStartTimes, isSessionDuration } from '../sessionDuration';

describe('coach session duration', () => {
  test.each([30, 45, 60, 90, 120])('accepts supported duration %i', minutes => {
    expect(isSessionDuration(minutes)).toBe(true);
  });
  test.each([0, -30, 15, 61, NaN])('rejects unsupported duration %s', minutes => {
    expect(isSessionDuration(minutes)).toBe(false);
    expect(getSessionStartTimes('10:00', '14:00', minutes)).toEqual([]);
  });
  test('fits 45-minute sessions fully inside stored availability', () => {
    expect(getSessionStartTimes('10:00:00', '12:00:00', 45)).toEqual(['10:00', '10:45']);
  });
  test('uses 30-minute slots and retains a session ending exactly at the window end', () => {
    expect(getSessionStartTimes('10:30', '12:00', 30)).toEqual(['10:30', '11:00', '11:30']);
  });
  test('retains hourly slots for the existing 60-minute default', () => {
    expect(getSessionStartTimes('10:00', '14:00', 60)).toEqual(['10:00', '11:00', '12:00', '13:00']);
  });
  test('does not offer a session longer than the availability window', () => {
    expect(getSessionStartTimes('10:00', '11:00', 90)).toEqual([]);
  });
});
