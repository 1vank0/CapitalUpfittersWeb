// usage: node qa.js <outDir> [pages...]
const { chromium } = require('playwright-core');
const fs = require('fs');
const out = process.argv[2];
const PAGES = process.argv.slice(3).length ? process.argv.slice(3) : ['index.html','quote.html','fleet.html','services/bedliner.html','contact.html','dealer-government.html','rebates.html','locations/bethesda-md.html'];
const BASE = 'http://localhost:8765/';
const VIEWS = { desktop: { width: 1280, height: 800 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
fs.mkdirSync(out, { recursive: true });

const audit = () => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage && s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return null; const c = parse(s.backgroundColor); if (c && c.a > 0.5) return c; if (/gradient/.test(s.backgroundImage)) { const m = s.backgroundImage.match(/rgba?\([^)]+\)/); if (m) return parse(m[0]); } } return { r: 255, g: 255, b: 255, a: 1 }; };
  const hex = c => '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('');
  const OLD = ['#0071e3', '#0066cc', '#1d4ed8', '#f59e0b', '#1b6ef3', '#b4741a', '#d97706', '#fb923c', '#0f4fbf'];
  const issues = []; const seen = new Set();
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.1; };
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.closest('svg') && el.tagName !== 'svg') continue;
    const s = getComputedStyle(el);
    for (const prop of ['color', 'backgroundColor', 'borderTopColor']) {
      const c = parse(s[prop]); if (!c || c.a === 0) continue;
      if (prop === 'borderTopColor' && parseFloat(s.borderTopWidth) === 0) continue;
      const h = hex(c); if (OLD.includes(h)) { const k = 'old ' + prop + ' ' + h + ' ' + (el.className && el.className.baseVal === undefined ? el.className : el.tagName); if (!seen.has(k)) { seen.add(k); issues.push(k); } }
    }
    // white-ish text on yellow
    const bg = parse(s.backgroundColor);
    if (bg && bg.a > 0.5 && bg.r > 220 && bg.g > 180 && bg.b < 60) { const c = parse(s.color); if (c && lum(c) > 0.3) issues.push('light text on yellow: ' + el.tagName + '.' + el.className); }
    // text contrast for direct text
    const txt = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!txt) continue;
    const fg = parse(s.color); const b2 = bgOf(el); if (!fg || !b2) continue;
    const fa = fg.a; const fgB = { r: fg.r*fa + b2.r*(1-fa), g: fg.g*fa + b2.g*(1-fa), b: fg.b*fa + b2.b*(1-fa), a: 1 }; const ratio = cr(fgB, b2); const size = parseFloat(s.fontSize); const bold = +s.fontWeight >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    if (ratio < need && fg.a > 0.25) { const k = 'contrast ' + ratio.toFixed(2) + '<' + need + ' ' + hex(fg) + '/' + fa + ' on ' + hex(b2) + ' "' + txt.slice(0, 40) + '" ' + el.tagName + '.' + (typeof el.className === 'string' ? el.className.slice(0, 40) : ''); if (!seen.has(k)) { seen.add(k); issues.push(k); } }
  }
  const btns = [...document.querySelectorAll('.btn-primary, .nav-cta, .float-cta-btn, .nav-mega-footer-cta--primary, .sticky-quote, button[type=submit], .cu-p6 .btn:not(.ghost), .cu-p6-bar .btn:not(.ghost), .sh-btn-primary')].filter(vis).map(b => { const s = getComputedStyle(b); return { cls: typeof b.className === 'string' ? b.className.slice(0, 50) : '', text: b.textContent.trim().slice(0, 30), bg: s.backgroundColor, color: s.color, radius: s.borderRadius, weight: s.fontWeight, h: Math.round(b.getBoundingClientRect().height) }; });
  return { issues, btns, overflowX: document.documentElement.scrollWidth - window.innerWidth };
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const report = {};
  for (const [vname, vp] of Object.entries(VIEWS)) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor || 1, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    await ctx.route(/patriotliner\.site|\.mp4/, r => r.abort());
    for (const p of PAGES) {
      const page = await ctx.newPage();
      try { await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 30000 }); } catch (e) {}
      await page.waitForTimeout(2200);
      const cls = await page.evaluate(() => window.__cls);
      await page.addStyleTag({ content: '.reveal{opacity:1!important;transition:none!important} *{animation-play-state:paused!important}' });
      const name = p.replace(/\//g, '_').replace('.html', '');
      await page.screenshot({ path: `${out}/${name}-${vname}.png` });
      await page.screenshot({ path: `${out}/${name}-${vname}-full.png`, fullPage: true });
      const a = await page.evaluate(audit);
      a.cls = +cls.toFixed(3);
      report[`${p} ${vname}`] = a;
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(`${out}/audit.json`, JSON.stringify(report, null, 1));
  for (const [k, v] of Object.entries(report)) console.log(k, '| issues', v.issues.length, '| overflowX', v.overflowX, '| cls', v.cls, '| btns', v.btns.length);
})();
