const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
function setup(service='tonneau',product='BAKFlip MX4',bundle=true){
 const events={},docEvents={},button={disabled:true}, fields={product:{value:product},'Bed Length':{value:'6.5 ft'},'Customer Notes':{value:'Keep my rack'},Message:{value:''},'Vehicle Year':{value:''},'Vehicle Make':{value:''},'Vehicle Model':{value:''}};
 const receipt={};
 const form={id:'quote-retail',elements:fields,dataset:{serviceQuote:service,cuLeadAttached:'1'},querySelector(s){if(s==='button[type="submit"]')return button;if(s==='[data-pilot-bundle]')return {checked:bundle};return receipt[s]||(receipt[s]={textContent:''});},addEventListener(n,fn){events[n]=fn;}};
 vm.runInNewContext(read('service-quote.js'),{URLSearchParams,window:{location:{search:'?year=2025&make=Ford&model=F-150'}},document:{readyState:'complete',querySelectorAll:()=>[form],querySelector:()=>form,addEventListener:(n,fn)=>docEvents[n]=fn}});
 return{fields,events,docEvents,button,form,receipt};
}
test('inline quote populates truck once and preserves product, bundle, pricing context and notes',()=>{
 const p=setup();assert.equal(p.button.disabled,false);assert.equal(p.fields['Vehicle Year'].value,'2025');
 p.events.submit({preventDefault(){}});assert.match(p.fields.Message.value,/BAKFlip MX4/);assert.match(p.fields.Message.value,/\$1,250/);assert.match(p.fields.Message.value,/Keep my rack/);assert.match(p.fields.Message.value,/6.5 ft/);
 const api={require,process,console,module:{exports:{}}};vm.runInNewContext(read('api/lead.js')+'\nmodule.exports=buildPersistencePayload;',api);
 const body={form_id:'quote-retail',form_type:'retail',Name:'QA Example',Email:'test@example.com',services:['tonneau','bedliner'],utm_source:'partner'};for(const [k,v]of Object.entries(p.fields))body[k]=v.value;
 const mapped=api.module.exports(body);assert.equal(mapped.contact.fullName,'QA Example');assert.equal(mapped.vehicle.model,'F-150');assert.equal(mapped.services.length,2);assert.match(mapped.preferences.notes,/\$1,250/);assert.equal(mapped.attribution.source,'partner');
});
test('non-bundle and unknown products do not get a promised offer',()=>{
 const p=setup('tonneau','RetraxPRO MX',false);p.events.submit({});assert.doesNotMatch(p.fields.Message.value,/\$/);
 const b=setup('bedliner','',false);b.events.submit({});assert.doesNotMatch(b.fields.Message.value,/Bundle requested|Advertised cover/);
});
test('receipt distinguishes saved-only and absent confirmation email without response promises',()=>{
 const p=setup();p.docEvents['cu:lead-success']({detail:{formId:'quote-retail',reference:'REF-QA',deliveryMode:'persisted_only',customerConfirmation:false}});
 assert.match(p.receipt['[data-pilot-warning]'].textContent,/notification was delayed/);assert.match(p.receipt['[data-pilot-confirmation]'].textContent,/not sent/);assert.match(p.receipt['[data-pilot-reference]'].textContent,/REF-QA/);
});
test('pilot pages keep clean canonicals, inline API contracts, managed media and unique IDs',()=>{
 for(const page of ['bedliner','tonneau']){const h=read('services/'+page+'.html');assert.match(h,new RegExp('rel="canonical" href="https://www.capitalupfitters.com/services/'+page+'"'));assert.match(h,/data-service-quote=/);assert.match(h,/action="\/api\/lead" method="post"/);assert.match(h,/type="submit" disabled/);assert.match(h,/service-quote.js/);assert.match(h,/data-media-slot=/);assert.match(h,/data-gallery-feed-list/);const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);assert.equal((h.match(/<h1\b/g)||[]).length,1);}
});
