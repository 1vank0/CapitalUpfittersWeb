const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Small DOM fixture runs the actual page controller and asynchronous feed together.
class Element {
  constructor(tag = 'div') {
    this.tagName = tag; this.children = []; this.attrs = {}; this.style = {};
    this.listeners = {}; this.dataset = {}; this.textContent = ''; this.className = '';
    this.classList = {
      contains: c => this.className.split(' ').includes(c),
      add: c => { if (!this.classList.contains(c)) this.className += ' ' + c; },
      remove: c => { this.className = this.className.split(' ').filter(x => x !== c).join(' '); },
      [Symbol.iterator]: () => this.className.split(' ')[Symbol.iterator]()
    };
  }
  setAttribute(k, v) { this.attrs[k] = v; if(k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_,c)=>c.toUpperCase())] = v; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(n) { this.children.push(n); n.parentElement = this; return n; }
  replaceChildren() { this.children = []; this.innerHTML = ''; }
  contains(n) { return n === this || this.children.some(c => c.contains(n)); }
  matches(s) {
    const not = s.match(/:not\(([^)]+)\)/);
    if(not && this.matches(not[1])) return false;
    s = s.replace(/:not\([^)]+\)/g, '');
    if(s.startsWith('.')) return s.slice(1).split('.').every(c => this.classList.contains(c));
    if(s.startsWith('[')) return this.getAttribute(s.slice(1,-1)) !== null;
    return this.tagName === s;
  }
  querySelectorAll(s) { return this.children.flatMap(c => [...(c.matches(s) ? [c] : []), ...c.querySelectorAll(s)]); }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  closest(s) { return this.matches(s) ? this : this.parentElement?.closest(s); }
  cloneNode() { const n = new Element(this.tagName); Object.assign(n, {src:this.src,alt:this.alt,loading:this.loading,attrs:{...this.attrs}}); return n; }
  addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); }
  dispatch(type, extra={}) {
    const e = {type, target:this, preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...extra};
    for(let n=this;n && !e.stopped;n=n.parentElement) for(const fn of n.listeners[type] || []) fn(e);
    return e;
  }
  click() { this.dispatch('click'); }
}
const root = path.resolve(__dirname, '..');
async function setup(data) {
  const document = new Element('document'); document.body = document.appendChild(new Element('body'));
  document.head = document.appendChild(new Element('head')); document.images = [];
  document.createElement = tag => new Element(tag);
  document.getElementById = id => document.querySelectorAll('div').concat(document.querySelectorAll('button')).find(n => n.id === id) || null;
  const add = (tag, cls, parent=document.body) => { const n=parent.appendChild(new Element(tag)); n.className=cls; return n; };
  const grid=add('div','gallery-grid'); grid.setAttribute('data-gallery-feed','grid');
  const staticItem=add('div','gallery-item',grid); staticItem.dataset={cat:'bedliner',label:'Static bedliner'};
  const staticImg=add('img','',staticItem); staticImg.src='/assets/real-work/f150-shop.webp'; staticImg.alt='Real Ford F150';
  for(const cat of ['all','bedliner','hitch']) { const b=add('button','gallery-filter-btn'+(cat==='all'?' active':'')); b.setAttribute('data-filter',cat); }
  const ids={}; for(const id of ['gallery-count','lightbox','lightbox-display','lightbox-caption','lightbox-counter','lightbox-close','lightbox-prev','lightbox-next']) { ids[id]=add('div',''); ids[id].id=id; }
  let resolve;
  const pending = new Promise(r => { resolve=r; });
  const context = vm.createContext({document,window:{fetch:true},fetch:()=>pending,URL,setTimeout,clearTimeout});
  const html=fs.readFileSync(path.join(root,'gallery.html'),'utf8');
  const controller=html.slice(html.indexOf('// Gallery filter'),html.indexOf('</script>',html.indexOf('// Gallery filter')));
  vm.runInContext(controller,context);
  vm.runInContext(fs.readFileSync(path.join(root,'gallery-feed.js'),'utf8'),context);
  resolve({ok:true,json:async()=>data});
  await new Promise(r => setImmediate(r));
  return {document,grid,staticItem,ids,context};
}
const photo=(name,service='hitches')=>({url:'https://example.com/'+name+'.jpg',alt:name+' alt',caption:name+' caption',service,width:640,height:480});
const feed={ok:true,photos:[photo('single')],pairs:[{before:photo('before'),after:photo('after'),caption:'Before / after (approved)'}]};

test('late feed photo opens by nested click with image, alt and caption, without moving its source',async()=>{
  const {grid,ids}=await setup(feed);
  const card=grid.children[2], source=card.querySelector('img'); source.click();
  assert.ok(ids.lightbox.classList.contains('open'));
  const image=ids['lightbox-display'].querySelector('img');
  assert.equal(image.src,source.src); assert.equal(image.alt,'single alt'); assert.equal(image.loading,'eager');
  assert.notEqual(image,source); assert.ok(card.contains(source));
  assert.equal(ids['lightbox-caption'].textContent,'single caption');
  assert.equal(ids['lightbox-counter'].textContent,'3 / 3');
});

test('late before/after pair opens with Enter and Space and preserves ordered labels and both images',async()=>{
  for(const key of ['Enter',' ']) {
    const {grid,ids}=await setup(feed);
    assert.equal(grid.children[1].dispatch('keydown',{key}).defaultPrevented,true);
    assert.deepEqual(ids['lightbox-display'].querySelectorAll('img').map(n=>n.alt),['before alt','after alt']);
    assert.deepEqual(ids['lightbox-display'].querySelectorAll('figcaption').map(n=>n.textContent),['Before','After']);
    assert.equal(ids['lightbox-caption'].textContent,'Before / after (approved)');
  }
});

test('next/previous and arrow keys traverse static, pair and single, wrapping and replacing content',async()=>{
  const {staticItem,ids,document}=await setup(feed); staticItem.click();
  assert.equal(ids['lightbox-display'].querySelector('img').alt,'Real Ford F150');
  ids['lightbox-next'].click(); assert.equal(ids['lightbox-display'].querySelectorAll('img').length,2);
  document.dispatch('keydown',{key:'ArrowRight'}); assert.equal(ids['lightbox-display'].querySelectorAll('img').length,1);
  ids['lightbox-next'].click(); assert.equal(ids['lightbox-display'].querySelectorAll('img').length,1);
  assert.equal(ids['lightbox-display'].querySelector('img').alt,'Real Ford F150');
  ids['lightbox-prev'].click(); assert.equal(ids['lightbox-counter'].textContent,'3 / 3');
  document.dispatch('keydown',{key:'ArrowLeft'}); assert.equal(ids['lightbox-counter'].textContent,'2 / 3');
  document.dispatch('keydown',{key:'Escape'}); assert.equal(ids.lightbox.classList.contains('open'),false);
});

test('filters exclude hidden static/feed cards and unrelated keys do not open the viewer',async()=>{
  const {grid,ids,document}=await setup(feed);
  grid.children[2].dispatch('keydown',{key:'Tab'}); assert.equal(ids.lightbox.classList.contains('open'),false);
  document.querySelectorAll('.gallery-filter-btn')[1].click();
  assert.equal(ids['gallery-count'].textContent,'Showing 1 of 3 projects');
  grid.children[2].click(); assert.equal(ids.lightbox.classList.contains('open'),false);
  grid.children[0].click(); ids['lightbox-next'].click(); assert.equal(ids['lightbox-counter'].textContent,'1 / 1');
  document.querySelectorAll('.gallery-filter-btn')[2].click(); grid.children[1].click();
  assert.equal(ids['lightbox-counter'].textContent,'1 / 2');
  ids['lightbox-next'].click(); assert.equal(ids['lightbox-counter'].textContent,'2 / 2');
});

test('empty feed preserves static activation and caption text is not parsed as markup',async()=>{
  const empty=await setup({ok:true,photos:[]}); empty.staticItem.click();
  assert.equal(empty.ids['lightbox-counter'].textContent,'1 / 1');
  const malicious='<img src=x onerror=alert(1)>';
  const {grid,ids}=await setup({ok:true,photos:[{...photo('safe'),caption:malicious}]}); grid.children[1].click();
  assert.equal(ids['lightbox-caption'].textContent,malicious);
  assert.equal(ids['lightbox-display'].querySelectorAll('img').length,1);
  assert.equal(ids['lightbox-display'].innerHTML,'');
});
