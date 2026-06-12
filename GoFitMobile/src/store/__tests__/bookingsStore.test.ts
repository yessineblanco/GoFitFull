jest.mock('@/services/bookings', () => ({
  bookingsService: {
    getAvailability: jest.fn(),
    setAvailability: jest.fn(),
    getBookingsForCoach: jest.fn(),
    getBookingsForClient: jest.fn(),
    createBooking: jest.fn(),
    cancelBooking: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn() },
}));

import { bookingsService, type Booking, type CreateBookingInput } from '@/services/bookings';
import { useBookingsStore } from '../bookingsStore';

const mockedBookingsService = bookingsService as jest.Mocked<typeof bookingsService>;

const makeBooking = (id: string, status: Booking['status'] = 'confirmed'): Booking => ({
  id,
  coach_id: 'coach-1',
  client_id: 'client-1',
  pack_purchase_id: null,
  scheduled_at: '2026-06-20T10:00:00.000Z',
  duration_minutes: 60,
  status,
  video_room_id: null,
  notes: null,
  cancelled_at: null,
  cancel_reason: null,
  rescheduled_from: null,
  created_at: '2026-06-12T10:00:00.000Z',
});

describe('bookings store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBookingsStore.setState({
      availability: [],
      coachBookings: [],
      clientBookings: [],
      loading: false,
      loadingAvailability: false,
    });
  });

  test('loads client bookings and clears the loading state', async () => {
    const bookings = [makeBooking('booking-1')];
    mockedBookingsService.getBookingsForClient.mockResolvedValue(bookings);

    const promise = useBookingsStore.getState().loadClientBookings('client-1');
    expect(useBookingsStore.getState().loading).toBe(true);

    await promise;

    expect(mockedBookingsService.getBookingsForClient).toHaveBeenCalledWith('client-1');
    expect(useBookingsStore.getState()).toMatchObject({
      clientBookings: bookings,
      loading: false,
    });
  });

  test('prepends a newly created booking without dropping existing bookings', async () => {
    const existing = makeBooking('existing');
    const created = makeBooking('created');
    const input: CreateBookingInput = {
      coach_id: 'coach-1',
      client_id: 'client-1',
      scheduled_at: created.scheduled_at,
      duration_minutes: 60,
    };
    useBookingsStore.setState({ clientBookings: [existing] });
    mockedBookingsService.createBooking.mockResolvedValue(created);

    await expect(useBookingsStore.getState().createBooking(input)).resolves.toBe(created);
    expect(useBookingsStore.getState().clientBookings).toEqual([created, existing]);
  });

  test('marks the matching coach and client booking as cancelled', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-12T12:00:00.000Z'));
    const target = makeBooking('target');
    const other = makeBooking('other');
    useBookingsStore.setState({
      coachBookings: [target, other],
      clientBookings: [target],
    });
    mockedBookingsService.cancelBooking.mockResolvedValue();

    await useBookingsStore.getState().cancelBooking('target', 'Schedule conflict');

    expect(mockedBookingsService.cancelBooking).toHaveBeenCalledWith(
      'target',
      'Schedule conflict',
    );
    expect(useBookingsStore.getState().coachBookings).toEqual([
      expect.objectContaining({
        id: 'target',
        status: 'cancelled',
        cancelled_at: '2026-06-12T12:00:00.000Z',
        cancel_reason: 'Schedule conflict',
      }),
      other,
    ]);
    expect(useBookingsStore.getState().clientBookings[0]).toMatchObject({
      id: 'target',
      status: 'cancelled',
    });
    jest.useRealTimers();
  });

  test('does not mutate booking state when cancellation fails', async () => {
    const booking = makeBooking('booking-1');
    useBookingsStore.setState({ clientBookings: [booking] });
    mockedBookingsService.cancelBooking.mockRejectedValue(new Error('network failure'));

    await expect(
      useBookingsStore.getState().cancelBooking('booking-1'),
    ).rejects.toThrow('network failure');
    expect(useBookingsStore.getState().clientBookings).toEqual([booking]);
  });
});
