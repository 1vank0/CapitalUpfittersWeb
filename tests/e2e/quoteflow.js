const { chromium } = require('playwright-core');
const OUT='/workspace/capital-upfitters-audit/brand-qa/priority';
(async()=>{
  const b = await chromium.launch({channel:'chrome'});
  const res={};
  for (const W of [390,1280]) {
    const ctx = await b.newContext({viewport:{width:W,height:W<800?844:900}, isMobile:W<800, hasTouch:W<800, deviceScaleFactor:2});
    const p = await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(/warn|error/.test(m.type()))errs.push(m.type()+': '+m.text().slice(0,200))});
    let payload=null;
    await p.route(/patriotliner\.site|\.mp4/, r=>r.abort());
    await p.route('**/api/lead**', async r=>{ payload=r.request().postData(); require('fs').writeFileSync('/tmp/payload-'+W+'.json',payload); await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,reference:'TEST-1',delivery_mode:'email'})}); });
    await p.goto('http://localhost:8765/quote.html',{waitUntil:'load'});
    await p.waitForTimeout(800);
    const vis = s=>p.$eval(s,e=>{const r=e.getBoundingClientRect();return getComputedStyle(e).display!=='none'&&r.height>0}).catch(()=>false);
    const r={W, step0:await vis('#step0'), step1:await vis('#step1'), mab:await vis('.mobile-action-bar'), next:await p.textContent('#nextLabel')};
    await p.screenshot({path:`${OUT}/quote-step1-vehicle-${W}.png`});
    // validation: click continue empty
    await p.click('#nextBtn'); await p.waitForTimeout(300);
    r.stillStep0AfterEmpty = await vis('#step0');
    await p.selectOption('#f-year','2021');
    await p.selectOption('#f-make-sel','Other');
    r.otherShown = await vis('#f-make-other');
    await p.fill('#f-make-other','Rivian');
    await p.selectOption('#f-make-sel','Ford');
    r.otherHiddenAgain = !(await vis('#f-make-other'));
    await p.fill('#f-model','F-150');
    r.makeHidden = await p.inputValue('#f-make');
    await p.click('#nextBtn'); await p.waitForTimeout(500);
    r.onServices = await vis('#step1'); r.step0Gone=!(await vis('#step0'));
    await p.click('.tile[data-svc]'); await p.waitForTimeout(400);
    const opt = await p.$('.opt[data-kind]:not(.addon)'); if(opt){await opt.click(); await p.waitForTimeout(300);}
    await p.screenshot({path:`${OUT}/quote-step2-services-${W}.png`});
    await p.click('#nextBtn'); await p.waitForTimeout(500);
    r.onReview = await vis('#step2');
    r.reviewText = (await p.textContent('#review')).replace(/\s+/g,' ').slice(0,300);
    await p.fill('#f-fname','Test'); await p.fill('#f-lname','QA'); await p.fill('#f-phone','3015550100'); await p.fill('#f-email','qa@example.com');
    await p.screenshot({path:`${OUT}/quote-step3-review-${W}.png`, fullPage:false});
    await p.click('#nextBtn'); await p.waitForTimeout(1500); r.dbg = await p.evaluate(()=>({errs:[...document.querySelectorAll('.field.error')].map(e=>e.id||e.textContent.slice(0,30)), succ:!document.getElementById('retail-form-success').hidden, done:getComputedStyle(document.getElementById('done')).display, banner:(document.querySelector('[data-role=recovery],.cu-recovery,.form-recovery')||{}).textContent, formDisp:getComputedStyle(document.getElementById('quote-retail')).display}));
    r.payload = payload ? (()=>{try{const j=JSON.parse(payload);return Object.fromEntries(Object.entries(j).filter(([k])=>/Vehicle|Service|First|Email|Phone|service/i.test(k)))}catch(e){return payload.slice(0,400)}})() : null;
    r.mabAfterSuccess = await vis('.mobile-action-bar');
    r.errs=errs;
    res[W]=r; await ctx.close();
  }
  // prefill
  const ctx = await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p = await ctx.newPage(); await p.route(/patriotliner\.site|\.mp4/, r=>r.abort());
  await p.goto('http://localhost:8765/quote.html?year=2022&make=FORD&model=F-150&service=bedliner'); await p.waitForTimeout(800);
  res.prefill = await p.evaluate(()=>({y:document.querySelector("#f-year").value,m:document.querySelector("#f-make").value,sel:document.querySelector("#f-make-sel").value,mo:document.querySelector("#f-model").value,step0:getComputedStyle(document.querySelector('#step0')).display,step1:getComputedStyle(document.querySelector('#step1')).display, bed:!!document.querySelector('.tile[data-svc="bedliner"][aria-checked="true"]')}));
  function f(){}
  await p.goto('http://localhost:8765/quote.html?make=chevy'); await p.waitForTimeout(600);
  res.partial = await p.evaluate(()=>({sel:document.querySelector('#f-make-sel').value, step0:getComputedStyle(document.querySelector('#step0')).display}));
  console.log(JSON.stringify(res,null,1)); await b.close();
})();
