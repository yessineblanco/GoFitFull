import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export type CheckInFrequency = 'daily' | 'weekly';

export type CheckInSchedule = {
  id: string;
  coach_id: string;
  client_id: string;
  enabled: boolean;
  frequency: CheckInFrequency;
  check_in_days: number[];
  check_in_time: string;
  created_at: string;
  updated_at: string;
};

export type CheckInResponse = {
  id: string;
  coach_id: string;
  client_id: string;
  response_date: string;
  mood: number;
  energy: number;
  soreness: number;
  sleep_quality: number;
  notes: string | null;
  responded_at: string;
  created_at: string;
  updated_at: string;
};

export type ClientCheckInState = {
  schedules: CheckInSchedule[];
  dueSchedules: CheckInSchedule[];
  completedToday: CheckInResponse[];
};

export type CheckInResponseInput = {
  mood: number;
  energy: number;
  soreness: number;
  sleep_quality: number;
  notes?: string;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const normalizeSchedule = (row: any): CheckInSchedule => ({
  id: row.id,
  coach_id: row.coach_id,
  client_id: row.client_id,
  enabled: Boolean(row.enabled),
  frequency: row.frequency as CheckInFrequency,
  check_in_days: Array.isArray(row.check_in_days) ? row.check_in_days.map(Number) : [1],
  check_in_time: row.check_in_time || '09:00',
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const normalizeResponse = (row: any): CheckInResponse => ({
  id: row.id,
  coach_id: row.coach_id,
  client_id: row.client_id,
  response_date: row.response_date,
  mood: Number(row.mood) || 0,
  energy: Number(row.energy) || 0,
  soreness: Number(row.soreness) || 0,
  sleep_quality: Number(row.sleep_quality) || 0,
  notes: row.notes ?? null,
  responded_at: row.responded_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const isDueNow = (schedule: CheckInSchedule, now = new Date()) => {
  if (!schedule.enabled) return false;
  if (schedule.frequency === 'weekly' && !schedule.check_in_days.includes(now.getDay())) {
    return false;
  }

  const scheduledTime = (schedule.check_in_time || '00:00').slice(0, 5);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return currentTime >= scheduledTime;
};

class CheckInsService {
  async getClientCheckInState(scheduleId?: string): Promise<ClientCheckInState> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let schedulesQuery = supabase
      .from('check_in_schedules')
      .select('*')
      .eq('client_id', user.id)
      .eq('enabled', true)
      .order('updated_at', { ascending: false });

    if (scheduleId) {
      schedulesQuery = schedulesQuery.eq('id', scheduleId);
    }

    const { data: schedulesData, error: schedulesError } = await schedulesQuery;
    if (schedulesError) {
      logger.error('Failed to load check-in schedules:', schedulesError);
      throw schedulesError;
    }

    const schedules = (schedulesData || []).map(normalizeSchedule);
    const dueToday = schedules.filter((schedule) => isDueNow(schedule));
    const coachIds = dueToday.map((schedule) => schedule.coach_id);

    if (!coachIds.length) {
      return { schedules, dueSchedules: [], completedToday: [] };
    }

    const { data: responsesData, error: responsesError } = await supabase
      .from('check_in_responses')
      .select('*')
      .eq('client_id', user.id)
      .eq('response_date', todayKey())
      .in('coach_id', coachIds);

    if (responsesError) {
      logger.error('Failed to load check-in responses:', responsesError);
      throw responsesError;
    }

    const completedToday = (responsesData || []).map(normalizeResponse);
    const completedCoachIds = new Set(completedToday.map((response) => response.coach_id));

    return {
      schedules,
      completedToday,
      dueSchedules: dueToday.filter((schedule) => !completedCoachIds.has(schedule.coach_id)),
    };
  }

  async submitClientResponse(schedule: CheckInSchedule, input: CheckInResponseInput): Promise<CheckInResponse> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const payload = {
      coach_id: schedule.coach_id,
      client_id: user.id,
      response_date: todayKey(),
      mood: input.mood,
      energy: input.energy,
      soreness: input.soreness,
      sleep_quality: input.sleep_quality,
      notes: input.notes?.trim() || null,
      responded_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('check_in_responses')
      .upsert(payload, { onConflict: 'client_id,coach_id,response_date' })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to submit check-in response:', error);
      throw error;
    }

    return normalizeResponse(data);
  }

  async getCoachClientSchedule(coachId: string, clientId: string): Promise<CheckInSchedule | null> {
    const { data, error } = await supabase
      .from('check_in_schedules')
      .select('*')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to load coach check-in schedule:', error);
      throw error;
    }

    return data ? normalizeSchedule(data) : null;
  }

  async saveCoachClientSchedule(input: {
    coach_id: string;
    client_id: string;
    enabled: boolean;
    frequency: CheckInFrequency;
    check_in_days?: number[];
    check_in_time?: string;
  }): Promise<CheckInSchedule> {
    const payload = {
      coach_id: input.coach_id,
      client_id: input.client_id,
      enabled: input.enabled,
      frequency: input.frequency,
      check_in_days: input.check_in_days?.length ? input.check_in_days : [1],
      check_in_time: input.check_in_time || '09:00',
    };

    const { data, error } = await supabase
      .from('check_in_schedules')
      .upsert(payload, { onConflict: 'coach_id,client_id' })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to save coach check-in schedule:', error);
      throw error;
    }

    return normalizeSchedule(data);
  }

  async getCoachClientResponses(coachId: string, clientId: string, limit = 12): Promise<CheckInResponse[]> {
    const { data, error } = await supabase
      .from('check_in_responses')
      .select('*')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .order('responded_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to load coach check-in responses:', error);
      throw error;
    }

    return (data || []).map(normalizeResponse);
  }
}

export const checkInsService = new CheckInsService();
