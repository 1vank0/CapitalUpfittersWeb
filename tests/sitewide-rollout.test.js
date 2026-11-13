const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pages=JSON.parse(read('config/sitewide-pages.json'));
test('all 49 customer-facing pages retain routes and opt into pilot or rollout styling',()=>{
 assert.equal(pages.length,49);
 for(const page of pages){const h=read(page);assert.match(h,/class="[^"]*(sitewide-page|truck-pilot|bedliner-pilot-body)/,page);assert.ok(/sitewide-rollout.css|truck-pilot.css/.test(h),page);assert.equal((h.match(/<h1\b/g)||[]).length,1,page);const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,page+' duplicate IDs');for(const [,json]of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(json);}
});
test('fleet and project paths retain explicit audience selectors',()=>{
 const fleet=read('fleet.html');assert.match(fleet,/quote\?audience=fleet/);assert.match(fleet,/href="tel:\+13013041419"/);
 const project=read('services/industrial-coatings.html');assert.match(project,/audience=project/);
 const dealer=read('dealer-government.html');assert.match(dealer,/audience=dealer/);assert.match(dealer,/audience=government/);
});
test('new decision panels preserve local destinations and contain no fake checkout',()=>{
 for(const page of pages){const h=read(page);for(const [,href]of h.matchAll(/<a[^>]+href="([^"#?]+)(?:[?#][^"]*)?"/g)){if(!href.startsWith('.')||href.includes('..')&&page.indexOf('/')===-1)continue;const file=path.resolve(root,path.dirname(page),href);assert.ok((fs.existsSync(file)||fs.existsSync(file+'.html')),`${page}: ${href}`);}}
});
test('shared rollout has responsive and keyboard-accessible decision guidance',()=>{
 const css=read('sitewide-rollout.css');assert.match(css,/max-width:600px/);assert.match(css,/focus-visible/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/grid-template-columns:1fr/);
});
