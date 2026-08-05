import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type FoodItemRow = {
  id: string;
  barcode: string | null;
  food_source: string | null;
  source_id: string | null;
  source_url: string | null;
  source_checked_at: string | null;
  name: string;
  serving_label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

type OpenFoodFactsProduct = {
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  nutriments?: Record<string, unknown>;
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });

function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function barcodeCandidates(barcode: string): string[] {
  const code = barcode.replace(/\D/g, '');
  if (code.length < 6) return [];

  return Array.from(new Set([
    code,
    code.length === 12 ? `0${code}` : '',
    code.length === 13 && code.startsWith('0') ? code.slice(1) : '',
  ].filter(Boolean)));
}

function normalizeProduct(barcode: string, product: OpenFoodFactsProduct) {
  const nutriments = product.nutriments ?? {};
  const name = product.product_name || product.product_name_en || product.generic_name || product.brands;
  if (!name) return null;

  return {
    barcode,
    food_source: 'open_food_facts',
    source_id: barcode,
    source_url: `https://world.openfoodfacts.org/product/${barcode}`,
    source_checked_at: new Date().toISOString(),
    name: String(name).trim(),
    serving_label: '100 g',
    calories: toNum(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal']),
    protein_g: toNum(nutriments.proteins_100g ?? nutriments.proteins),
    carbs_g: toNum(nutriments.carbohydrates_100g ?? nutriments.carbohydrates),
    fat_g: toNum(nutriments.fat_100g ?? nutriments.fat),
    fiber_g: toNum(nutriments.fiber_100g ?? nutriments.fiber),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { barcode } = await req.json();
    const candidates = barcodeCandidates(String(barcode ?? ''));

    if (candidates.length === 0) {
      return jsonResponse({ food: null, source: 'invalid' }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase credentials are not configured' }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Invalid user session' }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: existing, error: existingError } = await supabase
      .from('food_items')
      .select('id,barcode,food_source,source_id,source_url,source_checked_at,name,serving_label,calories,protein_g,carbs_g,fat_g,fiber_g')
      .in('barcode', candidates)
      .limit(1);

    if (existingError) throw existingError;
    if (existing?.[0]) {
      return jsonResponse({ food: existing[0] as FoodItemRow, source: 'cache' });
    }

    const canonicalBarcode = candidates[0];
    const fields = 'product_name,product_name_en,generic_name,brands,nutriments';
    const offUrl = `https://world.openfoodfacts.org/api/v2/product/${canonicalBarcode}.json?fields=${fields}`;
    const offResponse = await fetch(offUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GoFit/1.0 barcode lookup (contact: support@gofit.app)',
      },
    });

    if (!offResponse.ok) {
      return jsonResponse({ food: null, source: 'provider_error' }, 502);
    }

    const offData = await offResponse.json();
    if (offData.status !== 1 || !offData.product) {
      return jsonResponse({ food: null, source: 'not_found' });
    }

    const normalized = normalizeProduct(canonicalBarcode, offData.product as OpenFoodFactsProduct);
    if (!normalized) {
      return jsonResponse({ food: null, source: 'incomplete' });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('food_items')
      .insert(normalized)
      .select('id,barcode,food_source,source_id,source_url,source_checked_at,name,serving_label,calories,protein_g,carbs_g,fat_g,fiber_g')
      .single();

    if (insertError) {
      const { data: cachedAfterRace, error: raceError } = await supabase
        .from('food_items')
        .select('id,barcode,food_source,source_id,source_url,source_checked_at,name,serving_label,calories,protein_g,carbs_g,fat_g,fiber_g')
        .in('barcode', candidates)
        .limit(1);

      if (raceError) throw raceError;
      if (cachedAfterRace?.[0]) {
        return jsonResponse({ food: cachedAfterRace[0] as FoodItemRow, source: 'cache' });
      }
      throw insertError;
    }

    return jsonResponse({ food: inserted as FoodItemRow, source: 'open_food_facts' });
  } catch (error) {
    console.error('food-barcode-lookup error', error);
    return jsonResponse({ error: 'Barcode lookup failed' }, 500);
  }
});
