jest.mock('@/config/supabase', () => ({ supabase: { functions: { invoke: jest.fn() } } }));
jest.mock('@/utils/logger', () => ({ logger: { error: jest.fn() } }));
import { sessionPacksService } from '../sessionPacks';
import { supabase } from '@/config/supabase';

describe('verified pack payment confirmation', () => {
  beforeEach(() => jest.clearAllMocks());
  test('asks the backend to fulfill the payment, without client-side pack inserts', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: { purchaseId: 'purchase' } });
    await sessionPacksService.purchasePack('pi_test');
    expect(supabase.functions.invoke).toHaveBeenCalledWith('stripe-payment', {
      body: { action: 'fulfill_pack', paymentIntentId: 'pi_test' },
    });
  });
  test('does not report success when confirmation returns no purchase', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: {} });
    await expect(sessionPacksService.purchasePack('pi_test')).rejects.toThrow('did not save');
  });
  test('propagates rejected or unpaid confirmation', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ error: new Error('Unpaid') });
    await expect(sessionPacksService.purchasePack('pi_test')).rejects.toThrow('Unpaid');
  });
});
