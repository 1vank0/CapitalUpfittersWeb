# Competitor Judging Matrix

Source: `research-evidence.json` (50 sites, researched 2026-08-06 via WebSearch/WebFetch — Firecrawl unavailable, see `project-memory/DECISIONS.md`).

## Methodology and honesty disclosure

The task spec's full 14-category weighting includes categories that cannot be honestly scored from fetched HTML/text content alone: **Mobile usability, Visual credibility, Local SEO visibility, Gallery quality, Performance, Accessibility, Structured data/technical SEO** (37% of the original weight). No Lighthouse run, no device rendering, and no SERP-rank tool were run against 21 third-party sites in this pass — scoring those numerically would be fabrication, not evidence.

**This matrix scores only the 7 categories with direct textual evidence** (Positioning & differentiation, Lead-generation effectiveness, Quote/booking experience, Trust & proof, Service discovery, Content & topical authority, Fleet & commercial experience — original weight 63%), re-normalized to 100%. The excluded categories are addressed qualitatively below with evidence explicitly labeled "observed signal" (e.g., geo-page density as a Local SEO proxy) or flagged as unmeasured.

Scope: the 21 **Direct regional + National competitors** only (per spec, manufacturers/suppliers/marketplaces are not scored as competitors — see `research/competitor-inventory.md` for their profiles).

| Category | Original weight | Normalized weight |
|---|---:|---:|
| Lead-generation effectiveness | 13% | 20.6% |
| Quote or booking experience | 10% | 15.9% |
| Trust and proof | 10% | 15.9% |
| Positioning and differentiation | 9% | 14.3% |
| Service discovery | 9% | 14.3% |
| Content and topical authority | 6% | 9.5% |
| Fleet and commercial experience | 6% | 9.5% |

All scores 1–10, evidence type "observed" (from research-evidence.json) unless noted.

## Scored matrix

| Rank | Site | Position. | Lead-gen | Quote/Book | Trust | Svc discovery | Content | Fleet | **Weighted** |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Holman | 8 | 7 | 6 | 9 | 8 | 6 | 10 | **7.64** |
| 2 | Strobes N' More | 8 | 7 | 8 | 8 | 7 | 6 | 6 | **7.27** |
| 3 | Advantage Outfitters | 7 | 7 | 7 | 8 | 7 | 5 | 9 | **7.16** |
| 4 | RoadRunner Wraps | 8 | 7 | 7 | 9 | 6 | 5 | 7 | **7.13** |
| 5 | APS Rust & Tint (Fairfax) | 7 | 7 | 6 | 8 | 8 | 6 | 7 | **7.05** |
| 5 | Ted Britt Truck Shop | 8 | 6 | 7 | 8 | 6 | 6 | 9 | **7.05** |
| 7 | Capital Wrappers | 7 | 7 | 6 | 8 | 7 | 8 | 3 | **6.72** |
| 8 | Truck'n America | 8 | 6 | 6 | 8 | 8 | 5 | 5 | **6.70** |
| 9 | Leonard USA | 6 | 8 | 8 | 9 | 5 | 5 | 3 | **6.68** |
| 10 | U.S. Upfitters | 6 | 6 | 6 | 7 | 7 | 5 | 8 | **6.40** |
| 11 | Truckfitters (Big Tex) | 6 | 6 | 6 | 7 | 7 | 5 | 6 | **6.21** |
| 12 | Momentum Fleet Group | 6 | 7 | 6 | 6 | 6 | 4 | 8 | **6.21** |
| 13 | Trick Trucks | 6 | 6 | 6 | 6 | 8 | 5 | 6 | **6.19** |
| 14 | Adrian Steel | 7 | 5 | 5 | 8 | 6 | 5 | 7 | **6.10** |
| 15 | Superior Linings | 5 | 6 | 6 | 7 | 7 | 5 | 4 | **5.87** |
| 16 | National Fleet Services | 6 | 4 | 4 | 6 | 5 | 4 | 8 | **5.13** |
| 17 | Alliance Fleet | 6 | 3 | 3 | 6 | 7 | 3 | 8 | **4.95** |
| 18 | Baltimore Bedliners | 4 | 5 | 6 | 5 | 6 | 3 | 3 | **4.78** |
| 19 | APS Johnstown (Patriot Liner) | 3 | 5 | 6 | 5 | 6 | 3 | 3 | **4.64** |
| 20 | Coastal Linings | 4 | 5 | 5 | 3 | 7 | 3 | 4 | **4.54** |
| 21 | LINE-X of Northern VA | 5 | 4 | 4 | 4 | 6 | 4 | 4 | **4.43** |

## Unmeasured categories — qualitative evidence only

- **Local SEO visibility (not scored numerically):** Observed-signal proxy only (geo-landing-page density, not verified rankings). Capital Wrappers, My Paint Doctor, and All American Paint Protection (indirect regional, not in the 21-site table) show the deepest geo-page networks. Capital Upfitters' current site has 4 location pages — thin by comparison.
- **Gallery quality:** Not independently scored. RoadRunner Wraps and Truck'n America both surface visible project/work galleries; most others do not show one in fetched content.
- **Visual credibility, Mobile usability, Performance, Accessibility, Structured data/technical SEO:** Not measured against competitor sites in this pass — no rendering/device/Lighthouse tool was run against third-party domains. Do not treat any implicit ranking above as covering these dimensions.

## Weight-change disclosure

Per spec: "Weights may be changed only when the reason is documented." Reason recorded here: measurement capability gap (no Firecrawl page-render/Lighthouse access to competitor sites), not a judgment that these categories matter less. When QA-phase Lighthouse/axe tooling runs against Capital Upfitters' own site (`qa/final-qa-report.md`), it should not be treated as comparable to unmeasured competitor scores.
