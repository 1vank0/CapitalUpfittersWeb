/**
 * Tests for the quote-draft resolver.
 *
 * These require() and execute /cu-quote-draft.js — the exact file the
 * page loads. There is no transcription of the logic here; if the module
 * changes, these tests exercise the change.
 *
 * Run: node tests/quote-draft.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const D = require('../cu-quote-draft.js');

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;
const fresh = (over = {}) => Object.assign({
  v: 1, updatedAt: NOW - 1000,
  vehicle: { year: '2025', make: 'Acura', model: 'ADX' },
  services: ['bedliner', 'hitches'], audience: 'retail', source: 'find-my-fit'
}, over);

/** Minimal in-memory Storage. `mode` forces failure paths. */
function mkStorage(initial, mode) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem(k) { if (mode === 'throw-read') throw new Error('SecurityError'); return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { if (mode === 'throw-write' || mode === 'throw-read') throw new Error('QuotaExceeded'); map.set(k, v); },
    removeItem(k) { map.delete(k); },
    _dump: () => Object.fromEntries(map)
  };
}
const withDraft = (o, mode) => mkStorage({ [D.KEY]: JSON.stringify(o) }, mode);

let pass = 0, fail = 0;
const group = (n) => console.log('\n' + n + '\n');
function it(name, fn) {
  try { fn(); pass++; console.log('  PASS  ' + name); }
  catch (e) { fail++; console.error('  FAIL  ' + name + '\n        ' + e.message); process.exitCode = 1; }
}

group('A. vehicle precedence — URL is authoritative and never blended');

it('A1 full URL vehicle beats a different stored vehicle', () => {
  const r = D.resolve({ search: '?year=2021&make=Ford&model=F-150', storage: withDraft(fresh()), now: NOW });
  assert.deepStrictEqual(r.vehicle, { year: '2021', make: 'Ford', model: 'F-150' });
  assert.strictEqual(r.carried.vehicle, false);
});

it('A2 PARTIAL URL vehicle discards the stored vehicle WHOLE (no blending)', () => {
  const r = D.resolve({ search: '?make=Ford', storage: withDraft(fresh()), now: NOW });
  assert.strictEqual(r.vehicle.make, 'Ford');
  assert.strictEqual(r.vehicle.year, null, 'stored 2025 leaked in beside a URL make');
  assert.strictEqual(r.vehicle.model, null, 'stored ADX leaked in beside a URL make');
});

it('A3 stored vehicle is used when the URL carries none', () => {
  const r = D.resolve({ search: '', storage: withDraft(fresh()), now: NOW });
  assert.strictEqual(r.vehicle.make, 'Acura');
  assert.strictEqual(r.carried.vehicle, true);
});

group('B. per-field override — services and audience are independent');

it('B1 ?service= overrides services but NOT vehicle or audience', () => {
  const r = D.resolve({ search: '?service=tonneau,undercoating', storage: withDraft(fresh()), now: NOW });
  assert.deepStrictEqual(r.services, ['tonneau', 'undercoating']);
  assert.strictEqual(r.vehicle.make, 'Acura', 'vehicle was erased by a service param');
  assert.strictEqual(r.audience, 'retail', 'audience was erased by a service param');
});

it('B2 ?audience= overrides audience but NOT vehicle or services', () => {
  const r = D.resolve({ search: '?audience=fleet', storage: withDraft(fresh()), now: NOW });
  assert.strictEqual(r.audience, 'fleet');
  assert.strictEqual(r.vehicle.make, 'Acura');
  assert.deepStrictEqual(r.services, ['bedliner', 'hitches']);
});

it('B3 unrelated params erase nothing', () => {
  const r = D.resolve({ search: '?utm_source=google&gclid=abc&ref=x', storage: withDraft(fresh()), now: NOW });
  assert.strictEqual(r.vehicle.make, 'Acura');
  assert.deepStrictEqual(r.services, ['bedliner', 'hitches']);
  assert.strictEqual(r.audience, 'retail');
  assert.strictEqual(r.carried.any, true);
});

group('C. service id hygiene');

it('C1 duplicates are removed, order preserved', () => {
  assert.deepStrictEqual(D.cleanServiceIds(['bedliner', 'bedliner', 'hitches', 'BEDLINER']), ['bedliner', 'hitches']);
});
it('C2 invalid ids are dropped, not coerced', () => {
  assert.deepStrictEqual(D.cleanServiceIds(['ok-id', '<script>', 'a b', '', null, 42, 'x'.repeat(80)]), ['ok-id']);
});
it('C3 dedupe applies to URL-sourced services too', () => {
  const r = D.resolve({ search: '?service=bedliner,bedliner,hitches', storage: null, now: NOW });
  assert.deepStrictEqual(r.services, ['bedliner', 'hitches']);
});
it('C4 service count is capped', () => {
  const many = Array.from({ length: 30 }, (_, i) => 'svc-' + i);
  assert.strictEqual(D.cleanServiceIds(many).length, D.MAX_SERVICES);
});

group('D. audience validity');

it('D1 unknown audience values are rejected, not stored', () => {
  assert.strictEqual(D.cleanAudience('hacker'), null);
  assert.strictEqual(D.cleanAudience(''), null);
  assert.strictEqual(D.cleanAudience('FLEET'), 'fleet');
});
it('D2 an invalid ?audience= falls back to stored rather than blanking it', () => {
  const r = D.resolve({ search: '?audience=nonsense', storage: withDraft(fresh()), now: NOW });
  assert.strictEqual(r.audience, 'retail');
});

group('E. expiry and fail-closed');

it('E1 drafts older than 7 days are ignored', () => {
  const r = D.resolve({ search: '', storage: withDraft(fresh({ updatedAt: NOW - 7 * DAY - 1 })), now: NOW });
  assert.strictEqual(r.vehicle, null);
  assert.strictEqual(r.carried.any, false);
});
it('E2 exactly 7 days is treated as expired', () => {
  const r = D.resolve({ search: '', storage: withDraft(fresh({ updatedAt: NOW - 7 * DAY })), now: NOW });
  assert.strictEqual(r.vehicle, null);
});
it('E3 missing / non-numeric updatedAt fails closed', () => {
  for (const bad of [undefined, null, '123', NaN, 0, -5]) {
    const r = D.resolve({ search: '', storage: withDraft(fresh({ updatedAt: bad })), now: NOW });
    assert.strictEqual(r.vehicle, null, 'updatedAt=' + String(bad) + ' should fail closed');
  }
});
it('E4 schema mismatch fails closed (v2 draft is not read as v1)', () => {
  const r = D.resolve({ search: '', storage: withDraft(fresh({ v: 2 })), now: NOW });
  assert.strictEqual(r.vehicle, null);
});
it('E5 corrupt JSON fails closed without throwing', () => {
  for (const raw of ['{not json', '', 'null', '[]', '"str"', '123']) {
    const r = D.resolve({ search: '', storage: mkStorage({ [D.KEY]: raw }), now: NOW });
    assert.strictEqual(r.carried.any, false, 'raw=' + JSON.stringify(raw));
  }
});
it('E6 a storage read that THROWS is survivable', () => {
  const r = D.resolve({ search: '', storage: mkStorage({}, 'throw-read'), now: NOW });
  assert.strictEqual(r.carried.any, false);
});
it('E7 a storage write that THROWS returns null instead of propagating', () => {
  assert.strictEqual(D.write(mkStorage({}, 'throw-write'), fresh(), NOW), null);
});
it('E8 invalid nested values are sanitised, not trusted', () => {
  const r = D.resolve({ search: '', storage: withDraft(fresh({
    services: ['ok', '<img>', 'ok'], audience: 'not-real', vehicle: { year: '', make: 'X', model: 'Y' }
  })), now: NOW });
  assert.deepStrictEqual(r.services, ['ok']);
  assert.strictEqual(r.audience, null);
  assert.strictEqual(r.vehicle, null, 'a vehicle with no year is not a vehicle');
});

group('F. direct visit and migration');

it('F1 direct visit, no storage at all, is fully functional and empty', () => {
  const r = D.resolve({ search: '', storage: null, now: NOW });
  assert.deepStrictEqual([r.vehicle, r.services, r.audience, r.carried.any], [null, [], null, false]);
});
it('F2 direct visit with empty storage behaves the same', () => {
  const r = D.resolve({ search: '', storage: mkStorage({}), now: NOW });
  assert.strictEqual(r.carried.any, false);
});
it('F3 legacy cu_vehicle is migrated', () => {
  const s = mkStorage({ cu_vehicle: JSON.stringify({ year: '2019', make: 'Ram', model: '1500', ts: NOW - 1000 }) });
  const r = D.resolve({ search: '', storage: s, now: NOW });
  assert.strictEqual(r.vehicle.make, 'Ram');
  assert.strictEqual(r.carried.vehicle, true);
});
it('F4 an EXPIRED legacy cu_vehicle is not migrated', () => {
  const s = mkStorage({ cu_vehicle: JSON.stringify({ year: '2019', make: 'Ram', ts: NOW - 8 * DAY }) });
  assert.strictEqual(D.resolve({ search: '', storage: s, now: NOW }).vehicle, null);
});
it('F5 writing removes the legacy key so migration happens once', () => {
  const s = mkStorage({ cu_vehicle: JSON.stringify({ year: '2019', make: 'Ram', ts: NOW - 1000 }) });
  D.write(s, { vehicle: { year: '2020', make: 'Ford', model: 'F-150' }, services: ['bedliner'] }, NOW);
  assert.ok(!(D.LEGACY_KEY in s._dump()), 'legacy key survived the write');
  assert.ok(D.KEY in s._dump());
});
it('F6 a v1 draft takes precedence over a stale legacy key', () => {
  const s = mkStorage({
    [D.KEY]: JSON.stringify(fresh()),
    cu_vehicle: JSON.stringify({ year: '1999', make: 'Old', ts: NOW - 1000 })
  });
  assert.strictEqual(D.resolve({ search: '', storage: s, now: NOW }).vehicle.make, 'Acura');
});

group('G. privacy — the draft must never hold personal data');

it('G1 write() persists only the whitelisted fields', () => {
  const s = mkStorage({});
  D.write(s, {
    vehicle: { year: '2025', make: 'Ford', model: 'F-150' }, services: ['bedliner'], audience: 'retail',
    // everything below must be dropped
    name: 'Ivan', email: 'a@b.com', phone: '3013041419', vin: '1FT7W2BT0KEC12345',
    notes: 'call me', photos: ['data:image/png;base64,AAAA']
  }, NOW);
  const saved = JSON.parse(s._dump()[D.KEY]);
  assert.deepStrictEqual(Object.keys(saved).sort(), ['audience','services','source','updatedAt','v','vehicle'].sort());
  const blob = JSON.stringify(saved);
  for (const leak of ['Ivan', 'a@b.com', '3013041419', '1FT7W2BT0KEC12345', 'call me', 'base64'])
    assert.ok(!blob.includes(leak), 'leaked ' + leak + ' into localStorage');
});

group('H. round-trip');

it('H1 write -> resolve returns what was written', () => {
  const s = mkStorage({});
  D.write(s, { vehicle: { year: '2022', make: 'GMC', model: 'Sierra' },
               services: ['tonneau', 'tonneau', 'lighting'], audience: 'fleet', source: 'find-my-fit' }, NOW);
  const r = D.resolve({ search: '', storage: s, now: NOW });
  assert.deepStrictEqual(r.vehicle, { year: '2022', make: 'GMC', model: 'Sierra' });
  assert.deepStrictEqual(r.services, ['tonneau', 'lighting']);
  assert.strictEqual(r.audience, 'fleet');
});

group('I. wiring guards');

it('I1 quote.html loads the shared module and does not re-implement it', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'quote.html'), 'utf8');
  assert.ok(src.includes('cu-quote-draft.js'), 'quote.html does not load the shared module');
  assert.ok(src.includes('CUQuoteDraft'), 'quote.html does not call the shared module');
  assert.ok(!/localStorage\.getItem\(['"]cu_vehicle['"]\)/.test(src),
    'quote.html still reads cu_vehicle directly instead of going through the module');
});
it('I2 index.html writes through the shared module', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(src.includes('cu-quote-draft.js'), 'index.html does not load the shared module');
  assert.ok(src.includes('CUQuoteDraft'), 'index.html does not call the shared module');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
