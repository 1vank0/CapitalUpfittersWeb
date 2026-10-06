const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const test = require('node:test');
const handler = require('../api/lead.js');

const FIXED_KEY = '22222222-2222-4222-8222-222222222222';
const LOCAL_ORIGIN = 'http://localhost';
let seq = 0;

function request(body) {
  const raw = JSON.stringify(body);
  seq += 1;
  const req = Readable.from([raw]);
  req.method = 'POST';
  req.headers = {
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(raw)),
    origin: LOCAL_ORIGIN,
    host: 'localhost',
    'x-forwarded-proto': 'http',
    'x-forwarded-for': `10.1.0.${(seq % 250) + 1}`
  };
  req.socket = { remoteAddress: '127.0.0.1' };
  return req;
}

function response() {
  let resolve;
  const done = new Promise((c) => { resolve = c; });
  const res = {
    statusCode: 200, headers: {},
    setHeader(n, v) { this.headers[n.toLowerCase()] = v; },
    end(body) { this.body = body; resolve(this); }
  };
  res.done = done;
  return res;
}

async function invoke(body) {
  const req = request(body);
  const res = response();
  await handler(req, res);
  await res.done;
  return { status: res.statusCode, body: JSON.parse(res.body) };
}

function retail(overrides = {}) {
  return {
    form_type: 'retail',
    form_id: 'quote-retail',
    'First Name': 'QA',
    'Last Name': 'Spam',
    Email: 'retail@example.com',
    Phone: '3015550199',
    'Vehicle Year': '2024',
    'Vehicle Make': 'Ford',
    'Vehicle Model': 'F-150',
    services: ['bedliner'],
    Message: 'Looking for a bedliner quote.',
    idempotency_key: FIXED_KEY,
    submission_started_at: new Date(Date.now() - 10000).toISOString(),
    ...overrides
  };
}

async function withRuntime(run) {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  const originalWarn = console.warn;
  process.env.RESEND_API_KEY = 'test_key';
  process.env.LEAD_PERSISTENCE_URL = 'https://persistence.test/api/leads/';
  process.env.LEAD_PERSISTENCE_ORIGIN = 'https://capitalupfitters.com';
  process.env.LEAD_BRIDGE_SECRET = 'test-only-lead-bridge-secret-at-least-32-bytes';
  process.env.LEAD_ALLOWED_ORIGIN = LOCAL_ORIGIN;
  console.warn = () => {};
  let fetches = 0;
  global.fetch = async () => {
    fetches += 1;
    return { ok: true, status: 201, json: async () => ({ ok: true, persisted: true, reference: 'CU-SPAM' }), text: async () => '{}' };
  };
  try {
    await run(() => fetches);
  } finally {
    global.fetch = originalFetch;
    console.warn = originalWarn;
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  }
}

test('soft-spam: too-fast submission is silently discarded', async () => {
  await withRuntime(async (fetches) => {
    const result = await invoke(retail({
      submission_started_at: new Date().toISOString() // ~0ms age
    }));
    assert.equal(result.status, 200);
    assert.equal(result.body.delivery_mode, 'discarded');
    assert.equal(fetches(), 0);
  });
});

test('soft-spam: message with more than 2 URLs is discarded', async () => {
  await withRuntime(async (fetches) => {
    const result = await invoke(retail({
      Message: 'See https://a.com and https://b.com and https://c.com for details'
    }));
    assert.equal(result.status, 200);
    assert.equal(result.body.delivery_mode, 'discarded');
    assert.equal(fetches(), 0);
  });
});

test('soft-spam: disposable email domain is discarded', async () => {
  await withRuntime(async (fetches) => {
    const result = await invoke(retail({ Email: 'bot@mailinator.com' }));
    assert.equal(result.status, 200);
    assert.equal(result.body.delivery_mode, 'discarded');
    assert.equal(fetches(), 0);
  });
});

test('soft-spam: normal lead still persists', async () => {
  await withRuntime(async (fetches) => {
    const result = await invoke(retail());
    assert.equal(result.status, 200);
    assert.notEqual(result.body.delivery_mode, 'discarded');
    assert.ok(fetches() >= 1);
  });
});
