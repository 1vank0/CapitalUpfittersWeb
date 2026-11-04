const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
function run(search = '') {
  const radios = ['Bike rack or cargo carrier only', 'Trailer towing: verify towing kit and wiring', 'Help me choose the correct setup'].map(value => ({value, checked:false}));
  const fields = {year:{value:''},make:{value:''},model:{value:''},purchase_status:{value:'Need parts and installation',options:[{value:'Need parts and installation'},{value:'Already own the part; installation requested'},{value:'Comparing options before purchase'}]}};
  const output = Object.fromEntries(['sp-package-summary','sp-vehicle-summary','sp-includes-summary'].map(id=>[id,{textContent:''}]));
  const events = {}, pageEvents = {};
  const form = {elements:{namedItem:name=>fields[name]},querySelector:()=>radios.find(r=>r.checked),querySelectorAll:()=>radios,addEventListener:(event,fn)=>events[event]=fn};
  vm.runInNewContext(read('stealth-package.js'),{URLSearchParams,Array,window:{location:{search},addEventListener:(event,fn)=>pageEvents[event]=fn},document:{querySelector:()=>form,getElementById:id=>output[id]}});
  return {radios,fields,output,events,pageEvents};
}
test('Stealth selection and vehicle summary updates safely without HTML interpretation',()=>{
 const p=run(); assert.equal(p.output['sp-package-summary'].textContent,'Choose your setup below.');
 p.radios[0].checked=true;p.fields.year.value=' 2024 ';p.fields.make.value='BMW';p.fields.model.value='<img onerror=alert(1)>';
 p.events.input();assert.equal(p.output['sp-package-summary'].textContent,'Rack + installation');assert.equal(p.output['sp-vehicle-summary'].textContent,'2024 BMW <img onerror=alert(1)>');
 p.radios[0].checked=false;p.radios[1].checked=true;p.events.change();assert.equal(p.output['sp-package-summary'].textContent,'Towing + installation');
});
test('Stealth query preselection accepts only known packages and parts statuses',()=>{
 const p=run('?intended_use=Trailer+towing%3A+verify+towing+kit+and+wiring&purchase_status=Already+own+the+part%3B+installation+requested');
 assert.equal(p.radios[1].checked,true);assert.match(p.output['sp-includes-summary'].textContent,/supplied kit/);
 const bad=run('?intended_use=Invented+package&purchase_status=Free'); assert.equal(bad.radios.some(r=>r.checked),false);assert.equal(bad.fields.purchase_status.value,'Need parts and installation');
});
test('Stealth back/forward restores summary from current form state',()=>{
 const p=run();p.radios[2].checked=true;p.fields.model.value='X5';p.pageEvents.pageshow();assert.equal(p.output['sp-package-summary'].textContent,'Help choosing a setup');assert.equal(p.output['sp-vehicle-summary'].textContent,'X5');
});
test('Stealth native GET form and help fallback work without JavaScript and make no checkout promise',()=>{
 const html=read('services/stealth-hitches.html');
 assert.match(html,/<form class="partner-fitment-form" action="\.\.\/quote.html" method="get">/);
 assert.equal((html.match(/type="radio" name="intended_use"/g)||[]).length,3);
 assert.match(html,/type="submit" formnovalidate/);assert.match(html,/name="year" inputmode="numeric"/);
 assert.match(html,/No payment collected/);assert.doesNotMatch(html,/>Buy now|>Checkout|\$\d/i);
 assert.match(html,/src="\.\.\/partner-landing.js" defer/);
 assert.doesNotMatch(html,/<img[^>]+src="(?:https?:|\.\.\/assets)/);
});
test('Stealth FAQ visible answers agree with retained structured data',()=>{
 const html=read('services/stealth-hitches.html');const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 for(const q of schema['@graph'].find(s=>s['@type']==='FAQPage').mainEntity){assert.ok(html.includes('<summary>'+q.name+'</summary>'));assert.ok(html.includes('<p>'+q.acceptedAnswer.text+'</p>'));}
});
test('Stealth layout is scoped and has mobile, reduced motion and visible focus rules',()=>{
 const css=read('stealth-package.css');for(const token of ['.stealth-page','@media(max-width:700px)','prefers-reduced-motion',':focus-visible','grid-template-columns:1fr','min-height:50px'])assert.ok(css.includes(token));
});
