import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { notificationInboxService } from '@/services/notificationInbox';
import { pushNotificationService } from '@/services/pushNotification';
import { notificationService } from '@/services/notifications';

export interface AvailabilitySlot {
  id: string;
  coach_id: string;
  day_of_week: number; // 0=Sunday .. 6=Saturday
  start_time: string;  // HH:mm
  end_time: string;    // HH:mm
}

export interface Booking {
  id: string;
  coach_id: string;
  client_id: string;
  pack_purchase_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  video_room_id: string | null;
  notes: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  rescheduled_from: string | null;
  created_at: string;
  coach_name?: string;
  client_name?: string;
  client_profile_picture_url?: string | null;
}

async function mergeClientProfilesOntoCoachBookings(bookings: Booking[]): Promise<Booking[]> {
  const ids = [...new Set(bookings.map((b) => b.client_id).filter(Boolean))];
  if (!ids.length) return bookings;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, profile_picture_url, display_name')
      .in('id', ids);
    if (error || !data?.length) return bookings;
    const map = new Map<
      string,
      { profile_picture_url: string | null; display_name: string | null }
    >(
      data.map((r: { id: string; profile_picture_url: string | null; display_name: string | null }) => [
        r.id,
        { profile_picture_url: r.profile_picture_url, display_name: r.display_name },
      ]),
    );
    return bookings.map((b) => {
      const r = map.get(b.client_id);
      if (!r) return b;
      const pic = r.profile_picture_url?.trim() || null;
      const nameFromProfile = r.display_name?.trim() || '';
      const client_name =
        (b.client_name && b.client_name.trim()) || nameFromProfile || b.client_name;
      return {
        ...b,
        client_name: client_name || b.client_name,
        client_profile_picture_url: pic || b.client_profile_picture_url || null,
      };
    });
  } catch {
    return bookings;
  }
}

export interface CreateBookingInput {
  coach_id: string;
  client_id: string;
  pack_purchase_id?: string;
  scheduled_at: string;
  duration_minutes: number;
  notes?: string;
}

export const bookingsService = {
  // --- Availability ---

  async getAvailability(coachId: string): Promise<AvailabilitySlot[]> {
    try {
      const { data, error } = await supabase
        .from('coach_availability')
        .select('*')
        .eq('coach_id', coachId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch availability:', error);
      return [];
    }
  },

  async setAvailability(coachId: string, slots: Omit<AvailabilitySlot, 'id' | 'coach_id'>[]): Promise<void> {
    try {
      const { error: deleteError } = await supabase
        .from('coach_availability')
        .delete()
        .eq('coach_id', coachId);

      if (deleteError) throw deleteError;

      if (slots.length > 0) {
        const rows = slots.map((s) => ({
          coach_id: coachId,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        }));

        const { error: insertError } = await supabase
          .from('coach_availability')
          .insert(rows);

        if (insertError) throw insertError;
      }
    } catch (error) {
      logger.error('Failed to set availability:', error);
      throw error;
    }
  },

  // --- Bookings ---

  async createBooking(input: CreateBookingInput): Promise<Booking | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          coach_id: input.coach_id,
          client_id: input.client_id,
          pack_purchase_id: input.pack_purchase_id || null,
          scheduled_at: input.scheduled_at,
          duration_minutes: input.duration_minutes,
          notes: input.notes || null,
          status: 'confirmed',
        })
        .select()
        .single();

      if (error) throw error;

      if (input.pack_purchase_id) {
        await supabase.rpc('deduct_session', { p_pack_id: input.pack_purchase_id });
      }

      const { data: coachRow } = await supabase.from('coach_profiles').select('user_id').eq('id', input.coach_id).single();
      if (coachRow?.user_id) {
        await notificationInboxService.createNotification({
          user_id: coachRow.user_id,
          type: 'booking_confirmed',
          title: 'New booking',
          body: 'A client has booked a session with you.',
          data: { screen: 'CoachDetail', id: input.coach_id },
        });
        pushNotificationService.send({
          user_id: coachRow.user_id,
          title: 'New booking',
          body: 'A client has booked a session with you.',
          data: { screen: 'CoachDetail', id: input.coach_id },
        });
      }

      notificationService.scheduleBookingReminder(data.id, input.scheduled_at);

      return data;
    } catch (error) {
      logger.error('Failed to create booking:', error);
      throw error;
    }
  },

  async getBookingsForCoach(coachId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('coach_id', coachId)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      const rows = data || [];
      return mergeClientProfilesOntoCoachBookings(rows);
    } catch (error) {
      logger.error('Failed to fetch coach bookings:', error);
      return [];
    }
  },

  async getBookingsForClient(clientId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', clientId)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch client bookings:', error);
      return [];
    }
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    try {
      const { data: booking } = await supabase.from('bookings').select('coach_id, client_id').eq('id', bookingId).single();
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason || null,
        })
        .eq('id', bookingId);

      if (error) throw error;

      if (booking) {
        const { data: { user } } = await supabase.auth.getUser();
        const recipientUserId = user?.id === booking.client_id
          ? (await supabase.from('coach_profiles').select('user_id').eq('id', booking.coach_id).single()).data?.user_id
          : booking.client_id;
        if (recipientUserId && recipientUserId !== user?.id) {
          await notificationInboxService.createNotification({
            user_id: recipientUserId,
            type: 'booking_cancelled',
            title: 'Booking cancelled',
            body: 'A session booking has been cancelled.',
            data: {},
          });
          pushNotificationService.send({
            user_id: recipientUserId,
            title: 'Booking cancelled',
            body: 'A session booking has been cancelled.',
          });
        }
      }

      notificationService.cancelBookingReminder(bookingId);
    } catch (error) {
      logger.error('Failed to cancel booking:', error);
      throw error;
    }
  },

  async completeBooking(bookingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to complete booking:', error);
      throw error;
    }
  },
};
