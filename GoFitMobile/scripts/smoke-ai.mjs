import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), '.env'));
loadEnvFile(resolve(process.cwd(), '..', 'admin-panel', '.env.local'));

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const results = [];

function record(name, status, detail = '') {
  results.push({ name, status, detail });
  const suffix = detail ? ` - ${detail}` : '';
  console.log(`${status.toUpperCase()} ${name}${suffix}`);
}

async function postFunction(name, body, token = anonKey) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: response.status, ok: response.ok, json };
}

async function supabaseRequest(path, { method = 'GET', key = anonKey, body } = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 220).replace(/\s+/g, ' ') };
  }
  return {
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get('content-type') || '',
    json,
  };
}

async function main() {
  if (!supabaseUrl || !anonKey) {
    record('env', 'fail', 'Missing Supabase URL or anon key');
    process.exitCode = 1;
    return;
  }
  record('env', serviceRoleKey ? 'pass' : 'warn', serviceRoleKey ? 'Supabase keys present' : 'No service role key; authenticated checks skipped');

  try {
    const barcode = await postFunction('food-barcode-lookup', { barcode: '3017620422003' });
    if (barcode.status === 200 && barcode.json && ('food' in barcode.json || 'source' in barcode.json)) {
      record('food-barcode-lookup', 'pass', `HTTP ${barcode.status}, source=${barcode.json.source ?? 'unknown'}`);
    } else {
      record('food-barcode-lookup', 'fail', `HTTP ${barcode.status}: ${JSON.stringify(barcode.json).slice(0, 160)}`);
    }
  } catch (error) {
    record('food-barcode-lookup', 'fail', error instanceof Error ? error.message : String(error));
  }

  if (!serviceRoleKey) {
    record('authenticated Edge Functions', 'warn', 'Skipped because SUPABASE_SERVICE_ROLE_KEY is unavailable');
    return;
  }

  const email = `gofit-ai-smoke-${Date.now()}-${randomUUID().slice(0, 8)}@example.test`;
  const password = `Smoke-${randomUUID()}-1a`;
  let userId = null;
  let accessToken = null;

  try {
    const health = await supabaseRequest('/auth/v1/health');
    record('auth health', health.ok ? 'pass' : 'warn', `HTTP ${health.status}`);

    const created = await supabaseRequest('/auth/v1/admin/users', {
      method: 'POST',
      key: serviceRoleKey,
      body: {
        email,
        password,
        email_confirm: true,
        user_metadata: { user_type: 'client' },
      },
    });
    if (!created.ok || !created.json?.id) {
      throw new Error(
        `createUser HTTP ${created.status} ${created.contentType}: ${JSON.stringify(created.json).slice(0, 220)}`,
      );
    }
    userId = created.json.id;

    const signedIn = await supabaseRequest('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email, password },
    });
    if (!signedIn.ok || !signedIn.json?.access_token) {
      throw new Error(
        `signIn HTTP ${signedIn.status} ${signedIn.contentType}: ${JSON.stringify(signedIn.json).slice(0, 220)}`,
      );
    }
    accessToken = signedIn.json.access_token;
    record('temporary auth user', 'pass', 'Created and signed in');

    const workout = await postFunction('ai-workout-recommendation', {}, accessToken);
    if (workout.status === 200 && Array.isArray(workout.json?.exercises) && workout.json.exercises.length >= 3) {
      record('ai-workout-recommendation', 'pass', `${workout.json.exercises.length} exercises returned`);
    } else {
      record('ai-workout-recommendation', 'fail', `HTTP ${workout.status}: ${JSON.stringify(workout.json).slice(0, 220)}`);
    }

    const measurements = await postFunction(
      'body-measurements',
      { image_base64: 'data:image/jpeg;base64,AAAA', user_height_cm: 175 },
      accessToken,
    );
    if (measurements.status === 400 && String(measurements.json?.error || '').toLowerCase().includes('image')) {
      record('body-measurements auth/function', 'pass', 'Reached function and got expected image validation error');
    } else {
      record('body-measurements auth/function', 'fail', `HTTP ${measurements.status}: ${JSON.stringify(measurements.json).slice(0, 220)}`);
    }

    const notes = await postFunction('ai-session-notes', { client_id: userId, force: true }, accessToken);
    if (notes.status === 403 && String(notes.json?.error || '').includes('not a coach')) {
      record('ai-session-notes auth/function', 'pass', 'Reached function and got expected coach-only authorization response');
    } else {
      record('ai-session-notes auth/function', 'fail', `HTTP ${notes.status}: ${JSON.stringify(notes.json).slice(0, 220)}`);
    }
  } catch (error) {
    record('authenticated Edge Functions', 'fail', error instanceof Error ? error.message : String(error));
  } finally {
    if (userId) {
      const deleted = await supabaseRequest(`/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        key: serviceRoleKey,
      });
      record('temporary auth user cleanup', deleted.ok ? 'pass' : 'warn', deleted.ok ? 'Deleted' : `HTTP ${deleted.status}`);
    }
  }

  const failed = results.some((result) => result.status === 'fail');
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
