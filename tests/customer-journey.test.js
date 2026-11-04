const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
test('fleet Call buttons dial the shop instead of navigating to a quote', () => {
  const calls = [...read('fleet.html').matchAll(/<a\b([^>]*)>\s*Call \(301\) 304-1419<\/a>/g)];
  assert.ok(calls.length >= 3);
  for (const call of calls) assert.match(call[1], /href="tel:\+13013041419"/);
});
test('home does not restore the idle opacity dimming behavior', () => {
  for (const name of ['home.js', 'index.html']) {
    const code = read(name).replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[^]*?-->/g, '');
    assert.doesNotMatch(code, /\.style\.opacity\s*=\s*['"]?0\.02\b/);
  }
});
