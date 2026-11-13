const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { sanitize, route } = require('../attribution.js');

test('attribution removes personal URLs, arbitrary tags and identifiers', () => {
  const result = sanitize({
    landing_page: 'https://capitalupfitters.com/services/tonneau?email=private@example.com#name',
    form_page: '/quote?phone=3015550100', referrer: 'https://chatgpt.com/c/private-conversation?secret=abc',
    utm_source: 'chatgpt.com', utm_medium: 'profile', utm_campaign: 'winter-undercoating',
    utm_term: 'private@example.com', utm_content: 'Customer John', gclid: 'private-id',
    lead_source: 'Injected Customer Name', ip_address: '1.2.3.4', user_agent: 'private-agent'
  });
  assert.equal(result.landing_page, '/services/tonneau');
  assert.equal(result.form_page, '/quote');
  assert.equal(result.referrer, 'https://chatgpt.com');
  assert.equal(result.lead_source, 'AI Referral');
  assert.equal(result.utm_campaign, 'winter-undercoating');
  assert.ok(!JSON.stringify(result).includes('private'));
  assert.equal(result.gclid, '');
  assert.equal(result.utm_term, '');
});

test('malicious and unknown fields cannot pass the fixed attribution vocabulary', () => {
  const result = sanitize({ landing_page: '/services/private@example.com', form_page: 'javascript:alert(1)', referrer: 'https://chatgpt.com.evil.example/name', utm_source: 'customer@example.com', utm_medium: ['social'], utm_campaign: 'customer-3015550100' });
  assert.equal(result.landing_page, '');
  assert.equal(result.form_page, '');
  assert.equal(result.referrer, '');
  assert.equal(result.utm_source, '');
  assert.equal(result.utm_campaign, '');
  assert.equal(result.lead_source, 'Direct');
  assert.equal(route('/services/bedliner.html'), '/services/bedliner');
});

test('browser capture uses coarse session source with no network or visitor identifier', () => {
  const storage = new Map(); let removed = false;
  const window = {
    document: { referrer: 'https://gemini.google.com/app/private?token=secret' },
    location: new URL('https://capitalupfitters.com/services/tonneau?utm_source=chatgpt.com&email=private@example.com'),
    sessionStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) },
    localStorage: { removeItem: k => { removed = k === 'cu_attr_v1'; } }
  };
  vm.runInNewContext(fs.readFileSync('attribution.js', 'utf8'), { window, URL, URLSearchParams });
  assert.equal(window.CUAttribution.get().landing_page, '/services/tonneau');
  window.location = new URL('https://capitalupfitters.com/quote?name=private');
  const next = window.CUAttribution.get();
  assert.equal(next.landing_page, '/services/tonneau');
  assert.equal(next.form_page, '/quote');
  assert.equal(next.utm_source, 'chatgpt.com');
  assert.equal(removed, true);
  assert.ok(![...storage.values()].join('').includes('private'));
});

test('browser capture survives blocked storage', () => {
  const window = { document: { referrer: '' }, location: new URL('https://capitalupfitters.com/quote'), sessionStorage: { getItem() { throw Error(); }, setItem() { throw Error(); } }, localStorage: { removeItem() { throw Error(); } } };
  vm.runInNewContext(fs.readFileSync('attribution.js', 'utf8'), { window, URL, URLSearchParams });
  assert.equal(window.CUAttribution.get().form_page, '/quote');
});
