# Final QA Report — Capital Upfitters 2026 Relaunch

Branch: `redesign/2026-relaunch` · Date: 2026-08-06 · Production: **untouched** (`main` @ `ab77025`)

Testing method: local static server (`python3 -m http.server`) plus the in-app Chromium Browser pane, scripted DOM/geometry assertions, and a pristine `main` worktree served in parallel as a baseline to separate pre-existing bugs from regressions. Every "pre-existing" label below was verified by reproducing the behavior on unmodified `main` at the same viewport — not assumed.

---

## 1. Automated checks — all passing

| Check | Result |
|---|---|
| HTML tag balance (all rebuilt pages) | Pass — no unclosed/mismatched tags |
| JSON-LD validity (57 blocks, 40 pages) | Pass — 100% parse |
| Broken internal links (4,227 hrefs, 40 pages) | **26 → 0** |
| Asset paths (images, video, CSS, JS) | 0 broken |
| CSS brace balance (`style.css`) | Balanced |
| JS syntax (`node --check`) | Pass |
| Sitemap XML validity | Pass |
| Meta description present | All indexable pages (only `404.html`, `preview.html`, `products-section.html` lack one — pre-existing, all non-indexed/orphaned) |
| Horizontal page overflow at 375px | None (`scrollWidth == clientWidth`) |

## 2. Lead-flow regression gate

`node --test tests/lead-flow-contract.test.js`

| | This branch | Pristine `main` |
|---|---|---|
| Pass | 15 | 15 |
| **Fail** | **0** | **0** |
| Cancelled | 13 | 13 |

**Identical to baseline.** The 13 cancellations are a pre-existing environment artifact (`Promise resolution is still pending but the event loop has already resolved`), first documented in `reports/existing-site-audit.md` §3 — not caused by this work. **Zero regressions.** Per the audit's own guidance, re-run in Ivan's normal dev environment before any future change to lead-flow files.

Preserved and verified intact: `api/lead.js` contract, `lead-form.js` single-controller pattern, `attribution.js` public contract, `<script>` load order, and `assets/amp-powerstep.mp4`.

## 3. Real defect found and fixed

**Mobile nav CTA overflowed the viewport — FIXED**
At a 375px CSS viewport the header "Get a Quote" button's right edge sat at 421px, 46px past the viewport edge and visibly clipped. Cause: the `max-width: 900px` breakpoint hides `.nav-links`/`.nav-portal-link` but never constrains `.nav-cta`, so logo + CTA + hamburger exceeded the bar. Fixed in `style.css` by scaling the CTA below 600px and hiding it below 430px, where the hamburger menu and sticky mobile action bar both still expose the quote path. Verified: overflow eliminated, hamburger still reachable.
**Pre-existing on `main`** (reproduced at identical geometry on a clean worktree) — this redesign surfaced it rather than caused it.

## 4. Two suspected "critical bugs" investigated and dismissed

Recorded because both look alarming under automated inspection and will waste a future session's time otherwise.

**a) Hero headline at 2% opacity — NOT a bug; intentional feature.**
Automated checks repeatedly measured the hero `h1` frozen at `opacity: 0.02`, which looks like a stuck reveal animation hiding the site's most important text. It is actually a deliberate idle-fade in an inline script in `index.html` (`IDLE_MS = 1800`): after 1.8s with no `mousemove`/`touchstart`/`keydown`, the hero label, headline, and subtitle fade to 2% so the background video shows through, restoring instantly on any interaction. A headless/idle browser never generates those events, so it always captures the faded state. Reproduces identically on `main`. **No change made.**

**b) "0 of 32 reveal elements visible" — NOT a bug; wrong test.**
`.reveal.visible` counted 0, suggesting the reveal system never fired. But `.visible` belongs to the IntersectionObserver *fallback*, which by design only runs when `CSS.supports('animation-timeline','scroll()')` is false. This browser supports scroll-driven animations, so elements animate via `animation-timeline: view()` and never receive `.visible`. Intermediate opacities (e.g. `0.253`) were correct scroll-linked progress for a partially-entered element, not a stall — they appeared "frozen" only because the page wasn't being scrolled. **No change made.**

An earlier failsafe added to `animations.js` during this investigation was **reverted** once the above was understood, since forcing `opacity: 1` would have defeated both the intended idle-fade and the scroll-driven reveals.

## 5. Trust-claim compliance

Sitewide claim sweep after cleanup: **2 residual mentions**, both legitimate — a homepage FAQ question ("Are you an authorized Patriot Liner dealer?") whose answer explicitly states authorization status is pending verification.

Removed across ~40 pages: `aggregateRating` 5.0/96 (19 files), "Authorized Patriot Liner dealer", per-brand authorization badges (Stealth Hitch, Ranch, ReadyLIFT, DECKED, 3M/Avery, government procurement), Audi/BMW/Mercedes/Volvo/Tesla "active certifications", IGL/System X certified-installer, "5,000+ vehicles", family ownership, and all tenure claims.

**Ivan confirmed 2026-08-06 that the shop has operated since 2015**, making the site's previous "family-owned since 1994" / "30+ years" claims factually wrong. No year or duration was substituted. See `project-memory/DECISIONS.md`.

## 6. Not verified in this pass — stated plainly

- ~~**Lighthouse scores were not measured — no runner available.**~~ **CORRECTED 2026-08-07:** this was wrong. The `claude-seo` toolchain was installed all along; its CLI just needed Python 3.10+ (`CLAUDE_SEO_PYTHON`). Real Lighthouse data for 24 production routes, the resulting accessibility fixes, and what remains unmeasured are in **`qa/skills-audit-addendum.md`**. Headline: production averages Performance 87 / Accessibility 90 / Best Practices 95 / SEO 100 — SEO passes everywhere, Performance and Accessibility miss their targets.
- **Safari / real-device testing not performed** — only the in-app Chromium pane was available. Reduced-motion and keyboard-navigation paths were not exercised end-to-end.
- **No live lead submission was tested.** By design: no form was submitted to production or any live endpoint. The contract suite exercises `api/lead.js` with `global.fetch` fully mocked.
- **Only 3 of 40 pages were visually rebuilt** (`index.html`, `fleet.html`, `services/hitches.html`). The remaining 37 received the sitewide technical/claim/link fixes but retain their prior visual design. Extending the hybrid direction to the other service and location pages is follow-on work.

## 7. Recommended before production promotion

1. Run Lighthouse + axe against the Preview URL; confirm the §24 targets.
2. Re-run `tests/lead-flow-contract.test.js` in a normal dev environment.
3. Real-device pass on iOS Safari and Android Chrome.
4. Decide the 4 remaining non-www canonical instances (`project-memory/OPEN-QUESTIONS.md`).
5. Restore only those trust claims Ivan can document.
6. **Independent of this redesign:** the unverified `aggregateRating` and the incorrect 1994 founding year are still live on production today. Both are fixed on this branch but remain public until something ships.
