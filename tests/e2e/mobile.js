// usage: node mobile.js <outDir> <widths comma> [--shots] pages...
const { chromium } = require('playwright-core');
const fs = require('fs');
const out = process.argv[2]; const widths = process.argv[3].split(',').map(Number);
let args = process.argv.slice(4); const shots = args.includes('--shots'); args = args.filter(a => a !== '--shots');
const PAGES = args; const BASE = 'http://localhost:8765/';
fs.mkdirSync(out, { recursive: true });
const qaJs = fs.readFileSync(__dirname + '/qa.js', 'utf8');
const auditSrc = qaJs.slice(qaJs.indexOf('const audit = () =>'), qaJs.indexOf('(async () =>'));
eval(auditSrc.replace('const audit', 'global.colorAudit'));
const mob = () => {
  const W = window.innerWidth; const res = { overflowX: document.documentElement.scrollWidth - W, bodyOverflow: document.body.scrollWidth - W, offenders: [], taps: [], inputs: [], stretched: [], clipped: [], sticky: null, hero: null };
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const clippedByAncestor = el => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (/(hidden|auto|scroll|clip)/.test(s.overflowX) ) { const r = e.getBoundingClientRect(); if (r.right <= W + 1) return true; } if (s.position === 'fixed' && getComputedStyle(e).display==='none') return true; } return false; };
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.closest('svg') || el.closest('.nav-mobile:not(.open)') || el.closest('.nav-dropdown')) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > W + 1 || r.left < -1) && !clippedByAncestor(el) && getComputedStyle(el).position !== 'fixed') res.offenders.push(name(el) + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']');
    const s = getComputedStyle(el);
    if (el.matches('a, button, input, select, textarea, [role=button], summary') && !(r.left < -1000) && !(el.tagName==='A' && el.parentElement && ['P','SPAN','LI','DIV','TD','SMALL'].includes(el.parentElement.tagName) && el.parentElement.textContent.trim().length > el.textContent.trim().length + 15 && s.display.startsWith('inline') && !s.display.includes('flex'))) {
      const inline = el.tagName === 'A' && el.closest('p, li p, td') && s.display === 'inline';
      if (!inline && (r.height < 44 || r.width < 24) && !(el.tagName==='INPUT' && /checkbox|radio|hidden/.test(el.type))) res.taps.push(name(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' "' + (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 24) + '"');
    }
    if (el.matches('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=submit]):not([type=button]), select, textarea') && parseFloat(s.fontSize) < 16) res.inputs.push(name(el) + ' ' + s.fontSize);
    if (el.tagName === 'IMG' && el.naturalWidth && s.objectFit === 'fill') { const nr = el.naturalWidth / el.naturalHeight, rr = r.width / r.height; if (Math.abs(nr - rr) / nr > 0.06) res.stretched.push(name(el) + ' ' + (el.getAttribute('src')||'').slice(-40) + ' nat ' + nr.toFixed(2) + ' vs ' + rr.toFixed(2)); }
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (hasText && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && /(hidden|clip)/.test(s.overflowX) && s.textOverflow !== 'ellipsis') res.clipped.push(name(el) + ' "' + el.textContent.trim().slice(0, 30) + '" ' + el.scrollWidth + '>' + el.clientWidth);
  }
  res.blueCta = [];
  for (const el of document.querySelectorAll('a, button')) {
    if (!vis(el) || el.closest('.nav-mobile:not(.open), .nav-dropdown')) continue;
    const s = getComputedStyle(el); const m = s.backgroundColor.match(/rgba?\((\d+), (\d+), (\d+)/);
    if (m && +m[1] < 40 && +m[2] > 80 && +m[2] < 130 && +m[3] > 200 && el.textContent.trim().length > 2 && !el.matches('.active, .is-active, [aria-selected=true], [aria-pressed=true]')) res.blueCta.push(name(el) + ' "' + el.textContent.trim().slice(0, 30) + '"');
  }
  res.narrow = [];
  if (W < 700) for (const el of document.querySelectorAll('p, h2, h3, h4, li, span, div, a')) {
    if (!vis(el) || el.closest('.nav, .nav-mobile, .sticky-cta-bar, .footer, svg, .hero-stats, .stats-grid')) continue;
    const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ');
    if (t.length < 28) continue;
    const r = el.getBoundingClientRect(); if (r.width >= (W < 400 ? 150 : 170)) continue;
    let g = el.parentElement; while (g && g !== document.body) { const gs = getComputedStyle(g); if ((gs.display.includes('grid') && gs.gridTemplateColumns.split(' ').length > 1) || (gs.display.includes('flex') && gs.flexDirection === 'row' && g.children.length > 1)) break; g = g.parentElement; }
    res.narrow.push((g && g !== document.body ? name(g) + ' {' + (getComputedStyle(g).display.includes('grid') ? getComputedStyle(g).gridTemplateColumns : 'flex-row') + '}' : '?') + ' <- ' + name(el) + ' ' + Math.round(r.width) + 'px');
  }
  const bar = document.querySelector('.sticky-cta-bar, .cu-p6-bar, .sticky-bar, .mobile-sticky');
  if (bar && vis(bar) && getComputedStyle(bar).position === 'fixed') { const bh = bar.getBoundingClientRect().height; const pb = parseFloat(getComputedStyle(document.body).paddingBottom) + parseFloat(getComputedStyle(document.documentElement).paddingBottom); res.sticky = { cls: name(bar), h: Math.round(bh), bodyPad: pb, ok: pb >= bh - 2 }; }
  const hero = document.querySelector('.hero, .page-hero, .geo-hero, .sh-hero, header.hero, section[class*=hero]');
  if (hero) { const r = hero.getBoundingClientRect(); res.hero = { cls: name(hero), h: Math.round(r.height), vh: window.innerHeight }; }
  for (const k of ['offenders', 'taps', 'inputs', 'stretched', 'clipped', 'narrow', 'blueCta']) { res[k + 'N'] = res[k].length; res[k] = [...new Set(res[k])].slice(0, 25); }
  return res;
};
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const report = {};
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w >= 700 ? 1024 : 800 }, isMobile: w < 700, hasTouch: true, deviceScaleFactor: shots ? 1 : 2, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    await ctx.route(/patriotliner\.site|\.mp4/, r => r.abort());
    for (const p of PAGES) {
      const page = await ctx.newPage();
      try { await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 30000 }); } catch (e) {}
      await page.waitForTimeout(1200);
      await page.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;transition:none!important}' });
      const name = p.replace(/\//g, '_').replace('.html', '');
      const m = await page.evaluate(mob);
      const c = await page.evaluate(colorAudit);
      m.colorIssues = c.issues.filter(i => !/service-card/.test(i)).slice(0, 30);
      if (shots) { await page.screenshot({ path: `${out}/${name}-${w}.png` });
        const H = await page.evaluate(() => document.documentElement.scrollHeight); const vh = w >= 700 ? 1024 : 800;
        for (let y = 0, i = 0; y < H && i < 30; y += vh, i++) { await page.evaluate(yy => window.scrollTo(0, yy), y); await page.waitForTimeout(120); await page.screenshot({ path: `${out}/${name}-${w}-seg${String(i).padStart(2,'0')}.png` }); }
        await page.evaluate(() => window.scrollTo(0, 0)); }
      report[`${p} @${w}`] = m;
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(`${out}/mobile.json`, JSON.stringify(report, null, 1));
  for (const [k, v] of Object.entries(report)) console.log(k.padEnd(48), 'ovX', v.overflowX, 'off', v.offendersN, 'tap', v.tapsN, 'inp', v.inputsN, 'str', v.stretchedN, 'clip', v.clippedN, 'narrow', v.narrowN, 'blue', v.blueCtaN, 'col', v.colorIssues.length, v.sticky ? ('sticky ' + (v.sticky.ok ? 'ok' : 'PAD ' + v.sticky.bodyPad + '<' + v.sticky.h)) : '', v.hero ? ('hero ' + v.hero.h) : '');
})();
