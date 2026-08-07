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
