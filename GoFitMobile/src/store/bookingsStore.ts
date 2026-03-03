import { create } from 'zustand';
import {
  bookingsService,
  type AvailabilitySlot,
  type Booking,
  type CreateBookingInput,
} from '@/services/bookings';
import { logger } from '@/utils/logger';

interface BookingsStore {
  availability: AvailabilitySlot[];
  coachBookings: Booking[];
  clientBookings: Booking[];
  loading: boolean;
  loadingAvailability: boolean;

  loadAvailability: (coachId: string) => Promise<void>;
  saveAvailability: (coachId: string, slots: Omit<AvailabilitySlot, 'id' | 'coach_id'>[]) => Promise<void>;
  loadCoachBookings: (coachId: string) => Promise<void>;
  loadClientBookings: (clientId: string) => Promise<void>;
  createBooking: (input: CreateBookingInput) => Promise<Booking | null>;
  cancelBooking: (bookingId: string, reason?: string) => Promise<void>;
}

export const useBookingsStore = create<BookingsStore>((set, get) => ({
  availability: [],
  coachBookings: [],
  clientBookings: [],
  loading: false,
  loadingAvailability: false,

  loadAvailability: async (coachId: string) => {
    set({ loadingAvailability: true });
    try {
      const slots = await bookingsService.getAvailability(coachId);
      set({ availability: slots, loadingAvailability: false });
    } catch (error) {
      set({ loadingAvailability: false });
      logger.error('Failed to load availability:', error);
    }
  },

  saveAvailability: async (coachId, slots) => {
    try {
      await bookingsService.setAvailability(coachId, slots);
      const updated = await bookingsService.getAvailability(coachId);
      set({ availability: updated });
    } catch (error) {
      logger.error('Failed to save availability:', error);
      throw error;
    }
  },

  loadCoachBookings: async (coachId: string) => {
    set({ loading: true });
    try {
      const bookings = await bookingsService.getBookingsForCoach(coachId);
      set({ coachBookings: bookings, loading: false });
    } catch (error) {
      set({ loading: false });
      logger.error('Failed to load coach bookings:', error);
    }
  },

  loadClientBookings: async (clientId: string) => {
    set({ loading: true });
    try {
      const bookings = await bookingsService.getBookingsForClient(clientId);
      set({ clientBookings: bookings, loading: false });
    } catch (error) {
      set({ loading: false });
      logger.error('Failed to load client bookings:', error);
    }
  },

  createBooking: async (input) => {
    try {
      const booking = await bookingsService.createBooking(input);
      if (booking) {
        set({ clientBookings: [booking, ...get().clientBookings] });
      }
      return booking;
    } catch (error) {
      logger.error('Failed to create booking:', error);
      throw error;
    }
  },

  cancelBooking: async (bookingId, reason) => {
    try {
      await bookingsService.cancelBooking(bookingId, reason);
      const updateList = (list: Booking[]) =>
        list.map((b) => b.id === bookingId ? { ...b, status: 'cancelled' as const, cancelled_at: new Date().toISOString(), cancel_reason: reason || null } : b);
      set({
        coachBookings: updateList(get().coachBookings),
        clientBookings: updateList(get().clientBookings),
      });
    } catch (error) {
      logger.error('Failed to cancel booking:', error);
      throw error;
    }
  },
}));
