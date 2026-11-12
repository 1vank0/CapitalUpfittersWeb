const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const names = ['TruXedo TruXport','TruXedo Pro X15','Westin Hard Tri-Fold','BAKFlip MX4','RetraxPRO MX','Help me choose a tonneau cover'];
function landing(search='') {
 const choices = names.map(value=>({value,checked:false}));
 const summary={textContent:''}, added=[],events={},pageEvents={};
 const form={querySelectorAll:()=>choices,appendChild:input=>added.push(input),addEventListener:(name,fn)=>events[name]=fn};
 vm.runInNewContext(read('bed-covers.js'),{URLSearchParams,Array,window:{location:{search},addEventListener:(name,fn)=>pageEvents[name]=fn},document:{querySelector:()=>form,getElementById:()=>summary,createElement:()=>({})}});
 return {choices,summary,added,events,pageEvents};
}
function quote(search, checked=false, notes='') {
 const fields={'f-notes':{value:notes},'f-year':{value:'',options:[],appendChild(){}},'f-make-sel':{value:'',options:[{value:'Ford'}]},'f-make-other':{value:''},'f-model':{value:''}};
 const choices=[],tileClicks=[];
 const document={getElementById:id=>fields[id],createElement:()=>({}),querySelectorAll:()=>['tonneau','hitch'].map(id=>({dataset:{svc:id},click:()=>tileClicks.push(id)})),querySelector:selector=>({getAttribute:()=>checked?'true':'false',click:()=>choices.push(selector)})};
 vm.runInNewContext(read('quote-deeplink.js'),{URLSearchParams,setTimeout:fn=>fn(),window:{location:{search},CU_QUOTE:{syncMake(){},goStep(){}}},document});
 return {fields,choices,tileClicks};
}
test('bed cover inline quote offers nine verified models and a help choice with one set of truck/contact fields',()=>{
 const html=read('services/tonneau.html');
 const form=html.match(/<form class="partner-fitment-form"[\s\S]*?<\/form>/)[0];
 assert.match(form,/data-cms-form="retail"/);assert.match(form,/action="\/api\/lead" method="post"/);
 assert.equal((form.match(/type="radio" name="product"/g)||[]).length,10);
 for(const name of names)assert.ok(form.includes('value="'+name+'" required'));
 for(const field of ['Vehicle Year','Vehicle Make','Vehicle Model','Name','Email','Phone'])assert.equal(form.split('name="'+field+'"').length-1,1);
 assert.match(form,/name="services" value="tonneau"/);assert.match(form,/type="submit" disabled/);
 assert.match(html,/No payment collected here/);assert.match(html,/not checkout or a reserved appointment/);
});
test('bed cover selection is safe, updates live summary and restores on back/forward',()=>{
 const p=landing('?product=BAKFlip+MX4');assert.equal(p.choices[3].checked,true);assert.equal(p.summary.textContent,'BAKFlip MX4');
 p.choices[3].checked=false;p.choices[4].checked=true;p.events.change();assert.equal(p.summary.textContent,'RetraxPRO MX');
 p.choices[4].checked=false;p.choices[5].checked=true;p.pageEvents.pageshow();assert.equal(p.summary.textContent,names[5]);
 const unknown=landing('?product=%3Cscript%3E');assert.equal(unknown.choices.some(c=>c.checked),false);assert.equal(unknown.summary.textContent,'Choose a cover above, or ask us to help.');
});
test('known cover models preselect existing quote types and persist exact product notes',()=>{
 for(const [name,type] of names.slice(0,5).map((n,i)=>[n,['soft','soft','trifold','trifold','retrax'][i]])){
  const q=quote('?service=tonneau&product='+encodeURIComponent(name));
  assert.deepEqual(q.tileClicks,['tonneau']);
  assert.deepEqual(q.choices,['.opt[data-svc="tonneau"][data-kind="base"][data-opt="'+type+'"]']);
  assert.equal(q.fields['f-notes'].value,'Product requested: '+name);
 }
});
test('help, unknown and prototype product names never force a cover option; checked option is not toggled off',()=>{
 for(const product of [names[5],'constructor','toString','__proto__','<script>','Unlisted cover'])assert.equal(quote('?service=tonneau&product='+encodeURIComponent(product)).choices.length,0);
 assert.equal(quote('?service=tonneau&product=BAKFlip+MX4',true).choices.length,0);
 assert.equal(quote('?service=hitch&product=BAKFlip+MX4').choices.length,0);
 assert.equal(quote('?service=tonneau&product=BAKFlip+MX4',false,'Existing customer notes').fields['f-notes'].value,'Existing customer notes');
});
test('tonneau SEO route, FAQ schema and safe product claims agree with rendered markup',()=>{
 const html=read('services/tonneau.html');const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.match(html,/rel="canonical" href="https:\/\/www.capitalupfitters.com\/services\/tonneau"/);
 assert.match(html,/name="robots" content="index, follow"/);
 for(const q of schema['@graph'].find(x=>x['@type']==='FAQPage').mainEntity){assert.ok(html.includes('<summary>'+q.name+'</summary>'));assert.ok(html.includes('<p>'+q.acceptedAnswer.text+'</p>'));}
 const main=html.match(/<main[\s\S]*?<\/main>/)[0];
 assert.doesNotMatch(main,/150\+|2–5%|zero drilling|no drilling|Same-day|waterproof seals/i);
 assert.ok(main.includes('data-media-slot="tonneau"'));assert.ok(main.includes('data-gallery-feed-list'));
 assert.doesNotMatch(main,/<img[^>]+src="(?:https?:|\.\.\/assets)/);
 for(const id of ['benefits-heading','pricing-heading','process-heading','geo-heading-tonneau','faq-heading','related-heading'])assert.ok(main.includes('id="'+id+'"'));
});
test('bed cover layout is scoped, adapts to phones, and exposes keyboard and reduced-motion safeguards',()=>{
 const css=read('bed-covers.css');for(const text of ['.bed-cover-page','@media(max-width:700px)','grid-template-columns:1fr','prefers-reduced-motion','min-height:44px'])assert.ok(css.includes(text));
 assert.ok(read('stealth-package.css').includes(':focus-visible'));
 const html=read('services/tonneau.html');assert.match(html,/id="bc-selection" role="status" aria-live="polite"/);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});

test('expanded verified models are selectable and preserve exact product notes',()=>{
 for(const [name,type] of [['BAKFlip MX4 EZ-Lift','trifold'],['BAKFlip MX4 TS','trifold'],['RetraxPRO XR','retrax'],['RetraxPRO EZ-OFF FRC-4000','retrax']]){
  assert.ok(read('services/tonneau.html').includes('value="'+name+'" required'));
  const q=quote('?service=tonneau&product='+encodeURIComponent(name));assert.equal(q.fields['f-notes'].value,'Product requested: '+name);assert.ok(q.choices[0].includes('data-opt="'+type+'"'));
 }
});
