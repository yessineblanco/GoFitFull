import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const A4_HEIGHT_CM = 29.7;
const MIN_HEIGHT_CM = 80;
const MAX_HEIGHT_CM = 280;
const MIN_CONFIDENCE = 0.65;
/** If both profile height and A4 estimate are present, reject when they diverge more than this (cm). */
const REFERENCE_VS_PROFILE_MAX_DELTA_CM = 20;

type HeightMode = 'profile' | 'reference_a4';

const SYSTEM_PROMPT = `You are a strict image analyst for fitness body measurements.

You must ONLY return estimates when the image clearly shows ONE adult standing in a full-body view (head to feet), facing roughly toward the camera, with limbs visible enough to judge proportions. You are NOT a precision measuring device — you infer rough circumferences from visible proportions and the given height.

If the image is a face-only selfie, headshot, mirror crop without legs, sitting pose hiding legs, lying down, multiple people, animal, object, screenshot, too dark/blurry, or the body is mostly covered by loose clothing so proportions cannot be judged: you MUST set suitable_for_body_measurement to false and give a short unsuitable_reason. Do NOT invent measurements to please the user.

Always respond with ONLY one JSON object matching the schema in the user message.`;

const USER_PROMPT = `The person's reference height for this scan is {HEIGHT_CM} cm.

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

const GEOMETRY_SYSTEM_PROMPT = `You are a strict geometry checker for a full-body fitness photo.

Task:
1) Decide if this image is usable for body measurement.
2) Detect whether a standard A4 sheet is clearly visible and vertical.
3) Estimate two vertical spans in the SAME image axis:
   - person_vertical_span_px: head-top to lowest visible foot point.
   - reference_vertical_span_px: visible long-edge span of the A4 sheet.

Rules:
- Return suitable_for_body_measurement=false if body is not fully visible, image is unclear, multiple people, or A4 is not clearly visible and vertical.
- If unsuitable, still return a JSON object with reason and zeros for spans.
- Do not return markdown or prose. Return JSON only.`;

const GEOMETRY_USER_PROMPT = `Return ONLY this JSON shape:
{
  "suitable_for_body_measurement": true or false,
  "confidence": number from 0 to 1,
  "unsuitable_reason": "short reason if false, else empty string",
  "reference_a4_visible": true or false,
  "reference_vertical_span_px": 0,
  "person_vertical_span_px": 0
}

Interpretation constraints:
- A4 reference is a normal paper sheet, use the visible long edge only.
- If the paper is too tilted, too far from body plane, or occluded, set suitable_for_body_measurement=false.
- Spans should be positive numbers only when suitable_for_body_measurement=true.`;

const MEASUREMENT_FIELDS = [
  'shoulder_width',
  'chest',
  'waist',
  'hips',
  'left_arm',
  'right_arm',
  'left_thigh',
  'right_thigh',
] as const;

type GroqJson = Record<string, unknown>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseGroqJson(rawText: unknown): GroqJson | null {
  if (typeof rawText !== 'string' || !rawText.trim()) return null;
  try {
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function callGroqJson(
  apiKey: string,
  imageDataUrl: string,
  userText: string,
  systemText: string,
  maxTokens: number,
): Promise<{ ok: true; parsed: GroqJson } | { ok: false; status: number; error: string }> {
  const groqResp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemText },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.35,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!groqResp.ok) {
    const errText = await groqResp.text();
    return {
      ok: false,
      status: 422,
      error: `AI error (${groqResp.status}): ${errText.slice(0, 400)}`,
    };
  }

  const groqResult = await groqResp.json();
  const parsed = parseGroqJson(groqResult?.choices?.[0]?.message?.content);
  if (!parsed) {
    return { ok: false, status: 422, error: 'Failed to parse AI response. Try a clearer photo.' };
  }

  return { ok: true, parsed };
}

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

    const { image_base64, user_height_cm, height_mode } = await req.json();
    const mode: HeightMode = height_mode === 'reference_a4' ? 'reference_a4' : 'profile';

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: 'image_base64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let profileHeightCm: number | null = null;
    if (user_height_cm != null) {
      const heightNum = Number(user_height_cm);
      if (!Number.isFinite(heightNum) || heightNum < MIN_HEIGHT_CM || heightNum > MAX_HEIGHT_CM) {
        return jsonResponse({ error: 'user_height_cm must be a realistic height in cm (80–280).' }, 400);
      }
      profileHeightCm = Math.round(heightNum * 10) / 10;
    }
    if (mode === 'profile' && profileHeightCm == null) {
      return jsonResponse({ error: 'user_height_cm is required in profile mode.' }, 400);
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
      return jsonResponse(
        { error: 'GROQ_API_KEY is not configured. Add it in Supabase Dashboard > Edge Functions > Secrets.' },
        500,
      );
    }

    const imageDataUrl = (() => {
      const head = b64.slice(0, 24);
      if (head.startsWith('/9j') || head.startsWith('iVBOR')) {
        return head.startsWith('iVBOR') ? `data:image/png;base64,${b64}` : `data:image/jpeg;base64,${b64}`;
      }
      return `data:image/jpeg;base64,${b64}`;
    })();

    let effectiveHeightCm = profileHeightCm;
    if (mode === 'reference_a4') {
      const geometry = await callGroqJson(apiKey, imageDataUrl, GEOMETRY_USER_PROMPT, GEOMETRY_SYSTEM_PROMPT, 220);
      if (!geometry.ok) return jsonResponse({ error: geometry.error }, geometry.status);

      const geo = geometry.parsed;
      const suitable = geo.suitable_for_body_measurement === true;
      const confidence = Number(geo.confidence);
      const reasonRaw = typeof geo.unsuitable_reason === 'string' ? geo.unsuitable_reason.trim() : '';
      const refVisible = geo.reference_a4_visible === true;
      const personSpanPx = Number(geo.person_vertical_span_px);
      const refSpanPx = Number(geo.reference_vertical_span_px);

      if (!suitable || !refVisible) {
        return jsonResponse(
          {
            error:
              reasonRaw ||
              'A4 reference was not detected clearly. Keep one full body in frame and hold an A4 sheet vertically beside you.',
          },
          422,
        );
      }
      if (!Number.isFinite(confidence) || confidence < MIN_CONFIDENCE) {
        return jsonResponse(
          { error: 'Confidence was too low. Use better light and keep full body + A4 clearly visible.' },
          422,
        );
      }
      if (!Number.isFinite(personSpanPx) || !Number.isFinite(refSpanPx) || personSpanPx <= 0 || refSpanPx <= 0) {
        return jsonResponse({ error: 'Could not read body and A4 spans. Try a clearer full-body photo.' }, 422);
      }

      const spanRatio = personSpanPx / refSpanPx;
      if (spanRatio < 4 || spanRatio > 8) {
        return jsonResponse(
          { error: 'A4 scale looked inconsistent. Keep the paper vertical and close to your body plane.' },
          422,
        );
      }

      const estimatedHeightCm = Math.round(spanRatio * A4_HEIGHT_CM * 10) / 10;
      if (estimatedHeightCm < MIN_HEIGHT_CM || estimatedHeightCm > MAX_HEIGHT_CM) {
        return jsonResponse({ error: 'Estimated height was unrealistic. Retake with clearer A4 reference.' }, 422);
      }
      if (profileHeightCm != null) {
        const delta = Math.abs(estimatedHeightCm - profileHeightCm);
        if (delta > REFERENCE_VS_PROFILE_MAX_DELTA_CM) {
          return jsonResponse(
            {
              error:
                `Height from the A4 photo (~${estimatedHeightCm} cm) is far from your profile height (${profileHeightCm} cm). ` +
                  'Check that the sheet is vertical, fully visible, and about the same distance from the camera as your body—or update your profile height.',
            },
            422,
          );
        }
      }
      effectiveHeightCm = estimatedHeightCm;
    }

    if (effectiveHeightCm == null) {
      return jsonResponse({ error: 'Could not determine a valid reference height.' }, 422);
    }

    const prompt = USER_PROMPT.replace('{HEIGHT_CM}', String(effectiveHeightCm));
    const measurement = await callGroqJson(apiKey, imageDataUrl, prompt, SYSTEM_PROMPT, 320);
    if (!measurement.ok) return jsonResponse({ error: measurement.error }, measurement.status);
    const parsed = measurement.parsed;

    const suitable = parsed.suitable_for_body_measurement === true;
    const confidence = Number(parsed.confidence);
    const reasonRaw = typeof parsed.unsuitable_reason === 'string' ? parsed.unsuitable_reason.trim() : '';

    if (!suitable) {
      const msg =
        reasonRaw ||
        'This photo does not show your full body clearly enough. Stand back so head-to-feet are visible, good lighting, one person.';
      return jsonResponse({ error: msg }, 422);
    }

    if (!Number.isFinite(confidence) || confidence < MIN_CONFIDENCE) {
      return jsonResponse(
        {
          error:
            reasonRaw ||
            'Confidence in this photo was too low. Use a full-body shot, even lighting, and plain fitted clothing if possible.',
        },
        422,
      );
    }

    const rawMeasurements = parsed.measurements;
    if (!rawMeasurements || typeof rawMeasurements !== 'object' || Array.isArray(rawMeasurements)) {
      return jsonResponse({ error: 'Invalid measurement data from AI. Try again with a full-body photo.' }, 422);
    }

    const valid: Record<string, number> = {};
    for (const f of MEASUREMENT_FIELDS) {
      const v = Number((rawMeasurements as Record<string, unknown>)[f]);
      if (!Number.isNaN(v) && v > 0 && v < 300) {
        valid[f] = Math.round(v * 10) / 10;
      }
    }

    if (Object.keys(valid).length < 4) {
      return jsonResponse({ error: 'Could not estimate enough measurements. Ensure full body is visible.' }, 422);
    }

    const heightCm = Math.round(effectiveHeightCm * 10) / 10;

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
      JSON.stringify({ success: true, measurements: valid, record: saved, height_mode: mode }),
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
