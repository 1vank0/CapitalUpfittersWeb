const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'services/commercial-wraps.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'vehicle-branding.js'), 'utf8');
function harness() {
  const formEvents = {}, documentEvents = {}, clicks = {};
  const elements = {};
  for (const key of ['confirmation','reference','warning']) elements[key] = { textContent:'', hidden:false };
  const form = { id:'quote-fleet', addEventListener:(name,fn) => { formEvents[name]=fn; } };
  const coverage = { value:'Not sure yet' };
  const panel = { querySelector: selector => elements[selector.match(/branding-(\w+)/)[1]] };
  const link = { addEventListener:(name,fn) => { clicks[name]=fn; }, getAttribute:()=> 'Full wrap' };
  const document = {
    body:{classList:{contains:()=>true}},
    getElementById: id => ({'quote-fleet':form,'vb-coverage':coverage,'branding-form-success':panel}[id]),
    querySelectorAll:()=>[link], addEventListener:(name,fn)=>{documentEvents[name]=fn;}
  };
  vm.runInNewContext(script, {document});
  return {formEvents,documentEvents,clicks,coverage,elements};
}
test('branding retains canonical route, native lead bridge, media slot and approved gallery', () => {
  assert.match(html, /rel="canonical" href="https:\/\/www.capitalupfitters.com\/services\/commercial-wraps"/);
  assert.match(html, /id="quote-fleet" data-cms-form="fleet"/);
  for (const field of ['Business Name','Contact Name','Business Email','Phone','Vehicle Count','Vehicle Types','Timeline','Message']) assert.ok(html.includes(`name="${field}"`));
  assert.match(html, /name="Vehicle Count" type="number" min="1" max="10000" step="1"/);
  assert.match(html, /name="services" value="Wraps &amp; Branding"/);
  assert.match(html, /data-media-slot="commercial-wraps"/);
  assert.match(html, /data-service="commercial-wraps"/);
  for (const src of ['/lead-form.js','/attribution.js','/gallery-feed.js']) assert.ok(html.includes(`src="${src}"`));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length, new Set(ids).size, 'IDs must be unique');
  for (const [,id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id),`anchor ${id} exists`);
});
test('coverage links fill the brief without submitting', () => {
  const h = harness(); h.clicks.click(); assert.equal(h.coverage.value,'Full wrap');
});
test('graphics context reaches durable Message once on retries and preserves multiline fleet notes', () => {
  const h = harness();
  const input = {'Message':'8 Transits\n4 pickups; two units at a time','Branding Coverage':'Full wrap','Branding Artwork':'Logo and brand guidelines','utm_source':'partner','Vehicle Count':'1e2'};
  const serialize = () => { const data = new Map(Object.entries(input)); h.formEvents.formdata({formData:data}); return data; };
  const first = serialize(), second = serialize();
  assert.equal(first.get('Message'),second.get('Message'));
  assert.match(first.get('Message'),/Coverage: Full wrap\nArtwork: Logo and brand guidelines\n8 Transits\n4 pickups/);
  assert.equal(input.Message,'8 Transits\n4 pickups; two units at a time');
  assert.equal(first.get('utm_source'),'partner');
  assert.equal(first.get('Vehicle Count'),'100');
  assert.equal(first.has('Branding Coverage'),false);
  assert.equal(first.has('Branding Artwork'),false);
});
test('receipt honors confirmed email state, reference, saved-only warning and unrelated forms', () => {
  const h = harness();
  h.documentEvents['cu:lead-success']({detail:{formId:'other',customerConfirmation:true}});
  assert.equal(h.elements.confirmation.textContent,'');
  h.documentEvents['cu:lead-success']({detail:{formId:'quote-fleet',reference:'CU-123',customerConfirmation:false,deliveryMode:'persisted_only'}});
  assert.equal(h.elements.reference.textContent,'Reference: CU-123');
  assert.match(h.elements.confirmation.textContent,/email CapitalUpfitters/);
  assert.equal(h.elements.warning.hidden,false);
  h.documentEvents['cu:lead-success']({detail:{formId:'quote-fleet',reference:'CU-456',customerConfirmation:true,deliveryMode:'persisted_and_emailed'}});
  assert.match(h.elements.confirmation.textContent,/Check your email/);
  assert.equal(h.elements.warning.hidden,true);
});
