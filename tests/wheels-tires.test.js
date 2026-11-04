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
    submission_started_at: new Date(Date.now() - 10_000).toISOString(),
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
    submission_started_at: new Date(Date.now() - 10_000).toISOString(),
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
    submission_started_at: new Date(Date.now() - 10_000).toISOString(),
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

const html = fs.readFileSync(path.join(ROOT, 'services/wheels-tires.html'), 'utf8');
function wheelsBody(service = 'Wheels and tires') {
  return retailBody({Name:'Wheel Tester', 'First Name':'', 'Last Name':'', Email:'wheels@example.com',
    services:service, 'Vehicle Trim':'XLT 4WD', 'Parts Supply':'I already own parts; please review installation',
    Message:'Current 275/65R18. Stock suspension. Please review my preferred wheel offset.',
    utm_source:'customer-campaign',utm_campaign:'fall',landing_page:'https://example.test/start'});
}
test('wheel page retains supported lead identity, exact fields and honest receipt slots', () => {
  assert.match(html, /id="quote-retail" data-cms-form="retail" data-success-body="wt-form-body" data-success-panel="done"/);
  for(const name of ['services','Vehicle Year','Vehicle Make','Vehicle Model','Vehicle Trim','Parts Supply','Message','Name','Email','Phone']) assert.ok(html.includes(`name="${name}"`),name);
  for(const slot of ['data-cu-ref-slot','data-cu-confirmation-copy','data-cu-warning-slot']) assert.ok(html.includes(slot));
  assert.match(html,/src="\/lead-form.js"/); assert.match(html,/src="\/attribution.js"/);assert.match(html,/src="..\/quote-assist.js"/);
  assert.match(html,/data-media-slot="suspension"/); assert.ok(!/product=EcoHitch|price-feed|ecohitch-package/.test(html));
  assert.ok(!/quote-deeplink.js|quote.js/.test(html));
  assert.match(html,/href="#installed-quote" class="mab-btn mab-quote"/);
});
test('FAQ schema and visible answers match, and only one canonical exists', () => {
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  for(const q of schema['@graph'].find(x=>x['@type']==='FAQPage').mainEntity){assert.ok(html.includes('<summary>'+q.name+'</summary>'));assert.ok(html.includes('<p>'+q.acceptedAnswer.text+'</p>'));}
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
  assert.match(html,/capitalupfitters.com\/services\/wheels-tires.html/);
});
for(const [service, normalized] of [['Wheels and tires','wheels_and_tires'],['Wheels','Wheels'],['Tires','Tires'],['Wheel and tire fitment advice','wheel_and_tire_fitment_advice']]) {
 test(`wheel request ${service} reaches durable storage with real vehicle and attribution`, async()=>withRuntime(async()=>{
  let stored;
  global.fetch=async(url,options)=>{if(url==='https://persistence.test/api/leads/'){stored=JSON.parse(options.body);return jsonResponse({ok:true,persisted:true,reference:'CU-WHEELS'},201);}return jsonResponse({id:'email-id'});};
  const result=await invoke(wheelsBody(service));assert.equal(result.status,200);assert.equal(result.body.reference,'CU-WHEELS');assert.equal(result.body.customer_confirmation,true);
  assert.deepEqual(stored.services,[normalized]);assert.deepEqual(stored.vehicle,{year:2025,make:'Ford',model:'F-150',trim:'XLT 4WD'});
  assert.equal(stored.contact.fullName,'Wheel Tester');assert.equal(stored.attribution.source,'customer-campaign');assert.match(stored.preferences.notes,/Quote type: I already own parts/);assert.match(stored.preferences.notes,/275\/65R18/);
 }));
}
test('wheel request reports saved-only delivery honestly',async()=>withRuntime(async()=>{
 global.fetch=async(url)=>url==='https://persistence.test/api/leads/'?jsonResponse({ok:true,persisted:true,reference:'CU-SAVED'},201):jsonResponse({error:'email unavailable'},503);
 const result=await invoke(wheelsBody());assert.equal(result.status,200);assert.equal(result.body.delivery_mode,'persisted_only');assert.equal(result.body.customer_confirmation,false);assert.equal(result.body.reference,'CU-SAVED');
}));
test('wheel request storage failure does not claim success or send email',async()=>withRuntime(async()=>{
 global.fetch=async(url)=>{assert.equal(url,'https://persistence.test/api/leads/');return jsonResponse({ok:false,error:'unavailable'},503);};
 const result=await invoke(wheelsBody());assert.notEqual(result.status,200);assert.notEqual(result.body.ok,true);
}));
