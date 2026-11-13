(function(){'use strict';
 const w=window,d=document;let status='unknown',timer;
 w.CUShopStatus={get:()=>status};
 const badges=[];
 for(const [selector,placement] of [['.site-nav-actions, .nav-actions','desktop'],['.site-mobile-utility, #nav-mobile','mobile']]){const target=d.querySelector(selector);if(target){const el=d.createElement('span');el.className='cu-shop-status';el.dataset.placement=placement;el.dataset.state='unknown';el.textContent='Hours unavailable';el.setAttribute('aria-live','polite');target.prepend(el);badges.push(el);}}
 async function refresh(){clearTimeout(timer);status='unknown';badges.forEach(el=>{el.dataset.state='unknown';el.textContent='Hours unavailable';});try{const r=await fetch('/api/status',{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw Error();const data=await r.json();if(!['open','closed'].includes(data.status)||typeof data.label!=='string')throw Error();status=data.status;d.dispatchEvent(new CustomEvent('cu:shop-status',{detail:{status}}));badges.forEach(el=>{el.dataset.state=status;el.textContent=data.label+(data.note?' · '+data.note:'');});const delay=Date.parse(data.nextChange)-Date.parse(data.checkedAt);timer=setTimeout(refresh,Number.isFinite(delay)?Math.max(1000,Math.min(delay,300000)):300000);}catch(_){timer=setTimeout(refresh,60000);}}
 refresh();d.addEventListener('visibilitychange',()=>{if(!d.hidden)refresh();});w.addEventListener('online',refresh);
 const button=d.createElement('button');button.type='button';button.className='cu-back-top';button.hidden=true;button.setAttribute('aria-label','Back to top');button.innerHTML='<span>Top</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>';d.body.appendChild(button);
 // Replace the legacy floating quote bubble; leave the mobile action bar untouched.
 d.querySelectorAll('.float-cta').forEach(el=>el.hidden=true);
 // Keep the control discoverable on shorter pages and at the footer, too.
 function update(){const height=w.innerHeight;const y=w.scrollY||d.documentElement.scrollTop||0;const threshold=Math.min(320,height*.5);const menu=d.querySelector('#site-mobile-panel');const menuOpen=!!(menu&&menu.open);
 button.hidden=y<threshold||menuOpen;
 const bar=d.querySelector('.mobile-action-bar');if(bar){const r=bar.getBoundingClientRect();if(r.height&&r.top<height&&r.bottom>0)button.style.bottom=Math.max(80,height-r.top+16)+'px';else button.style.bottom='';}}
 let scheduled=false;function queue(){if(!scheduled){scheduled=true;w.requestAnimationFrame(()=>{scheduled=false;update();});}}
 w.addEventListener('scroll',queue,{passive:true});w.addEventListener('resize',queue);w.addEventListener('load',queue);
 if(w.ResizeObserver)new ResizeObserver(queue).observe(d.body);
 if(w.visualViewport){w.visualViewport.addEventListener('resize',queue);w.visualViewport.addEventListener('scroll',queue);} 
 // Animate explicitly for consistent iOS behavior. Focus only after motion ends:
 // older Safari can ignore preventScroll and jump when focus is moved first.
 let scrollFrame=0;
 function cancelScroll(){if(scrollFrame)w.cancelAnimationFrame(scrollFrame);scrollFrame=0;}
 ['touchstart','wheel','keydown'].forEach(event=>w.addEventListener(event,cancelScroll,{passive:true}));
 function focusTop(){const target=d.querySelector('main,h1')||d.body;if(!target.hasAttribute('tabindex')){target.setAttribute('tabindex','-1');target.addEventListener('blur',()=>target.removeAttribute('tabindex'),{once:true});}target.focus({preventScroll:true});w.scrollTo({top:0,behavior:'instant'});}
 button.addEventListener('click',()=>{
   cancelScroll();
   if(w.matchMedia('(prefers-reduced-motion: reduce)').matches){focusTop();return;}
   const from=w.scrollY||d.documentElement.scrollTop||0;
   const duration=Math.min(850,Math.max(400,from*.2));let started;
   function step(now){if(started===undefined)started=now;const progress=Math.min(1,(now-started)/duration);const eased=1-Math.pow(1-progress,3);w.scrollTo({top:from*(1-eased),behavior:'instant'});if(progress<1)scrollFrame=w.requestAnimationFrame(step);else{scrollFrame=0;focusTop();}}
   scrollFrame=w.requestAnimationFrame(step);
 });update();
})();
