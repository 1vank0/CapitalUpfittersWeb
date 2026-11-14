const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('portfolio is explicit in desktop mobile and no-script navigation',()=>{
 const h=read('partials/header.html');
 assert.match(h,/<a class="site-nav-trigger site-gallery-link" href="\.\/portfolio">Portfolio &amp; Projects<\/a>/);
 assert.match(h,/<nav class="site-mobile-links"[^>]*>\s*<a class="site-mobile-gallery-link" href="\.\/portfolio">/);
 assert.match(h,/<noscript>[\s\S]*href="\.\/portfolio">Portfolio &amp; Projects/);
});
test('home showcases both actual portfolio projects with valid destinations',()=>{
 const h=read('index.html');
 for(const slug of ['f150-patriot-liner','mcs-maverick-fleet']){
 assert.ok(fs.existsSync('portfolio/'+slug+'.html'));
 assert.ok(h.includes('href="/portfolio/'+slug+'"'));
 }
 assert.match(h,/href="\/portfolio">Browse all projects/);
});
