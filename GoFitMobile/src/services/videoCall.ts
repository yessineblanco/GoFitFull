import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

/** Set to `false` before release: restores join only within `windowMinutes` of the session. */
const SKIP_CALL_TIME_WINDOW_FOR_TESTING = true;

export const videoCallService = {
  async generateToken(roomName: string, participantName: string, participantId: string): Promise<{ token: string; url: string } | null> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-token', {
        body: { room_name: roomName, participant_name: participantName, participant_id: participantId },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to generate video token:', error);
      return null;
    }
  },

  async createVideoRoom(bookingId: string): Promise<string | null> {
    try {
      const roomId = `booking-${bookingId}`;

      const { error } = await supabase
        .from('bookings')
        .update({ video_room_id: roomId })
        .eq('id', bookingId);

      if (error) throw error;
      return roomId;
    } catch (error) {
      logger.error('Failed to create video room:', error);
      return null;
    }
  },

  isWithinCallWindow(scheduledAt: string, windowMinutes = 15): boolean {
    if (SKIP_CALL_TIME_WINDOW_FOR_TESTING) return true;

    const scheduled = new Date(scheduledAt).getTime();
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    return now >= scheduled - windowMs && now <= scheduled + windowMs;
  },
};
