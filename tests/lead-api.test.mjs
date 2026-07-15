import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const handler = require('../api/lead.js');

async function invoke({ body = {}, method = 'POST', contentType = 'application/json', fetchImpl }) {
  const previousFetch = global.fetch;
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 'test-key';
  if (fetchImpl) global.fetch = fetchImpl;

  const request = new EventEmitter();
  request.method = method;
  request.headers = { 'content-type': contentType };
  request.socket = { remoteAddress: '127.0.0.1' };

  const response = {
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; }
  };

  const result = new Promise((resolve, reject) => {
    response.end = (value) => {
      try {
        resolve({ status: response.statusCode, headers: response.headers, body: value ? JSON.parse(value) : {} });
      } catch (error) { reject(error); }
    };
  });

  const running = handler(request, response);
  queueMicrotask(() => {
    const serialized = JSON.stringify(body);
    if (serialized) request.emit('data', Buffer.from(serialized));
    request.emit('end');
  });

  try {
    await running;
    return await result;
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
}

test('rejects a lead without an email or phone', { concurrency: false }, async () => {
  const response = await invoke({ body: { form_type: 'retail' } });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Email or phone required.');
});

test('rejects malformed email addresses', { concurrency: false }, async () => {
  const response = await invoke({ body: { Email: 'not-an-email' } });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Enter a valid email address.');
});

test('does not report success when internal delivery fails', { concurrency: false }, async () => {
  const response = await invoke({
    body: { Phone: '(301) 555-0100', submission_id: 'test-failure' },
    fetchImpl: async () => ({ ok: false, status: 500, text: async () => 'provider failure' })
  });
  assert.equal(response.status, 502);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.delivered, false);
});

test('confirms success only after internal delivery succeeds', { concurrency: false }, async () => {
  const response = await invoke({
    body: { Phone: '(301) 555-0100', submission_id: 'test-success' },
    fetchImpl: async () => ({ ok: true, json: async () => ({ id: 'email_123' }) })
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.delivered, true);
  assert.equal(response.body.provider_id, 'email_123');
  assert.equal(response.body.submission_id, 'test-success');
});

test('requires JSON requests', { concurrency: false }, async () => {
  const response = await invoke({ body: { Phone: '3015550100' }, contentType: 'text/plain' });
  assert.equal(response.status, 415);
});
