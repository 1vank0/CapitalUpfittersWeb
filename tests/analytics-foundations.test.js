const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
function fixture(referrer = '') {
 const listeners={},scripts=[];
 const document={referrer,head:{appendChild:s=>scripts.push(s.src)},documentElement:{setAttribute:()=>{}},createElement:()=>({}),getElementById:()=>null,addEventListener:(k,f)=>(listeners[k]||=[]).push(f)};
 const window={location:new URL('https://capitalupfitters.com/services/tonneau')};
 vm.runInNewContext(fs.readFileSync('analytics.js','utf8'),{window,document,URL,URLSearchParams});
 return {window,scripts,fire:(name,event)=>(listeners[name]||[]).forEach(fn=>fn(event)),events:window.CU_ANALYTICS.events};
}
test('all CMS forms including project retain successful-submission semantics under gated taxonomy',()=>{
 for(const audience of ['retail','fleet','dealer','project']) {
  const f=fixture('https://gemini.google.com/app/private?secret=abc');
  const form={id:'quote-'+audience,getAttribute:()=>audience};const target={closest:s=>s==='form[data-cms-form]'?form:null};
  f.fire('focusin',{target});f.fire('focusin',{target});f.fire('submit',{target:form});
  assert.equal(f.events.filter(e=>e.name==='form_start').length,1);assert.equal(f.events.filter(e=>e.name==='form_submit').length,0);
  f.fire('cu:lead-success',{detail:{formId:form.id,leadId:'11111111-1111-4111-8111-111111111111',deliveryMode:'persisted_and_emailed'}});
  assert.equal(f.events.filter(e=>e.name==='form_submit').length,1);assert.equal(f.events[0].params.audience,audience);assert.equal(f.events[0].params.source,'gemini');
  assert.ok(!JSON.stringify(f.events).includes('private'));assert.equal(f.scripts.length,0);
 }
});
test('AI grouping rejects misleading hostname substring',()=>{
 const f=fixture('https://chatgpt.com.evil.example/');const form={id:'q',getAttribute:()=> 'retail'};f.fire('focusin',{target:{closest:s=>s==='form[data-cms-form]'?form:null}});assert.equal(f.events[0].params.source,'other');
});
test('unknown legacy CTA event does not bypass approved measurement taxonomy',()=>{
 const f=fixture();f.window.CU_ANALYTICS.track('cta_click',{link_url:'/quote?secret=private'});assert.equal(f.events.length,0);
});
