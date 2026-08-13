# Best Principles — Capital Upfitters Redesign

Synthesizes `reports/existing-site-audit.md` and `research/*` (50 sites researched 2026-08-06). Every claim below is tagged **[audit]**, **[research]**, **[user]** (Ivan's seed context), or **[standard]** (established convention). Where a principle is a judgment call rather than direct evidence, it says so.

---

## 1. Research conclusions

- Capital Upfitters is a **Patriot Liner licensee** ("Patriot Liner Rockville") **[user]**. The two other Patriot Liner licensees researched (Baltimore Bedliners, APS Johnstown PA) both scored in the bottom five of the competitor matrix, running byte-identical corporate template copy **[research: `research/top-five-analysis.md`]**. This is direct, franchise-specific evidence — not a generic assumption — that a distinctly branded, non-templated site is a real competitive edge here.
- The current site's biggest gaps are technical, not strategic: broken `og:image` sitewide, 16 pages calling a dead CMS domain, an unverified `aggregateRating` baked into JSON-LD, and near-zero real photography (one `<img>` tag site-wide, the rest CSS gradients/inline SVG) **[audit]**.
- The strongest local/regional competitors (APS Rust & Tint, Ted Britt Truck Shop, Capital Wrappers) succeed on **service-breadth clarity + specific, verifiable proof**, not on flashy design **[research]**.
- The weakest competitors share two failure patterns: generic/templated positioning, and buried or missing conversion paths (e.g., Alliance Fleet's footer-only contact link) **[research: `research/best-vs-worst.md`]**.

## 2. Capital Upfitters positioning

**[Judgment call, grounded in research + user context]:** Position as *the DMV's technically-credible, non-templated upfitting specialist* — explicitly differentiated from the franchise-template pattern that defines much of the Patriot Liner network regionally, while remaining honest that Capital Upfitters *is* Patriot Liner Rockville (don't hide the affiliation, out-execute it). Lead with specific service breadth (hitches through industrial coatings) rather than a single-service identity, since that breadth is a genuine differentiator against narrower competitors (Leonard USA = bedliner-only, LINE-X NoVA = coatings-only) **[research]**.

## 3. Audience segments

Retail, luxury/performance owners, truck/SUV owners, contractors/trades, dealerships, commercial fleets, government/law-enforcement, industrial coatings customers **[user]**. Audit confirms the current site already attempts this split (`fleet.html`, `dealer-government.html`, audience tabs in `quote-form.js`) — preserve and sharpen this structure rather than replacing it **[audit]**.

## 4. Customer motivations

Inferred from competitor CTA/trust patterns **[research, inferred]**: retail customers want fast, low-friction quotes with visible proof (reviews, specificity); fleet/government buyers want OEM/manufacturer authorization signals and dedicated intake (fleet size, agency, role); luxury/performance owners want protection-first framing and portfolio evidence (see Gloss Guard Studios, My Paint Doctor patterns).

## 5. Customer objections

- "Is this just another franchise shop?" — addressed by differentiation strategy (§2).
- "How long will this take / what does it cost?" — the audit shows the current site already exposes some pricing (`$575` bedliner) but inconsistently **[audit §7]**; Ted Britt Truck Shop's install-time transparency ("2-4 hours") and Leonard USA's "no deposit, 1-business-day response" are the pattern to emulate **[research]**.
- "Can I trust the reviews/claims?" — every trust claim on the current site needs verification before publishing; see `project-memory/FACTS-TO-VERIFY.md` and the audit's flag on the unverified `aggregateRating` **[audit §5.4, user]**.

## 6. Competitor findings

Full detail in `research/competitor-inventory.md`, `research-evidence.json`. Summary: 25 regional (9 direct/16 indirect), 12 national, 8 manufacturer/marketplace, 5 design-reference sites researched. See §1 above for headline conclusion.

## 7. Best-versus-worst findings

Full detail in `research/best-vs-worst.md`. Applied here: (a) never present inherited/franchisor claims as the shop's own history — verify or omit; (b) never let a strong credential sit behind a weak conversion path (Alliance Fleet's failure mode); (c) specificity beats superlatives in trust signals (Leonard USA's "3,818 reviews" vs. vague "many happy customers").

## 8. Homepage content hierarchy

1. Hero — audience-aware entry (not one generic hero for all 8 audience segments), preserving the existing homepage video **[user: do not change without approval]**.
2. Immediate service-category overview (not 16 flat links — group by theme: Protection & Coatings, Towing & Hitches, Fleet & Commercial, Industrial).
3. Differentiation statement (see §2) with specific, verifiable proof — not generic "quality you can trust" copy.
4. Audience-segmented paths (retail / fleet & government / dealer) — mirrors current `start-here.html` router, keep the pattern, sharpen the execution.
5. Verified trust signals only (per `FACTS-TO-VERIFY.md` gating).
6. Service preview grid linking to full service pages.
7. FAQ (existing FAQPage JSON-LD content is a real asset — audit confirms 85 Question/Answer entries site-wide **[audit §5]** — surface the best of it here).
8. Final CTA, phone-first for mobile (`tel:` link, per audit's existing pattern).

## 9. Recommended sitemap

Preserve all 35 existing sitemapped URLs/slugs — audit confirms this is load-bearing SEO equity **[audit §9]**. Additive changes only in this pass:
- Keep `services/`, `locations/`, `blog/` structures as-is.
- Consider expanding `locations/` beyond the current 4 cities using the audit's recommended template+data pattern **[audit §4.4]** — flagged as a future enhancement, not required for this redesign pass (scope discipline).
- Do not introduce new top-level content types without a documented reason.

## 10. Navigation strategy

Preserve the existing 3-audience top-level split (retail implicit / Fleet / Dealer-Government) rather than inventing a new IA — audit shows no navigation defects, only visual/typography issues from the original master task's brief **[user]**. Fix inconsistent script-loading paths as part of any nav-adjacent JS touched **[audit §7]**.

## 11. Service-page template

One shared template (already exists as 16 near-identical pages) with: hero, what's-included, process/technical detail (per "technical authority" brand direction **[user]**), compatible-vehicle/fitment note where applicable, related services, audience-specific quote CTA. Do not duplicate inline `<style>` blocks per page — audit found 40 pages carrying inconsistent inline styles that should be shared component CSS **[audit §8, item 11]**.

## 12. Vehicle-fitment strategy

Stealth Hitches' compatibility-chart pattern (50+ makes, downloadable PDF) is the clearest fitment-communication reference found **[research]**. For Capital Upfitters: a lightweight "does this fit my vehicle" note per hitch/towing service page, not a full interactive configurator this pass (scope discipline — avoid inventing large new systems the task didn't ask for).

## 13. Retail quote strategy

Preserve the existing progressive collection pattern already implemented in `quote-form.js`/`lead-form.js` — audience tabs, service-picker chips, single shared submit controller **[audit §3]**. This already matches the required flow (vehicle info → service → contact → scheduling) reasonably well; the redesign's job is visual/UX polish and trust-signal placement, not rebuilding the flow from scratch **[audit — must-preserve list, item 2]**.

## 14. Fleet and government lead strategy

Currently fleet/dealer leads share the same `/api/lead` contract with a different `audience` discriminator — preserve **[audit §3]**. Strengthen the *front-end* distinction: fleet-size and agency-type fields, OEM/manufacturer-authorization display near the fleet CTA (per Holman/Advantage Outfitters pattern **[research]**), separate visual treatment from retail (per REQUIREMENTS.md: "Do not force all customers into the same generic form").

## 15. Dealership lead strategy

Currently folded into the `dealer` audience path alongside government — audit shows this is intentional (`dealer-government.html`) **[audit]**. Keep combined page, but ensure copy/CTAs clearly branch dealer vs. government intent within it, since their actual needs differ (dealer = referral/wholesale relationship, government = procurement/compliance).

## 16. Industrial lead strategy

Currently the weakest-represented audience on the existing site (`services/industrial-coatings.html` exists but is one of 16 flat service pages, no distinct journey) **[audit]**. Minimum viable fix this pass: ensure industrial coatings has its own clear CTA path distinguishing it from retail bedliner/ceramic inquiries, without building a fully separate portal (scope discipline).

## 17. Trust framework

**Non-negotiable gate:** nothing in `project-memory/FACTS-TO-VERIFY.md` ships (copy, schema, badges) without independent verification **[user, audit §5.4]**. Where a claim can't be verified in this pass, either omit it or phrase it in a way that doesn't require verification (e.g., service descriptions instead of "X years experience"). This directly avoids the exact failure mode found in the worst-scoring competitors (inherited franchisor claims presented as the shop's own) **[research]**.

## 18. Gallery and media strategy

Full detail in `reports/image-strategy.md` (separate deliverable, pending). Headline: the current site has no real photography wired in; candidate assets are the 19 unused WebP images in `media/next/` **[audit §4.5]**. Per Ivan's 2026-08-06 decision, no new AI-generated imagery this pass — reuse existing repo assets **[user decision, `project-memory/DECISIONS.md`]**.

## 19. Content strategy

Preserve and extend the existing blog (5 posts, locally-relevant topics like "Undercoating Maryland Winter") **[audit §1]** — this matches the research finding that content/topical authority correlates with stronger regional competitors (Capital Wrappers' MD/DC tint-law blog content) **[research]**. Add JSON-LD `Article`/`BlogPosting` schema, currently entirely missing **[audit §5, item 6]**.

## 20. SEO, AEO, and GEO strategy

Full detail in `reports/seo-aeo-geo-plan.md` (separate deliverable, pending). Headline fixes from the audit, all high-priority: broken `og:image` sitewide, malformed meta descriptions on 2 pages, `AutoRepair`→more-accurate schema type, www/non-www canonical inconsistency **[audit §5, §6]**.

## 21. Local landing-page strategy

Current 4 location pages (Rockville, Bethesda, Silver Spring, Gaithersburg) use expected, correct local-SEO duplication (same template, city-specific copy/schema) **[audit §4.4]**. Research shows the strongest local competitors run denser geo-page networks **[research: top-five-analysis.md]** — noted as a future expansion opportunity, not required for this pass (scope discipline: 4 real, well-built pages beat rushed additional ones).

## 22. Accessibility requirements

WCAG-compliant contrast, strong focus states, reduced-motion support, keyboard navigation for all interactive elements (nav, forms, gallery filters, quote picker) — per task spec §16. Audit didn't run a full accessibility pass (out of audit scope); QA phase (`qa/final-qa-report.md`) owns verification.

## 23. Mobile requirements

Mobile-first CSS (already the stated architecture per `base.css`'s fluid `clamp()` type scale **[audit §2]**), phone-first CTAs (`tel:` links already in use), no horizontal overflow, sticky mobile quote/call action per task spec §13.

## 24. Performance budgets

Per task spec §16: Lighthouse Performance 90+, Accessibility 95+, Best Practices 95+, SEO 95+; LCP <2.5s, INP <200ms, CLS <0.1. The current near-total absence of real images **[audit §4.5]** likely helps current performance scores artificially — real photography added in this redesign must be responsive/optimized (WebP/AVIF, proper `srcset`) to avoid regressing these budgets.

## 25. Structured-data plan

Full detail in `reports/schema-plan.md` (separate deliverable, pending). Must resolve: `AutoRepair`→better-fit type, unverified `AggregateRating` (hold until verified), missing blog `Article` schema, www/non-www `url` field inconsistency **[audit §5]**.

## 26. Analytics event plan

Not yet implemented on the current site (no analytics tooling found in audit scope). Minimum for this pass: lead-form submission events (retail/fleet/dealer, already discriminated server-side by `audience` field per `api/lead.js` **[audit §3]**), CTA click tracking, gallery-to-quote link tracking — implemented as vanilla JS `dataLayer` pushes (per task spec §13), no new analytics platform selection without Ivan's input (flagged as a follow-up decision, not blocking).

## 27. Static HTML architecture

Confirmed already true of the current site: no framework, `base.css`/`style.css` hand-authored, vanilla JS controllers (`lead-form.js`, `attribution.js`, `quote-form.js`) **[audit §1]**. Redesign must preserve this. **Decision on `cms-data.json`/Tina** (audit §4.2, flagged as needing a call, not silently fixed): this pass keeps the site as hand-authored static HTML, does **not** wire up full Tina CMS rendering (that's a larger scope than "redesign," and Tina/build-step wiring would need explicit approval as a build-system addition per REQUIREMENTS.md). Instead, centralize the worst hardcoded-duplication offenders (phone, address, hours — currently duplicated across 30+ files **[audit §7]**) into one small JSON data file consumed by a minimal existing-pattern script, which fixes the actual pain point without expanding the build system. Full CMS wiring is documented as a future integration boundary (§28).

## 28. Future integration boundaries

Per task spec §4 and `project-memory/PROJECT-CONTEXT.md`: this static site must expose stable integration points for Upfit Portal, Josh OS, Steve OS, CRM, gallery-management, customer-portal, and fleet-operations systems — without building those systems now. Concretely: keep `/api/lead.js`'s request/response contract stable (already well-designed per audit §9); keep the centralized business-data file (§27) as the future CMS-wiring seam; keep Tina scaffolding in place, untouched, as Ivan's call for a later phase **[audit §9, item 8]**.

## 29. Existing features to preserve

Full list in `reports/existing-site-audit.md` §9 ("Must-Preserve List"). Highest-stakes items: `api/lead.js` contract, `lead-form.js` single-controller pattern, `attribution.js` public contract, all 35 sitemapped URL slugs, `assets/amp-powerstep.mp4` (homepage video), `tests/lead-flow-contract.test.js` as the regression gate.

## 30. Anti-patterns to avoid

- Generic/templated positioning copy (the exact failure mode of the two other Patriot Liner licensees researched) **[research]**.
- Publishing any claim from `FACTS-TO-VERIFY.md` without verification **[user]**.
- Strong credentials behind weak/buried conversion paths (Alliance Fleet's failure mode) **[research]**.
- One generic form serving retail, fleet, and government alike **[user, REQUIREMENTS.md]**.
- Silently "fixing" the CMS-wiring question instead of treating it as a scoped decision (§27) **[audit §4.2]**.
- Introducing a framework, build system, or new large dependency without documented justification **[user, REQUIREMENTS.md]**.
- Fabricated or invented FAQ content, hidden SEO text, doorway pages, or fake service areas **[user, REQUIREMENTS.md]**.

## 31. Acceptance criteria

- All items in `project-memory/REQUIREMENTS.md`'s deliverables checklist complete.
- All 35 existing URLs preserved (redirects if any slug must change — none planned).
- Homepage video unchanged.
- No claim from `FACTS-TO-VERIFY.md` published without sign-off.
- Lead API contract unchanged; `tests/lead-flow-contract.test.js` passing before/after (re-verified in a normal dev environment per audit §3's flag).
- Lighthouse targets met or gaps documented with cause (task spec §16).
- Production untouched; work lives on `redesign/2026-relaunch`, delivered as a draft PR + Vercel Preview only.
