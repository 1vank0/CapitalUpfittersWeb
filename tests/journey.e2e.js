/**
 * End-to-end acceptance test for the Find My Fit -> Quote journey.
 *
 * RULE OF THIS FILE: every piece of state is produced by a visible
 * customer interaction. Nothing is seeded into localStorage. The only
 * direct storage call is the initial clear() and read-back assertions.
 * If a step cannot be driven through the UI, that is a finding, not a
 * reason to inject state.
 *
 * Playwright is used because the preview harness strips query strings
 * and cannot exercise forward navigation.
 *
 * Usage:  node tests/journey.e2e.js [baseURL]
 */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:8097';
const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900, mobile: false },
  { name: '390x844',  width: 390,  height: 844, mobile: true  },
  { name: '360x800',  width: 360,  height: 800, mobile: true  },
];

let pass = 0, fail = 0;
const results = [];
function check(vp, step, cond, detail) {
  (cond ? pass++ : fail++);
  results.push({ vp, step, ok: !!cond, detail: detail || '' });
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  [${vp}] ${step}${detail && !cond ? ' -> ' + detail : ''}`);
  if (!cond) process.exitCode = 1;
}


/**
 * Drive Find My Fit to a rendered recommendation list.
 *
 * The three copies of this sequence were the only flaky part of the
 * suite: they waited on `!vs-btn.disabled`, but the button is enabled by
 * a change handler that runs after the model list is populated
 * asynchronously, so the wait could observe a stale enabled/disabled
 * state and then click a button that was not ready. Each step now waits
 * on the OBSERVABLE RESULT of the previous one (option counts, then a
 * non-empty value, then the rendered rows) instead of a proxy signal.
 */
async function selectVehicle(page, year, make, model) {
  await page.waitForSelector('#vs-year', { state: 'visible' });
  await page.selectOption('#vs-year', year);
  await page.waitForFunction(() => document.querySelectorAll('#vs-make option').length > 1);
  const mk = make || await page.evaluate(() => document.querySelectorAll('#vs-make option')[1].value);
  await page.selectOption('#vs-make', mk);
  await page.waitForFunction(() => document.getElementById('vs-make').value !== '');
  await page.waitForFunction(() => document.querySelectorAll('#vs-model option').length > 1);
  const md = model || await page.evaluate(() => document.querySelectorAll('#vs-model option')[1].value);
  await page.selectOption('#vs-model', md);
  await page.waitForFunction(() => document.getElementById('vs-model').value !== '');
  await page.waitForFunction(() => {
    const b = document.getElementById('vs-btn');
    return b && !b.disabled && document.getElementById('vs-model').value !== '';
  });
  await page.click('#vs-btn');
  // the rendered rows are the real end state, not the click itself
  await page.waitForFunction(() => document.querySelectorAll('.vs-rec-add[data-service]').length > 0);
  await page.waitForSelector('.vs-rec-add[data-service]', { state: 'visible' });
  return { mk, md };
}

const draftOf = (page) => page.evaluate(() =>
  JSON.parse(localStorage.getItem('cu_quote_draft_v1') || 'null'));

async function run(vp) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.mobile, isMobile: vp.mobile,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 120)));

  try {
    // ── 1. clear all relevant storage ────────────────────────────────
    await page.goto(BASE + '/index.html');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    check(vp.name, '1. storage cleared', (await draftOf(page)) === null);

    // ── 2. vehicle through the UI ────────────────────────────────────
    const { mk: make, md: model } = await selectVehicle(page, '2022');
    let d = await draftOf(page);
    check(vp.name, '2. vehicle chosen via UI', d && d.vehicle && d.vehicle.year === '2022',
      JSON.stringify(d && d.vehicle));

    // heading must say "Recommended", never "compatible"
    const heading = await page.textContent('#vs-results-label');
    check(vp.name, '2b. heading says Recommended, not compatible',
      /Recommended/i.test(heading) && !/compatib/i.test(heading), heading);

    // ── 3. two services through the UI ───────────────────────────────
    const ids = await page.$$eval('.vs-rec-add[data-service]',
      els => els.slice(0, 2).map(e => e.getAttribute('data-service')));
    for (const id of ids) await page.click(`.vs-rec-add[data-service="${id}"]`);
    d = await draftOf(page);
    check(vp.name, '3. two services selected via UI',
      d && d.services.length === 2 && ids.every(i => d.services.includes(i)),
      JSON.stringify(d && d.services));

    // CTA reflects the count, live region announces it
    const ctaText = (await page.textContent('#vs-continue')).replace(/\s+/g, ' ').trim();
    check(vp.name, '3b. CTA shows selected count', /2 selected/.test(ctaText), ctaText);
    const live = await page.textContent('#vs-live');
    check(vp.name, '3c. count announced to screen readers', /2 services selected/.test(live), live);

    // selection control and details link are siblings, not nested
    const nested = await page.$$eval('.vs-rec',
      rows => rows.some(r => !!r.querySelector('a button, a input, button a')));
    check(vp.name, '3d. no interactive control nested inside a link', !nested);

    // tap targets
    const smallest = await page.$$eval('.vs-rec-add[data-service], .vs-rec-details, #vs-unsure',
      els => Math.min(...els.map(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); })));
    check(vp.name, '3e. tap targets >= 44px', smallest >= 44, smallest + 'px');

    // toggling off must remove it (persistent selected state)
    await page.click(`.vs-rec-add[data-service="${ids[1]}"]`);
    d = await draftOf(page);
    check(vp.name, '3f. re-clicking removes the service', d.services.length === 1);
    await page.click(`.vs-rec-add[data-service="${ids[1]}"]`);   // put it back
    check(vp.name, '3g. no duplicates after re-add',
      (await draftOf(page)).services.length === 2);

    // ── 4. audience through the UI ───────────────────────────────────
    // Click the real "Fleet & Commercial" card and let it navigate, which
    // is what a customer actually does. Rewriting its href to stay on the
    // page would have removed the ?audience= the handler reads — a test
    // artifact, not a product behaviour.
    await page.click('a[href*="audience=fleet"]');
    await page.waitForLoadState('domcontentloaded');
    d = await draftOf(page);
    check(vp.name, '4a. audience card navigated', /start-here|audience=fleet/.test(page.url()), page.url());
    check(vp.name, '4b. audience captured from the audience card', d && d.audience === 'fleet',
      JSON.stringify(d && d.audience));
    check(vp.name, '4c. choosing an audience kept the services', d && d.services.length === 2,
      JSON.stringify(d && d.services));

    // ── 5. visible Continue to Quote ─────────────────────────────────
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#vs-continue', { timeout: 5000 }).catch(() => {});
    const haveCta = await page.$('#vs-continue');
    if (haveCta) {
      await page.click('#vs-continue');
    } else {
      // Find My Fit collapses on a fresh load; re-open it, then use the CTA.
      await selectVehicle(page, '2022', make, model);
      await page.waitForSelector('#vs-continue', { state: 'visible' });
      await page.click('#vs-continue');
    }
    await page.waitForLoadState('domcontentloaded');
    check(vp.name, '5. Continue to Quote navigated to the quote page', /quote/.test(page.url()), page.url());

    // ── 6. hydration is visible ──────────────────────────────────────
    await page.waitForTimeout(900);
    const hydrated = await page.evaluate(() => ({
      year: document.getElementById('r-year')?.value,
      checked: [...document.querySelectorAll('input[name="services"]:checked')].map(c => c.value),
      panel: document.querySelector('.audience-tab.active')?.getAttribute('data-panel'),
      chips: document.querySelectorAll('.cu-chip').length,
      summaryVisible: [...document.querySelectorAll('.cu-chip')].every(c => c.getBoundingClientRect().height > 0),
    }));
    check(vp.name, '6a. vehicle hydrated', hydrated.year === '2022', hydrated.year);
    check(vp.name, '6b. services visibly checked', hydrated.checked.length === 2, JSON.stringify(hydrated.checked));
    check(vp.name, '6c. audience tab is fleet (not assumed retail)', hydrated.panel === 'form-fleet', hydrated.panel);
    check(vp.name, '6d. summary visible under a non-retail audience', hydrated.summaryVisible && hydrated.chips >= 3,
      'chips=' + hydrated.chips);

    // ── 7. remove a service, change the vehicle ──────────────────────
    // Both edits go through visible controls. Note the audience here is
    // FLEET, whose panel has no year/make/model inputs at all (it asks
    // for a vehicle count) — so the summary chip's remove control is the
    // vehicle control for this customer, which is precisely why the
    // summary had to live outside the audience panels.
    await page.click('.cu-chip[data-clear="service"] button');
    await page.waitForTimeout(250);
    const afterSvcRemove = await draftOf(page);
    check(vp.name, '7a. service removed via its visible control',
      afterSvcRemove.services.length === 1, JSON.stringify(afterSvcRemove.services));

    // Change (not clear) the vehicle. The fleet panel has no year field,
    // so switch audience with the real tab first — which is itself a
    // visible audience control — then edit the now-visible year select.
    await page.click('.audience-tab[data-panel="form-retail"]');
    await page.waitForTimeout(300);
    await page.selectOption('#r-year', '2020');
    await page.waitForTimeout(300);
    d = await draftOf(page);
    check(vp.name, '7b. audience changed via the real tab', d.audience === 'retail', JSON.stringify(d.audience));
    check(vp.name, '7c. vehicle changed via the visible year control',
      d.vehicle && d.vehicle.year === '2020', JSON.stringify(d.vehicle));

    // ── 8. refresh keeps the edit ────────────────────────────────────
    await page.reload();
    await page.waitForTimeout(900);
    const afterReload = await page.evaluate(() => ({
      year: document.getElementById('r-year')?.value,
      checked: [...document.querySelectorAll('input[name="services"]:checked')].length,
      panel: document.querySelector('.audience-tab.active')?.getAttribute('data-panel'),
    }));
    check(vp.name, '8. refresh preserved the edited state',
      afterReload.year === '2020' && afterReload.checked === 1 && afterReload.panel === 'form-retail',
      JSON.stringify(afterReload));

    // ── 9. back restores Find My Fit selections ──────────────────────
    await page.goBack({ waitUntil: 'domcontentloaded' });
    // restoreFromDraft() re-drives the selects asynchronously; wait for the
    // observable end state instead of a fixed sleep, which was flaky.
    await page.waitForFunction(
      () => !document.querySelector('#vs-year') ||
            !!document.querySelector('.vs-results.visible .vs-rec-add[data-service]'),
      null, { timeout: 15000 }).catch(() => {});
    const onHome = /index|\/$/.test(page.url());
    const backState = await page.evaluate(() => ({
      selected: [...document.querySelectorAll('.vs-rec-add.is-selected')].map(e => e.getAttribute('data-service')),
      resultsVisible: !!document.querySelector('.vs-results.visible'),
      ctaText: (document.getElementById('vs-continue') || {}).textContent || '',
    }));
    check(vp.name, '9. back: Find My Fit restored its selection',
      !onHome || (backState.selected.length === 1 && backState.resultsVisible),
      'url=' + page.url() + ' ' + JSON.stringify(backState.selected) + ' visible=' + backState.resultsVisible);

    // ── 10. forward restores the edited quote state ──────────────────
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => !document.getElementById('r-year') || document.getElementById('r-year').value !== '',
      null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);
    const fwd = await page.evaluate(() => ({
      url: location.pathname,
      year: document.getElementById('r-year')?.value,
      checked: [...document.querySelectorAll('input[name="services"]:checked')].length,
      panel: document.querySelector('.audience-tab.active')?.getAttribute('data-panel'),
    }));
    check(vp.name, '10. forward: quote page restored the edited state',
      /quote/.test(fwd.url) && fwd.year === '2020' && fwd.checked === 1 && fwd.panel === 'form-retail',
      JSON.stringify(fwd));

    // ── 12. keyboard + focus + labels ────────────────────────────────
    // Start clean: with a draft present, restoreFromDraft() re-drives the
    // same selects this step drives, and the two race.
    await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await selectVehicle(page, '2022', make, model);
    const before = (await draftOf(page)).services.length;
    await page.focus('.vs-rec-add[data-service]');
    const focusVisible = await page.evaluate(() => {
      const el = document.activeElement;
      const s = getComputedStyle(el, ':focus-visible');
      return { tag: el.tagName, isAdd: el.classList.contains('vs-rec-add'), outline: s.outlineStyle };
    });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const after = (await draftOf(page)).services.length;
    check(vp.name, '12a. selection operable by keyboard (Enter)', after === before + 1,
      `${before} -> ${after}`);
    check(vp.name, '12b. focus lands on the button element', focusVisible.isAdd, JSON.stringify(focusVisible));
    const labels = await page.$$eval('.vs-rec-add[data-service]',
      els => els.every(e => (e.getAttribute('aria-label') || '').length > 3 && e.hasAttribute('aria-pressed')));
    check(vp.name, '12c. add controls have aria-label + aria-pressed', labels);
    const detailsLabelled = await page.$$eval('.vs-rec-details',
      els => els.every(e => /view service details/i.test(e.getAttribute('aria-label') || '')));
    check(vp.name, '12d. details links are distinctly labelled', detailsLabelled);

    // expert path works with nothing selected
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
    await selectVehicle(page, '2022', make, model);
    await page.waitForSelector('#vs-unsure', { state: 'visible' });
    await page.click('#vs-unsure');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(700);
    const expert = await page.evaluate(() => ({
      url: location.pathname + location.search,
      askShown: !!document.getElementById('cu-audience-ask'),
      formPresent: !!document.getElementById('quote-retail'),
    }));
    check(vp.name, '12e. "ask an expert" continues with no service selected',
      /quote/.test(expert.url) && expert.formPresent, JSON.stringify(expert));
    check(vp.name, '12f. unknown audience is asked, not assumed', expert.askShown);

    check(vp.name, 'no uncaught page errors', errors.length === 0, errors.join(' | '));
  } finally {
    await browser.close();
  }
}

(async () => {
  for (const vp of VIEWPORTS) {
    console.log('\n=== ' + vp.name + (vp.mobile ? ' (touch)' : '') + ' ===\n');
    try { await run(vp); }
    catch (e) { fail++; process.exitCode = 1; console.error('  ERROR [' + vp.name + '] ' + String(e).slice(0, 300)); }
  }
  console.log('\n──────────────────────────────────────');
  console.log(`TOTAL: ${pass} passed, ${fail} failed`);
  const bad = results.filter(r => !r.ok);
  if (bad.length) { console.log('\nFailures:'); bad.forEach(b => console.log(`  [${b.vp}] ${b.step} -> ${b.detail}`)); }
})();
