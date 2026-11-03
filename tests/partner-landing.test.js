const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
function deepLink(search, restoredNotes = '') {
  const elements = {
    'f-year': {value:'',options:[],appendChild(o){this.options.push(o);}},
    'f-make-sel': {value:'',options:[{value:'Ford'},{value:'Other'}]},
    'f-make-other': {value:''}, 'f-model': {value:''}, 'f-notes': {value:restoredNotes}
  };
  const clicks = [];
  const context = {URLSearchParams,setTimeout:fn=>fn(),window:{location:{search},CU_QUOTE:{syncMake(){},goStep(){}}},document:{getElementById:id=>elements[id],createElement:()=>({}),querySelectorAll:()=>['hitch','tonneau','boards'].map(id=>({dataset:{svc:id},click(){clicks.push(id);}}))}};
  vm.runInNewContext(read('quote-deeplink.js'),context);
  return {elements, clicks};
}
test('brand handoff preselects service and retains vehicle and product intent in existing notes',()=>{
  const f=deepLink('?service=hitch&year=2024&make=Ford&model=Explorer&product=Stealth+Hitches&purchase_status=Already+own&intended_use=Rack+only&part_details=ABC123');
  assert.equal(f.elements['f-model'].value,'Explorer');
  assert.equal(f.elements['f-year'].value,'2024');
  assert.equal(f.elements['f-make-sel'].value,'Ford');
  assert.deepEqual(f.clicks,['hitch']);
  assert.equal(f.elements['f-notes'].value,'Product requested: Stealth Hitches\nParts status: Already own\nIntended use: Rack only\nPart / fitment details: ABC123');
});
test('brand intent never overwrites restored customer notes and bounds untrusted URL text',()=>{
  assert.equal(deepLink('?product=Retrax','My existing request').elements['f-notes'].value,'My existing request');
  const f=deepLink('?product='+encodeURIComponent('x'.repeat(200)+'\n<script>'));
  assert.equal(f.elements['f-notes'].value,'Product requested: '+'x'.repeat(80));
});
test('legacy product links map to real service tiles',()=>{
  for(const [slug,expected] of [['stealth-hitch-rack','hitch'],['stealth-hitch-combo','hitch'],['ecohitch','hitch'],['amp-powerstep','boards'],['bakflip','tonneau'],['retrax','tonneau']]){
    assert.deepEqual(deepLink('?service='+slug).clicks,[expected]);
  }
});
test('six referral/product pages retain canonical URLs and use existing quote GET handoff',()=>{
  for(const slug of ['stealth-hitches','ecohitch','bakflip','retrax','amp-research','etrailer-installation']){
    const html=read('services/'+slug+'.html');
    assert.match(html,new RegExp('rel="canonical" href="https://www.capitalupfitters.com/services/'+slug+'\\.html"'));
    assert.match(html,/class="partner-fitment-form" action="\.\.\/quote.html" method="get"/);
    assert.match(html,/name="product"/);
    assert.match(html,/name="purchase_status"/);
    assert.match(html,/not a purchase or a reserved appointment/);
    assert.equal((html.match(/id="partner-quote-title"/g)||[]).length,1);
    assert.match(html,/<!-- cu:header -->/);
  }
});
test('new pages have sitemap entries and are discoverable from categories',()=>{
  for(const slug of ['amp-research','etrailer-installation'])assert.ok(read('sitemap.xml').includes('/services/'+slug+'.html'));
  assert.ok(read('services/running-boards.html').includes('./amp-research.html'));
  assert.ok(read('services/hitches.html').includes('./etrailer-installation.html'));
});
test('landing script passes actual campaign context without manufacturing referral sources',()=>{
  const appended=[];
  vm.runInNewContext(read('partner-landing.js'),{URLSearchParams,window:{location:{search:'?utm_source=StealthHitches&utm_medium=referral'}},document:{querySelectorAll:()=>[{elements:{namedItem:()=>null},appendChild:x=>appended.push(x)}],createElement:()=>({})}});
  assert.deepEqual(appended.map(x=>[x.name,x.value]),[['utm_source','StealthHitches'],['utm_medium','referral']]);
});
