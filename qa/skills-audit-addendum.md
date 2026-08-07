# QA Addendum — Tooling-Based Audit (claude-seo)

Date: 2026-08-07. Supersedes parts of `qa/final-qa-report.md` §6.

## Why this exists

The original QA report stated Lighthouse and axe "were not measured — no runner available in this environment." **That was wrong.** The `claude-seo` toolchain was installed the whole time; its CLI simply required Python 3.10+ while the default `python3` is 3.9.6. Pointing `CLAUDE_SEO_PYTHON` at the already-installed Python 3.11.15 and running `claude-seo setup` provisioned a managed runtime with Chromium in about a minute. The performance and accessibility gap was a tooling-setup problem I didn't diagnose, not an environment limitation.

## Real Lighthouse data — production, 24 routes (Unlighthouse, mobile)

| Category | Average | Worst | Target | Verdict |
|---|---:|---:|---:|---|
| Performance | 87 | 75 | 90+ | **Misses** on 13 of 24 routes |
| Accessibility | 90 | 83 | 95+ | **Misses** on most routes |
| Best Practices | 95 | 75 | 95+ | Misses on 3 routes |
| SEO | 100 | 100 | 95+ | **Passes everywhere** |

Worst performers: `/locations/silver-spring-md.html` (75), `/locations/gaithersburg-md.html` (77), `/dealer-government.html` (79 perf / 75 BP), `/services/ceramic-coating.html` (79). Homepage: 83 / 84 / 100 / 100.

Best Practices 75 on `/contact.html`, `/quote.html`, `/dealer-government.html` — worth a separate look.

## Accessibility failures by frequency (production)

| Audit | Routes affected |
|---|---:|
| `label-content-name-mismatch` | 25 |
| `color-contrast` | 20 |
| `aria-hidden-focus` | 19 |
| `target-size` | 14 |
| `aria-prohibited-attr` | 10 |
| `heading-order` | 2 |

## Fixed on this branch as a result

**1. `aria-hidden-focus` — floating and sticky quote CTAs invisible to screen readers.**
The floating "Get a Quote" CTA (36 pages) and the sticky mobile CTA bar (4 pages) were wrapped in `aria-hidden="true"` while containing real links. Screen-reader users could not reach the primary floating quote CTA at all, while keyboard users could still tab into it — a focus trap into content the accessibility tree says doesn't exist. **This is a conversion bug as much as an accessibility one.** Verified 40 → 0 violations sitewide with a nesting-aware parser. Pre-existing on `main`.

*Method note:* a first crude regex scan reported 17 violations on `index.html`; a proper nesting-aware parse showed the true figure was 1 there and 5 across the three redesigned pages, with the rest being correct `aria-hidden` on decorative SVGs. The sitewide fix was scoped from the verified count, not the crude one.

**2. NAP inconsistency — local-SEO ranking factor.**
Three competing variants were live: `12019 Nebel St` (81 uses) vs `12019 Nebel Street` (41), and a one-off `301-304-1419` in `contact.html`'s `<title>` against `(301) 304-1419` everywhere else. NAP consistency is a documented local-pack factor; Google cross-references these strings against directory citations. Normalized to `data/business.json`. Now one street format (122 uses) and one display phone format sitewide.

## Content quality — redesigned homepage

`content_quality.py` (QRG-aligned) on the rebuilt `index.html`:

| Metric | Score |
|---|---:|
| Overall quality | **96 / 100** |
| Filler language | 0 (none detected) |
| AI-pattern language | 0 (none detected) |
| Information density | 1.0 (max) |
| Repetition | 30 (flagged) |

The single "repetitive" flag is expected for a page carrying 16 service cards and repeated conversion CTAs.

## GEO / AI-search readiness

- **AI crawlers are not blocked.** `robots.txt` is `User-agent: * / Allow: /` with no `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot`, or `OAI-SearchBot` restrictions — AI search engines can crawl and cite the site.
- **No `llms.txt`.** Optional and ignored by Google Search; low priority.

## Still not verified

- **The redesigned pages have no Lighthouse score of their own.** Unlighthouse blocks `localhost`/`127.0.0.1` (SSRF protection), and the Vercel Preview timed out behind Vercel Authentication. The scores above are **production**, i.e. the pre-redesign baseline. To score the redesign, either disable Preview protection temporarily or run Lighthouse after promotion.
- PageSpeed Insights API returned a rate-limit error without an API key; CrUX field data was not retrieved. Configure a Google API key for field-data runs.
- Safari and real-device testing still not performed.
- `color-contrast` (20 routes), `label-content-name-mismatch` (25 routes), `target-size` (14 routes), and `aria-prohibited-attr` (10 routes) are **identified but not yet fixed** — they need per-element review rather than a sitewide pattern fix.

## Recommended next

1. Fix `label-content-name-mismatch` and `color-contrast` — the two largest remaining accessibility gaps, together the main thing keeping Accessibility below the 95 target.
2. Investigate Best Practices 75 on `contact.html`, `quote.html`, `dealer-government.html`.
3. Performance work on the two weakest location pages (75, 77).
4. Re-run `claude-seo run unlighthouse_run.py` against the deployed site after promotion to confirm the redesign's real scores.

---

# Part 2 — UI/UX Design Review (ui-ux-pro-max)

Ran 2026-08-07 against the redesigned homepage, fleet, and hitches pages.

## Direction validated

Querying the design-system database for "automotive service premium technical trust conversion" returned **"Trust & Authority + Conversion"** as the recommended pattern:

| Database recommendation | What the redesign already does |
|---|---|
| Sections: Hero (credibility) → Proof → Solution overview → CTA path | Matches `best-principles.md` §8 hierarchy as built |
| CTA: "Get Quote (primary) + Nav" | Matches — primary quote CTA plus nav CTA |
| Color: "Navy/Grey corporate. Trust blue. Accent for CTA only." | Matches — Apple ink `#1d1d1f` + Signal Blue `#0071e3` reserved for CTAs |
| Typography: Inter | Matches — Manrope display + Inter body |

Independent corroboration of the hybrid direction chosen in `reports/design-comparison-matrix.md`.

## Recommendation deliberately NOT followed

The database suggested the **"Liquid Glass"** style (translucent, animated blur, chromatic aberration) and a red `#DC2626` CTA accent. Both were rejected:

- Liquid Glass carries the database's own warnings — **Performance: Moderate-Poor** and **Accessibility: Text contrast**. Production already misses the Performance target (avg 87 vs 90) and we had just finished repairing contrast failures. Adopting it would regress both.
- Switching the CTA accent from Signal Blue to red would discard the merged Apple-palette decision on `main` (PR #10) without a documented reason, which `REQUIREMENTS.md` forbids.

Recorded because a future session may re-run this query and see the same suggestion.

## Contrast — measured and fixed

Computed real WCAG ratios rather than trusting Lighthouse's pass/fail alone:

| Token | Ratio on dark | Verdict | Action |
|---|---:|---|---|
| `rgba(255,255,255,0.28)` | 2.4:1 | Fail | → 0.6 |
| `rgba(255,255,255,0.30)` | 2.9:1 | Fail | → 0.6 |
| `rgba(255,255,255,0.35)` | 3.3:1 | Fail | → 0.6 |
| `rgba(255,255,255,0.40)` | 3.7:1 | Fail | → 0.6 |
| `rgba(255,255,255,0.45)` | 4.4:1 | Borderline fail | → 0.6 |
| `rgba(255,255,255,0.50+)` | 5.1:1+ | Pass | unchanged |
| `--brand-muted` on white | 5.07:1 | Pass | unchanged |
| Signal Blue ↔ white | 4.70:1 | Pass | unchanged |

Border/outline `rgba` values at the same alphas were left alone — they are non-text UI boundaries under the 3:1 threshold, not body text. Zero sub-AA text colors remain in the redesigned files.

## Checklist results

| Item | Status |
|---|---|
| `prefers-reduced-motion` respected | Pass — guarded in `animations.js` |
| Focus states visible | Pass — 9 focus rules in `style.css` |
| `cursor: pointer` on clickables | Pass |
| Transition durations 150–300ms | Mostly pass (0.1–0.4s); one 0.65s and one 8s ambient animation |
| Light-mode text contrast 4.5:1 | Pass after the fix above |
| **No emoji as icons** | **FAIL — see below** |

## Open finding: emoji used as icons (not fixed)

The checklist's "no emojis as icons (use SVG)" rule fails in three places:

1. **`★` in nav badges** — "★ Top Seller", "★ Bundle", and a `★ Popular` optgroup label. Worth prioritising: screen readers announce this as "black star", and a star glyph reads as a *rating* — misleading on a site where every rating claim was just removed as unverified.
2. **`🔧` / `🛡️` section labels in `fleet.html`** — announced as "wrench" / "shield" before the actual label text.
3. **A ~30-entry emoji icon map in the homepage vehicle-selector JS** (`🛡️ 🔒 🔗 🧰 ⛺ ✨ 🕳️ 💡 📦 🚜 🎨 …`) injected into results, plus a `✉️` in a generated CTA.

Beyond screen-reader noise, emoji render inconsistently across platforms and undercut the "premium, restrained, technically credible" brand direction in `PROJECT-CONTEXT.md`.

**Not fixed here** because a proper migration means introducing an SVG icon set and touching the selector's rendering logic — a self-contained piece of work that deserves its own pass and its own review, rather than being folded into a contrast fix. **Minimum viable interim step:** wrap each decorative emoji in `<span aria-hidden="true">` so assistive tech skips it, and drop the `★` from the badges entirely.
