(function(){'use strict';
 const w=window,d=document;let status='unknown',timer;
 w.CUShopStatus={get:()=>status};
 const badges=[];
 for(const [selector,placement] of [['.site-nav-actions, .nav-actions','desktop'],['.site-mobile-utility, #nav-mobile','mobile']]){const target=d.querySelector(selector);if(target){const el=d.createElement('span');el.className='cu-shop-status';el.dataset.placement=placement;el.dataset.state='unknown';el.textContent='Hours unavailable';el.setAttribute('aria-live','polite');target.prepend(el);badges.push(el);}}
 async function refresh(){clearTimeout(timer);status='unknown';badges.forEach(el=>{el.dataset.state='unknown';el.textContent='Hours unavailable';});try{const r=await fetch('/api/status',{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw Error();const data=await r.json();if(!['open','closed'].includes(data.status)||typeof data.label!=='string')throw Error();status=data.status;badges.forEach(el=>{el.dataset.state=status;el.textContent=data.label+(data.note?' · '+data.note:'');});const delay=Date.parse(data.nextChange)-Date.parse(data.checkedAt);timer=setTimeout(refresh,Number.isFinite(delay)?Math.max(1000,Math.min(delay,300000)):300000);}catch(_){timer=setTimeout(refresh,60000);}}
 refresh();d.addEventListener('visibilitychange',()=>{if(!d.hidden)refresh();});w.addEventListener('online',refresh);
 const button=d.createElement('button');button.type='button';button.className='cu-back-top';button.hidden=true;button.setAttribute('aria-label','Back to top');button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>';d.body.appendChild(button);
 // Replace the legacy floating quote bubble; leave the mobile action bar untouched.
 d.querySelectorAll('.float-cta').forEach(el=>el.hidden=true);
 const endings=d.querySelectorAll('.cta-banner,.closing-cta,.final-cta,[data-closing-cta]');
 function update(){const height=w.innerHeight;const closing=Array.from(endings).some(el=>{const r=el.getBoundingClientRect();return r.bottom>0&&r.top<height;});button.hidden=d.documentElement.scrollHeight<3*height||w.scrollY<2*height||closing;
 const bar=d.querySelector('.mobile-action-bar');if(bar){const r=bar.getBoundingClientRect();if(r.height&&r.top<height&&r.bottom>0)button.style.bottom=Math.max(80,height-r.top+16)+'px';else button.style.bottom='';}}
 let scheduled=false;function queue(){if(!scheduled){scheduled=true;w.requestAnimationFrame(()=>{scheduled=false;update();});}}
 w.addEventListener('scroll',queue,{passive:true});w.addEventListener('resize',queue);w.addEventListener('load',queue);
 if(w.ResizeObserver)new ResizeObserver(queue).observe(d.body);
 button.addEventListener('click',()=>{const target=d.querySelector('main,h1')||d.body;if(!target.hasAttribute('tabindex')){target.setAttribute('tabindex','-1');target.addEventListener('blur',()=>target.removeAttribute('tabindex'),{once:true});}target.focus({preventScroll:true});w.scrollTo({top:0,behavior:w.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});update();
})();
