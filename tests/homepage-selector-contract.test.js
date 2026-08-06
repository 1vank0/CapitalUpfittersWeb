const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');

function pathwayHref(name) {
  const tag = homepage.match(
    new RegExp(`<a\\b[^>]*\\bdata-lead-path="${name}"[^>]*>`, 'i')
  );
  assert.ok(tag, `missing ${name} lead pathway`);

  const href = tag[0].match(/\bhref="([^"]+)"/i);
  assert.ok(href, `missing href for ${name} lead pathway`);
  return href[1];
}

test('homepage exposes one project pathway selector', () => {
  assert.equal((homepage.match(/<section class="funnel-section"/g) || []).length, 1);
  assert.match(homepage, /<h2 id="funnel-heading">Select Your Project Pathway\.<\/h2>/);
  assert.equal((homepage.match(/\bdata-lead-path=/g) || []).length, 4);
});

test('each project pathway routes to its supported destination', () => {
  assert.equal(pathwayHref('retail'), './quote.html?audience=retail');
  assert.equal(pathwayHref('fleet'), './quote.html?audience=fleet');
  assert.equal(pathwayHref('dealer'), './quote.html?audience=dealer');
  assert.equal(pathwayHref('industrial'), './services/industrial-coatings.html');
});

test('selector includes keyboard focus, mobile, and reduced-motion treatments', () => {
  assert.match(styles, /\.pathway-card:focus-visible/);
  assert.match(styles, /@media \(max-width: 640px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test('static implementation does not leave inactive React or Tailwind source', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'components', 'LeadGenSelector.tsx')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'tailwind.config.ts')), false);
});
