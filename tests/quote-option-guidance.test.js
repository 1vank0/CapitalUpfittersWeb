const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../quote.js'), 'utf8');
function functionSource(name, nextName) {
  return source.slice(source.indexOf('function ' + name + '('), source.indexOf('function ' + nextName + '('));
}
test('bedliner help explains existing choices without adding or preselecting options', () => {
  const state = { pick: {} };
  const context = { state, esc: String, optionCard: (service, option) => `<option data-id="${option.id}"></option>` };
  vm.createContext(context);
  vm.runInContext(functionSource('panelHTML', 'columnCount'), context);
  const html = context.panelHTML({ id: 'bedliner', name: 'Bedliner', sub: 'Existing copy', base: [{ id: 'std' }, { id: 'prem' }, { id: 'wells' }] });
  assert.match(html, /<summary>Help me choose<\/summary>/);
  assert.match(html, /Choose one option below to continue/);
  assert.match(html, /href="tel:\+13013041419"/);
  assert.equal((html.match(/<option /g) || []).length, 3);
  assert.deepEqual(state.pick, {});
  const other = context.panelHTML({ id: 'tint', name: 'Tint', sub: 'Existing copy', base: [{ id: 'film' }] });
  assert.doesNotMatch(other, /Help me choose/);
});
test('selected but unconfigured service explains the next action without changing state', () => {
  const label = { hidden: true, textContent: '' };
  const tile = { dataset: { svc: 'bedliner' }, classList: { toggle() {} }, setAttribute() {} };
  const state = { open: ['bedliner'], pick: {}, adds: {} };
  const context = { grid: {}, MAX_SERVICES: 12, state, $$: () => [tile], $: () => label, svc: () => ({ base: [] }) };
  vm.createContext(context);
  vm.runInContext(functionSource('refreshTiles', 'refreshSummary'), context);
  context.refreshTiles();
  assert.equal(label.hidden, false);
  assert.equal(label.textContent, 'Choose an option below to continue');
  assert.deepEqual(state.pick, {});
});
test('continue label names the actual next task, not internal zero-based numbering', () => {
  assert.match(source, /ready \? 'Review & contact'/);
  assert.doesNotMatch(source, /ready \? 'Continue to Step 2'/);
});
