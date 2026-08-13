# SEO, AEO & GEO Plan — Capital Upfitters Redesign

Companion to `best-principles.md` §20 and `reports/existing-site-audit.md` §5–§6. This is a planning document — no live files are edited here. All recommendations are gated by `project-memory/FACTS-TO-VERIFY.md`: nothing below authorizes publishing an unverified claim.

---

## 1. Search-intent mapping by audience segment

Mirrors the 8 audience segments in `best-principles.md` §3. Each row is the *primary* intent the corresponding page(s) should satisfy — not a keyword list to stuff, but the question the page must answer in its first screen.

| Segment | Primary intent | Owning page(s) | Intent type |
|---|---|---|---|
| Retail (general) | "Who can protect/upgrade my truck near me, and how fast/what does it cost?" | `index.html`, `start-here.html`, `services/*.html` | Commercial investigation → transactional |
| Luxury/performance owners | "Who won't damage my [Audi/BMW/etc.] and can prove it?" | `services/ceramic-coating.html`, `services/window-tinting.html`, `services/exterior.html` | Trust-led commercial |
| Truck/SUV owners | "Bedliner/hitch/tonneau for my [make/model] — does it fit, what's it cost?" | `services/bedliner.html`, `services/hitches.html`, `services/tonneau.html`, `services/suspension.html` | Transactional, fitment-driven |
| Contractors/trades | "Toolboxes, running boards, ladder racks — who outfits work trucks in the DMV?" | `services/toolboxes.html`, `services/running-boards.html`, `services/commercial-wraps.html` | Transactional, utility-led |
| Dealerships | "Who can we send overflow upfit work / referrals to?" | `dealer-government.html` | B2B relationship/referral |
| Commercial fleets | "Who can outfit N vehicles on a schedule, with OEM-authorized materials?" | `fleet.html` | B2B, authorization-led |
| Government/law enforcement | "Who is procurement-eligible and has done agency work?" | `dealer-government.html` (government branch) | B2B, compliance-led — **claims here are FACTS-TO-VERIFY gated; do not publish "government/law-enforcement work" until verified** |
| Industrial coatings | "Who does industrial-grade protective coatings, not just truck bedliners?" | `services/industrial-coatings.html` | Transactional, niche |

This table is the intent backbone for title/description work below — every template must answer its row's question in the first 160 characters of the meta description and the first visible heading.

## 2. Title / description templates

Keep titles ≤60 characters, descriptions ≤155 characters, and — critically — **single, clean strings**. The audit found malformed/triple-concatenated descriptions on `locations/rockville-md.html` and `start-here.html` (audit §5, item 2) from exactly this kind of template drift; any new template work must end with one final string, not drafts appended together.

- **Homepage:** `Capital Upfitters | Vehicle Upfitting in Rockville, MD` / `Bedliners, hitches, ceramic coatings & fleet upfitting in Rockville, MD. Serving the DMV. Call (301) 304-1419.`
  - Note: the *current* homepage title/description/JSON-LD already assert "Family-owned," "30+ years," and "Authorized Patriot Liner dealer" — all three are on the FACTS-TO-VERIFY list. The template above is deliberately claim-free; do not restore the stronger claims until Ivan signs off, per the non-negotiable gate in `best-principles.md` §17.
- **Service page:** `{Service Name} in Rockville, MD | Capital Upfitters` / `{One-sentence, verifiable description of the service}. Serving Rockville, Bethesda, Silver Spring & Gaithersburg. Call (301) 304-1419.`
- **Location page:** `{City}, MD Vehicle Upfitting | Capital Upfitters` / `Capital Upfitters serves {City}, MD from our Rockville shop at 12019 Nebel Street. {1 verifiable differentiator}. Call (301) 304-1419.`
- **Blog post:** `{Post Title} | Capital Upfitters Blog` / `{Single clean summary sentence, ≤155 chars, no keyword stuffing}.`
- **Audience hub (`fleet.html`, `dealer-government.html`):** `{Fleet / Dealer & Government} Vehicle Upfitting | Capital Upfitters` / `{One sentence on the specific B2B path — quote intake, not generic retail copy}.`

Rule for every template: one intent, one clean sentence per field, no drafts left concatenated, no keyword repetition beyond what reads naturally.

## 3. Canonical URL policy

**Resolves audit §5, item 5 (www vs. non-www inconsistency).**

- **Canonical host: `https://www.capitalupfitters.com`** — this is what canonical tags already use sitewide (audit confirms `<link rel="canonical">` present and `www`-based on every page checked) and what 34 of 35 sitemap entries use.
- Fix the two known deviations:
  1. `index.html`'s JSON-LD `Organization`/`LocalBusiness` `"url"` field currently reads `"https://capitalupfitters.com"` (no `www`) — change to `"https://www.capitalupfitters.com"`.
  2. `sitemap.xml`'s `services/stealth-hitches.html` entry uses the bare `https://capitalupfitters.com/...` host — change to `https://www.capitalupfitters.com/...` (see `recommended-sitemap.md`).
- Every page's `<link rel="canonical">` continues to self-reference its own full `www` URL — no change needed there, just consistency enforcement going forward.
- If the apex domain (`capitalupfitters.com`) currently serves content rather than 301-redirecting to `www`, that redirect should exist at the hosting/DNS layer (Vercel domain config) — flagged here as a technical follow-up, not an HTML file change, and out of scope for this static-file pass.

## 4. Heading hierarchy guidance

- One `<h1>` per page, matching the page's primary intent (from §1) — not the brand name alone.
- `<h2>` for major sections (service groups, "What's Included," FAQ, location details).
- `<h3>` for sub-points within a section (individual FAQ questions, individual fitment notes).
- Never skip levels (no `<h2>` straight to `<h4>`) and never use heading tags for visual sizing alone — `best-principles.md`'s existing `clamp()` type scale in `base.css` already handles visual sizing independent of semantic level.
- Service pages: `<h1>` = service name + location ("Bedliner Installation in Rockville, MD"), `<h2>`s for What's Included / Process / Fitment / Related Services / FAQ, matching the shared template in `best-principles.md` §11.

## 5. Internal linking strategy

- **Service ↔ service:** every service page links to 2–4 genuinely related services (e.g., bedliner → tonneau, toolboxes; ceramic coating → window tinting, undercoating) — not all 16 to all 16, which dilutes link equity and reads as a link farm.
- **Service → location:** each service page should reference the 4 service-area cities in body copy or a "Serving" line, linking to the relevant `locations/*.html` pages where natural — reinforces local relevance without duplicating full location content on service pages.
- **Location → service:** each location page links out to the specific services most commonly requested in that context (can be the same list across the 4 cities since the service catalog doesn't change city to city).
- **Blog → service/location:** every blog post links to at least one relevant service page and, where geographically relevant (e.g., "Undercoating for Maryland Winters"), the nearest location page. This is the single highest-leverage internal-linking fix since blog posts currently carry zero structured data and are topically isolated (audit §5, item 6).
- **Audience hubs (`fleet.html`, `dealer-government.html`) → services:** link to the subset of services relevant to that audience (fleet: wraps, coatings, lighting; dealer/gov: same plus toolboxes/suspension) rather than the full 16-item flat list.
- **Breadcrumbs:** every non-homepage page carries a `BreadcrumbList` (already 28 `ListItem`/`BreadcrumbList` occurrences per the audit — extend consistently rather than reinvent; see `schema-plan.md`).
- Anchor text should describe the destination ("ceramic coating options" not "click here" or "learn more").

## 6. Image alt-text policy

Directly informs `image-strategy.md`'s manifest, restated here as an SEO-facing policy:

- Every `<img>` gets a specific, descriptive `alt` — service + context, not filename-derived or generic ("Sprayed-in bedliner on a Ford F-150 pickup bed" not "bedliner image" or "IMG_4021").
- Never describe an image as depicting a real Capital Upfitters customer vehicle/job unless it demonstrably is one. Per `REQUIREMENTS.md`'s non-negotiable ("do not publish generated imagery as authentic customer work"), alt text for any AI-generated asset (this includes the PR #11 `media/gallery/homepage/` pool — see `image-strategy.md` §Provenance) must describe the *subject* accurately without implying it's a photo of an actual completed Capital Upfitters job unless verified.
- Decorative images (background texture, pure layout dividers) get `alt=""` and are excluded from the accessibility tree — not omitted from `alt` entirely (an omitted `alt` attribute is worse than an empty one for screen readers).
- No keyword stuffing in alt text ("bedliner Rockville MD truck bed liner spray Maryland DMV" is a violation, not an optimization).

## 7. Local-relevance / service-area content approach

- Preserve the existing 4-city location-page structure (Rockville, Bethesda, Silver Spring, Gaithersburg) — audit §4.4 confirms this is expected, correct local-SEO duplication (same template, city-specific copy/schema), not a defect.
- Each location page's differentiated content must stay genuinely city-specific: drive-time/distance from the Rockville shop, any city-specific service notes, and the location's own `PostalAddress`/`GeoCoordinates` schema referencing Rockville (Capital Upfitters has one physical shop; location pages represent service area, not additional branches — this must be explicit in copy so it doesn't read as claiming multiple physical locations it doesn't have).
- Do not expand beyond the current 4 cities this pass — `best-principles.md` §21 explicitly scopes broader geo-page expansion as a future opportunity, not required now. See `recommended-sitemap.md` for the noted (not actioned) opportunity.
- **Forbidden:** duplicate city pages with only the city name swapped and no genuine differentiation; doorway pages that exist purely to rank and funnel everything back to one generic page; fake or aspirational service areas not actually served from the Rockville shop.

## 8. Direct-answer / FAQ content strategy

The audit found **85 existing `Question`/`Answer` JSON-LD entries** and 18 `FAQPage` blocks already live sitewide (audit §5) — this is real, load-bearing content, not a gap to fill from scratch.

- **Build on it, don't replace it:** audit the 85 existing Q/A entries during implementation for (a) genuine helpfulness, (b) no unverified claims baked into an answer (e.g., an FAQ answer that asserts "30+ years experience" needs the same FACTS-TO-VERIFY gate as any other copy), (c) no duplication of the same question across pages with copy-pasted answers.
- **Do not fabricate new FAQ entries** to pad AEO/GEO visibility — every question must reflect an actual, common customer question (verifiable against real objections in `best-principles.md` §5, or Ivan's direct input), and every answer must be something the business can stand behind today.
- Structure direct-answer content so the first sentence of each answer is a complete, extractable answer (works for both the FAQPage rich result and for AI Overviews/ChatGPT/Perplexity-style extraction) — lead with the answer, follow with elaboration.
- Homepage should surface the *best* subset of the existing FAQ content (per `best-principles.md` §8, item 7) rather than all 85 — pick the highest-value, most-searched questions per audience segment.
- GEO-specific: ensure each service page has at least one short, self-contained paragraph that directly answers "what does {service} cost / how long does it take / does it fit my vehicle" — the pattern AI answer engines extract most reliably — sourced from real, current pricing/timeline info, not invented numbers.

## 9. Entity consistency — canonical NAP

One Name/Address/Phone must be used identically everywhere (site copy, schema, footer, meta descriptions):

- **Name:** Capital Upfitters
- **Address:** 12019 Nebel Street, Rockville, MD 20852
- **Phone:** (301) 304-1419 / `tel:+13013041419`

This already matches what's in `index.html`'s JSON-LD (`streetAddress: "12019 Nebel Street"`, `postalCode: "20852"`, `telephone: "+13013041419"`) — the fix is consistency enforcement (audit §7 found phone hardcoded in 38+ files, address in 36+, with no single source of truth) rather than a new value. Per `best-principles.md` §27, centralizing these into one small JSON data file (not a full CMS) is the agreed mechanism — this SEO plan's requirement is simply that whatever centralization mechanism ships, every page's visible NAP and every page's JSON-LD NAP resolve to the exact same three values, character-for-character (no "St" vs "Street" drift, no "12019 Nebel Street" vs "12019 Nebel St").

## 10. Sitemap / robots guidance

See `recommended-sitemap.md` for the full URL list. Summary requirement here:
- Fix the `stealth-hitches.html` bare-domain entry to match the `www` canonical host (§3).
- Keep `robots.txt` as-is structurally (`Allow: /`, `Disallow: /assets/private/`, sitemap pointer) — it is minimal and correct per the audit. No change needed beyond leaving it alone.
- Continue excluding `privacy.html`, `terms.html`, `404.html` from the sitemap (correct, defensible per audit §6).
- Do not add `preview.html` or `products-section.html` to the sitemap — both are orphaned/dead per audit §4.3 and should be resolved (archived or deleted) as part of implementation, not indexed.

## 11. Open Graph fix

The audit found `og:image` broken **sitewide** (37 occurrences, audit §5 item 1): every page points to `https://www.capitalupfitters.com/assets/og-default.png`, which doesn't exist. The only real OG-style asset in the repo is `/og.png` (21.7KB) at root.

**Recommendation:** point `og:image` at `https://www.capitalupfitters.com/og.png` (absolute URL, matching the canonical host from §3) sitewide, replacing every `assets/og-default.png` reference. This is a one-line find-and-replace across all pages carrying the tag, with no new asset required. If a higher-resolution or page-specific OG image becomes available later (see `image-strategy.md`), this can be revisited, but the immediate fix (broken → working, using the existing `/og.png`) should ship regardless.

## 12. Indexability

- Keep `<meta name="robots" content="index, follow">` on all public pages (already correct sitewide per audit).
- Ensure the 16-page dead-CMS-fetch cleanup (audit §4.1) doesn't introduce any render-blocking behavior that could delay indexable content — removing that dead code (already planned per `best-principles.md`) is itself a minor indexability/performance win.
- No `noindex` on any of the 35 sitemapped URLs.
- Verify (post-implementation) that Vercel Preview deployments carry `X-Robots-Tag: noindex` or equivalent so preview URLs never get indexed — standard practice, flagged here since this redesign explicitly ships as a Preview only (per `REQUIREMENTS.md`).

## 13. Core Web Vitals targets

Per task spec (`best-principles.md` §24) and `REQUIREMENTS.md`:
- Lighthouse Performance ≥ 90
- Lighthouse Accessibility ≥ 95
- Lighthouse Best Practices ≥ 95
- Lighthouse SEO ≥ 95
- LCP < 2.5s
- INP < 200ms
- CLS < 0.1

Caveat carried over from `best-principles.md` §24: the current near-zero photography artificially helps today's scores. Any real photography introduced via `image-strategy.md`'s manifest must ship with proper `srcset`/responsive sizing, modern formats (the `media/gallery/homepage/` pool is already AVIF+WebP at multiple breakpoints — use that), explicit `width`/`height` (or `aspect-ratio`) to avoid CLS from late-loading images, and `loading="lazy"` for below-the-fold images / no lazy-load on the LCP candidate. Video (`assets/amp-powerstep.mp4`, homepage hero, unchanged per constraint) should keep its current loading treatment unless performance testing shows a specific regression tied to it.

## 14. Mobile usability

- Preserve the existing mobile-first `clamp()`-based fluid type scale (`base.css`, confirmed per audit §2) — do not introduce fixed breakpoint-only sizing.
- Sticky mobile quote/call CTA per task spec (`best-principles.md` §23).
- No horizontal overflow on any page at common mobile viewport widths.
- Tap targets sized appropriately for touch (buttons, chip-grid service picker in `quote-form.js`, nav).
- `tel:` links remain the primary mobile CTA pattern (already in use, per audit).

## 15. Explicitly forbidden practices

Carried forward from `best-principles.md` §30 and REQUIREMENTS.md, restated here as SEO-specific guardrails for this plan:

- **Keyword stuffing** — no unnatural repetition of "Rockville MD bedliner" style phrases in titles, meta, alt text, or body copy.
- **Duplicate city pages** — no new location page that's a copy-paste of an existing one with only the city name changed and no genuine local differentiation; no expansion beyond the current 4 cities this pass (§7).
- **Doorway pages** — no page built purely to rank for a phrase and funnel to another page without its own real content.
- **Fabricated FAQs** — no invented questions/answers not grounded in real customer questions or verifiable business facts (§8).
- **Hidden SEO text** — no off-screen, zero-opacity, or color-matched-to-background text for search engines.
- **Unsupported review markup** — no `AggregateRating` schema until real, verifiable review data exists; see `schema-plan.md` for the explicit hold on this, cross-referencing the audit's compliance-risk flag (audit §5, item 4) on the current unverified 5.0/96 rating.
- **Fake service areas** — location pages and "Serving..." copy must reflect areas genuinely served from the Rockville shop, not aspirational expansion markets.
- **Unverified certifications** — no manufacturer/certification badges, logos, or claims (Patriot Liner authorization, RealTruck dealer status, Audi/BMW/Volvo certification, etc.) published in copy, alt text, or schema until confirmed per `FACTS-TO-VERIFY.md`.
