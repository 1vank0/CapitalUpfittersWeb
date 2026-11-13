const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture(query = '', referrer = '', enabled = false) {
  const listeners = {}, scripts = [], calls = [];
  const forms = Object.fromEntries(['retail', 'fleet', 'dealer', 'project'].map(type => [type, { id: `quote-${type}`, getAttribute: k => k === 'data-cms-form' ? type : null }]));
  const location = new URL('https://www.capitalupfitters.com/services/tonneau' + query);
  const document = { referrer, readyState: 'complete', createElement: () => ({}), head: { appendChild: s => scripts.push(s.src) }, querySelector: () => null, getElementById: id => forms[id.replace('quote-', '')], addEventListener: (event, handler) => (listeners[event] ||= []).push(handler) };
  const window = { location, gtag: (...args) => calls.push(args) };
  let source = fs.readFileSync('analytics.js', 'utf8');
  if (enabled) source = source.replace("var GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'", "var GA4_MEASUREMENT_ID = 'G-TEST123456'");
  vm.runInNewContext(source, { window, document, URL, URLSearchParams });
  return { window, scripts, calls, forms, fire: (name, event) => (listeners[name] || []).forEach(fn => fn(event)), events: window.CU_ANALYTICS.events };
}
test('GA4 stays disabled without measurement ID, classifies AI source without leaking query', () => {
  const f = fixture('?utm_source=chatgpt.com&email=private@example.com');
  f.window.CU_ANALYTICS.track('phone_click', { page_path: '/services/tonneau', email: 'private@example.com' });
  assert.equal(f.window.CU_ANALYTICS.ga4Enabled, false);
  assert.ok(!f.scripts.some(s => s.includes('google')));
  assert.equal(f.events[0].params.ai_source, 'chatgpt');
  assert.ok(!JSON.stringify(f.events).includes('private'));
});
test('all CMS form types including project and inline retail start once and submit only after success', () => {
  for (const type of ['retail', 'fleet', 'dealer', 'project']) {
    const f = fixture('', 'https://gemini.google.com/app/private?secret=abc', true);
    const form = f.forms[type];
    const target = { closest: s => s === 'form[data-cms-form]' ? form : null };
    f.fire('focusin', { target }); f.fire('change', { target });
    assert.equal(f.events.filter(e => e.name === 'quote_start').length, 1);
    f.fire('submit', { target: form });
    assert.equal(f.events.filter(e => e.name === 'quote_submit').length, 0);
    f.fire('cu:lead-success', { detail: { formId: form.id } });
    f.fire('cu:lead-success', { detail: { formId: form.id } });
    assert.equal(f.events.filter(e => e.name === 'quote_submit').length, 1);
    assert.equal(f.calls.filter(c => c[1] === 'generate_lead').length, 1);
    assert.equal(f.events[0].params.ai_source, 'gemini');
    const config = f.calls.find(c => c[0] === 'config')[2];
    assert.equal(config.page_referrer, 'https://gemini.google.com');
    assert.equal(config.page_location, 'https://www.capitalupfitters.com/services/tonneau');
  }
});
test('CTA analytics strips potentially personal destination query and fragment', () => {
  const f = fixture();
  const a = { textContent: 'Get Quote', getAttribute: () => '/quote?email=private@example.com#name', closest: s => s.includes('.btn-primary') ? a : null };
  f.fire('click', { target: { closest: () => a } });
  assert.equal(f.events[0].params.link_url, '/quote');
  assert.ok(!JSON.stringify(f.events).includes('private'));
});
test('AI grouping uses exact domains, not a misleading hostname substring', () => {
  assert.equal(fixture('', 'https://chatgpt.com.evil.example/').window.CU_ANALYTICS.track('phone_click', {}), undefined);
  const f = fixture('', 'https://chatgpt.com.evil.example/'); f.window.CU_ANALYTICS.track('phone_click', {});
  assert.equal(f.events[0].params.ai_source, 'other_or_direct');
});
test('lead attribution recognizes Gemini before Google organic and preserves lead contract', () => {
  let stored;
  const window = { location: new URL('https://www.capitalupfitters.com/services/tonneau'), localStorage: { getItem: () => null, setItem: (_, value) => { stored = value; } } };
  vm.runInNewContext(fs.readFileSync('attribution.js', 'utf8'), { window, document: { referrer: 'https://gemini.google.com/app/abc' }, navigator: { userAgent: 'test' }, URL, URLSearchParams });
  const context = window.CUAttribution.get();
  assert.equal(context.lead_source, 'ChatGPT / AI Referral');
  assert.equal(context.referrer_domain, 'gemini.google.com');
  assert.ok(stored);
});
