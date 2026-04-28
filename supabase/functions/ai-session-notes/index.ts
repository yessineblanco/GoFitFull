import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      return jsonResponse({ error: 'GROQ_API_KEY is not configured' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const clientId = asString(body.client_id);
    const force = Boolean(body.force);
    if (!clientId) {
      return jsonResponse({ error: 'client_id is required' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Invalid user session' }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const userId = userData.user.id;

    const { data: coachProfile, error: coachError } = await supabase
      .from('coach_profiles')
      .select('id, user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (coachError) throw coachError;
    if (!coachProfile?.id) {
      return jsonResponse({ error: 'Authenticated user is not a coach' }, 403);
    }

    const [{ data: bookingRows }, { data: packRows }] = await Promise.all([
      supabase
        .from('bookings')
        .select('id')
        .eq('coach_id', coachProfile.id)
        .eq('client_id', clientId)
        .limit(1),
      supabase
        .from('purchased_packs')
        .select('id')
        .eq('coach_id', coachProfile.id)
        .eq('client_id', clientId)
        .limit(1),
    ]);

    if (!bookingRows?.length && !packRows?.length) {
      return jsonResponse({ error: 'No coaching relationship with this client' }, 403);
    }

    if (!force) {
      const { data: cached, error: cacheError } = await supabase
        .from('ai_session_notes')
        .select('id, summary, context, generated_by, created_at, expires_at')
        .eq('coach_id', coachProfile.id)
        .eq('client_id', clientId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cacheError) throw cacheError;
      if (cached) {
        return jsonResponse({ ...cached, cached: true });
      }
    }

    const [{ data: clientProfile }, { data: sessions }, { data: notes }] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('display_name, goal, activity_level, age, gender')
        .eq('id', clientId)
        .maybeSingle(),
      supabase
        .from('workout_sessions')
        .select('id, started_at, completed_at, duration_minutes, exercises_completed, workouts(name, difficulty)')
        .eq('user_id', clientId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(8),
      supabase
        .from('coach_client_notes')
        .select('note, updated_at')
        .eq('coach_id', coachProfile.id)
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false })
        .limit(5),
    ]);

    const prompt = [
      'Create a concise pre-session briefing for a fitness coach.',
      'Use only the data provided. Do not invent injuries, diagnoses, or private facts.',
      'Write in plain text with short sections:',
      '1. Recent training',
      '2. Consistency and load',
      '3. Wins or possible PRs',
      '4. Coach attention points',
      '5. Suggested next-session focus',
      'Keep it under 220 words.',
      '',
      `Client profile: ${JSON.stringify(clientProfile || {})}`,
      `Recent completed sessions: ${JSON.stringify(sessions || [])}`,
      `Private coach notes: ${JSON.stringify(notes || [])}`,
    ].join('\n');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.25,
        messages: [
          {
            role: 'system',
            content:
              'You are a careful coaching assistant. Summarize training context for a coach without medical advice or invented details.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!groqResponse.ok) {
      const details = await groqResponse.text();
      return jsonResponse({ error: 'Groq request failed', details }, 502);
    }

    const groqJson = await groqResponse.json();
    const summary = asString(groqJson.choices?.[0]?.message?.content).trim();
    if (!summary) {
      return jsonResponse({ error: 'Groq returned an empty summary' }, 502);
    }

    const context = {
      session_count: sessions?.length || 0,
      notes_count: notes?.length || 0,
      generated_at: new Date().toISOString(),
    };

    const { data: note, error: insertError } = await supabase
      .from('ai_session_notes')
      .insert({
        coach_id: coachProfile.id,
        client_id: clientId,
        summary,
        context,
        generated_by: 'groq',
      })
      .select('id, summary, context, generated_by, created_at, expires_at')
      .single();

    if (insertError) throw insertError;

    return jsonResponse({ ...note, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
