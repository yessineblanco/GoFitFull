import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export type BodyMeasurement = {
  id: string;
  user_id: string;
  measurement_date: string;
  photo_url: string | null;
  shoulder_width: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  left_arm: number | null;
  right_arm: number | null;
  left_thigh: number | null;
  right_thigh: number | null;
  /** Reference height (cm) used for this entry — profile height at scan time or manual */
  height_cm: number | null;
  landmarks: any;
  manual_overrides: any;
  source: 'ai' | 'manual';
  created_at: string;
};

export type MeasurementInput = {
  shoulder_width?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  left_arm?: number;
  right_arm?: number;
  left_thigh?: number;
  right_thigh?: number;
  height_cm?: number;
};

class BodyMeasurementsService {
  async analyzePhoto(imageBase64: string, userHeightCm: number): Promise<{
    measurements: MeasurementInput;
    record: BodyMeasurement;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('body-measurements', {
      body: {
        image_base64: imageBase64,
        user_height_cm: userHeightCm,
      },
    });

    if (error) {
      let msg = error.message || 'Edge function error';
      try {
        const ctx = (error as any).context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (body?.error) msg = body.error;
        }
      } catch {}
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);

    return {
      measurements: data.measurements,
      record: data.record,
    };
  }

  async saveManual(input: MeasurementInput): Promise<BodyMeasurement> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('body_measurements')
      .insert({
        user_id: user.id,
        measurement_date: new Date().toISOString().split('T')[0],
        ...input,
        source: 'manual',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getHistory(limit = 20): Promise<BodyMeasurement[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch measurement history', error);
      return [];
    }

    return data || [];
  }

  async getLatest(): Promise<BodyMeasurement | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch latest measurement', error);
      return null;
    }

    return data;
  }

  async deleteMeasurement(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('body_measurements')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }
}

export const bodyMeasurementsService = new BodyMeasurementsService();
