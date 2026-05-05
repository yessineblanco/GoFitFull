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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const { barcode } = await req.json();
    const candidates = barcodeCandidates(String(barcode ?? ''));

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ food: null, source: 'invalid' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Supabase service role is not configured' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: existing, error: existingError } = await supabase
      .from('food_items')
      .select('id,barcode,food_source,source_id,source_url,source_checked_at,name,serving_label,calories,protein_g,carbs_g,fat_g,fiber_g')
      .in('barcode', candidates)
      .limit(1);

    if (existingError) throw existingError;
    if (existing?.[0]) {
      return new Response(JSON.stringify({ food: existing[0] as FoodItemRow, source: 'cache' }), {
        headers: jsonHeaders,
      });
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
      return new Response(JSON.stringify({ food: null, source: 'provider_error' }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const offData = await offResponse.json();
    if (offData.status !== 1 || !offData.product) {
      return new Response(JSON.stringify({ food: null, source: 'not_found' }), {
        headers: jsonHeaders,
      });
    }

    const normalized = normalizeProduct(canonicalBarcode, offData.product as OpenFoodFactsProduct);
    if (!normalized) {
      return new Response(JSON.stringify({ food: null, source: 'incomplete' }), {
        headers: jsonHeaders,
      });
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
        return new Response(JSON.stringify({ food: cachedAfterRace[0] as FoodItemRow, source: 'cache' }), {
          headers: jsonHeaders,
        });
      }
      throw insertError;
    }

    return new Response(JSON.stringify({ food: inserted as FoodItemRow, source: 'open_food_facts' }), {
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error('food-barcode-lookup error', error);
    return new Response(JSON.stringify({ error: 'Barcode lookup failed' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
