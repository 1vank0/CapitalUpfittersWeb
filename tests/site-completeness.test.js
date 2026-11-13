const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const excluded = new Set(['cms', 'node_modules', '.git', 'partials', 'admin']);
const utility = new Set(['products-section.html', 'preview.html']);
function pages(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => excluded.has(e.name) ? [] : e.isDirectory() ? pages(path.join(dir,e.name)) : e.name.endsWith('.html') && !utility.has(e.name) ? [path.join(dir,e.name)] : []); }
const html = new Map(pages(root).map(p => [p, fs.readFileSync(p,'utf8')]));
function resolvePage(base, value) {
 const p = value.startsWith('/') ? path.join(root,value) : path.resolve(path.dirname(base),value);
 return [p, p+'.html',path.join(p,'index.html')].find(p => html.has(p));
}
test('customer-facing internal page and fragment links resolve', () => {
 const failures=[];
 for (const [file,source] of html) for(const [,href] of source.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
  if (/^(https?:|tel:|sms:|mailto:|javascript:)/.test(href)) continue;
  const [relative,frag] = href.split('#');
  const clean=relative.split('?')[0];
  const target = clean ? resolvePage(file,clean) : file;
  if (!target) { if (!path.extname(clean) || clean.endsWith('.html')) failures.push(`${path.relative(root,file)}: ${href}`); continue; }
  if (frag && !new RegExp(`\\bid=["']${frag.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`).test(html.get(target))) failures.push(`${path.relative(root,file)}: ${href}`);
 }
 assert.deepEqual([...new Set(failures)],[]);
});
test('homepage advertises qualified liner coverage and identifies real image',()=> {
 const home=html.get(path.join(root,'index.html'));
 assert.ok(home.includes('Manufacturer limited warranty and six-month installation coverage'));
 assert.ok(home.includes('Real shop project · Ford F-150. Exterior view; see the gallery'));
});
