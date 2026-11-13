const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const pages=JSON.parse(read('config/sitewide-pages.json')),origin='https://www.capitalupfitters.com';
const clean=p=>p.replace(/\/index\.html$/,'/').replace(/\.html$/,'').replace(/\/(services|blog)\/$/,'/$1');
const nodes=h=>[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>{const d=JSON.parse(m[1]);assert.equal(d['@context'],'https://schema.org');return d['@graph']||[d];});
test('public canonicals and internal page links use final clean paths, with routes preserved',()=>{
 for(const page of pages){const h=read(page),canonical=h.match(/rel="canonical" href="([^"]+)"/);if(canonical)assert.equal(canonical[1],clean(origin+'/'+page),page);
  for(const [,href]of h.matchAll(/href="([^"]+)"/g)){
   if(/^(https?:|\/\/)/.test(href)&&!href.startsWith(origin+'/'))continue;
   assert.doesNotMatch(href,/\.html(?:[?#]|$)/,page+': '+href);
  }
 }
});
test('sitemap contains unique clean public URLs and excludes quote/session utilities',()=>{
 const urls=[...read('sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1]);assert.equal(urls.length,new Set(urls).size);
 for(const url of urls){assert.ok(url.startsWith(origin+'/'));assert.equal(url,clean(url));assert.doesNotMatch(url,/\?|\/quote$|\/hitch-quote$|\/404$/);let route=url.slice(origin.length);assert.ok(fs.existsSync(path.join(root,route+'.html'))||fs.existsSync(path.join(root,route,'index.html')),url);}
});
test('business schema is one consistent entity and all services reference it',()=>{
 let business;
 for(const page of pages){const n=nodes(read(page)),local=n.filter(x=>x['@type']==='AutoRepair');assert.ok(local.length<=1,page);assert.ok(n.filter(x=>x['@type']==='BreadcrumbList').length<=1,page);
  for(const b of local){assert.equal(b['@id'],origin+'/#business');const normalized={...b};delete normalized['@context'];business ||= normalized;assert.deepEqual(normalized,business,page);assert.ok(!b.aggregateRating);}
  for(const s of n.filter(x=>x['@type']==='Service')){assert.deepEqual(s.provider,{'@id':origin+'/#business'});assert.equal(local.length,1,page);}
 }
});
test('quote utilities are noindexed but public search crawlability is retained',()=>{
 for(const f of ['quote.html','hitch-quote.html'])assert.match(read(f),/<meta name="robots" content="noindex, follow">/);
 const config=JSON.parse(read('vercel.json'));assert.ok(config.headers.some(x=>x.source==='/(quote|hitch-quote)(.html)?'&&x.headers.some(h=>h.key==='X-Robots-Tag'&&h.value==='noindex, follow')));
 assert.ok(!config.headers.find(x=>x.source==='/(.*)').headers.some(h=>h.key==='X-Robots-Tag'));
 assert.match(read('robots.txt'),/User-agent: \*\nAllow: \/\n/);assert.doesNotMatch(read('robots.txt'),/User-agent: GPTBot/);
});
