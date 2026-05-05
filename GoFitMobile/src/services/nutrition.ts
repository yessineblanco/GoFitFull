import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FoodItem = {
  id: string;
  barcode?: string | null;
  food_source?: string | null;
  source_id?: string | null;
  source_url?: string | null;
  source_checked_at?: string | null;
  name: string;
  serving_label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

type BarcodeLookupResponse = {
  food?: Record<string, unknown> | null;
  source?: string;
};

const FOOD_SELECT = 'id,barcode,food_source,source_id,source_url,source_checked_at,name,serving_label,calories,protein_g,carbs_g,fat_g,fiber_g';

export type NutritionGoals = {
  user_id: string;
  calories_goal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml_goal: number;
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

export type RecentFoodLog = {
  food_item: FoodItem;
  last_meal_type: MealType;
  last_servings: number;
  last_logged_date: string;
};

export type SavedMealItem = {
  id: string;
  food_item_id: string;
  servings: number;
  item_order: number;
  food_item: FoodItem;
};

export type SavedMeal = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  items: SavedMealItem[];
};

export type DayTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
};

export type WeeklyNutritionSummary = {
  average_calories: number;
  protein_days_hit: number;
  water_days_hit: number;
  fiber_days_hit: number;
  tracked_days: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapFood(row: Record<string, unknown>): FoodItem {
  return {
    id: String(row.id),
    barcode: row.barcode ? String(row.barcode) : null,
    food_source: row.food_source ? String(row.food_source) : 'gofit',
    source_id: row.source_id ? String(row.source_id) : null,
    source_url: row.source_url ? String(row.source_url) : null,
    source_checked_at: row.source_checked_at ? String(row.source_checked_at) : null,
    name: String(row.name),
    serving_label: String(row.serving_label ?? '100 g'),
    calories: num(row.calories),
    protein_g: num(row.protein_g),
    carbs_g: num(row.carbs_g),
    fat_g: num(row.fat_g),
    fiber_g: num(row.fiber_g),
  };
}

class NutritionService {
  async searchFoods(query: string, limit = 50): Promise<FoodItem[]> {
    const q = query.trim();
    if (q.length < 1) return [];

    const { data, error } = await supabase
      .from('food_items')
      .select(FOOD_SELECT)
      .ilike('name', `%${q}%`)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('searchFoods', error);
      throw error;
    }
    return (data || []).map((r) => mapFood(r as Record<string, unknown>));
  }

  async findFoodByBarcode(barcode: string): Promise<FoodItem | null> {
    const code = barcode.replace(/\D/g, '');
    if (code.length < 6) return null;

    const candidates = Array.from(new Set([
      code,
      code.length === 12 ? `0${code}` : '',
      code.length === 13 && code.startsWith('0') ? code.slice(1) : '',
    ].filter(Boolean)));

    const { data, error } = await supabase
      .from('food_items')
      .select(FOOD_SELECT)
      .in('barcode', candidates)
      .limit(1);

    if (error) {
      logger.error('findFoodByBarcode', error);
      throw error;
    }

    return data?.[0] ? mapFood(data[0] as Record<string, unknown>) : null;
  }

  async lookupFoodByBarcode(barcode: string): Promise<FoodItem | null> {
    const local = await this.findFoodByBarcode(barcode);
    if (local) return local;

    const { data, error } = await supabase.functions.invoke<BarcodeLookupResponse>('food-barcode-lookup', {
      body: { barcode },
    });

    if (error) {
      logger.error('lookupFoodByBarcode', error);
      throw error;
    }

    return data?.food ? mapFood(data.food) : null;
  }

  async getSavedMeals(limit = 20): Promise<SavedMeal[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('saved_meals')
      .select(`
        id,
        user_id,
        name,
        created_at,
        updated_at,
        saved_meal_items (
          id,
          food_item_id,
          servings,
          item_order,
          food_items (${FOOD_SELECT})
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('getSavedMeals', error);
      throw error;
    }

    return (data || []).map((meal: any) => ({
      id: meal.id,
      user_id: meal.user_id,
      name: meal.name,
      created_at: meal.created_at,
      updated_at: meal.updated_at,
      items: (meal.saved_meal_items || [])
        .slice()
        .sort((a: any, b: any) => num(a.item_order) - num(b.item_order))
        .map((item: any) => ({
          id: item.id,
          food_item_id: item.food_item_id,
          servings: num(item.servings) || 1,
          item_order: num(item.item_order),
          food_item: mapFood((item.food_items ?? item.food_item) as Record<string, unknown>),
        })),
    }));
  }

  async saveMealFromLogs(name: string, logs: MealLogWithFood[]): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (logs.length === 0) throw new Error('Nothing to save');

    const { data: meal, error: mealError } = await supabase
      .from('saved_meals')
      .insert({ user_id: user.id, name })
      .select('id')
      .single();

    if (mealError) throw mealError;

    const items = logs.map((log, index) => ({
      saved_meal_id: meal.id,
      food_item_id: log.food_item_id,
      servings: log.servings,
      item_order: index,
    }));

    const { error: itemError } = await supabase.from('saved_meal_items').insert(items);
    if (itemError) {
      await supabase.from('saved_meals').delete().eq('id', meal.id).eq('user_id', user.id);
      throw itemError;
    }
  }

  async addSavedMealLog(savedMeal: SavedMeal, mealType: MealType, date: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (savedMeal.items.length === 0) return;

    const rows = savedMeal.items.map((item) => ({
      user_id: user.id,
      food_item_id: item.food_item_id,
      meal_type: mealType,
      servings: item.servings,
      logged_date: date,
    }));

    const { error } = await supabase.from('meal_logs').insert(rows);
    if (error) throw error;
  }

  async renameSavedMeal(id: string, name: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const trimmed = name.trim();
    if (trimmed.length < 1) throw new Error('Meal name is required');

    const { error } = await supabase
      .from('saved_meals')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async deleteSavedMeal(id: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('saved_meals').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
  }

  async updateSavedMealItemServings(itemId: string, servings: number): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (!Number.isFinite(servings) || servings <= 0 || servings > 50) {
      throw new Error('Servings must be between 0 and 50');
    }

    const { error } = await supabase.from('saved_meal_items').update({ servings }).eq('id', itemId);
    if (error) throw error;
  }

  async deleteSavedMealItem(itemId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('saved_meal_items').delete().eq('id', itemId);
    if (error) throw error;
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
      fiber_g: 25,
      water_ml_goal: 2500,
    };
    const { data, error } = await supabase.from('nutrition_goals').insert(defaults).select('*').single();
    if (error) throw error;
    return data as NutritionGoals;
  }

  async saveGoals(input: Partial<Pick<NutritionGoals, 'calories_goal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g' | 'water_ml_goal'>>): Promise<NutritionGoals> {
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
          fiber_g: input.fiber_g ?? 25,
          water_ml_goal: input.water_ml_goal ?? 2500,
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
        `id,user_id,food_item_id,logged_date,meal_type,servings, food_items(${FOOD_SELECT})`,
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

  async getRecentFoods(limit = 8): Promise<RecentFoodLog[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('meal_logs')
      .select(
        `food_item_id,logged_date,meal_type,servings,created_at, food_items(${FOOD_SELECT})`,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) {
      logger.error('getRecentFoods', error);
      throw error;
    }

    const seen = new Set<string>();
    const recent: RecentFoodLog[] = [];
    for (const row of data || []) {
      const item = row as any;
      const foodId = String(item.food_item_id);
      if (seen.has(foodId)) continue;
      seen.add(foodId);
      recent.push({
        food_item: mapFood((item.food_items ?? item.food_item) as Record<string, unknown>),
        last_meal_type: item.meal_type as MealType,
        last_servings: num(item.servings) || 1,
        last_logged_date: String(item.logged_date),
      });
      if (recent.length >= limit) break;
    }

    return recent;
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
        acc.fiber_g += f.fiber_g * s;
        return acc;
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, water_ml: 0 },
    );
  }

  async getDayTotals(date: string): Promise<DayTotals> {
    const [logs, waterMl] = await Promise.all([this.getLogsForDate(date), this.getWaterTotal(date)]);
    return { ...this.computeTotals(logs), water_ml: waterMl };
  }

  async getWaterTotal(date: string): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase
      .from('water_logs')
      .select('amount_ml')
      .eq('user_id', user.id)
      .eq('logged_date', date);

    if (error) {
      logger.error('getWaterTotal', error);
      throw error;
    }

    return (data || []).reduce((total, row: any) => total + num(row.amount_ml), 0);
  }

  async addWaterLog(amountMl: number, date: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('water_logs').insert({
      user_id: user.id,
      amount_ml: amountMl,
      logged_date: date,
    });
    if (error) throw error;
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

  async getWeeklySummary(endDate: string, goals: NutritionGoals): Promise<WeeklyNutritionSummary> {
    const end = new Date(`${endDate}T12:00:00`);
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(end);
      date.setDate(end.getDate() - (6 - index));
      return date.toISOString().slice(0, 10);
    });

    const totals = await Promise.all(dates.map((date) => this.getDayTotals(date)));
    const tracked = totals.filter((day) => day.calories > 0 || day.water_ml > 0);
    const divisor = Math.max(1, tracked.length || totals.length);

    return {
      average_calories: Math.round(totals.reduce((sum, day) => sum + day.calories, 0) / divisor),
      protein_days_hit: totals.filter((day) => day.protein_g >= goals.protein_g).length,
      water_days_hit: totals.filter((day) => day.water_ml >= goals.water_ml_goal).length,
      fiber_days_hit: totals.filter((day) => day.fiber_g >= goals.fiber_g).length,
      tracked_days: tracked.length,
    };
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
