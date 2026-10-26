const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../../admin-panel/node_modules/typescript');

function loadHandler(options = {}) {
  let handler;
  const calls = [], rows = [], events = [], captures = [], cancellations = [];
  const intent = { id: 'pi_test', status: 'succeeded', amount: 12900, amount_received: 12900,
    currency: 'eur', livemode: false, metadata: { checkoutKind: 'pack', clientId: 'caller',
      packId: 'pack', coachId: 'coach', sessionsTotal: '12', amountMinor: '12900' }, ...options.intent };
  class Stripe {
    paymentIntents = {
      create: async input => { calls.push(input); return { id: 'pi_test', client_secret: 'unit-test-secret' }; },
      retrieve: async () => intent,
      capture: async (id, params, config) => { events.push('capture'); captures.push(config); return { ...intent, status: 'succeeded', amount_received: intent.amount }; },
      cancel: async id => { cancellations.push(id); return { id, status: 'canceled' }; },
    };
  }
  const reserved = { id: 'booking', coach_id: 'coach', client_id: 'caller', quoted_amount: 60,
    payment_status: 'capturing', checkout_expires_at: '2030-01-01T00:00:00Z', ...options.reserved };
  const db = {
    rpc: async (name, args) => {
      events.push(name);
      if (name === 'reserve_paid_session') return options.conflict ? { error: { code: '23P01' } } : { data: reserved };
      if (name === 'prepare_paid_session_capture') return options.expired ? { error: { code: '22023' } } : { data: reserved };
      if (name === 'complete_paid_session') return { data: { ...reserved, payment_status: 'paid', status: 'confirmed' } };
      if (name === 'cancel_paid_session_checkout') return { data: options.cannotCancel ? null : { ...reserved, status: 'cancelled' } };
      throw Error('Unexpected RPC');
    },
    auth: { getUser: async () => options.unauthorized ? { error: {} } : { data: { user: { id: 'caller' } } } },
    from: table => {
      let pending;
      const query = {
        select: () => query, eq: () => query, neq: () => query, gte: () => query, lte: () => query,
        update: () => query,
        then: resolve => Promise.resolve({ data: options.busyRows || [] }).then(resolve),
        insert: input => { pending = input; return query; },
        single: async () => {
          if (pending) {
            if (rows.some(r => r.stripe_payment_id === pending.stripe_payment_id)) return { error: { code: '23505' } };
            const row = { ...pending, id: 'purchase' }; rows.push(row); return { data: row };
          }
          if (table === 'bookings') return { data: { id: 'booking' } };
          if (table === 'session_packs') return { data: { id: 'pack', coach_id: 'coach', price: 129, currency: 'EUR', session_count: 12 } };
          return { data: rows[0] };
        },
      };
      return query;
    },
  };
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports: {}, Response, console,
    Deno: { env: { get: name => name === 'STRIPE_SECRET_KEY' && options.missingKey ? undefined : 'configured' } },
    require: name => {
      if (name.includes('http/server')) return { serve: fn => { handler = fn; } };
      if (name.startsWith('npm:stripe')) return Stripe;
      if (name.includes('supabase-js')) return { createClient: () => db };
      if (name.includes('_shared/cors')) return { corsHeaders: {} };
      throw Error('Unexpected import');
    },
  });
  const request = body => handler(new Request('https://example.test/stripe-payment', {
    method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body),
  }));
  return { request, calls, rows, events, captures, cancellations };
}

for (const currency of ['usd', 'eur', undefined]) {
  test(`untracked legacy payment request is refused for input ${currency}`, async () => {
    const { request, calls } = loadHandler();
    const r = await request({ amount: 50, currency, metadata: { clientId: 'caller', coachId: 'coach' } });
    assert.equal(r.status, 400); assert.equal(calls.length, 0);
  });
}
test('pack creation ignores client price and identity', async () => {
  const { request, calls } = loadHandler();
  const r = await request({ action: 'create_pack', packId: 'pack', amount: 0.01, metadata: { clientId: 'attacker' } });
  assert.equal(r.status, 200); assert.equal(calls[0].amount, 12900);
  assert.equal(calls[0].metadata.clientId, 'caller'); assert.equal(calls[0].metadata.sessionsTotal, '12');
});
test('unpaid intent cannot allocate pack credits', async () => {
  const { request, rows } = loadHandler({ intent: { status: 'requires_payment_method', amount_received: 0 } });
  assert.equal((await request({ action: 'fulfill_pack', paymentIntentId: 'pi_test' })).status, 409);
  assert.equal(rows.length, 0);
});
test('paid pack saves amount, reference, mode and both credit counts; retry returns original row', async () => {
  const { request, rows } = loadHandler();
  const body = { action: 'fulfill_pack', paymentIntentId: 'pi_test' };
  const first = await request(body), retry = await request(body);
  assert.equal(first.status, 200); assert.equal(retry.status, 200);
  assert.equal((await first.json()).purchaseId, (await retry.json()).purchaseId);
  assert.equal(rows.length, 1); assert.equal(rows[0].sessions_total, 12); assert.equal(rows[0].sessions_remaining, 12);
  assert.equal(rows[0].paid_amount, 129); assert.equal(rows[0].paid_currency, 'EUR');
  assert.equal(rows[0].payment_livemode, false); assert.equal(rows[0].stripe_payment_id, 'pi_test');
});
test('other-user payment is rejected', async () => {
  const { request, rows } = loadHandler({ intent: { metadata: { checkoutKind: 'pack', clientId: 'someone-else' } } });
  assert.equal((await request({ action: 'fulfill_pack', paymentIntentId: 'pi_test' })).status, 403);
  assert.equal(rows.length, 0);
});
test('invalid authentication and missing server configuration never fabricate success', async () => {
  for (const [options,status] of [[{ unauthorized: true },401],[{ missingKey: true },503]]) {
    const { request,calls }=loadHandler(options);
    assert.equal((await request({ action: 'create_pack', packId: 'pack' })).status,status);
    assert.equal(calls.length,0);
  }
});
test('a captured amount mismatch cannot allocate credits', async () => {
  const { request,rows }=loadHandler({intent:{amount_received:100}});
  assert.equal((await request({action:'fulfill_pack',paymentIntentId:'pi_test'})).status,409);
  assert.equal(rows.length,0);
});

const sessionIntent = { checkoutKind: 'session', clientId: 'caller', bookingId: 'booking', amountMinor: '6000' };
test('session intent is manually captured and priced from the reservation', async () => {
  const { request, calls } = loadHandler();
  const response = await request({ action: 'create_session', coachId: 'coach', amount: 1,
    scheduledAt: '2030-01-01T09:00:00Z', durationMinutes: 60, expectedAmount: 60 });
  assert.equal(response.status, 200); assert.equal(calls[0].amount, 6000);
  assert.equal(calls[0].capture_method, 'manual'); assert.equal(calls[0].metadata.bookingId, 'booking');
});
test('slot conflict prevents PaymentIntent creation', async () => {
  const { request, calls } = loadHandler({ conflict: true });
  assert.equal((await request({ action: 'create_session' })).status, 409); assert.equal(calls.length, 0);
});
test('session capture happens only after reservation check and uses an idempotency key', async () => {
  const { request, events, captures } = loadHandler({ intent: { status: 'requires_capture', amount: 6000, metadata: sessionIntent } });
  const response = await request({ action: 'fulfill_session', paymentIntentId: 'pi_test' });
  assert.equal(response.status, 200);
  assert.deepEqual(events, ['prepare_paid_session_capture','capture','complete_paid_session']);
  assert.equal(captures[0].idempotencyKey, 'session-capture-pi_test');
  assert.equal((await response.json()).booking.status, 'confirmed');
});
test('expired reservation releases card authorization without capture', async () => {
  const { request, captures, cancellations } = loadHandler({ expired: true,
    intent: { status: 'requires_capture', amount: 6000, metadata: sessionIntent } });
  assert.equal((await request({ action: 'fulfill_session', paymentIntentId: 'pi_test' })).status, 409);
  assert.equal(captures.length, 0); assert.deepEqual(cancellations, ['pi_test']);
});
test('unpaid session and other-user session cannot capture', async () => {
  for (const [intent,status] of [
    [{ status: 'requires_payment_method', metadata: sessionIntent },409],
    [{ status: 'requires_capture', metadata: { ...sessionIntent, clientId: 'other' } },403],
  ]) {
    const { request, captures }=loadHandler({intent});
    assert.equal((await request({action:'fulfill_session',paymentIntentId:'pi_test'})).status,status);
    assert.equal(captures.length,0);
  }
});
test('already-paid session replay does not capture twice', async () => {
  const { request, captures }=loadHandler({reserved:{payment_status:'paid'},
    intent:{status:'succeeded',amount:6000,metadata:sessionIntent}});
  assert.equal((await request({action:'fulfill_session',paymentIntentId:'pi_test'})).status,200);
  assert.equal(captures.length,0);
});
test('cancellation cannot cancel a card during capture', async () => {
  const { request, cancellations }=loadHandler({cannotCancel:true,intent:{metadata:sessionIntent}});
  assert.equal((await request({action:'cancel_session',paymentIntentId:'pi_test'})).status,409);
  assert.equal(cancellations.length,0);
});
test('busy-slot response exposes only times and hides expired reservations', async () => {
  const { request }=loadHandler({busyRows:[
    {scheduled_at:'2030-01-01T09:00:00Z',duration_minutes:60,payment_status:'paid',client_id:'private'},
    {scheduled_at:'2030-01-01T10:00:00Z',duration_minutes:60,payment_status:'awaiting_payment',checkout_expires_at:'2020-01-01'},
  ]});
  const response=await request({action:'session_slots',coachId:'coach'});
  assert.deepEqual((await response.json()).busySlots,[{scheduled_at:'2030-01-01T09:00:00Z',duration_minutes:60}]);
});
