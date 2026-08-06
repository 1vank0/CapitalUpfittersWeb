# Content Inventory

Status: populated 2026-08-06 from the current-site audit. Full evidence/severity detail lives in `reports/existing-site-audit.md` — this file is the quick-reference summary.

## Pages (live, in sitemap — 35 URLs)
- Root: `index.html`, `start-here.html`, `fleet.html`, `dealer-government.html`, `gallery.html`, `quote.html`, `contact.html`, `rebates.html`. Plus `privacy.html`, `terms.html` (live, not sitemapped) and `404.html`.
- `services/` — index + 16 services: bedliner, camper-shells, ceramic-coating, commercial-wraps, exterior, hitches, industrial-coatings, lighting, mobile-detailing, running-boards, stealth-hitches, suspension, tonneau, toolboxes, undercoating, window-tinting.
- `locations/` — rockville-md, bethesda-md, silver-spring-md, gaithersburg-md.
- `blog/` — index + 5 posts (undercoating-maryland-winter, leveling-vs-lift-kit, patriot-liner-vs-drop-in, weatherguard-vs-kargomaster, best-tonneau-covers-maryland). **None carry Article/BlogPosting JSON-LD — no schema at all found on any blog page.**

## Orphaned pages (not linked anywhere, not in sitemap — decide keep/delete)
- `preview.html` — "Products Section Preview", still uses pre-redesign Barlow Condensed font stack.
- `products-section.html` — claims to be "Generated from products.json — 58 products + 4 bundles"; that `products.json` does not exist in the repo.

## Duplicate/near-duplicate content
- The 4 location pages are ~line-for-line identical in structure/CSS, differing in copy + schema fields per city (expected pattern for local-SEO pages — good candidate for template + data-driven generation in the redesign, not a defect).
- Service page hero H1s are each genuinely distinct copy (not duplicated) — checked all 16.

## Missing / not wired content sources
- `cms-data.json` (190KB, Tina-generated: services, geoPages, testimonials, faqs, settings, brands, gallery, etc.) exists but **nothing in the live site's HTML/JS reads it** — confirmed via repo-wide grep. All page content is still hand-hardcoded HTML. This is a decision point for the redesign (wire it up for real, or treat as reference content to hand-port) — see `reports/existing-site-audit.md` §4.2.
- `tina/__generated__/` CMS scaffolding present but same story — not wired to rendering.

## Preservation decisions (must keep — see full list in audit §9)
- All 35 sitemapped URL slugs (SEO equity).
- `assets/amp-powerstep.mp4` — protected, do not change without approval.
- Lead API contract, attribution.js contract, lead-form.js single-controller pattern (see audit §3, §9).
