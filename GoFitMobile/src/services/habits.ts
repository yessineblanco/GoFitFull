import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export type HabitType =
  | 'hydration'
  | 'protein'
  | 'steps'
  | 'sleep'
  | 'mobility'
  | 'nutrition'
  | 'progress_photo'
  | 'weigh_in'
  | 'custom';

export type DailyHabit = {
  id: string;
  user_id: string;
  type: HabitType;
  title: string;
  target_value: number | null;
  unit: string | null;
  sort_order: number;
  is_active: boolean;
  completed: boolean;
  completed_at: string | null;
};

export type HabitsResult = {
  habits: DailyHabit[];
  unavailable: boolean;
};

export type HabitUpsertInput = {
  id?: string;
  type: HabitType;
  title: string;
  target_value: number | null;
  unit: string | null;
  sort_order?: number;
  is_active?: boolean;
};

const DEFAULT_HABITS: Array<Pick<DailyHabit, 'type' | 'title' | 'target_value' | 'unit' | 'sort_order'>> = [
  { type: 'hydration', title: 'Drink water', target_value: 2, unit: 'L', sort_order: 10 },
  { type: 'protein', title: 'Hit protein', target_value: 100, unit: 'g', sort_order: 20 },
  { type: 'steps', title: 'Move today', target_value: 8000, unit: 'steps', sort_order: 30 },
  { type: 'mobility', title: 'Mobility', target_value: 10, unit: 'min', sort_order: 40 },
];

const todayKey = () => new Date().toISOString().slice(0, 10);

function isMissingTable(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('does not exist');
}

function localHabits(userId: string): DailyHabit[] {
  return DEFAULT_HABITS.map((habit, index) => ({
    id: `local-${habit.type}`,
    user_id: userId,
    type: habit.type,
    title: habit.title,
    target_value: habit.target_value,
    unit: habit.unit,
    sort_order: habit.sort_order ?? index,
    is_active: true,
    completed: false,
    completed_at: null,
  }));
}

class HabitsService {
  private async getUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  }

  private async ensureDefaultHabits(userId: string) {
    await supabase.from('daily_habits').upsert(
      DEFAULT_HABITS.map((habit) => ({
        user_id: userId,
        ...habit,
        is_active: true,
      })),
      { onConflict: 'user_id,type,title' },
    );
  }

  private mapHabit(habit: any): DailyHabit {
    return {
      id: habit.id,
      user_id: habit.user_id,
      type: habit.type as HabitType,
      title: habit.title,
      target_value: habit.target_value === null ? null : Number(habit.target_value),
      unit: habit.unit,
      sort_order: Number(habit.sort_order) || 0,
      is_active: Boolean(habit.is_active),
      completed: Boolean(habit.completed),
      completed_at: habit.completed_at || null,
    };
  }

  async getTodayHabits(): Promise<HabitsResult> {
    const userId = await this.getUserId();
    if (!userId) return { habits: [], unavailable: false };

    try {
      await this.ensureDefaultHabits(userId);

      const { data: habitsData, error: habitsError } = await supabase
        .from('daily_habits')
        .select('id,user_id,type,title,target_value,unit,sort_order,is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (habitsError) throw habitsError;

      const habitIds = (habitsData || []).map((habit: any) => habit.id);
      const { data: logsData, error: logsError } = habitIds.length
        ? await supabase
            .from('habit_logs')
            .select('habit_id,completed_at')
            .eq('user_id', userId)
            .eq('completed_date', todayKey())
            .in('habit_id', habitIds)
        : { data: [], error: null };

      if (logsError) throw logsError;

      const completed = new Map((logsData || []).map((log: any) => [log.habit_id, log.completed_at]));
      return {
        unavailable: false,
        habits: (habitsData || []).map((habit: any) => ({
          ...this.mapHabit(habit),
          completed: completed.has(habit.id),
          completed_at: completed.get(habit.id) || null,
        })),
      };
    } catch (error: any) {
      if (isMissingTable(error)) {
        return { habits: localHabits(userId), unavailable: true };
      }
      logger.error('getTodayHabits', error);
      throw error;
    }
  }

  async listHabits(): Promise<HabitsResult> {
    const userId = await this.getUserId();
    if (!userId) return { habits: [], unavailable: false };

    try {
      await this.ensureDefaultHabits(userId);
      const { data, error } = await supabase
        .from('daily_habits')
        .select('id,user_id,type,title,target_value,unit,sort_order,is_active')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return {
        unavailable: false,
        habits: (data || []).map((habit: any) => this.mapHabit(habit)),
      };
    } catch (error: any) {
      if (isMissingTable(error)) {
        return { habits: localHabits(userId), unavailable: true };
      }
      logger.error('listHabits', error);
      throw error;
    }
  }

  async saveHabit(input: HabitUpsertInput): Promise<DailyHabit> {
    const userId = await this.getUserId();
    if (!userId) throw new Error('Not authenticated');

    const payload = {
      user_id: userId,
      type: input.type,
      title: input.title.trim(),
      target_value: input.target_value,
      unit: input.unit?.trim() || null,
      sort_order: input.sort_order ?? 100,
      is_active: input.is_active ?? true,
    };

    const query = input.id
      ? supabase.from('daily_habits').update(payload).eq('id', input.id).eq('user_id', userId)
      : supabase.from('daily_habits').insert(payload);

    const { data, error } = await query
      .select('id,user_id,type,title,target_value,unit,sort_order,is_active')
      .single();
    if (error) throw error;
    return this.mapHabit(data);
  }

  async setHabitActive(habitId: string, isActive: boolean): Promise<void> {
    const userId = await this.getUserId();
    if (!userId) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('daily_habits')
      .update({ is_active: isActive })
      .eq('id', habitId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async deleteHabit(habitId: string): Promise<void> {
    const userId = await this.getUserId();
    if (!userId) throw new Error('Not authenticated');
    const { error } = await supabase.from('daily_habits').delete().eq('id', habitId).eq('user_id', userId);
    if (error) throw error;
  }

  async setHabitCompleted(habit: DailyHabit, completed: boolean): Promise<void> {
    if (habit.id.startsWith('local-')) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (completed) {
      const { error } = await supabase.from('habit_logs').upsert(
        {
          habit_id: habit.id,
          user_id: user.id,
          completed_date: todayKey(),
          value: habit.target_value,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'habit_id,completed_date' },
      );
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('habit_logs')
      .delete()
      .eq('habit_id', habit.id)
      .eq('user_id', user.id)
      .eq('completed_date', todayKey());
    if (error) throw error;
  }
}

export const habitsService = new HabitsService();
