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
