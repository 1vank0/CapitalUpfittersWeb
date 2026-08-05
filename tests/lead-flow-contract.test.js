const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const test = require('node:test');

const handler = require('../api/lead.js');
const ROOT = path.resolve(__dirname, '..');
const FIXED_KEY = '11111111-1111-4111-8111-111111111111';
const LOCAL_ORIGIN = 'http://localhost';
const BRIDGE_SECRET = 'test-only-lead-bridge-secret-at-least-32-bytes';
let requestSequence = 0;

function request(body, options = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  requestSequence += 1;
  // Keep every request in its own rate-limit bucket without triggering the
  // optional external IP-geolocation lookup during unit tests.
  const trustedIp = `10.0.0.${(requestSequence % 250) + 1}`;
  const req = Readable.from([raw]);
  req.method = options.method || 'POST';
  req.headers = {
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(raw)),
    origin: LOCAL_ORIGIN,
    host: 'localhost',
    'x-forwarded-proto': 'http',
    'x-forwarded-for': trustedIp,
    ...(options.headers || {})
  };
  req.socket = { remoteAddress: '127.0.0.1' };
  return req;
}

function response() {
  let resolve;
  const done = new Promise((complete) => { resolve = complete; });
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) { this.body = body; resolve(this); }
  };
  res.done = done;
  return res;
}

async function invoke(body, options = {}) {
  const req = request(body, options);
  const res = response();
  await handler(req, res);
  await res.done;
  return {
    status: res.statusCode,
    body: JSON.parse(res.body),
    headers: res.headers
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}

function retailBody(overrides = {}) {
  return {
    form_type: 'retail',
    form_id: 'quote-retail',
    'First Name': 'QA',
    'Last Name': 'Retail',
    Email: 'retail@example.com',
    'Vehicle Year': '2025',
    'Vehicle Make': 'Ford',
    'Vehicle Model': 'F-150',
    services: ['bedliner', 'Hitches & Towing'],
    idempotency_key: FIXED_KEY,
    submission_started_at: new Date().toISOString(),
    ...overrides
  };
}

function callbackBody(overrides = {}) {
  return {
    form_type: 'retail',
    form_id: 'callback-form',
    Name: 'Callback Tester',
    Email: 'callback@example.com',
    Phone: '301-555-0100',
    'Best Time to Call': 'Morning (9:30am–12pm)',
    Message: 'Please call about a hitch.',
    idempotency_key: FIXED_KEY,
    submission_started_at: new Date().toISOString(),
    ...overrides
  };
}

function applicationBody(overrides = {}) {
  return {
    form_type: 'dealer',
    form_id: 'apply-form',
    'Business Name': 'QA Municipal Fleet',
    'Contact Name': 'Application Tester',
    'Work Email': 'application@example.com',
    Phone: '301-555-0111',
    'Business Type': 'Government Agency',
    'Monthly Volume': '10–24 vehicles/month',
    Message: 'Please set up a purchasing account.',
    idempotency_key: FIXED_KEY,
    submission_started_at: new Date().toISOString(),
    ...overrides
  };
}

async function withRuntime(run) {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  process.env.RESEND_API_KEY = 'test_key';
  process.env.LEAD_PERSISTENCE_URL = 'https://persistence.test/api/leads/';
  process.env.LEAD_PERSISTENCE_ORIGIN = 'https://capitalupfitters.com';
  process.env.LEAD_BRIDGE_SECRET = BRIDGE_SECRET;
  delete process.env.LEAD_PERSISTENCE_BYPASS_SECRET;
  process.env.LEAD_ALLOWED_ORIGIN = LOCAL_ORIGIN;
  process.env.LEAD_ALLOWED_ORIGINS = LOCAL_ORIGIN;
  process.env.LEAD_PERSISTENCE_TIMEOUT_MS = '25';
  process.env.LEAD_RESEND_TIMEOUT_MS = '25';
  console.error = () => {};
  console.warn = () => {};
  console.log = () => {};

  try {
    await run();
  } finally {
    global.fetch = originalFetch;
    console.error = originalError;
    console.warn = originalWarn;
    console.log = originalLog;
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  }
}

test('quote requests persist once with a durable reference and timeout signals', async () => {
  await withRuntime(async () => {
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      assert.equal(options.signal instanceof AbortSignal, true);
      assert.equal(options.signal.aborted, false);
      if (url === 'https://persistence.test/api/leads/') {
        const payload = JSON.parse(options.body);
        assert.equal(options.headers.Origin, 'https://capitalupfitters.com');
        assert.equal(options.headers['Idempotency-Key'], FIXED_KEY);
        assert.equal(payload.schemaVersion, '2026-07-15');
        assert.equal(payload.idempotencyKey, FIXED_KEY);
        assert.equal(payload.kind, 'retail');
        assert.deepEqual(payload.services, ['bedliner', 'hitches_and_towing']);
        assert.deepEqual(payload.vehicle, {
          year: 2025,
          make: 'Ford',
          model: 'F-150'
        });
        return jsonResponse({ ok: true, persisted: true, reference: 'CU-QA-1' }, 201);
      }
      assert.equal(url, 'https://api.resend.com/emails');
      return jsonResponse({ id: 'email-id' });
    };

    const result = await invoke(retailBody());
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, {
      ok: true,
      persisted: true,
      reference: 'CU-QA-1',
      delivered: true,
      customer_confirmation: true,
      delivery_mode: 'persisted_and_emailed',
      warning: ''
    });
    assert.equal(calls.length, 3);
    assert.deepEqual(
      calls.slice(1).map((call) => call.options.headers['Idempotency-Key']).sort(),
      [`${FIXED_KEY}-customer`, `${FIXED_KEY}-internal`]
    );
  });
});

test('protected persistence preview receives the configured bypass header', async () => {
  await withRuntime(async () => {
    const bypassSecret = 'test-only-vercel-protection-bypass-secret';
    process.env.LEAD_PERSISTENCE_BYPASS_SECRET = bypassSecret;
    let persistenceHeaders;
    global.fetch = async (url, options) => {
      if (url === 'https://persistence.test/api/leads/') {
        persistenceHeaders = options.headers;
        return jsonResponse({ ok: true, persisted: true, reference: 'CU-BYPASS-1' }, 201);
      }
      assert.equal(url, 'https://api.resend.com/emails');
      return jsonResponse({ id: 'email-id' });
    };

    const result = await invoke(retailBody());

    assert.equal(result.status, 200);
    assert.equal(
      persistenceHeaders['x-vercel-protection-bypass'],
      bypassSecret
    );
  });
});

test('persistence request omits the bypass header when it is unset', async () => {
  await withRuntime(async () => {
    let persistenceHeaders;
    global.fetch = async (url, options) => {
      if (url === 'https://persistence.test/api/leads/') {
        persistenceHeaders = options.headers;
        return jsonResponse({ ok: true, persisted: true, reference: 'CU-BYPASS-2' }, 201);
      }
      assert.equal(url, 'https://api.resend.com/emails');
      return jsonResponse({ id: 'email-id' });
    };

    const result = await invoke(retailBody());

    assert.equal(result.status, 200);
    assert.equal(persistenceHeaders['x-vercel-protection-bypass'], undefined);
  });
});

test('same-payload retries keep Resend bodies and idempotency keys byte-identical', async () => {
  await withRuntime(async () => {
    const persistenceCalls = [];
    const emailCalls = [];
    global.fetch = async (url, options) => {
      assert.equal(options.signal instanceof AbortSignal, true);
      assert.equal(options.signal.aborted, false);
      if (url === 'https://persistence.test/api/leads/') {
        persistenceCalls.push({ body: options.body, headers: options.headers });
        return jsonResponse({ ok: true, persisted: true, reference: 'CU-RETRY-1' }, 201);
      }
      assert.equal(url, 'https://api.resend.com/emails');
      emailCalls.push({ body: options.body, headers: options.headers });
      return jsonResponse({ id: 'email-id' });
    };

    const body = retailBody();
    const first = await invoke(body, {
      headers: {
        'x-forwarded-for': '10.20.0.1',
        'cf-connecting-ip': '203.0.113.10',
        'x-real-ip': '203.0.113.11'
      }
    });
    const retry = await invoke(body, {
      headers: {
        'x-forwarded-for': '10.20.0.2',
        'cf-connecting-ip': '198.51.100.10',
        'x-real-ip': '198.51.100.11'
      }
    });

    assert.equal(first.status, 200);
    assert.equal(retry.status, 200);
    assert.equal(persistenceCalls.length, 2);
    assert.equal(emailCalls.length, 4);
    assert.deepEqual(emailCalls.map((call) => call.headers['Idempotency-Key']), [
      `${FIXED_KEY}-internal`,
      `${FIXED_KEY}-customer`,
      `${FIXED_KEY}-internal`,
      `${FIXED_KEY}-customer`
    ]);
    for (const index of [0, 1]) {
      assert.equal(
        Buffer.from(emailCalls[index].body).equals(Buffer.from(emailCalls[index + 2].body)),
        true
      );
      assert.equal(
        emailCalls[index].headers['Idempotency-Key'],
        emailCalls[index + 2].headers['Idempotency-Key']
      );
    }
  });
});

test('same key with a changed payload reaches upstream 409 and sends no retry email', async () => {
  await withRuntime(async () => {
    const persistenceCalls = [];
    let emailCalls = 0;
    global.fetch = async (url, options) => {
      assert.equal(options.signal instanceof AbortSignal, true);
      if (url === 'https://persistence.test/api/leads/') {
        persistenceCalls.push({ body: options.body, headers: options.headers });
        if (persistenceCalls.length === 1) {
          return jsonResponse({ ok: true, persisted: true, reference: 'CU-CONFLICT-1' }, 201);
        }
        assert.equal(options.headers['Idempotency-Key'], FIXED_KEY);
        assert.notEqual(options.body, persistenceCalls[0].body);
        return jsonResponse({
          ok: false,
          persisted: false,
          error: {
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'This idempotency key was already used for another payload.'
          }
        }, 409);
      }
      assert.equal(url, 'https://api.resend.com/emails');
      emailCalls += 1;
      return jsonResponse({ id: 'email-id' });
    };

    const body = retailBody();
    const first = await invoke(body);
    const conflict = await invoke({ ...body, 'Vehicle Model': 'Ranger' });

    assert.equal(first.status, 200);
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.ok, false);
    assert.equal(conflict.body.persisted, false);
    assert.equal(conflict.body.delivered, false);
    assert.equal(persistenceCalls.length, 2);
    assert.equal(emailCalls, 2);
  });
});

test('fleet business email is preserved in persistence and both notifications', async () => {
  await withRuntime(async () => {
    const emailPayloads = [];
    global.fetch = async (url, options) => {
      if (url === 'https://persistence.test/api/leads/') {
        const payload = JSON.parse(options.body);
        assert.equal(payload.kind, 'commercial');
        assert.equal(payload.requestType, 'fleet');
        assert.equal(payload.contact.email, 'fleet@example.com');
        assert.deepEqual(payload.scope.services, ['pickup_upfitting']);
        return jsonResponse({ ok: true, persisted: true, reference: 'CU-QA-2' }, 201);
      }
      emailPayloads.push(JSON.parse(options.body));
      return jsonResponse({ id: 'email-id' });
    };

    const result = await invoke({
      form_type: 'fleet',
      form_id: 'quote-fleet',
      'Business Name': 'QA Fleet',
      'Contact Name': 'Fleet Tester',
      'Business Email': 'fleet@example.com',
      Phone: '301-555-0100',
      'Vehicle Count': '6–15',
      services: ['Pickup Upfitting'],
      idempotency_key: FIXED_KEY,
      submission_started_at: new Date().toISOString()
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.persisted, true);
    assert.equal(emailPayloads[0].reply_to, 'fleet@example.com');
    assert.equal(emailPayloads[1].to, 'fleet@example.com');
  });
});

test('transient persistence failure falls back to confirmed shop email', async () => {
  await withRuntime(async () => {
    let calls = 0;
    global.fetch = async (url) => {
      calls += 1;
      if (url === 'https://persistence.test/api/leads/') {
        return jsonResponse({
          ok: false,
          persisted: false,
          error: {
            code: 'PERSISTENCE_UNAVAILABLE',
            message: 'Database unavailable'
          }
        }, 503);
      }
      assert.equal(url, 'https://api.resend.com/emails');
      return jsonResponse({ id: 'email-id' });
    };

    const result = await invoke(retailBody());
    assert.equal(result.status, 200);
    assert.equal(result.body.persisted, false);
    assert.equal(result.body.delivered, true);
    assert.equal(result.body.delivery_mode, 'email_fallback');
    assert.match(result.body.warning, /storage was unavailable/i);
    assert.equal(calls, 3);
  });
});

test('hostile browser origins are rejected before persistence or email', async () => {
  await withRuntime(async () => {
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      throw new Error('external side effect must not occur');
    };

    const result = await invoke(retailBody(), {
      headers: { origin: 'https://evil.example' }
    });

    assert.equal(result.status, 403);
    assert.equal(result.body.ok, false);
    assert.equal(result.body.delivered, false);
    assert.notEqual(result.headers['access-control-allow-origin'], 'https://evil.example');
    assert.equal(calls, 0);
  });
});

test('non-JSON lead submissions are rejected before persistence or email', async () => {
  await withRuntime(async () => {
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      throw new Error('external side effect must not occur');
    };

    const result = await invoke(retailBody(), {
      headers: { 'content-type': 'text/plain' }
    });

    assert.equal(result.status, 415);
    assert.equal(result.body.ok, false);
    assert.equal(result.body.delivered, false);
    assert.equal(calls, 0);
  });
});

test('declared Content-Length over 128 KiB is rejected before reading or fetching', async () => {
  await withRuntime(async () => {
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      throw new Error('external side effect must not occur');
    };

    const body = retailBody();
    assert.ok(Buffer.byteLength(JSON.stringify(body)) < 128 * 1024);
    const result = await invoke(body, {
      headers: { 'content-length': String((128 * 1024) + 1) }
    });

    assert.equal(result.status, 413);
    assert.equal(result.body.ok, false);
    assert.equal(result.body.delivered, false);
    assert.equal(calls, 0);
  });
});

test('unsupported and mismatched form identities have zero side effects', async () => {
  await withRuntime(async () => {
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      throw new Error('external side effect must not occur');
    };

    const invalidBodies = [
      retailBody({ form_type: 'unknown', form_id: 'quote-retail' }),
      retailBody({ form_type: 'fleet', form_id: 'quote-retail' }),
      retailBody({ form_type: 'retail', form_id: 'unknown-form' })
    ];

    for (const body of invalidBodies) {
      const result = await invoke(body);
      assert.equal(result.status, 400);
      assert.equal(result.body.ok, false);
      assert.equal(result.body.delivered, false);
    }
    assert.equal(calls, 0);
  });
});

test('non-object bodies and array-valued email are rejected with zero side effects', async () => {
  await withRuntime(async () => {
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      throw new Error('external side effect must not occur');
    };

    for (const body of [null, [], retailBody({ Email: ['first@example.com', 'second@example.com'] })]) {
      const result = await invoke(body);
      assert.equal(result.status, 400);
      assert.equal(result.body.ok, false);
      assert.equal(result.body.delivered, false);
    }
    assert.equal(calls, 0);
  });
});

test('trusted Vercel XFF is signed for the durable API and spoofable headers are ignored', async () => {
  await withRuntime(async () => {
    const trustedIp = '2001:DB8::77';
    const normalizedTrustedIp = trustedIp.toLowerCase();
    let bridgeHeaders = null;
    global.fetch = async (url, options) => {
      if (url === 'https://persistence.test/api/leads/') {
        bridgeHeaders = options.headers;
        return jsonResponse({ ok: true, persisted: true, reference: 'CU-IP-1' }, 201);
      }
      assert.equal(url, 'https://api.resend.com/emails');
      return jsonResponse({ id: 'email-id' });
    };

    const result = await invoke(retailBody(), {
      headers: {
        'x-forwarded-for': trustedIp,
        'cf-connecting-ip': '203.0.113.66',
        'x-real-ip': '203.0.113.67'
      }
    });

    assert.equal(result.status, 200);
    assert.equal(bridgeHeaders['X-Real-IP'], undefined);
    assert.equal(bridgeHeaders['X-Capital-Bridge-Client-IP'], normalizedTrustedIp);
    assert.match(bridgeHeaders['X-Capital-Bridge-Timestamp'], /^\d{10}$/);
    const canonical = [
      'capital-upfitters-lead-bridge-v1',
      bridgeHeaders['X-Capital-Bridge-Timestamp'],
      normalizedTrustedIp,
      FIXED_KEY,
      'https://capitalupfitters.com'
    ].join('\n');
    const expected = createHmac('sha256', BRIDGE_SECRET)
      .update(canonical)
      .digest('hex');
    assert.equal(bridgeHeaders['X-Capital-Bridge-Signature'], expected);
  });
});

test('quote persistence fails closed before side effects when bridge auth is unconfigured', async () => {
  await withRuntime(async () => {
    delete process.env.LEAD_BRIDGE_SECRET;
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      throw new Error('external side effect must not occur');
    };

    const result = await invoke(retailBody());
    assert.equal(result.status, 503);
    assert.equal(result.body.ok, false);
    assert.equal(result.body.persisted, false);
    assert.equal(result.body.delivered, false);
    assert.equal(calls, 0);
  });
});

test('ninth request from one local IP is rate limited before fetch', async () => {
  await withRuntime(async () => {
    const sameIpHeaders = { 'x-forwarded-for': '127.0.0.42' };
    let calls = 0;
    global.fetch = async (url, options) => {
      calls += 1;
      assert.equal(options.signal instanceof AbortSignal, true);
      if (url === 'https://persistence.test/api/leads/') {
        return jsonResponse({ ok: true, persisted: true, reference: 'CU-RATE-1' }, 201);
      }
      assert.equal(url, 'https://api.resend.com/emails');
      return jsonResponse({ id: 'email-id' });
    };

    for (let index = 0; index < 8; index += 1) {
      const result = await invoke(retailBody({
        idempotency_key: `11111111-1111-4111-8111-11111111111${index}`
      }), { headers: sameIpHeaders });
      assert.equal(result.status, 200);
    }

    const callsBeforeLimit = calls;
    const limited = await invoke(retailBody({
      idempotency_key: '11111111-1111-4111-8111-111111111118'
    }), { headers: sameIpHeaders });

    assert.equal(callsBeforeLimit, 24);
    assert.equal(limited.status, 429);
    assert.equal(limited.body.ok, false);
    assert.equal(limited.body.delivered, false);
    assert.match(limited.headers['retry-after'], /^\d+$/);
    assert.ok(Number(limited.headers['retry-after']) >= 1);
    assert.equal(calls, callsBeforeLimit);
  });
});

test('persistence timeout reaches the confirmed-email fallback', { timeout: 2000 }, async () => {
  await withRuntime(async () => {
    let persistenceSawAbortSignal = false;
    let emailCalls = 0;
    global.fetch = async (url, options) => {
      if (url === 'https://persistence.test/api/leads/') {
        persistenceSawAbortSignal = options.signal instanceof AbortSignal;
        if (!persistenceSawAbortSignal) {
          const error = new Error('simulated persistence timeout');
          error.name = 'AbortError';
          throw error;
        }
        return new Promise((resolve, reject) => {
          const rejectOnAbort = () => {
            const error = new Error('simulated persistence timeout');
            error.name = 'AbortError';
            reject(error);
          };
          if (options.signal.aborted) rejectOnAbort();
          else options.signal.addEventListener('abort', rejectOnAbort, { once: true });
        });
      }
      assert.equal(url, 'https://api.resend.com/emails');
      emailCalls += 1;
      return jsonResponse({ id: 'email-id' });
    };

    const result = await invoke(retailBody());
    assert.equal(persistenceSawAbortSignal, true);
    assert.equal(result.status, 200);
    assert.equal(result.body.persisted, false);
    assert.equal(result.body.delivered, true);
    assert.equal(result.body.delivery_mode, 'email_fallback');
    assert.equal(emailCalls, 2);
  });
});

test('persistence response-body timeout reaches confirmed email fallback', { timeout: 2000 }, async () => {
  await withRuntime(async () => {
    let persistenceBodySawAbort = false;
    let emailCalls = 0;
    global.fetch = async (url, options) => {
      if (url === 'https://persistence.test/api/leads/') {
        assert.equal(options.signal instanceof AbortSignal, true);
        return {
          ok: true,
          status: 201,
          json: () => new Promise((resolve, reject) => {
            const rejectOnAbort = () => {
              persistenceBodySawAbort = true;
              const error = new Error('simulated persistence body timeout');
              error.name = 'AbortError';
              reject(error);
            };
            if (options.signal.aborted) rejectOnAbort();
            else options.signal.addEventListener('abort', rejectOnAbort, { once: true });
          })
        };
      }
      assert.equal(url, 'https://api.resend.com/emails');
      assert.equal(options.signal instanceof AbortSignal, true);
      emailCalls += 1;
      return jsonResponse({ id: 'email-id' });
    };

    let guard;
    const result = await Promise.race([
      invoke(retailBody()),
      new Promise((resolve, reject) => {
        guard = setTimeout(() => reject(
          new Error('handler did not recover from the persistence body timeout')
        ), 500);
      })
    ]).finally(() => clearTimeout(guard));

    assert.equal(persistenceBodySawAbort, true);
    assert.equal(result.status, 200);
    assert.equal(result.body.persisted, false);
    assert.equal(result.body.delivered, true);
    assert.equal(result.body.delivery_mode, 'email_fallback');
    assert.equal(emailCalls, 2);
  });
});

test('security-guard 503 never falls through to email', async () => {
  await withRuntime(async () => {
    for (const code of ['ABUSE_GUARD_UNAVAILABLE', 'ORIGIN_GUARD_UNAVAILABLE']) {
      let calls = 0;
      global.fetch = async (url) => {
        calls += 1;
        assert.equal(url, 'https://persistence.test/api/leads/');
        return jsonResponse({
          ok: false,
          persisted: false,
          error: {
            code,
            message: 'Security guard unavailable'
          }
        }, 503);
      };

      const result = await invoke(retailBody());
      assert.equal(result.status, 503);
      assert.equal(result.body.ok, false);
      assert.equal(result.body.persisted, false);
      assert.equal(result.body.delivered, false);
      assert.equal(calls, 1);
    }
  });
});

test('persistence 403 and 422 guards never fall through to email', async () => {
  await withRuntime(async () => {
    for (const status of [403, 422]) {
      let calls = 0;
      global.fetch = async (url) => {
        calls += 1;
        assert.equal(url, 'https://persistence.test/api/leads/');
        return jsonResponse({
          ok: false,
          persisted: false,
          error: { message: `Rejected with ${status}` }
        }, status);
      };

      const result = await invoke(retailBody());
      assert.equal(result.status, status);
      assert.equal(result.body.persisted, false);
      assert.equal(result.body.delivered, false);
      assert.equal(calls, 1);
    }
  });
});

test('callback requests persist before shop and customer notifications', async () => {
  await withRuntime(async () => {
    const calls = [];
    const sequence = [];
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url === 'https://persistence.test/api/leads/') {
        sequence.push('persistence-request');
        const payload = JSON.parse(options.body);
        assert.equal(payload.kind, 'retail');
        assert.equal(payload.contact.fullName, 'Callback Tester');
        assert.equal(payload.contact.preference, 'phone');
        assert.deepEqual(payload.services, ['callback_request']);
        assert.deepEqual(payload.vehicle, {
          year: 'unknown',
          make: 'Unknown',
          model: 'Unknown'
        });
        assert.deepEqual(payload.preferences, {
          notes: 'Please call about a hitch.',
          timing: 'Morning (9:30am–12pm)'
        });
        return {
          ok: true,
          status: 201,
          json: async () => {
            sequence.push('persistence-confirmed');
            return { ok: true, persisted: true, reference: 'CU-CALLBACK-1' };
          }
        };
      }
      assert.equal(url, 'https://api.resend.com/emails');
      sequence.push('email');
      return jsonResponse({ id: 'email-id' });
    };

    const result = await invoke(callbackBody());

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.persisted, true);
    assert.equal(result.body.reference, 'CU-CALLBACK-1');
    assert.equal(result.body.delivered, true);
    assert.equal(result.body.customer_confirmation, true);
    assert.equal(result.body.delivery_mode, 'persisted_and_emailed');
    assert.equal(calls.length, 3);
    assert.equal(calls[0].url, 'https://persistence.test/api/leads/');
    assert.deepEqual(sequence, [
      'persistence-request',
      'persistence-confirmed',
      'email',
      'email'
    ]);
  });
});

test('dealer applications persist a valid commercial account request', async () => {
  await withRuntime(async () => {
    const calls = [];
    const sequence = [];
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url === 'https://persistence.test/api/leads/') {
        sequence.push('persistence-request');
        const payload = JSON.parse(options.body);
        assert.equal(payload.kind, 'commercial');
        assert.equal(payload.requestType, 'government');
        assert.equal(payload.contact.fullName, 'Application Tester');
        assert.equal(payload.contact.email, 'application@example.com');
        assert.deepEqual(payload.scope, {
          services: ['account_application'],
          notes: 'Please set up a purchasing account.'
        });
        assert.deepEqual(payload.assets, {
          description: 'Government Agency account application'
        });
        assert.deepEqual(payload.logistics, {
          notes: 'Monthly volume estimate: 10–24 vehicles/month'
        });
        assert.deepEqual(payload.organization, { name: 'QA Municipal Fleet' });
        return {
          ok: true,
          status: 201,
          json: async () => {
            sequence.push('persistence-confirmed');
            return { ok: true, persisted: true, reference: 'CU-APPLY-1' };
          }
        };
      }
      assert.equal(url, 'https://api.resend.com/emails');
      sequence.push('email');
      return jsonResponse({ id: 'email-id' });
    };

    const result = await invoke(applicationBody());

    assert.equal(result.status, 200);
    assert.equal(result.body.persisted, true);
    assert.equal(result.body.reference, 'CU-APPLY-1');
    assert.equal(result.body.delivered, true);
    assert.equal(result.body.customer_confirmation, true);
    assert.equal(result.body.delivery_mode, 'persisted_and_emailed');
    assert.equal(calls.length, 3);
    assert.equal(calls[0].url, 'https://persistence.test/api/leads/');
    assert.deepEqual(sequence, [
      'persistence-request',
      'persistence-confirmed',
      'email',
      'email'
    ]);
  });
});

test('distributed rejection blocks callback and application email side effects', async () => {
  await withRuntime(async () => {
    for (const status of [403, 422, 429]) {
      for (const body of [callbackBody(), applicationBody()]) {
        let calls = 0;
        global.fetch = async (url) => {
          calls += 1;
          assert.equal(url, 'https://persistence.test/api/leads/');
          return jsonResponse({
            ok: false,
            persisted: false,
            error: {
              code: status === 429 ? 'TOO_MANY_REQUESTS' : 'SUBMISSION_REJECTED',
              message: `Rejected with ${status}`
            }
          }, status);
        };

        const result = await invoke(body);
        assert.equal(result.status, status);
        assert.equal(result.body.persisted, false);
        assert.equal(result.body.delivered, false);
        assert.equal(calls, 1);
      }
    }
  });
});

test('callback and application required fields are enforced before side effects', async () => {
  await withRuntime(async () => {
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      return jsonResponse({ id: 'unexpected-side-effect' });
    };

    const cases = [
      callbackBody({ Phone: '' }),
      callbackBody({ Name: '' }),
      applicationBody({ 'Business Name': '' }),
      applicationBody({ 'Contact Name': '' }),
      applicationBody({ 'Work Email': '' }),
      applicationBody({ Phone: '' }),
      applicationBody({ 'Business Type': '' }),
      applicationBody({ 'Monthly Volume': '' })
    ];

    for (const body of cases) {
      const result = await invoke(body);
      assert.equal(result.status, 400);
      assert.equal(result.body.ok, false);
      assert.equal(result.body.delivered, false);
    }
    assert.equal(calls, 0);
  });
});

test('persistence validation or rate rejection does not bypass the upstream guard', async () => {
  await withRuntime(async () => {
    let calls = 0;
    global.fetch = async (url) => {
      calls += 1;
      assert.equal(url, 'https://persistence.test/api/leads/');
      return jsonResponse({
        ok: false,
        persisted: false,
        error: { message: 'Too many requests' }
      }, 429);
    };

    const result = await invoke(retailBody());
    assert.equal(result.status, 429);
    assert.equal(result.body.persisted, false);
    assert.equal(result.body.delivered, false);
    assert.equal(calls, 1);
  });
});

test('notification transport failures always resolve to truthful JSON', async () => {
  await withRuntime(async () => {
    global.fetch = async (url, options) => {
      if (url === 'https://persistence.test/api/leads/') {
        return jsonResponse({ ok: true, persisted: true, reference: 'CU-QA-3' }, 201);
      }
      const email = JSON.parse(options.body);
      if (email.to === 'CapitalUpfitters@gmail.com') {
        throw new Error('simulated transport failure');
      }
      return jsonResponse({ id: 'customer-email-id' });
    };

    const result = await invoke(retailBody());
    assert.equal(result.status, 502);
    assert.equal(result.body.persisted, true);
    assert.equal(result.body.delivered, false);
    assert.equal(result.body.customer_confirmation, false);
  });
});

test('customer confirmation failure does not turn a delivered shop lead into failure', async () => {
  await withRuntime(async () => {
    global.fetch = async (url, options) => {
      if (url === 'https://persistence.test/api/leads/') {
        return jsonResponse({ ok: true, persisted: true, reference: 'CU-QA-4' }, 201);
      }
      const email = JSON.parse(options.body);
      if (email.to === 'retail@example.com') {
        throw new Error('simulated customer transport failure');
      }
      return jsonResponse({ id: 'internal-email-id' });
    };

    const result = await invoke(retailBody());
    assert.equal(result.status, 200);
    assert.equal(result.body.persisted, true);
    assert.equal(result.body.delivered, true);
    assert.equal(result.body.customer_confirmation, false);
  });
});

test('missing contact, malformed JSON, and oversized JSON have zero side effects', async () => {
  await withRuntime(async () => {
    let calls = 0;
    global.fetch = async () => { calls += 1; throw new Error('unexpected fetch'); };

    const missing = await invoke({ form_type: 'retail' });
    assert.equal(missing.status, 400);
    assert.equal(missing.body.delivered, false);

    const malformed = await invoke('{"Email":"qa@example.com"');
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.ok, false);
    assert.equal(malformed.body.delivered, false);

    const oversized = await invoke(JSON.stringify({
      form_type: 'retail',
      form_id: 'quote-retail',
      Email: 'qa@example.com',
      padding: 'x'.repeat(129 * 1024)
    }));
    assert.equal(oversized.status, 413);
    assert.equal(oversized.body.ok, false);
    assert.equal(oversized.body.delivered, false);
    assert.equal(calls, 0);
  });
});

test('one shared client controller owns every form submit and success state', () => {
  const lead = fs.readFileSync(path.join(ROOT, 'lead-form.js'), 'utf8');
  const quote = fs.readFileSync(path.join(ROOT, 'quote-form.js'), 'utf8');
  const quoteHtml = fs.readFileSync(path.join(ROOT, 'quote.html'), 'utf8');
  const contactHtml = fs.readFileSync(path.join(ROOT, 'contact.html'), 'utf8');
  const dealerHtml = fs.readFileSync(path.join(ROOT, 'dealer-government.html'), 'utf8');

  assert.equal((lead.match(/addEventListener\(['"]submit['"]/g) || []).length, 1);
  assert.equal((lead.match(/fetch\(['"]\/api\/lead['"]/g) || []).length, 1);
  assert.equal((quote.match(/addEventListener\(['"]submit['"]/g) || []).length, 0);
  assert.equal((quote.match(/fetch\s*\(/g) || []).length, 0);
  assert.doesNotMatch(quote + quoteHtml, /capital-upfitters-next\.vercel\.app\/api\/leads/);
  assert.doesNotMatch(contactHtml, /callback-form['"]\)\.addEventListener\(['"]submit/);
  assert.doesNotMatch(dealerHtml, /apply-form['"]\)\.addEventListener\(['"]submit/);

  for (const kind of ['retail', 'fleet', 'dealer']) {
    assert.match(quoteHtml, new RegExp(
      `id="quote-${kind}"[^>]*data-success-body="form-${kind}-body"` +
      `[^>]*data-success-panel="form-${kind}-success"`
    ));
  }
  assert.match(contactHtml, /id="callback-form"[^>]*data-success-body="callback-form-body"[^>]*data-success-panel="callback-success"/);
  assert.match(dealerHtml, /id="apply-form"[^>]*data-success-body="apply-form"[^>]*data-success-panel="apply-form-success"/);
});
