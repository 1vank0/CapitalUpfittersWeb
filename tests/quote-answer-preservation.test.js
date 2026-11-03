const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../quote.js'), 'utf8');
function fixture() {
  let selected = ['bedliner', 'tonneau'];
  let fields = [];
  const host = { innerHTML: '', classList: { add() {}, remove() {} } };
  const context = {
    Set, state: { adds: {} }, esc: value => String(value),
    document: {
      getElementById: () => host,
      querySelectorAll: selector => selector.startsWith('.tile')
        ? selected.map(id => ({ getAttribute: () => id })) : fields
    }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('var SVC_QUESTIONS'), source.indexOf('function isDmvZip')), context);
  return { context, host, select: ids => { selected = ids; }, fields: values => { fields = values.map(([id,value]) => ({ id,value })); } };
}
test('bedliner and tonneau ask bed length once and retain it when service selection changes', () => {
  const f = fixture();
  f.context.renderSvcDetails();
  assert.match(f.host.innerHTML, /id="sq-bed-length"/);
  assert.doesNotMatch(f.host.innerHTML, /id="sq-tonneau-bed"/);
  f.fields([['sq-bed-length', '6.5 ft'], ['sq-cab', 'Crew / SuperCrew']]);
  f.context.renderSvcDetails();
  assert.match(f.host.innerHTML, /value="6.5 ft" selected/);
  assert.match(f.host.innerHTML, /value="Crew \/ SuperCrew" selected/);
  f.select(['tonneau']);
  f.context.renderSvcDetails();
  assert.match(f.host.innerHTML, /id="sq-tonneau-bed"/);
  assert.match(f.host.innerHTML, /value="6.5 ft" selected/);
  f.fields([['sq-tonneau-bed', '6.5 ft']]);
  assert.deepEqual(Array.from(f.context.collectSvcAnswers()), ['Bed Length: 6.5 ft']);
});
test('re-render keeps answers, removes inactive answers from payload, and retains them on reselection', () => {
  const f = fixture();
  f.select(['tint']);
  f.fields([['sq-tint-current', 'Aftermarket (remove)']]);
  f.context.renderSvcDetails();
  f.select([]);
  f.context.renderSvcDetails();
  f.fields([]);
  assert.deepEqual(Array.from(f.context.collectSvcAnswers()), []);
  f.select(['tint']);
  f.context.renderSvcDetails();
  assert.match(f.host.innerHTML, /value="Aftermarket \(remove\)" selected/);
});
test('chosen hitch wiring is reused without asking again or sending contradictory dropdown data', () => {
  const f = fixture();
  f.select(['hitch']);
  f.fields([['sq-wiring', 'No']]);
  f.context.state.adds.hitch = new Set(['7pin']);
  f.context.renderSvcDetails();
  assert.doesNotMatch(f.host.innerHTML, /id="sq-wiring"/);
  assert.deepEqual(Array.from(f.context.collectSvcAnswers()), ['Wiring Needed: 7-pin']);
  delete f.context.state.adds.hitch;
  f.fields([]);
  f.context.renderSvcDetails();
  assert.match(f.host.innerHTML, /id="sq-wiring"/);
});
test('submission always restores original notes even for short builds or thrown dispatch', () => {
  const start = source.indexOf('  try {\n    if (typeof form.requestSubmit');
  const body = source.slice(start, source.indexOf('\n});', start));
  for (const throws of [false, true]) {
    const notesEl = { value: 'Vehicle: generated\nNotes: Original request' };
    const context = { notesEl, notesOrig: 'Original request', form: { requestSubmit() { if (throws) throw Error('dispatch'); } } };
    vm.createContext(context);
    try { vm.runInContext(body, context); } catch (error) { assert.equal(error.message, 'dispatch'); }
    assert.equal(notesEl.value, 'Original request');
  }
});
