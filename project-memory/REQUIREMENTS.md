# Requirements

Source: Ivan's master task instruction, 2026-08-06. Do not remove any item below without recording Ivan's explicit authorization here with a date.

## Non-negotiable
- Static HTML5, mobile-first CSS, CSS custom properties, minimal vanilla JS, progressive enhancement, native controls, responsive images, JSON-LD.
- No React/Next.js/Vue/Angular/Tailwind/Bootstrap/SPA/large framework/unnecessary build system. New dependencies need documented justification + approval.
- Do not change production, merge a PR, modify the production domain, delete the current site, replace/change the current homepage video, publish generated imagery as authentic customer work, commit credentials, or make unsupported claims.
- Production deployment requires Ivan's explicit authorization.

## Objective
Redesign must: generate more qualified retail/fleet/dealership/government/commercial leads; communicate premium quality and technical authority; make services/products easier to discover; establish Capital Upfitters as the strongest upfitting presence in DC/MD/Northern VA; support future integration with Upfit Portal, Josh OS, Steve OS, CRM, gallery-management, customer-portal, fleet-operations; deploy as a Vercel Preview without touching production.

## Trust claims requiring verification before publishing
Family ownership; 30+ years combined experience; operating since 2015; Patriot Liner authorization; Patriot Fleet Solutions relationship; Patriot Rust Defense relationship; Waxoyl Application Center status; RealTruck dealer status; eTrailer installer status/rating; Stealth Hitches installer/parts-provider status; Audi/BMW/Volvo certification; government/law-enforcement work; review ratings/counts; manufacturer logos/trademark permissions. See `FACTS-TO-VERIFY.md`.

## Deliverables checklist
- [ ] `/CLAUDE.md`, `/project-memory/*` — in progress
- [ ] `/reports/existing-site-audit.md`
- [ ] `/research/competitor-inventory.md`, `research-sources.md`, `research-evidence.json`
- [ ] `/research/competitor-matrix.md`, `top-five-analysis.md`, `best-vs-worst.md`
- [ ] `/best-principles.md`
- [ ] `/reports/recommended-sitemap.md`, `seo-aeo-geo-plan.md`, `schema-plan.md`, `image-strategy.md`
- [ ] `/experiments/direction-a-luxury`, `direction-b-technical`, `direction-c-conversion`
- [ ] `/reports/design-comparison-matrix.md`
- [ ] Selected static HTML implementation
- [ ] Centralized media manifest
- [ ] Optimized assets
- [ ] `/qa/final-qa-report.md`
- [ ] GitHub redesign branch (`redesign/2026-relaunch`)
- [ ] Draft pull request
- [ ] Vercel Preview

## Documented deviations from spec (approved by Ivan, 2026-08-06)
- **Competitor research method:** Firecrawl is not connected in this environment. Using WebSearch/WebFetch fallback instead. Impact: less structured extraction, evidence still sourced and dated.
- **Image generation:** OpenAI Images API is not connected. Reusing existing repository/PR #11 photography and already-generated media instead of producing new AI imagery this pass.
- **PR #11 (`agent/luxury-homepage-gallery`):** Contains an earlier, substantially similar redesign + research pass. Ivan chose to start fully fresh rather than build on it. PR #11 stays open/untouched.
