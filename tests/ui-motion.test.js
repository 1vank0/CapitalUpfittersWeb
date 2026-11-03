const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../animations.js'), 'utf8');
function run(reduced = false) {
  let callback, change, cancelled = 0, observed = 0, animated = 0;
  const preference = { matches: reduced, addEventListener: (_, fn) => { change = fn; } };
  const target = { parentElement: { children: [] }, contains: () => false,
    addEventListener() {}, animate() { animated++; return { cancel() { cancelled++; }, finished: Promise.resolve() }; } };
  target.parentElement.children.push(target);
  class Observer { constructor(fn) { callback = fn; } observe() { observed++; } unobserve() {} disconnect() {} }
  const document = { activeElement: null, querySelector: selector => selector === '.site-nav' ? {} : null, querySelectorAll: () => [target] };
  vm.runInNewContext(source, { document, window: { matchMedia: () => preference, IntersectionObserver: Observer, addEventListener() {} }, IntersectionObserver: Observer });
  return { enter: () => callback?.([{ target, isIntersecting: true }]), change: () => change(), metrics: () => ({ cancelled, observed, animated }) };
}
test('shared motion reveals only observed marketing targets and cancels on preference changes', () => {
  const page = run();
  assert.equal(page.metrics().observed, 1);
  page.enter();
  assert.equal(page.metrics().animated, 1);
  page.change();
  assert.equal(page.metrics().cancelled, 1);
});
test('reduced motion does not observe or animate shared UI', () => {
  const page = run(true);
  page.enter();
  assert.deepEqual(page.metrics(), { observed: 0, animated: 0, cancelled: 0 });
});
