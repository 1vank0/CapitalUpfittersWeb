const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const pricing = require('../hitch-pricing.js');
const ROOT = path.resolve(__dirname, '..');

test('approved labor rates and minimum are applied', () => {
  assert.deepEqual(pricing.rates, { standard: 165, csp: 195, minimum: 220 });
  assert.equal(pricing.labor(1, 'parts-labor'), 220);
  assert.equal(pricing.labor(2, 'parts-labor'), 330);
  assert.equal(pricing.labor(2, 'csp'), 390);
});

test('mobile estimate remains a separate 150–200 fee', () => {
  const result = pricing.estimate('csp', 'standard', 'rack', 'mobile');
  assert.equal(result.laborLow, 390);
  assert.equal(result.laborHigh, 585);
  assert.equal(result.mobileLow, 150);
  assert.equal(result.mobileHigh, 200);
});

test('hitch quote requires CSP details and mobile prepayment acknowledgment', () => {
  const html = fs.readFileSync(path.join(ROOT, 'hitch-quote.html'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'hitch-quote.js'), 'utf8');
  assert.match(html, /name="Parts Supply" value="parts-labor"/);
  assert.match(html, /name="Parts Supply" value="csp"/);
  assert.match(html, /name="Mobile Prepayment Accepted"/);
  assert.match(html, /paid in full before they can be scheduled/i);
  assert.match(script, /cspParts\.required = csp/);
  assert.match(script, /\['h-address', 'h-workspace', 'h-prepay'\]/);
  assert.match(script, /document\.getElementById\(id\)\.required = mobile/);
});

test('the general quote form exposes the same hitch choices', () => {
  const html = fs.readFileSync(path.join(ROOT, 'quote.html'), 'utf8');
  assert.match(html, /id="quote-retail"/);
  assert.match(html, /Parts \+ Labor — \$165\/hour labor/);
  assert.match(html, /Labor Only \(CSP\) — \$195\/hour labor/);
  assert.match(html, /Mobile — add \$150–\$200/);
  assert.match(html, /all mobile services must be paid in full/i);
});

test('the general quote service chooser is grouped and explains each service', () => {
  const html = fs.readFileSync(path.join(ROOT, 'quote.html'), 'utf8');
  assert.match(html, /Protection & Appearance/);
  assert.match(html, /Truck Bed & Access/);
  assert.match(html, /Towing & Performance/);
  assert.match(html, /Business & Specialty/);
  assert.match(html, /class="t-sub"/);
  assert.match(html, /class="t-icon"/);
  assert.match(html, /Start with one or select several for a package quote/);
});

test('each service appears in exactly one chooser group', () => {
  const html = fs.readFileSync(path.join(ROOT, 'quote.html'), 'utf8');
  const servicesBlock = html.match(/const SERVICES = \[([\s\S]*?)\n\];\nconst MAX_SERVICES/);
  const groupsBlock = html.match(/const SERVICE_GROUPS = \[([\s\S]*?)\n\];\n\n\/\* =+/);
  assert.ok(servicesBlock && groupsBlock);
  const serviceIds = [...servicesBlock[1].matchAll(/^\s*id:'([^']+)', name:/gm)].map((match) => match[1]);
  const groupedIds = [...groupsBlock[1].matchAll(/ids:\[([^\]]+)\]/g)]
    .flatMap((match) => [...match[1].matchAll(/'([^']+)'/g)].map((idMatch) => idMatch[1]));
  assert.deepEqual([...groupedIds].sort(), [...serviceIds].sort());
  assert.equal(new Set(groupedIds).size, groupedIds.length);
});
