jest.mock('expo-linear-gradient', () => ({ LinearGradient: require('react-native').View }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('lucide-react-native', () => ({ ArrowLeft: () => null, Calendar: () => null, Clock: () => null, Check: () => null }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' } }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: { coachId: 'coach-id', coachName: 'Test coach' } }),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key === 'booking.daySunday' ? 'Sunday' : key }) }));
jest.mock('@/utils/responsive', () => ({ getResponsiveFontSize: (n: number) => n }));
jest.mock('@/store/bookingsStore', () => ({ useBookingsStore: jest.fn() }));
jest.mock('@/store/authStore', () => ({ useAuthStore: () => ({ user: { id: 'client-id', user_metadata: {} } }) }));
jest.mock('@/services/bookings', () => ({ bookingsService: { getSessionTerms: jest.fn(), getBusySessionTimes: jest.fn(), confirmPaidSession: jest.fn() } }));
jest.mock('@/components/shared/CustomDialog', () => ({ dialogManager: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/config/supabase', () => ({ supabase: { functions: { invoke: jest.fn() } } }));
jest.mock('@/config/stripe', () => ({ getStripePublishableKey: jest.fn(() => 'pk_test_fixture') }));
jest.mock('@stripe/stripe-react-native', () => ({ useStripe: jest.fn(() => ({
  initPaymentSheet: jest.fn().mockResolvedValue({}), presentPaymentSheet: jest.fn().mockResolvedValue({}),
})) }));

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { BookSessionScreen } from '../BookSessionScreen';
import { bookingsService } from '@/services/bookings';
import { useBookingsStore } from '@/store/bookingsStore';
import { supabase } from '@/config/supabase';
import { dialogManager } from '@/components/shared/CustomDialog';
import { getStripePublishableKey } from '@/config/stripe';
import { useStripe } from '@stripe/stripe-react-native';
const { act, create } = require('react-test-renderer');

describe('duration-aware booking screen (payment and backend mocked)', () => {
  let tree: any;
  const createBooking = jest.fn();
  const getTerms = bookingsService.getSessionTerms as jest.Mock;
  const confirmPayment = bookingsService.confirmPaidSession as jest.Mock;
  const loadClientBookings = jest.fn();
  beforeEach(() => {
    jest.useRealTimers();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    (getStripePublishableKey as jest.Mock).mockReturnValue('pk_test_fixture');
    (useStripe as jest.Mock).mockImplementation(() => ({ initPaymentSheet: jest.fn().mockResolvedValue({}), presentPaymentSheet: jest.fn().mockResolvedValue({}) }));
    getTerms.mockResolvedValue({ duration: 45, amount: 45 });
    (bookingsService.getBusySessionTimes as jest.Mock).mockResolvedValue([]);
    confirmPayment.mockResolvedValue({ id: 'server-booking' });
    loadClientBookings.mockResolvedValue(undefined);
    createBooking.mockResolvedValue({ id: 'mock-booking' });
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: { clientSecret: 'mock-secret', paymentIntentId: 'pi_test' } });
    (useBookingsStore as unknown as jest.Mock).mockReturnValue({
      availability: [{ id: 'slot', coach_id: 'coach-id', day_of_week: 0, start_time: '10:00:00', end_time: '12:00:00' }],
      loadingAvailability: false, loadAvailability: jest.fn(), createBooking, loadClientBookings,
    });
  });
  afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = null; });
  const render = async () => { await act(async () => { tree = create(<BookSessionScreen />); }); };
  const press = async (label: string) => {
    const button = tree.root.findAllByType(TouchableOpacity).find((node: any) =>
      node.findAllByType(Text).some((text: any) => text.props.children === label));
    expect(button).toBeDefined();
    await act(async () => { await button.props.onPress(); });
  };

  test('renders saved-duration slots and submits that duration for a Sunday session', async () => {
    await render();
    await press('Sun');
    await press('10:45');
    await press('booking.bookSession');
    expect(supabase.functions.invoke).toHaveBeenCalledWith('stripe-payment', expect.objectContaining({
      body: expect.objectContaining({ action: 'create_session', durationMinutes: 45, expectedAmount: 45 }),
    }));
    expect(confirmPayment).toHaveBeenCalledWith('pi_test');
    expect(loadClientBookings).toHaveBeenCalledWith('client-id');
    expect(createBooking).not.toHaveBeenCalled();
    expect(new Date((supabase.functions.invoke as jest.Mock).mock.calls[0][1].body.scheduledAt).getUTCDay()).toBe(0);
  });

  test('blocks payment when the coach duration changed after time selection', async () => {
    await render();
    await press('Sun');
    await press('10:45');
    getTerms.mockResolvedValue({ duration: 60, amount: 60 });
    await press('booking.bookSession');
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
    expect(createBooking).not.toHaveBeenCalled();
    expect(dialogManager.error).toHaveBeenCalledWith('common.error', expect.stringContaining('changed their session price or duration'));
  });

  test('missing Stripe configuration blocks backend, native sheet and booking writes', async () => {
    (getStripePublishableKey as jest.Mock).mockReturnValue('');
    await render();
    await press('Sun');
    await press('10:45');
    await press('booking.bookSession');
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
    expect(createBooking).not.toHaveBeenCalled();
    expect(dialogManager.error).toHaveBeenCalledWith('payments.unavailableTitle', 'payments.unavailableMessage');
    for (const call of (useStripe as jest.Mock).mock.results) {
      expect(call.value.initPaymentSheet).not.toHaveBeenCalled();
      expect(call.value.presentPaymentSheet).not.toHaveBeenCalled();
    }
  });

  test('shows a retry state instead of silently using 60 when duration lookup fails', async () => {
    getTerms.mockRejectedValue(new Error('Network unavailable'));
    await render();
    expect(tree.root.findAllByType(Text).some((text: any) => text.props.children === 'Unable to load session price or availability')).toBe(true);
    expect(createBooking).not.toHaveBeenCalled();
    getTerms.mockResolvedValue({ duration: 30, amount: 30 });
    await press('Retry');
    await press('Sun');
    await press('11:30');
  });
  test('busy overlapping slots are hidden before checkout', async () => {
    const { getNextBookingDate } = require('@/utils/bookingTime');
    (bookingsService.getBusySessionTimes as jest.Mock).mockResolvedValue([
      { scheduled_at: getNextBookingDate(0, '10:45').toISOString(), duration_minutes: 45 },
    ]);
    await render(); await press('Sun');
    expect(tree.root.findAllByType(Text).some((node: any) => node.props.children === '10:45')).toBe(false);
    await press('10:00');
  });

  test('payment-sheet cancellation releases the reservation and creates no booking', async () => {
    (useStripe as jest.Mock).mockImplementation(() => ({
      initPaymentSheet: jest.fn().mockResolvedValue({}),
      presentPaymentSheet: jest.fn().mockResolvedValue({ error: { code: 'Canceled' } }),
    }));
    await render(); await press('Sun'); await press('10:45'); await press('booking.bookSession');
    expect(confirmPayment).not.toHaveBeenCalled();
    expect(supabase.functions.invoke).toHaveBeenCalledWith('stripe-payment', {
      body: { action: 'cancel_session', paymentIntentId: 'pi_test' },
    });
  });

});
