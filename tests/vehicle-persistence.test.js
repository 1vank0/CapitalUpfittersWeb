/**
 * Deterministic tests for the Find My Fit -> quote.html vehicle handoff.
 *
 * Why this file exists: the browser preview strips query strings, so
 * URL-parameter precedence could not be proven there. That is a tooling
 * limitation, not a reason to ship the rule untested — the precedence
 * decision (a shared link must describe its own vehicle, not whatever
 * this browser last looked at) is exactly the kind of rule that breaks
 * silently and wrongly.
 *
 * The resolver below is a faithful transcription of the logic in
 * quote.html. It is duplicated rather than imported because quote.html
 * is a static page with an inline IIFE and no module boundary; the
 * guard test at the bottom fails if the page's logic drifts from this
 * copy, so the duplication cannot rot unnoticed.
 *
 * Run: node tests/vehicle-persistence.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * Mirrors the resolution order in quote.html.
 *
 * `getItem` is a function, not a value, on purpose: quote.html calls
 * localStorage.getItem() INSIDE its try block, so a browser that throws
 * on storage access (Safari private mode, blocked third-party storage)
 * is caught. Passing a pre-read value instead would move the throw
 * outside the try and test a call site that does not exist.
 */
function resolveVehicle({ search = '', getItem = () => null, now = Date.now() }) {
  const params = new URLSearchParams(search);
  let year = params.get('year');
  let make = params.get('make');
  let model = params.get('model');
  let carried = false;

  if (!year && !make && !model) {
    try {
      const saved = JSON.parse(getItem('cu_vehicle') || 'null');
      if (saved && saved.year && (now - (saved.ts || 0)) < SEVEN_DAYS) {
        year = saved.year; make = saved.make; model = saved.model;
        carried = true;
      }
    } catch (e) { /* storage unavailable — stay un-prefilled */ }
  }
  return { year, make, model, carried };
}

const stored = (o) => () => JSON.stringify(o);   // returns a getItem-style fn
const FRESH = { year: '2025', make: 'Acura', model: 'ADX', ts: Date.now() };
let passed = 0;
function it(name, fn) {
  try { fn(); passed++; console.log('  PASS  ' + name); }
  catch (e) { console.error('  FAIL  ' + name + '\n        ' + e.message); process.exitCode = 1; }
}

console.log('\nvehicle handoff: URL vs stored state\n');

it('URL params win over stored state (the case the browser could not test)', () => {
  const r = resolveVehicle({ search: '?year=2021&make=Ford&model=F-150', getItem: stored(FRESH) });
  assert.strictEqual(r.make, 'Ford', 'stored Acura leaked past the URL');
  assert.strictEqual(r.year, '2021');
  assert.strictEqual(r.model, 'F-150');
  assert.strictEqual(r.carried, false, 'a URL vehicle must not be labelled as carried over');
});

it('a PARTIAL url vehicle still suppresses storage entirely', () => {
  // Guards a subtle bug: falling back per-field would mix a URL make with
  // a stored year and silently invent a vehicle that never existed.
  const r = resolveVehicle({ search: '?make=Ford', getItem: stored(FRESH) });
  assert.strictEqual(r.make, 'Ford');
  assert.strictEqual(r.year, null, 'stored year leaked in beside a URL make');
  assert.strictEqual(r.model, null);
});

it('stored state is used when the URL has no vehicle', () => {
  const r = resolveVehicle({ search: '', getItem: stored(FRESH) });
  assert.strictEqual(r.make, 'Acura');
  assert.strictEqual(r.carried, true, 'must be flagged so the banner says "looked up earlier"');
});

it('unrelated query params do not count as a vehicle', () => {
  const r = resolveVehicle({ search: '?service=bedliner&utm_source=google', getItem: stored(FRESH) });
  assert.strictEqual(r.make, 'Acura', 'a service param should not block the stored vehicle');
  assert.strictEqual(r.carried, true);
});

console.log('\nexpiry and safety\n');

it('stored state expires after 7 days', () => {
  const stale = { ...FRESH, ts: Date.now() - (SEVEN_DAYS + 60000) };
  const r = resolveVehicle({ search: '', getItem: stored(stale) });
  assert.strictEqual(r.year, null, 'a stale vehicle must not silently pre-fill');
  assert.strictEqual(r.carried, false);
});

it('state exactly at the boundary is treated as expired', () => {
  const edge = { ...FRESH, ts: Date.now() - SEVEN_DAYS };
  assert.strictEqual(resolveVehicle({ search: '', getItem: stored(edge) }).carried, false);
});

it('a record with no timestamp is treated as expired, not as epoch-fresh', () => {
  const r = resolveVehicle({ search: '', getItem: stored({ year: '2020', make: 'Ram', model: '1500' }) });
  assert.strictEqual(r.carried, false, 'missing ts must fail closed');
});

it('direct visit with no stored data works and pre-fills nothing', () => {
  const r = resolveVehicle({ search: '', getItem: () => null });
  assert.deepStrictEqual([r.year, r.make, r.model, r.carried], [null, null, null, false]);
});

it('corrupt storage does not throw (private mode / manual tampering)', () => {
  for (const bad of ['{not json', '', 'null', '[]', '"str"', '{"year":null}']) {
    const r = resolveVehicle({ search: '', getItem: () => bad });
    assert.strictEqual(r.carried, false, 'corrupt value ' + JSON.stringify(bad) + ' should fail closed');
  }
});

it('a storage read that throws is survivable', () => {
  const r = resolveVehicle({ search: '', getItem() { throw new Error('SecurityError'); } });
  assert.strictEqual(r.carried, false);
});

console.log('\ndrift guard\n');

it('quote.html still contains the logic this file mirrors', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'quote.html'), 'utf8');
  assert.ok(src.includes("localStorage.getItem('cu_vehicle')"), 'quote.html no longer reads cu_vehicle');
  assert.ok(src.includes('if (!pYear && !pMake && !pModel)'),
    'the all-fields-empty precedence guard changed — update this test to match');
  assert.ok(src.includes('7 * 24 * 60 * 60 * 1000'), 'the 7-day expiry changed');
});

it('index.html still writes the vehicle Find My Fit resolves', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(src.includes("localStorage.setItem('cu_vehicle'"), 'index.html no longer persists the vehicle');
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ' (with failures)' : '') + '\n');
