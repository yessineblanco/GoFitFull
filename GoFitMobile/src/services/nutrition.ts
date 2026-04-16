import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FoodItem = {
  id: string;
  name: string;
  serving_label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type NutritionGoals = {
  user_id: string;
  calories_goal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  updated_at: string;
};

export type MealLogWithFood = {
  id: string;
  user_id: string;
  food_item_id: string;
  logged_date: string;
  meal_type: MealType;
  servings: number;
  food_item: FoodItem;
};

export type DayTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapFood(row: Record<string, unknown>): FoodItem {
  return {
    id: String(row.id),
    name: String(row.name),
    serving_label: String(row.serving_label ?? '100 g'),
    calories: num(row.calories),
    protein_g: num(row.protein_g),
    carbs_g: num(row.carbs_g),
    fat_g: num(row.fat_g),
  };
}

class NutritionService {
  async searchFoods(query: string, limit = 50): Promise<FoodItem[]> {
    const q = query.trim();
    if (q.length < 1) return [];

    const { data, error } = await supabase
      .from('food_items')
      .select('id,name,serving_label,calories,protein_g,carbs_g,fat_g')
      .ilike('name', `%${q}%`)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('searchFoods', error);
      throw error;
    }
    return (data || []).map((r) => mapFood(r as Record<string, unknown>));
  }

  async getOrCreateGoals(): Promise<NutritionGoals> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing, error: selErr } = await supabase
      .from('nutrition_goals')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (selErr) throw selErr;
    if (existing) return existing as NutritionGoals;

    const defaults = {
      user_id: user.id,
      calories_goal: 2000,
      protein_g: 150,
      carbs_g: 200,
      fat_g: 65,
    };
    const { data, error } = await supabase.from('nutrition_goals').insert(defaults).select('*').single();
    if (error) throw error;
    return data as NutritionGoals;
  }

  async saveGoals(input: Partial<Pick<NutritionGoals, 'calories_goal' | 'protein_g' | 'carbs_g' | 'fat_g'>>): Promise<NutritionGoals> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('nutrition_goals')
      .upsert(
        {
          user_id: user.id,
          calories_goal: input.calories_goal ?? 2000,
          protein_g: input.protein_g ?? 150,
          carbs_g: input.carbs_g ?? 200,
          fat_g: input.fat_g ?? 65,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single();

    if (error) throw error;
    return data as NutritionGoals;
  }

  async getLogsForDate(date: string): Promise<MealLogWithFood[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('meal_logs')
      .select(
        'id,user_id,food_item_id,logged_date,meal_type,servings, food_items(id,name,serving_label,calories,protein_g,carbs_g,fat_g)',
      )
      .eq('user_id', user.id)
      .eq('logged_date', date)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('getLogsForDate', error);
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      food_item_id: row.food_item_id,
      logged_date: row.logged_date,
      meal_type: row.meal_type as MealType,
      servings: num(row.servings),
      food_item: mapFood((row.food_items ?? row.food_item) as Record<string, unknown>),
    }));
  }

  computeTotals(logs: MealLogWithFood[]): DayTotals {
    return logs.reduce(
      (acc, log) => {
        const s = log.servings;
        const f = log.food_item;
        acc.calories += f.calories * s;
        acc.protein_g += f.protein_g * s;
        acc.carbs_g += f.carbs_g * s;
        acc.fat_g += f.fat_g * s;
        return acc;
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
  }

  async getDayTotals(date: string): Promise<DayTotals> {
    const logs = await this.getLogsForDate(date);
    return this.computeTotals(logs);
  }

  async addMealLog(foodItemId: string, mealType: MealType, servings: number, date: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('meal_logs').insert({
      user_id: user.id,
      food_item_id: foodItemId,
      meal_type: mealType,
      servings,
      logged_date: date,
    });
    if (error) throw error;
  }

  async deleteMealLog(id: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('meal_logs').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
  }
}

export const nutritionService = new NutritionService();
