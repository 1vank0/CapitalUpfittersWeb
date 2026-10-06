const { chromium } = require('playwright-core');const {execSync}=require('child_process');
const pages=execSync("cd /workspace/cu/CapitalUpfittersWeb && git ls-files '*.html' | grep -v 'products-section'").toString().trim().split('\n');
(async()=>{const b=await chromium.launch({channel:'chrome'});const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true});const agg={};
for(const pg of pages){const p=await ctx.newPage();await p.route(/\.mp4/,r=>r.abort());
 p.on('console',m=>{if(m.type()==='error'){const t=m.text().replace(/\?[^ ']*/g,'').slice(0,110);if(/mp4|ERR_ABORTED/.test(t))return;(agg[t]=agg[t]||new Set()).add(pg)}});
 p.on('pageerror',e=>{const t='PAGEERROR '+e.message.slice(0,100);(agg[t]=agg[t]||new Set()).add(pg)});
 p.on('requestfailed',r=>{const u=r.url();if(/\.mp4/.test(u))return;const t='REQFAIL '+u.replace(/\?.*/,'').slice(0,100);(agg[t]=agg[t]||new Set()).add(pg)});
 p.on('response',r=>{if(r.status()>=400){const t='HTTP'+r.status()+' '+r.url().replace(/\?.*/,'').replace('http://localhost:8765','').slice(0,100);(agg[t]=agg[t]||new Set()).add(pg)}});
 try{await p.goto('http://localhost:8765/'+pg,{waitUntil:'load',timeout:45000});await p.waitForTimeout(1500);}catch(e){(agg['GOTO '+e.message.slice(0,60)]=agg['GOTO '+e.message.slice(0,60)]||new Set()).add(pg)}
 await p.close();}
for(const [k,v] of Object.entries(agg)) console.log(v.size+'x '+k+'  <- '+[...v].slice(0,4).join(', ')+(v.size>4?' …':''));
await b.close();})();
