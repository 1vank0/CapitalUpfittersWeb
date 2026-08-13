# Design Comparison Matrix

Scored 2026-08-06 against the three prototypes in `experiments/direction-{a,b,c}-*`. Methodology: structural verification (all three agents confirmed valid HTML/CSS/JS, working relative paths, no duplicate IDs) plus a live visual pass in the Browser pane (local static server, both desktop viewport and scroll-through) for Brand fit, Visual distinction, and Accessibility. Performance and full accessibility auditing were **not** Lighthouse-measured against the prototypes in this pass — scored directionally from observed signals (image/video usage, JS footprint) and disclosed as such, consistent with the honesty standard set in `research/competitor-matrix.md`.

## Real defects found during the visual pass (not from agent self-reports)

- **Direction A:** service-category card headings ("Fleet & Commercial," "Industrial") have low text/background contrast — legible but weak, confirmed via screenshot at `#full-services`.
- **Direction C:** hero headline ("Tell us what you're upfitting. Get a real quote today.") has a real contrast failure against its background photo — confirmed via two screenshots as the background carousel rotates; text becomes nearly unreadable against busier images. This must be fixed (solid scrim/overlay) before this hero pattern ships.
- **Direction B:** no contrast defects found in the sections reviewed (hero, spec table). Scroll-reveal animation briefly renders content as blank/white before its `is-visible` class triggers opacity — cosmetic, not a defect, but worth a shorter reveal delay in implementation.

## Scored matrix (1–10 per category, weighted per task spec)

| Category | Weight | A — Luxury | B — Technical | C — Conversion |
|---|---:|---:|---:|---:|
| Brand fit | 15% | 8 | 6 | 6 |
| Conversion potential | 15% | 6 | 6 | 9 |
| Trust and credibility | 12% | 7 | 8 | 7 |
| Mobile usability | 12% | 7 | 7 | 8 |
| Service discovery | 10% | 7 | 8 | 7 |
| Visual distinction | 8% | 8 | 7 | 7 |
| Accessibility | 8% | 6 | 7 | 5 |
| Performance (directional, not Lighthouse-measured) | 7% | 7 | 7 | 7 |
| SEO architecture | 7% | 7 | 8 | 7 |
| Maintainability | 6% | 7 | 7 | 7 |
| **Weighted total** | | **7.00** | **6.99** | **7.11** |

The near-tie (7.00 / 6.99 / 7.11) is not a scoring artifact — it reflects that each direction genuinely wins in its own lane and gives up ground elsewhere, which is exactly the situation the task spec anticipates a hybrid recommendation for.

## Recommendation: hybrid, not a single direction

`project-memory/PROJECT-CONTEXT.md`'s brand direction explicitly calls for "premium, restrained... technically credible... luxurious without theatrics... Apple-influenced hierarchy" — that brief itself describes a fusion of A's restraint and B's technical credibility. And the task's primary objective (§1, listed first) is lead generation, which C is purpose-built for. No single prototype satisfies all three; the hybrid does.

**Exact sections adopted, and why:**

1. **Base visual system: Direction A** — typography scale, spacing rhythm, color restraint, imagery treatment, button/CTA styling. *Why:* closest direct match to the stated brand brief; scored highest on Brand fit (8) and Visual distinction (8). **Required fix before use:** add a solid gradient scrim behind service-card text (the confirmed contrast defect above).

2. **Homepage structural order and lead-capture mechanics: Direction C** — the "Find My Fit" picker positioned immediately after the hero (before the service-category grid), proof placed near decision points rather than only at page-bottom, low-friction CTA copy pattern ("no deposit to request a quote, same-business-day response," directly modeled on the research finding that Leonard USA's identical pattern was the strongest lead-gen mechanism observed — `research/best-vs-worst.md`). *Why:* scored highest on Conversion potential (9) by a wide margin, and conversion is the task's first-listed objective. **Required fix before use:** solid scrim behind hero text (the confirmed contrast defect above) — do not carry the low-contrast hero forward as-is.

3. **Fleet/Government section and hitch-adjacent service pages: Direction B's modules** — the spec table, vehicle-fitment panel, and dark "fleet credibility zone" with partner-authorization badges. *Why:* scored highest on Trust/credibility (8) and Service discovery (8); directly answers `best-principles.md` §12 (Vehicle-fitment strategy) and §14 (Fleet lead strategy), and mirrors the research findings on what the strongest fleet/technical competitors do (Holman, Adrian Steel — `research/top-five-analysis.md`).

4. **Trust-claims handling: Direction B's "Verification Status" panel pattern** — explicitly flags every `FACTS-TO-VERIFY.md` item as pending rather than either stating it as fact or silently omitting it. *Why:* the cleanest, most transparent implementation of the trust-claims gate found across all three prototypes; adopt this pattern sitewide, not just on the homepage.

## What this means for implementation (Task 9)

Build the real site starting from Direction A's CSS/token system, restructure the homepage per Direction C's content order, and pull in Direction B's spec-table/fitment/fleet-zone components for the fleet page and hitch-family service pages. Fix both confirmed contrast defects before anything ships. Full Lighthouse/axe verification against the real implementation happens in the QA phase (`qa/final-qa-report.md`), not against these prototypes.
