jest.mock('@/config/supabase', () => ({ supabase: { from: jest.fn(), functions: { invoke: jest.fn() } } }));
jest.mock('@/utils/logger', () => ({ logger: { error: jest.fn() } }));
jest.mock('@/services/notificationInbox', () => ({ notificationInboxService: {} }));
jest.mock('@/services/pushNotification', () => ({ pushNotificationService: {} }));
jest.mock('@/services/notifications', () => ({ notificationService: {} }));
import { bookingsService } from '../bookings';
import { supabase } from '@/config/supabase';

beforeEach(() => jest.clearAllMocks());

test.each([[60,45,45],[0.29,30,0.15]])('previews rate %s for duration %s as EUR %s', async (rate,duration,amount) => {
  const query: any = { select: jest.fn(() => query), eq: jest.fn(() => query),
    single: jest.fn().mockResolvedValue({ data: { hourly_rate: rate, default_session_duration: duration } }) };
  (supabase.from as jest.Mock).mockReturnValue(query);
  expect(await bookingsService.getSessionTerms('coach')).toEqual({ duration, amount });
});

test('confirmation returns the server booking without direct insertion', async () => {
  (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: { booking: { id: 'booking' } } });
  expect(await bookingsService.confirmPaidSession('pi_test')).toEqual({ id: 'booking' });
  expect(supabase.functions.invoke).toHaveBeenCalledWith('stripe-payment', { body: { action: 'fulfill_session', paymentIntentId: 'pi_test' } });
  expect(supabase.from).not.toHaveBeenCalled();
});

test('failed confirmation retains a payment reference for review', async () => {
  (supabase.functions.invoke as jest.Mock).mockResolvedValue({ error: new Error('Network unavailable') });
  await expect(bookingsService.confirmPaidSession('pi_test')).rejects.toThrow('pi_test');
});

test('busy-time failure does not masquerade as an empty schedule', async () => {
  (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: {} });
  await expect(bookingsService.getBusySessionTimes('coach')).rejects.toThrow('Unable');
});
