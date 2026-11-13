const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
function fixture(config={},url='https://capitalupfitters.com/services/tonneau',fail=false){
 const listeners={},scripts=[],requests=[],attrs={};
 const document={referrer:'https://example.org/?email=secret@example.com',head:{appendChild:s=>scripts.push(s.src)},documentElement:{setAttribute:(k,v)=>attrs[k]=v},createElement:()=>({}),getElementById:()=>null,addEventListener:(k,f)=>(listeners[k]||=[]).push(f)};
 const window={location:new URL(url),fetch:async(...args)=>{requests.push(args);if(fail)throw Error('offline');return {ok:true,json:async()=>config};}};
 vm.runInNewContext(fs.readFileSync('analytics.js','utf8'),{window,document,URL,URLSearchParams});
 return {window,document,scripts,requests,attrs,fire:(n,e)=>(listeners[n]||[]).forEach(f=>f(e)),settle:()=>new Promise(r=>setImmediate(r))};
}
test('empty flags and failed config yield zero third-party measurement requests',async()=>{
 for(const fail of [false,true]){const f=fixture({},undefined,fail);await f.settle();assert.deepEqual(f.scripts,[]);assert.equal(f.requests.length,1);assert.equal(f.requests[0][0],'/api/measurement-config');assert.equal(f.window.CU_ANALYTICS.ga4Enabled,false);assert.equal(f.window.CU_ANALYTICS.clarityEnabled,false);}
});
test('invalid IDs cannot inject script paths; debug query does not enable tags',async()=>{
 const f=fixture({ga4Id:'G-TEST/<script>',clarityId:'bad/url'},'https://capitalupfitters.com/?cu_analytics=debug');await f.settle();assert.deepEqual(f.scripts,[]);
});
test('GA and Clarity flags independent; Clarity masks before loading, blocks query URLs',async()=>{
 const f=fixture({ga4Id:'G-TEST1234',clarityId:'abc12345'});await f.settle();assert.equal(f.scripts.length,2);assert.equal(f.attrs['data-clarity-mask'],'true');
 const q=fixture({ga4Id:'G-TEST1234',clarityId:'abc12345'},'https://capitalupfitters.com/services/tonneau?email=secret@example.com#token');await q.settle();assert.equal(q.scripts.length,1);assert.ok(!JSON.stringify(q.window.dataLayer).includes('secret'));assert.ok(!JSON.stringify(q.window.dataLayer).includes('token'));
});
test('all ten event names work through safe taxonomy, reject unknown event and free text',()=>{
 const f=fixture(); const a=f.window.CU_ANALYTICS;
 for(const name of a.eventNames)a.track(name,{email:'private@example.com',model:'private text',page_path:'/quote?secret=1',source:'private@example.com'});
 a.track('arbitrary',{email:'x'});assert.equal(a.events.length,10);assert.ok(!JSON.stringify(a.events).includes('private'));assert.ok(!JSON.stringify(a.events).includes('secret'));
});
test('successful lead recorded once, not on attempt, discard or missing ID',()=>{
 const f=fixture();const form={id:'quote-retail',getAttribute:()=> 'retail'};
 const target={closest:s=>s==='form[data-cms-form]'?form:null};f.fire('focusin',{target});f.fire('focusin',{target});assert.equal(f.window.CU_ANALYTICS.events.length,1);
 f.fire('submit',{target:form});assert.equal(f.window.CU_ANALYTICS.events.length,1);
 f.fire('cu:lead-success',{detail:{formId:form.id,deliveryMode:'discarded',leadId:'11111111-1111-4111-8111-111111111111'}});assert.equal(f.window.CU_ANALYTICS.events.length,1);
 f.fire('submit',{target:form});f.fire('cu:lead-success',{detail:{formId:form.id,deliveryMode:'persisted_only',leadId:'11111111-1111-4111-8111-111111111111'}});
 f.fire('submit',{target:form});f.fire('cu:lead-success',{detail:{formId:form.id,deliveryMode:'persisted_only',leadId:'11111111-1111-4111-8111-111111111111'}});
 assert.equal(f.window.CU_ANALYTICS.events.filter(e=>e.name==='form_submit').length,1);
});
test('quote step and phone click hooks work without loading tags',()=>{
 const f=fixture();f.fire('cu:quote-step',{detail:{initial:true,step:0}});f.fire('cu:quote-step',{detail:{step:1}});
 const a={getAttribute:k=>k==='href'?'tel:+13013041419':null,closest:()=>null};f.fire('click',{target:{closest:()=>a}});
 assert.deepEqual(Array.from(f.window.CU_ANALYTICS.events,e=>e.name),['quote_step','call_click']);assert.equal(f.scripts.length,0);
});
test('public config returns only validated IDs, empty default and no-store',()=>{
 const handler=require('../api/measurement-config');const saved={ga:process.env.NEXT_PUBLIC_GA4_ID,cl:process.env.NEXT_PUBLIC_CLARITY_ID};
 try{delete process.env.NEXT_PUBLIC_GA4_ID;delete process.env.NEXT_PUBLIC_CLARITY_ID;let body;const headers={};handler({}, {setHeader:(k,v)=>headers[k]=v,end:x=>body=JSON.parse(x)});assert.deepEqual(body,{ga4Id:'',clarityId:''});assert.equal(headers['Cache-Control'],'no-store');
 process.env.NEXT_PUBLIC_GA4_ID='G-TEST1234';process.env.NEXT_PUBLIC_CLARITY_ID='abc12345';handler({}, {setHeader:()=>{},end:x=>body=JSON.parse(x)});assert.deepEqual(body,{ga4Id:'G-TEST1234',clarityId:'abc12345'});
 }finally{for(const [key,value] of [['NEXT_PUBLIC_GA4_ID',saved.ga],['NEXT_PUBLIC_CLARITY_ID',saved.cl]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
