/**
 * Section screenshot capture for before/after comparison.
 * Usage: node tests/shots.js <label>   e.g. node tests/shots.js before
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LABEL = process.argv[2] || 'shot';
const BASE = process.argv[3] || 'http://localhost:8097';
const OUT = path.join(__dirname, '..', 'qa-shots');
fs.mkdirSync(OUT, { recursive: true });

const SECTIONS = [
  { name: 'audience',   sel: '.funnel-section' },
  { name: 'industrial', sel: 'section[aria-labelledby="industrial-prestige-heading"]' },
  { name: 'why',        sel: 'section[aria-labelledby="why-heading"]' },
  { name: 'reviews',    sel: 'section[aria-labelledby="testimonials-heading"]' },
];
const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '390x844',  width: 390,  height: 844, mobile: true },
];

(async () => {
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: !!vp.mobile, isMobile: !!vp.mobile,
    });
    const page = await ctx.newPage();
    await page.goto(BASE + '/index.html', { waitUntil: 'load' });
    // settle: stop the hero video and force any reveal animations to done
    await page.evaluate(() => {
      document.querySelectorAll('video').forEach(v => { try { v.pause(); } catch (e) {} });
      document.querySelectorAll('.reveal').forEach(e => {
        e.classList.add('visible'); e.style.opacity = '1'; e.style.animation = 'none';
      });
    });
    await page.waitForTimeout(1200);
    for (const s of SECTIONS) {
      const el = await page.$(s.sel);
      const file = path.join(OUT, `${LABEL}-${s.name}-${vp.name}.png`);
      if (!el) { console.log(`  (skip) ${s.name} @ ${vp.name} — section not present`); continue; }
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(350);
      try {
        await el.screenshot({ path: file });
        const kb = Math.round(fs.statSync(file).size / 1024);
        console.log(`  ${path.basename(file)}  (${kb}KB)`);
      } catch (e) { console.log(`  (fail) ${s.name} @ ${vp.name}: ${String(e).slice(0, 80)}`); }
    }
    await ctx.close();
  }
  await browser.close();
  console.log('\nsaved to qa-shots/');
})();
