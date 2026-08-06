# Task Log

## 2026-08-06
- Resolved canonical repo among ~8 candidates via Vercel cross-reference → `1vank0/CapitalUpfittersWeb`.
- Cloned repo to `/Users/ivanko/Documents/All Coding Projects/CapitalUpfittersWeb`.
- Discovered PR #11 (prior near-duplicate redesign attempt), PR #3, PR #4 — documented in PROJECT-CONTEXT.md and DECISIONS.md.
- Ran capability gate: GitHub + Vercel connected; Firecrawl and OpenAI Images unavailable — fallbacks approved by Ivan.
- Created branch `redesign/2026-relaunch` off `main`.
- Scaffolded `/project-memory/*` and `/CLAUDE.md` routing.
- Next: current-site audit (`reports/existing-site-audit.md`) and competitor research (`research/*`) phases.

## 2026-08-06 (cont.)
- Existing-site audit complete (`reports/existing-site-audit.md`, `project-memory/CONTENT-INVENTORY.md`, `project-memory/ASSET-INVENTORY.md`). Key findings: live CSS uses an Apple-inspired palette (README is stale); 16 pages fire unguarded fetches to a dead CMS domain; sitewide `og:image` is broken (points to a nonexistent file); Tina CMS content (`cms-data.json`) is fully orphaned — nothing renders from it; near-zero real photography (one `<img>` tag sitewide, rest is CSS gradients + inline SVG); lead API contract (`api/lead.js`) is solid and must be preserved; unverified `aggregateRating` (5.0/96) baked into JSON-LD.
- Competitor research complete (`research/competitor-inventory.md`, `research-sources.md`, `research-evidence.json`, 50 sites). Coverage: 25 regional (9 direct/16 indirect), 12 national, 8 manufacturer/marketplace, 5 design references. Key insight: Capital Upfitters is a Patriot Liner licensee, and multiple regional "competitors" (baltimorebedliners.com, apsjohnstown.com) run byte-identical Patriot Liner template copy — a distinctly branded, non-templated site is a real differentiation opening, not just a nice-to-have. Strongest local competitors (All American Paint Protection, My Paint Doctor, Capital Wrappers) pair 150+ reviews with dense city-specific geo-landing pages.
- Competitor judging matrix, top-five analysis, best-vs-worst complete (`research/competitor-matrix.md`, `top-five-analysis.md`, `best-vs-worst.md`). Scored 21 direct/national competitors on 7 evidence-backed categories (63% of spec weight); flagged 7 categories (mobile/visual/local-SEO/gallery/perf/a11y/schema, 37% weight) as unmeasured — no Lighthouse/rendering access to competitor sites, disclosed rather than fabricated.
- `best-principles.md` complete — all 31 required sections, each claim tagged by evidence source. Key decision made: keep static hand-authored HTML, do not wire Tina CMS this pass (see DECISIONS.md).
