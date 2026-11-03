import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const header = read('partials/header.html');
const ids = new Set([...header.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
assert.equal(ids.size, [...header.matchAll(/\bid="([^"]+)"/g)].length, 'Header IDs must be unique');
for (const [, id] of header.matchAll(/\baria-controls="([^"]+)"/g)) {
  assert.ok(ids.has(id), `Disclosure target ${id} must exist`);
}
for (const [, href] of header.matchAll(/\bhref="(\.\/[^"#]*)(?:#[^"]*)?"/g)) {
  const target = resolve(root, href);
  assert.ok(existsSync(target), `Navigation destination ${href} must exist`);
}
assert.ok(header.includes('<dialog'), 'Mobile navigation must use native modal focus containment');
assert.ok(!header.includes('role="menu"'), 'Site links use disclosure navigation, not application menu roles');
assert.ok(header.includes('href="tel:+13013041419"'), 'The shop call action must remain available');

const directory = read('services/index.html');
const imageNeeds = read('docs/IMAGE-NEEDS.md');
const cards = [...directory.matchAll(/<a href="(\.\/[^\"]+)" class="service-hub-card" data-category="([^"]+)"/g)];
assert.equal(cards.length, 15, 'All existing directory service destinations must remain available');
for (const [, href, categories] of cards) {
  assert.ok(existsSync(resolve(root, 'services', href)), `Service card ${href} must have a destination`);
  assert.ok(categories.split(/\s+/).includes('all'), `Service card ${href} must be visible in All services`);
}
for (const [, slot] of directory.matchAll(/data-image-need="([^"]+)"/g)) {
  assert.ok(imageNeeds.includes('`' + slot + '`'), `Directory image ${slot} needs a documented brief`);
}
assert.ok(directory.includes('id="service-results" role="status"'), 'Service filtering must announce its result count');
assert.ok(!directory.includes('role="tablist"'), 'Service filters are toggle buttons, not tabs');
assert.ok(directory.includes('aria-label="Filter services by category" hidden'), 'Inactive filters stay hidden without JavaScript');

let managed = 0;
const skip = new Set(['.git', '.openai', 'node_modules', 'ui-before']);
function visit(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(item.name)) continue;
    const path = join(dir, item.name);
    if (item.isDirectory()) visit(path);
    else if (item.name.endsWith('.html')) {
      const source = readFileSync(path, 'utf8');
      if (!source.includes('<!-- cu:header -->')) continue;
      managed++;
      for (const name of ['ui-system.css', 'site-nav.js']) {
        const count = [...source.matchAll(new RegExp(`(?:href|src)="[^"<>]*${name.replace('.', '\\.')}[?]?[^"<>]*"`, 'g'))].length;
        assert.equal(count, 1, `${path} must load ${name} exactly once`);
      }
    }
  }
}
visit(root);

const css = read('ui-system.css');
function color(token) {
  const hex = css.match(new RegExp(`--ui-${token}:\\s*#([a-fA-F0-9]{6})`))?.[1];
  assert.ok(hex, `${token} must be a declared color token`);
  return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
}
function luminance(rgb) {
  return rgb.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
}
for (const [foreground, background] of [['ink','white'], ['body','white'], ['muted','white'], ['muted','mist'], ['white','ink']]) {
  const values = [luminance(color(foreground)), luminance(color(background))].sort((a,b) => b-a);
  const ratio = (values[0] + .05) / (values[1] + .05);
  assert.ok(ratio >= 4.5, `${foreground} on ${background} must meet WCAG AA (got ${ratio})`);
  console.log(`contrast ${foreground}/${background}: ${ratio.toFixed(2)}:1`);
}
console.log(`UI contracts pass (${managed} shared-header pages, valid disclosure targets and navigation routes).`);
