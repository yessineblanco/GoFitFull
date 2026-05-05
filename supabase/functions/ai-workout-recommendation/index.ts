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

type ReadinessRow = {
  date: string;
  score: number;
  level: 'low' | 'moderate' | 'high';
  recommendation: string | null;
  inputs: Record<string, unknown> | null;
};

type HealthRow = {
  date: string;
  steps: number | null;
  active_calories: number | null;
  sleep_minutes: number | null;
  resting_heart_rate: number | null;
  hrv_rmssd_ms: number | null;
};

type WorkoutSessionRow = {
  date: string | null;
  started_at: string | null;
  completed_at: string | null;
  exercises_completed: number | null;
  workouts: { name: string | null; difficulty: string | null } | null;
};

type CustomProgramRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  updated_at: string;
};

type ActivePackRow = {
  id: string;
  coach_id: string;
  sessions_remaining: number;
  expires_at: string | null;
};

type AdaptiveContext = {
  readinessLevel: 'unknown' | 'low' | 'moderate' | 'high';
  readinessScore: number | null;
  daysSinceLastWorkout: number | null;
  volumeAdjustment: 'reduce' | 'maintain' | 'increase';
  intensityGuidance: string;
  rationale: string;
  constraints: string[];
  recovery: {
    sleepMinutes: number | null;
    restingHeartRate: number | null;
    hrvRmssdMs: number | null;
  };
  coachContext: {
    hasAssignedProgram: boolean;
    hasActivePack: boolean;
    programTitle: string | null;
    guidance: string;
  };
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

const getDaysSinceLastWorkout = (sessions: WorkoutSessionRow[] | null | undefined) => {
  const lastSession = sessions?.find((session) => session.completed_at || session.date);
  const lastDate = lastSession?.completed_at || lastSession?.date;
  if (!lastDate) return null;

  const parsed = new Date(lastDate);
  if (Number.isNaN(parsed.getTime())) return null;

  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

const computeAdaptiveContext = (
  readiness: ReadinessRow | null | undefined,
  health: HealthRow | null | undefined,
  sessions: WorkoutSessionRow[] | null | undefined,
  assignedProgram: CustomProgramRow | null | undefined,
  activePack: ActivePackRow | null | undefined
): AdaptiveContext => {
  const readinessLevel = readiness?.level || 'unknown';
  const daysSinceLastWorkout = getDaysSinceLastWorkout(sessions);
  const constraints: string[] = [];
  let volumeAdjustment: AdaptiveContext['volumeAdjustment'] = 'maintain';
  let intensityGuidance = 'Use moderate working sets and leave 1 to 2 reps in reserve.';
  let rationale = 'Balanced session based on recent training history.';

  if (readinessLevel === 'low') {
    volumeAdjustment = 'reduce';
    intensityGuidance = 'Lower intensity and volume. Prefer technique, mobility, and longer rests.';
    rationale = readiness?.recommendation || 'Readiness is low today, so the session should protect recovery.';
    constraints.push('Use 3 to 5 exercises', 'Avoid maximal sets', 'Prefer lower skill or lower load options');
  } else if (readinessLevel === 'high' && daysSinceLastWorkout !== null && daysSinceLastWorkout <= 2) {
    volumeAdjustment = 'increase';
    intensityGuidance = 'Slightly higher volume is acceptable while keeping form quality high.';
    rationale = 'Readiness is high and training rhythm is current.';
    constraints.push('Use 5 to 7 exercises', 'Progress volume conservatively');
  }

  if (daysSinceLastWorkout !== null && daysSinceLastWorkout >= 4 && volumeAdjustment !== 'reduce') {
    volumeAdjustment = 'maintain';
    intensityGuidance = 'Build a moderate catch-up workout instead of a punishing session.';
    rationale = `It has been ${daysSinceLastWorkout} days since the last completed workout, so restart momentum gradually.`;
    constraints.push('Prefer full-body basics', 'Avoid making up missed volume all at once');
  }

  if (health?.sleep_minutes !== null && health?.sleep_minutes !== undefined && health.sleep_minutes < 360) {
    volumeAdjustment = 'reduce';
    intensityGuidance = 'Reduce intensity because recent sleep is short.';
    rationale = 'Recent sleep is below 6 hours, so the workout should be recovery-aware.';
    constraints.push('Keep rest periods generous');
  }

  const hasAssignedProgram = Boolean(assignedProgram?.id);
  const hasActivePack = Boolean(activePack?.id);
  if (hasAssignedProgram || hasActivePack) {
    constraints.push('Do not override coach programming', 'Frame this as optional companion work');
  }

  return {
    readinessLevel,
    readinessScore: readiness?.score ?? null,
    daysSinceLastWorkout,
    volumeAdjustment,
    intensityGuidance,
    rationale,
    constraints: Array.from(new Set(constraints)),
    recovery: {
      sleepMinutes: health?.sleep_minutes ?? null,
      restingHeartRate: health?.resting_heart_rate ?? null,
      hrvRmssdMs: health?.hrv_rmssd_ms ?? null,
    },
    coachContext: {
      hasAssignedProgram,
      hasActivePack,
      programTitle: assignedProgram?.title ?? null,
      guidance:
        hasAssignedProgram || hasActivePack
          ? 'Treat this workout as an optional companion suggestion. Do not replace coach-assigned programming.'
          : 'No active coach programming was found for this user.',
    },
  };
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

    const [
      { data: profile },
      { data: sessions },
      { data: readiness },
      { data: health },
      { data: assignedProgram },
      { data: activePack },
      { data: exercises, error: exercisesError },
    ] = await Promise.all([
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
        .from('daily_readiness')
        .select('date, score, level, recommendation, inputs')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('health_data')
        .select('date, steps, active_calories, sleep_minutes, resting_heart_rate, hrv_rmssd_ms')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('custom_programs')
        .select('id, title, type, status, updated_at')
        .eq('client_id', userId)
        .eq('is_template', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('purchased_packs')
        .select('id, coach_id, sessions_remaining, expires_at')
        .eq('client_id', userId)
        .eq('status', 'active')
        .gt('sessions_remaining', 0)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .limit(1)
        .maybeSingle(),
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
    const adaptiveContext = computeAdaptiveContext(
      readiness as ReadinessRow | null,
      health as HealthRow | null,
      sessions as WorkoutSessionRow[] | null,
      assignedProgram as CustomProgramRow | null,
      activePack as ActivePackRow | null
    );

    const prompt = [
      'Create one personalized custom workout for a GoFit mobile user.',
      'Use ONLY exercises from the provided exercise catalog. Do not invent exercise IDs.',
      'Make it practical for one session and follow the adaptive guidance over generic volume.',
      'If volumeAdjustment is reduce, use 3 to 5 exercises, fewer hard sets, and longer rests.',
      'If the user missed several days, create a moderate catch-up session, not a punishment workout.',
      'If coachContext has an assigned program or active pack, this must be an optional companion workout and must not replace coach instructions.',
      'Return JSON only with this exact shape:',
      '{"name":"string","focus":"string","reason":"string","exercises":[{"id":"uuid from catalog","sets":"string number","reps":"string such as 10 or 12,10,8","restTime":"seconds as string"}],"adaptation":{"rationale":"string"}}',
      '',
      `User profile: ${JSON.stringify(profile || {})}`,
      `Recent completed sessions: ${JSON.stringify(sessions || [])}`,
      `Adaptive guidance: ${JSON.stringify(adaptiveContext)}`,
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
    const maxExercises = adaptiveContext.volumeAdjustment === 'reduce' ? 5 : 8;
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
      .slice(0, maxExercises);

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
      adaptation: {
        volumeAdjustment: adaptiveContext.volumeAdjustment,
        readinessLevel: adaptiveContext.readinessLevel,
        readinessScore: adaptiveContext.readinessScore,
        daysSinceLastWorkout: adaptiveContext.daysSinceLastWorkout,
        rationale: String(generated.adaptation?.rationale || adaptiveContext.rationale).slice(0, 180),
        coachContext: adaptiveContext.coachContext,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
