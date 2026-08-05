const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const quote = fs.readFileSync(path.join(root, 'quote.html'), 'utf8');
const growth = fs.readFileSync(path.join(root, 'homepage-growth.js'), 'utf8');

test('homepage leads with the brief positioning and two distinct buying paths', () => {
  assert.match(home, /Your vehicle\.<br>Built for what comes next\./);
  assert.match(home, /Build My Quote/);
  assert.match(home, /Build a Project Brief/);
  assert.match(home, /data-intake-target="retail"/);
  assert.match(home, /data-intake-target="fleet"/);
});

test('homepage provides low-friction retail and fleet forms supported by the lead API', () => {
  assert.match(home, /id="quote-retail"[^>]+data-cms-form="retail"/);
  assert.match(home, /id="quote-fleet"[^>]+data-cms-form="fleet"/);
  for (const field of ['First Name', 'Email', 'Vehicle Year', 'Vehicle Make', 'Vehicle Model']) {
    assert.match(home, new RegExp(`name="${field}"`));
  }
  for (const field of ['Business Name', 'Contact Name', 'Business Email', 'Vehicle Count']) {
    assert.match(home, new RegExp(`name="${field}"`));
  }
  assert.ok((home.match(/name="services"/g) || []).length >= 10);
});

test('outcome packages replace product-only starting points', () => {
  for (const name of ['Truck Protection', 'Contractor Ready', 'Fleet Launch', 'Capital Signature Build', 'Tow Ready']) {
    assert.match(home, new RegExp(name));
  }
  assert.match(home, /One project owner from fitment to handoff\./);
});

test('unverified homepage claims called out by the brief are not published', () => {
  const disallowed = [
    /aggregateRating/,
    /Same-week/i,
    /Family-Owned 30\+ Years/i,
    /Authorized Patriot Liner/i,
    /IGL &amp; System X Certified/i,
    /Starting from <strong>/i,
    /only factory-certified/i
  ];
  disallowed.forEach((pattern) => assert.doesNotMatch(home, pattern));
});

test('quote page avoids unsupported response-time promises', () => {
  const disallowed = [
    /respond(?:s)? within 24 hours/i,
    /respond(?:s)? same business day/i,
    /within one business day/i,
    /same[- ]week/i,
    /same day/i,
    /24\s*[–-]\s*48\s*h/i,
    /5,000\+/i,
    /30\+[^<]*years/i,
    /get a free quote/i
  ];
  disallowed.forEach((pattern) => assert.doesNotMatch(quote, pattern));
  assert.match(quote, /BUILD THE <em>RIGHT PROJECT\.<\/em>/);
  assert.match(quote, /Fitment First/);
  assert.match(quote, /Retail \+ Fleet/);
});

test('conversion scaffolding covers path selection, clicks, starts, and completions', () => {
  assert.match(growth, /intake_path_selected/);
  assert.match(growth, /conversion_click/);
  assert.match(growth, /lead_form_start/);
  assert.match(growth, /service_interest_selected/);
  assert.match(growth, /lead_form_success/);
  assert.match(growth, /window\.dataLayer/);
});

test('homepage has unique element IDs', () => {
  const ids = [...home.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});

test('homepage structured data stays valid JSON', () => {
  const blocks = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.ok(blocks.length >= 2);
  blocks.forEach((block) => assert.doesNotThrow(() => JSON.parse(block[1])));
});
