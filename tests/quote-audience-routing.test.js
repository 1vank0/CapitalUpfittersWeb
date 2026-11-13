const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('quote.js', 'utf8');
const start = source.indexOf("  var container = document.querySelector('.cu-p6');");
const end = source.indexOf('  // Listen for lead-form.js success', start);
function fixture(query) {
  const handlers = {}, state = { mode: null, scrolls: 0 };
  const pills = ['retail', 'fleet', 'dealer', 'project'].map(mode => ({
    dataset: { mode }, classList: { toggle() {} }, attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(k, fn) { this[k] = fn; }
  }));
  const modes = pills.map(p => ({ dataset: { modeBody: p.dataset.mode }, classList: { toggle(_, value) { this.active = value; } } }));
  const location = { href: 'https://example.com/quote' + query, search: query };
  const context = { URL, URLSearchParams, window: { location, history: {
    pushState(_, __, url) { location.href = String(url); location.search = url.search; }
  }, addEventListener(k, fn) { handlers[k] = fn; } }, document: {
    body: { classList: { toggle(_, on) { state.sticky = on; } } },
    querySelector(s) { return s === '.cu-p6' ? { setAttribute(_, v) { state.mode = v; } } : { scrollIntoView() { state.scrolls++; } }; },
    querySelectorAll(s) { return s === '.cu-p6-pill' ? pills : modes; },
    getElementById() { return { style: {} }; }
  } };
  vm.runInNewContext(source.slice(start, end), context);
  return { state, pills, modes, location, handlers };
}
test('direct audience and legacy links select the intended form without scrolling', () => {
  for (const [query, expected] of [
    ['', 'retail'], ['?audience=fleet', 'fleet'], ['?type=commercial', 'fleet'],
    ['?audience=commercial', 'fleet'], ['?audience=dealer', 'dealer'],
    ['?audience=government', 'project'], ['?audience=project', 'project'], ['?service=industrial', 'project'], ['?service=industrial-coatings', 'project'], ['?audience=retail&type=commercial', 'retail'],
    ['?audience=__proto__', 'retail'], ['?audience=unknown&type=commercial', 'fleet'],
    ['?service=bedliner', 'retail']
  ]) {
    const f = fixture(query);
    assert.equal(f.state.mode, expected, query);
    assert.equal(f.state.scrolls, 0);
    assert.equal(f.state.sticky, expected === 'retail');
    assert.equal(f.pills.filter(p => p.attrs['aria-selected'] === 'true').length, 1);
    assert.equal(f.modes.filter(p => p.classList.active).length, 1);
    assert.equal(f.pills.find(p => p.dataset.mode === expected).tabIndex, 0);
  }
});
test('tab changes preserve service and attribution; history restores selected audience', () => {
  const f = fixture('?type=commercial&service=hitch&utm_source=partner');
  f.pills[2].click();
  const url = new URL(f.location.href);
  assert.equal(url.searchParams.get('audience'), 'dealer');
  assert.equal(url.searchParams.get('type'), null);
  assert.equal(url.searchParams.get('service'), 'hitch');
  assert.equal(url.searchParams.get('utm_source'), 'partner');
  assert.equal(f.state.mode, 'dealer');
  f.location.search = '?type=commercial&service=hitch&utm_source=partner';
  f.handlers.popstate();
  assert.equal(f.state.mode, 'fleet');
  assert.equal(f.state.scrolls, 1);
  f.location.search = '?audience=retail';
  f.handlers.popstate();
  assert.equal(f.state.mode, 'retail');
});
test('fleet primary CTA uses the canonical audience parameter', () => {
  const html = fs.readFileSync('fleet.html', 'utf8');
  assert.match(html, /href="\.\/quote\?audience=fleet"[^>]*>Get a Commercial Fleet Quote/);
  assert.doesNotMatch(html, /quote\.html\?type=commercial/);
});
