import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are a strict image analyst for fitness body measurements.

You must ONLY return estimates when the image clearly shows ONE adult standing in a full-body view (head to feet), facing roughly toward the camera, with limbs visible enough to judge proportions. You are NOT a precision measuring device — you infer rough circumferences from visible proportions and the given height.

If the image is a face-only selfie, headshot, mirror crop without legs, sitting pose hiding legs, lying down, multiple people, animal, object, screenshot, too dark/blurry, or the body is mostly covered by loose clothing so proportions cannot be judged: you MUST set suitable_for_body_measurement to false and give a short unsuitable_reason. Do NOT invent measurements to please the user.

Always respond with ONLY one JSON object matching the schema in the user message.`;

const USER_PROMPT = `The person's reference height (from their profile, not detected from the image) is {HEIGHT_CM} cm.

Return ONLY this JSON shape (no markdown, no backticks):
{
  "suitable_for_body_measurement": true or false,
  "confidence": number from 0 to 1 (how sure you are that the image is usable),
  "unsuitable_reason": "short English reason if suitable is false, else empty string",
  "measurements": {
    "shoulder_width": 0,
    "chest": 0,
    "waist": 0,
    "hips": 0,
    "left_arm": 0,
    "right_arm": 0,
    "left_thigh": 0,
    "right_thigh": 0
  }
}

Rules when suitable_for_body_measurement is true:
- Fill measurements in centimeters; realistic adults; round to 1 decimal; left/right may differ slightly.
- confidence must be at least 0.65 when suitable is true; if you are unsure, set suitable to false instead.
- Use the reference height only as scale for proportions — do not output height in measurements.

When suitable_for_body_measurement is false:
- Set measurements to zeros or omit numeric fields; unsuitable_reason must explain why (e.g. "Face only — full body required").`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { image_base64, user_height_cm } = await req.json();

    if (!image_base64 || !user_height_cm) {
      return new Response(
        JSON.stringify({ error: 'image_base64 and user_height_cm are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const heightNum = Number(user_height_cm);
    if (!Number.isFinite(heightNum) || heightNum < 80 || heightNum > 280) {
      return new Response(
        JSON.stringify({ error: 'user_height_cm must be a realistic height in cm (80–280).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const b64 = String(image_base64).replace(/^data:image\/\w+;base64,/, '');
    if (b64.length < 800) {
      return new Response(
        JSON.stringify({ error: 'Image payload is too small to be a useful photo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (b64.length > 12_000_000) {
      return new Response(
        JSON.stringify({ error: 'Image is too large. Try a lower camera quality setting.' }),
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

    const prompt = USER_PROMPT.replace('{HEIGHT_CM}', String(heightNum));

    const imageDataUrl = (() => {
      const head = b64.slice(0, 24);
      if (head.startsWith('/9j') || head.startsWith('iVBOR')) {
        return head.startsWith('iVBOR') ? `data:image/png;base64,${b64}` : `data:image/jpeg;base64,${b64}`;
      }
      return `data:image/jpeg;base64,${b64}`;
    })();

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
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
        temperature: 0.35,
        max_tokens: 320,
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

    let parsed: Record<string, unknown>;
    try {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response. Try a clearer photo.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const suitable = parsed.suitable_for_body_measurement === true;
    const confidence = Number(parsed.confidence);
    const reasonRaw = typeof parsed.unsuitable_reason === 'string' ? parsed.unsuitable_reason.trim() : '';

    if (!suitable) {
      const msg =
        reasonRaw ||
        'This photo does not show your full body clearly enough. Stand back so head-to-feet are visible, good lighting, one person.';
      return new Response(JSON.stringify({ error: msg }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!Number.isFinite(confidence) || confidence < 0.65) {
      return new Response(
        JSON.stringify({
          error:
            reasonRaw ||
            'Confidence in this photo was too low. Use a full-body shot, even lighting, and plain fitted clothing if possible.',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const rawMeasurements = parsed.measurements;
    if (!rawMeasurements || typeof rawMeasurements !== 'object' || Array.isArray(rawMeasurements)) {
      return new Response(
        JSON.stringify({ error: 'Invalid measurement data from AI. Try again with a full-body photo.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const fields = ['shoulder_width', 'chest', 'waist', 'hips', 'left_arm', 'right_arm', 'left_thigh', 'right_thigh'];
    const valid: Record<string, number> = {};
    for (const f of fields) {
      const v = Number((rawMeasurements as Record<string, unknown>)[f]);
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

    const heightCm = Math.round(heightNum * 10) / 10;

    const { data: saved, error: saveError } = await supabaseUser
      .from('body_measurements')
      .insert({
        user_id: user.id,
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
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
