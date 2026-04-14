import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are a fitness body measurement estimator. When given a full-body photo and the person's height, estimate their body measurements in centimeters. Return ONLY a JSON object, no explanation.`;

const USER_PROMPT = `Analyze this full-body photo. The person's height is {HEIGHT_CM} cm.

Estimate these measurements in centimeters and return ONLY this JSON:
{"shoulder_width": 0, "chest": 0, "waist": 0, "hips": 0, "left_arm": 0, "right_arm": 0, "left_thigh": 0, "right_thigh": 0}

Rules: realistic adult values, round to 1 decimal, left/right can differ slightly. ONLY JSON, nothing else.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image_base64, user_height_cm, user_id } = await req.json();

    if (!image_base64 || !user_height_cm) {
      return new Response(
        JSON.stringify({ error: 'image_base64 and user_height_cm are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY is not configured. Add it in Supabase Dashboard > Edge Functions > Secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const prompt = USER_PROMPT.replace('{HEIGHT_CM}', String(user_height_cm));

    const groqResp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${image_base64}` },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 256,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqResp.ok) {
      const errText = await groqResp.text();
      return new Response(
        JSON.stringify({ error: `AI error (${groqResp.status}): ${errText.slice(0, 400)}` }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const groqResult = await groqResp.json();
    const rawText = groqResult?.choices?.[0]?.message?.content;

    if (!rawText) {
      return new Response(
        JSON.stringify({ error: 'No AI response. Try again with a clearer full-body photo.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let measurements: Record<string, number>;
    try {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      measurements = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response. Try a clearer photo.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const fields = ['shoulder_width', 'chest', 'waist', 'hips', 'left_arm', 'right_arm', 'left_thigh', 'right_thigh'];
    const valid: Record<string, number> = {};
    for (const f of fields) {
      const v = Number(measurements[f]);
      if (!Number.isNaN(v) && v > 0 && v < 300) {
        valid[f] = Math.round(v * 10) / 10;
      }
    }

    if (Object.keys(valid).length < 4) {
      return new Response(
        JSON.stringify({ error: 'Could not estimate enough measurements. Ensure full body is visible.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const heightCm = Math.round(Number(user_height_cm) * 10) / 10;

    const { data: saved, error: saveError } = await supabase
      .from('body_measurements')
      .insert({
        user_id,
        measurement_date: new Date().toISOString().split('T')[0],
        height_cm: heightCm,
        ...valid,
        source: 'ai',
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({ success: true, measurements: valid, record: saved }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
