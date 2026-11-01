const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const pages = ['gallery.html'].concat(
  fs.readdirSync(path.join(ROOT, 'services')).filter((f) => f.endsWith('.html')).map((f) => 'services/' + f)
);
const withFeed = pages.filter((f) => read(f).includes('data-gallery-feed='));

test('gallery feed is wired into the gallery and service pages', () => {
  assert.ok(withFeed.includes('gallery.html'));
  assert.ok(withFeed.length >= 12, 'expected gallery + service pages, got ' + withFeed.length);
});

test('every page with a feed target loads the script exactly once', () => {
  for (const f of withFeed) {
    const n = (read(f).match(/<script src="\/gallery-feed\.js" defer><\/script>/g) || []).length;
    assert.strictEqual(n, 1, f);
  }
});

test('service sections start hidden so empty feeds change nothing', () => {
  for (const f of withFeed.filter((p) => p !== 'gallery.html')) {
    const m = read(f).match(/<section[^>]*data-gallery-feed="section"[^>]*>/);
    assert.ok(m, f);
    assert.match(m[0], /\shidden[\s>]/, f);
    const slug = path.basename(f, '.html');
    assert.ok(m[0].includes('data-service="' + slug + '"'), f);
  }
});

test('gallery page keeps its static items and has no stale CMS block', () => {
  const html = read('gallery.html');
  assert.strictEqual((html.match(/class="gallery-item"/g) || []).length, 24);
  assert.ok(!html.includes('CMS: Gallery Wire'));
});

test('feed script only adds, never injects markup or structured data', () => {
  const js = read('gallery-feed.js');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/.test(js));
  assert.ok(!/ld\+json/.test(js));
  assert.ok(!/textContent\s*=\s*['"]{2}/.test(js), 'must not clear containers');
  assert.match(js, /credentials:\s*'omit'/);
  assert.match(js, /protocol !== 'https:'/);
});
