const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(reduced=false){
 let button,focusCount=0,id=0;const frames=new Map(),listeners={},scrolls=[];
 const main={hasAttribute:()=>true,focus:()=>focusCount++};
 const window={innerHeight:844,scrollY:0,addEventListener:(k,fn)=>listeners[k]=fn,requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),matchMedia:()=>({matches:reduced}),scrollTo:opts=>{scrolls.push(opts.top);window.scrollY=opts.top}};
 const document={documentElement:{scrollTop:0,scrollHeight:1800},body:{appendChild:b=>button=b},querySelector:s=>s==='main,h1'?main:s==='.mobile-action-bar'?{getBoundingClientRect:()=>({height:70,top:774,bottom:844})}:null,querySelectorAll:()=>[],createElement:()=>({style:{},setAttribute(){},addEventListener(k,fn){this[k]=fn}}),addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('site-utilities.js','utf8'),{window,document,fetch:()=>new Promise(()=>{}),clearTimeout(){},setTimeout(){}});
 return {window,button,scrolls,listeners,focus:()=>focusCount,tick(time){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));}};
}
test('visible after 320px on short iPhone page and at footer, above mobile bar',()=>{const f=fixture();assert.equal(f.button.hidden,true);f.window.scrollY=330;f.listeners.scroll();f.tick(0);assert.equal(f.button.hidden,false);assert.equal(f.button.style.bottom,'86px');f.window.scrollY=956;f.listeners.scroll();f.tick(10);assert.equal(f.button.hidden,false);assert.match(f.button.innerHTML,/>Top</);});
test('animates intermediate positions before moving focus, ending exactly at top',()=>{const f=fixture();f.window.scrollY=1800;f.button.click();assert.equal(f.focus(),0);f.tick(0);f.tick(200);assert.ok(f.window.scrollY>0&&f.window.scrollY<1800);assert.equal(f.focus(),0);f.tick(900);assert.equal(f.window.scrollY,0);assert.equal(f.focus(),1);});
test('Reduce Motion returns instantly; touching cancels animation',()=>{const r=fixture(true);r.window.scrollY=1800;r.button.click();assert.equal(r.window.scrollY,0);assert.equal(r.focus(),1);const f=fixture();f.window.scrollY=1800;f.button.click();f.tick(0);f.listeners.touchstart();f.tick(900);assert.equal(f.window.scrollY,1800);assert.equal(f.focus(),0);});
