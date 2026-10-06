const { chromium } = require('playwright-core');
const fs=require('fs');
const BASE='http://localhost:8765/';
const PII=['Testy','McQA','qa-analytics@example.com','3015550199','Acme Fleet Co'];
const ANALYTICS_SRC=fs.readFileSync('/workspace/cu/CapitalUpfittersWeb/analytics.js','utf8');
(async()=>{
const b=await chromium.launch({channel:'chrome'});
const R={};
async function mk(W,{gaId,debug=true}={}){
  const ctx=await b.newContext({viewport:{width:W,height:W<800?844:900},isMobile:W<800,hasTouch:W<800});
  const p=await ctx.newPage();
  const reqs=[], errs=[];
  p.on('request',r=>{const u=r.url(); if(/googletagmanager|google-analytics|_vercel\//.test(u)) reqs.push(u.replace(BASE,'/'));});
  p.on('pageerror',e=>errs.push('pageerror: '+e.message));
  p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text().slice(0,160)); });
  await p.route(/patriotliner\.site|\.mp4/,r=>r.abort());
  await p.route('**/_vercel/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:'/* stub */'}));
  await p.route(/googletagmanager\.com/,r=>r.fulfill({status:200,contentType:'application/javascript',body:'/* gtag stub */'}));
  if(gaId) await p.route('**/analytics.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:ANALYTICS_SRC.replace("var GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'","var GA4_MEASUREMENT_ID = '"+gaId+"'")}));
  // keep the page put: cancel link navigation AFTER analytics' capture listener ran
  await p.addInitScript(()=>{ window.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]'); if(a) e.preventDefault();},false); });
  return {ctx,p,reqs,errs};
}
const ev = p=>p.evaluate(()=>({cu:(window.CU_ANALYTICS||{}).events||[], vaq:(window.vaq||[]).map(a=>Array.from(a)), dl:(window.dataLayer||[]).map(a=>Array.from(a)).map(x=>JSON.parse(JSON.stringify(x,(k,v)=>v instanceof Date?'DATE':v)))}));

// A. default localhost (no debug): nothing loaded
{ const {ctx,p,reqs,errs}=await mk(390,{});
  await p.goto(BASE+'index.html'); await p.waitForTimeout(1200);
  R.A_default={reqs, ga4Enabled:await p.evaluate(()=>CU_ANALYTICS.ga4Enabled), errs}; await ctx.close(); }
// B. debug, placeholder ID: Vercel scripts yes, Google no
{ const {ctx,p,reqs,errs}=await mk(390,{});
  await p.goto(BASE+'index.html?cu_analytics=debug'); await p.waitForTimeout(1200);
  R.B_placeholder={reqs, ga4Enabled:await p.evaluate(()=>CU_ANALYTICS.ga4Enabled), errs}; await ctx.close(); }

// C. debug + test ID: events on index (390)
{ const {ctx,p,reqs,errs}=await mk(390,{gaId:'G-TEST12345'});
  await p.goto(BASE+'index.html?cu_analytics=debug'); await p.waitForTimeout(1500);
  await p.click('.mobile-action-bar .mab-call');
  await p.click('.mobile-action-bar .mab-quote');
  await p.click('.nav-cta');
  const ab=await p.$('#announce-bar a[href^="tel:"]'); if(ab) await ab.click();
  await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight)); await p.waitForTimeout(300);
  const ft=await p.$('footer a[href^="tel:"]'); if(ft){ await ft.scrollIntoViewIfNeeded(); await ft.click({force:true}); }
  await p.evaluate(()=>document.querySelector('.trustindex-widget').scrollIntoView({block:'center'})); await p.waitForTimeout(1500);
  const hb=await p.$('.hero .btn-primary, .hero-ctas .btn-primary'); if(hb){ await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(300); await hb.click(); }
  const e=await ev(p);
  R.C_index={reqs:[...new Set(reqs)], events:e.cu, vaqEvents:e.vaq.filter(a=>a[0]==='event').length, gtagEvents:e.dl.filter(a=>a[0]==='event').map(a=>a[1]), gtagConfig:e.dl.find(a=>a[0]==='config'), errs};
  await ctx.close(); }

// D. quote funnel retail (390) with mocked success, plus failure case
for (const mode of ['ok','fail']) {
  const {ctx,p,reqs,errs}=await mk(390,{gaId:'G-TEST12345'});
  await p.route('**/api/lead**',r=>r.fulfill({status:mode==='ok'?200:400,contentType:'application/json',body:JSON.stringify(mode==='ok'?{ok:true,reference:'T-1'}:{ok:false,error:'Please enter a valid phone number.'})}));
  await p.goto(BASE+'quote.html?cu_analytics=debug'); await p.waitForTimeout(1000);
  const before=(await ev(p)).cu.length;
  await p.selectOption('#f-year','2021'); await p.selectOption('#f-make-sel','Ford'); await p.fill('#f-model','F-150');
  await p.click('#nextBtn'); await p.waitForTimeout(400);
  await p.click('.tile[data-svc="bedliner"]'); await p.waitForTimeout(200);
  await p.locator('.opt[data-svc="bedliner"]:not(.addon)').first().click();
  await p.click('.tile[data-svc="tint"]'); await p.waitForTimeout(200);
  await p.locator('.opt[data-svc="tint"]:not(.addon)').first().click();
  await p.click('#nextBtn'); await p.waitForTimeout(400);
  await p.click('#backBtn'); await p.waitForTimeout(300); await p.click('#nextBtn'); await p.waitForTimeout(300);
  await p.fill('#f-fname',PII[0]); await p.fill('#f-lname',PII[1]); await p.fill('#f-phone',PII[3]); await p.fill('#f-email',PII[2]); await p.fill('#f-zip','20852');
  await p.click('#nextBtn'); await p.waitForTimeout(1500);
  const e=await ev(p);
  R['D_retail_'+mode]={eventsBeforeInteraction:before, events:e.cu, gtagEvents:e.dl.filter(a=>a[0]==='event').map(a=>a[1]), vaq:e.vaq.filter(a=>a[0]==='event').map(a=>a[1].name), errs};
  await ctx.close();
}
// E. fleet quote (1280) — no submit button exists on the fleet form, so requestSubmit() programmatically
{ const {ctx,p,reqs,errs}=await mk(1280,{gaId:'G-TEST12345'});
  await p.route('**/api/lead**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await p.goto(BASE+'quote.html?cu_analytics=debug'); await p.waitForTimeout(800);
  await p.click('.cu-p6-pill[data-mode="fleet"]'); await p.waitForTimeout(500);
  const afterPill=(await ev(p)).cu.map(x=>x.name);
  await p.fill('#fl-biz',PII[4]); await p.fill('#fl-contact',PII[0]); await p.fill('#fl-email',PII[2]); await p.fill('#fl-phone',PII[3]);
  await p.selectOption('#fl-count',{index:1});
  await p.check('#quote-fleet input[value="Bedliners"]'); await p.check('#quote-fleet input[value="Window Tint"]');
  await p.evaluate(()=>document.getElementById('quote-fleet').requestSubmit()); await p.waitForTimeout(1200);
  const e=await ev(p);
  R.E_fleet={afterPillOnly:afterPill, events:e.cu, errs}; await ctx.close(); }
// F. 1280 desktop
{ const {ctx,p,reqs,errs}=await mk(1280,{gaId:'G-TEST12345'});
  await p.goto(BASE+'services/bedliner.html?cu_analytics=debug'); await p.waitForTimeout(1000);
  await p.evaluate(()=>{ document.querySelector('.float-cta-btn').click(); document.querySelectorAll('a[href^="tel:"]').forEach(a=>a.click()); });
  await p.click('.page-hero .btn-primary, .hero .btn-primary');
  const vis=await p.$eval('.mobile-action-bar',e=>getComputedStyle(e).display);
  const e=await ev(p); R.F_desktop_bedliner={mabDisplay:vis, events:e.cu}; await ctx.close(); }
// PII scan
const all=JSON.stringify(R);
R.PII_FOUND = PII.filter(x=> JSON.stringify(Object.entries(R).filter(([k])=>k!=='PII_FOUND').map(([k,v])=>[v.events,v.gtagEvents])).includes(x));
console.log(JSON.stringify(R,null,1));
await b.close();})();
