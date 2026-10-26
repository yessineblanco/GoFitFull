jest.mock('@/config/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('@/utils/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

import { supabase } from '@/config/supabase';
import { checkInsService } from '../checkIns';

describe('coach low check-in alerts', () => {
  const row = { id: 'response-1', coach_id: 'coach-1', client_id: 'client-1', response_date: '2026-10-24', mood: 1, energy: 4, soreness: 3, sleep_quality: 3 };
  let query: any;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-24T12:00:00Z'));
    query = { select: jest.fn(), eq: jest.fn(), gte: jest.fn(), or: jest.fn(), order: jest.fn() };
    for (const method of ['select', 'eq', 'gte', 'or']) query[method].mockReturnValue(query);
    (supabase.from as jest.Mock).mockReturnValue(query);
    query.order.mockResolvedValue({ data: [row], error: null });
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: [{ client_id: 'client-1', display_name: 'Test client' }], error: null });
  });
  afterEach(() => jest.useRealTimers());

  test('fetches filtered responses without an invalid embedded join and enriches only matching client names', async () => {
    const results = await checkInsService.getRecentLowCheckInsForCoach('coach-1');
    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.eq).toHaveBeenCalledWith('coach_id', 'coach-1');
    expect(query.gte).toHaveBeenCalledWith('response_date', '2026-10-22');
    expect(query.or).toHaveBeenCalledWith('mood.lte.2,energy.lte.2');
    expect(query.order).toHaveBeenCalledWith('response_date', { ascending: false });
    expect(supabase.rpc).toHaveBeenCalledWith('get_coach_clients', { p_coach_id: 'coach-1' });
    expect(results[0]).toMatchObject({ id: 'response-1', client_id: 'client-1', client_name: 'Test client' });
  });

  test('keeps true empty results distinct from failed loads and avoids unnecessary name lookup', async () => {
    query.order.mockResolvedValue({ data: [], error: null });
    await expect(checkInsService.getRecentLowCheckInsForCoach('coach-1')).resolves.toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test('propagates a failed response query for the dashboard error state', async () => {
    const error = { code: 'PGRST200', message: 'Query failed' };
    query.order.mockResolvedValue({ data: null, error });
    await expect(checkInsService.getRecentLowCheckInsForCoach('coach-1')).rejects.toEqual(error);
  });

  test('preserves alerts if names are unavailable', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Name lookup unavailable' } });
    expect(await checkInsService.getRecentLowCheckInsForCoach('coach-1')).toEqual([{ ...row, client_name: null }]);
  });

  test('preserves alerts if the name request rejects at transport level', async () => {
    (supabase.rpc as jest.Mock).mockRejectedValue(new Error('Network failure'));
    expect((await checkInsService.getRecentLowCheckInsForCoach('coach-1'))[0]).toMatchObject({ id: 'response-1', client_name: null });
  });

  test('does not use another client name when the alert client is not in the coach client list', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: [{ client_id: 'other-client', display_name: 'Other client' }], error: null });
    expect((await checkInsService.getRecentLowCheckInsForCoach('coach-1'))[0]).toMatchObject({ client_id: 'client-1', client_name: null });
  });
});
