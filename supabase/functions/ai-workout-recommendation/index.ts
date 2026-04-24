import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type ExerciseRow = {
  id: string;
  name: string;
  category: string | null;
  muscle_groups: string[] | null;
  equipment: string[] | null;
  difficulty: string | null;
  default_sets: number | null;
  default_reps: number | null;
  default_rest_time: number | null;
  image_url: string | null;
};

type GeneratedExercise = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  restTime: string;
  image?: string;
  category?: string;
  muscle_groups?: string[];
  equipment?: string[];
  difficulty?: string;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const extractJson = (text: string) => {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response did not include JSON');
  return JSON.parse(match[0]);
};

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

    const userId = userData.user.id;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: profile }, { data: sessions }, { data: exercises, error: exercisesError }] =
      await Promise.all([
        supabase
          .from('user_profiles')
          .select('goal, activity_level, age, gender')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('workout_sessions')
          .select('date, started_at, completed_at, exercises_completed, workouts(name, difficulty)')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(8),
        supabase
          .from('exercises')
          .select('id, name, category, muscle_groups, equipment, difficulty, default_sets, default_reps, default_rest_time, image_url')
          .order('name', { ascending: true })
          .limit(120),
      ]);

    if (exercisesError) throw exercisesError;
    if (!exercises || exercises.length < 3) {
      return jsonResponse({ error: 'Not enough exercises are available to build a workout' }, 400);
    }

    const exerciseCatalog = (exercises as ExerciseRow[]).map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      muscles: exercise.muscle_groups || [],
      equipment: exercise.equipment || [],
      difficulty: exercise.difficulty,
      defaults: {
        sets: exercise.default_sets || 3,
        reps: exercise.default_reps || 10,
        restTime: exercise.default_rest_time || 60,
      },
    }));

    const prompt = [
      'Create one personalized custom workout for a GoFit mobile user.',
      'Use ONLY exercises from the provided exercise catalog. Do not invent exercise IDs.',
      'Prefer 5 to 7 exercises. Make it practical for one session.',
      'Return JSON only with this exact shape:',
      '{"name":"string","focus":"string","reason":"string","exercises":[{"id":"uuid from catalog","sets":"string number","reps":"string such as 10 or 12,10,8","restTime":"seconds as string"}]}',
      '',
      `User profile: ${JSON.stringify(profile || {})}`,
      `Recent completed sessions: ${JSON.stringify(sessions || [])}`,
      `Exercise catalog: ${JSON.stringify(exerciseCatalog)}`,
    ].join('\n');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a careful fitness programming assistant. Return valid JSON only and only use exercise IDs from the provided catalog.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!groqResponse.ok) {
      const body = await groqResponse.text();
      return jsonResponse({ error: 'Groq request failed', details: body }, 502);
    }

    const groqJson = await groqResponse.json();
    const content = groqJson.choices?.[0]?.message?.content;
    if (!content) {
      return jsonResponse({ error: 'Groq returned an empty response' }, 502);
    }

    const generated = extractJson(content);
    const exerciseMap = new Map((exercises as ExerciseRow[]).map((exercise) => [exercise.id, exercise]));
    const generatedExercises = Array.isArray(generated.exercises) ? generated.exercises : [];
    const validExercises = generatedExercises
      .map((item: any) => {
        const source = exerciseMap.get(String(item.id));
        if (!source) return null;

        return {
          id: source.id,
          name: source.name,
          sets: String(item.sets || source.default_sets || 3),
          reps: String(item.reps || source.default_reps || 10),
          restTime: String(item.restTime || source.default_rest_time || 60),
          image: source.image_url || undefined,
          category: source.category || undefined,
          muscle_groups: source.muscle_groups || undefined,
          equipment: source.equipment || undefined,
          difficulty: source.difficulty || undefined,
        };
      })
      .filter((exercise: GeneratedExercise | null): exercise is GeneratedExercise => exercise !== null)
      .slice(0, 8);

    if (validExercises.length < 3) {
      return jsonResponse({ error: 'AI response did not include enough valid catalog exercises' }, 502);
    }

    return jsonResponse({
      name: String(generated.name || 'AI Custom Workout').slice(0, 80),
      difficulty: 'Custom',
      focus: String(generated.focus || 'Personalized training'),
      reason: String(generated.reason || 'Built from your profile, recent workouts, and the exercise library.'),
      image_url: validExercises[0]?.image || null,
      exercises: validExercises,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
