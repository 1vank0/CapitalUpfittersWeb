const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('compact navigation breakpoint matches script and hours utility',()=>{
 assert.match(read('site-nav.js'),/min-width: 1280px/);
 assert.match(read('ui-system.css'),/@media \(max-width: 1279px\) \{[\s\S]*?\.site-nav-links \{ display: none; \}/);
 assert.match(read('site-utilities.css'),/@media\(max-width:1279px\)/);
 assert.match(read('site-utilities.css'),/@media\(min-width:1280px\)/);
});
test('wide header caps status width and reduces spacing without clipping controls',()=>{
 assert.match(read('site-utilities.css'),/\[data-placement=desktop\]\{margin-right:0;max-width:110px;white-space:normal/);
 assert.match(read('ui-system.css'),/@media \(min-width: 1280px\) \{\s*\.site-nav \.site-nav-inner \{ gap: 12px; \}\s*\.site-nav \.site-nav-trigger \{ padding-inline: 8px; \}/);
});
