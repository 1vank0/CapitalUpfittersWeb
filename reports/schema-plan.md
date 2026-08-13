# Structured Data (Schema.org / JSON-LD) Plan — Capital Upfitters Redesign

Companion to `best-principles.md` §25 and `reports/existing-site-audit.md` §5. Planning document only — no live JSON-LD is edited here. Every schema field that carries a factual claim is gated by `project-memory/FACTS-TO-VERIFY.md`; this plan specifies structure and types, not final copy values.

Current sitewide JSON-LD inventory (audit §5, for reference): `City` (103), `Question`/`Answer` (85 each), `ListItem`/`BreadcrumbList` (76/28), `PostalAddress` (25), `Organization` (24), `AggregateRating` (19), `FAQPage` (18), `Service` (17), `LocalBusiness` (17), `AggregateOffer` (13), `State` (9), `AutoRepair` (8), `OpeningHoursSpecification`/`GeoCoordinates` (7 each), `County` (2), `GeoCircle`/`AdministrativeArea` (1 each).

---

## 1. Organization

Keep one canonical `Organization` block (referenced by `@id`, e.g. `https://www.capitalupfitters.com/#organization`), reused via `@id` reference from every page's `LocalBusiness`/`AutomotiveBusiness` block rather than re-declared with drifting field values on all 24 current occurrences.

```json
{
  "@type": "Organization",
  "@id": "https://www.capitalupfitters.com/#organization",
  "name": "Capital Upfitters",
  "url": "https://www.capitalupfitters.com",
  "telephone": "+13013041419",
  "logo": "https://www.capitalupfitters.com/og.png"
}
```
- `url` must be the `www` canonical (fixes audit §5 item 5 — current homepage JSON-LD uses the bare `capitalupfitters.com` host).
- No `sameAs` (social profile) entries added unless Ivan confirms real, current social URLs — do not guess or reuse placeholder handles.
- No `foundingDate` (implies verified "operating since 2015" claim) until confirmed.

## 2. LocalBusiness / AutomotiveBusiness type — resolves the `AutoRepair` mismatch

**Finding (audit §5, item 3):** the current site uses `"@type": "AutoRepair"` 8 times, including the homepage's primary `LocalBusiness` block. `AutoRepair` is a Schema.org `LocalBusiness` subtype specifically for mechanical repair. Capital Upfitters installs bedliners, hitches, coatings, and accessories — it does not perform mechanical repair. Using `AutoRepair` is a content/type mismatch that can affect rich-result eligibility and how Google categorizes the entity.

**Recommendation:** use `AutomotiveBusiness` as the primary type. It's the correct parent type under Schema.org's automotive vertical for a business that sells/installs vehicle accessories and services without being a repair shop, dealership, or rental/wash business — none of the more specific automotive subtypes (`AutoDealer`, `AutoRental`, `AutoWash`, `AutoRepair`, `AutoPartsStore`) fit Capital Upfitters' actual service line, and `AutomotiveBusiness` is Schema.org's own general-purpose type for exactly this case. Combine it with `LocalBusiness`-standard properties (address, geo, hours, telephone, priceRange) as today, just swap the `@type` value and drop `AutoRepair` everywhere it appears.

```json
{
  "@type": "AutomotiveBusiness",
  "@id": "https://www.capitalupfitters.com/#localbusiness",
  "name": "Capital Upfitters",
  "image": "https://www.capitalupfitters.com/og.png",
  "telephone": "+13013041419",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "12019 Nebel Street",
    "addressLocality": "Rockville",
    "addressRegion": "MD",
    "postalCode": "20852",
    "addressCountry": "US"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": "__VERIFY__", "longitude": "__VERIFY__" },
  "openingHoursSpecification": [ "...existing values, carried forward as-is..." ],
  "url": "https://www.capitalupfitters.com",
  "areaServed": ["Rockville, MD", "Bethesda, MD", "Silver Spring, MD", "Gaithersburg, MD"]
}
```
- `areaServed` reflects the 4 real location pages only — no fabricated service areas (per `seo-aeo-geo-plan.md` §15).
- Do not add `foundingDate`, `award`, or `slogan` fields carrying unverified claims.

## 3. Service + OfferCatalog

Keep the existing per-service-page `Service` block (17 current occurrences) but wrap the full service line under one `OfferCatalog` on `services/index.html` and on the homepage, so the 16 services read as a structured catalog rather than 16 disconnected `Service` entities:

```json
{
  "@type": "AutomotiveBusiness",
  "@id": "https://www.capitalupfitters.com/#localbusiness",
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Vehicle Upfitting Services",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Bedliner Installation", "url": "https://www.capitalupfitters.com/services/bedliner.html" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Hitch Installation", "url": "https://www.capitalupfitters.com/services/hitches.html" } }
      /* ...remaining 14 services, same shape... */
    ]
  }
}
```
- Each individual service page keeps its own standalone `Service` block (`provider` referencing the `Organization` `@id` from §1) — the `OfferCatalog` is additive, on the catalog/homepage level, not a replacement.
- `AggregateOffer` (13 current occurrences, presumably pricing ranges) stays, but every price value must be current and real — no placeholder/aspirational pricing carried into schema. Cross-reference against whatever pricing actually ships in visible copy (audit §7 notes pricing is currently hardcoded per page and also duplicated, unsynced, in the orphaned `cms-data.json`) — schema price and visible price must match exactly.

## 4. BreadcrumbList

Extend the existing pattern (76 `ListItem` / 28 `BreadcrumbList` occurrences) consistently to every non-homepage page that doesn't yet have one — service pages, location pages, blog posts. Standard 2–3 level structure:

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.capitalupfitters.com/" },
    { "@type": "ListItem", "position": 2, "name": "Services", "item": "https://www.capitalupfitters.com/services/" },
    { "@type": "ListItem", "position": 3, "name": "Bedliner Installation", "item": "https://www.capitalupfitters.com/services/bedliner.html" }
  ]
}
```
No new pattern needed — this is a coverage/consistency task during implementation, not a design decision.

## 5. FAQPage — keep legitimate, do not pad

The audit found **85 real `Question`/`Answer` entries and 18 `FAQPage` blocks already live** (audit §5) — a genuine existing asset, not a gap.

**Plan:**
- Audit the existing 85 Q/A pairs during implementation against three checks: (a) is the question one a real customer would actually ask (not manufactured to rank for a phrase); (b) does the answer avoid asserting anything on `FACTS-TO-VERIFY.md` (e.g., an answer that states "we've been in business 30+ years" needs the same gate as body copy); (c) is the answer accurate and current (no stale pricing/hours baked into a schema answer).
- Where an existing Q/A entry fails check (b), either rewrite the answer to remove the unverified claim or hold that specific entry until verified — do not delete the whole `FAQPage` block over one bad entry if the rest is sound.
- **Do not add new Q/A entries to hit a round number or to target new keyword phrases.** Every question added must trace to a real, common customer question (per `best-principles.md` §5's objection list, or direct input from Ivan).
- Each `FAQPage` should live on the page where those specific questions are actually answered in visible on-page content — `FAQPage` schema must mirror what's genuinely rendered on the page (Google's guidelines require the marked-up content to be visible to users, not schema-only). Retire this plan item as satisfied once implementation confirms no schema-only/invisible FAQ content exists.
- Homepage FAQ selection (per `best-principles.md` §8 item 7): surface the highest-value subset across audience segments, each entry pointing back (via `mainEntityOfPage` or contextual link) to its full-detail source page where relevant.

## 6. ImageObject

For every real photo introduced via `image-strategy.md`'s manifest (both the `media/next/` pool and the PR #11 `media/gallery/homepage/` pool), attach `ImageObject` schema where the image is a primary content image (hero, key service illustration, gallery item) — not required for every decorative/thumbnail image:

```json
{
  "@type": "ImageObject",
  "contentUrl": "https://www.capitalupfitters.com/media/gallery/homepage/service-bedliner-80c7badcf7-1448.webp",
  "caption": "Sprayed-in bedliner installation, DMV region",
  "creditText": "Capital Upfitters",
  "creator": { "@type": "Organization", "name": "Capital Upfitters" }
}
```
- Caption/alt text must not claim the depicted vehicle/job is an actual completed Capital Upfitters customer job when the source is the AI-generated PR #11 pool — describe the subject generically ("sprayed-in bedliner installation" not "a recent customer's F-150 in Rockville") unless the specific claim is true. See `image-strategy.md` §Provenance for the full policy.
- Gallery page (`gallery.html`) is the natural home for a denser set of `ImageObject` entries, potentially wrapped in an `ImageGallery`-style ordered list once the manifest-driven gallery replaces the current live-fetch-dependent placeholder pattern.

## 7. VideoObject — homepage hero video

`assets/amp-powerstep.mp4` is explicitly protected (must not be changed, per `REQUIREMENTS.md` and audit §9 item 5) but currently carries **no** `VideoObject` schema. Add it without touching the video file itself:

```json
{
  "@type": "VideoObject",
  "name": "Capital Upfitters — Vehicle Upfitting Overview",
  "description": "__Ivan/verified copy — accurately describe what the video actually shows__",
  "thumbnailUrl": "https://www.capitalupfitters.com/og.png",
  "uploadDate": "__verify original publish/upload date__",
  "contentUrl": "https://www.capitalupfitters.com/assets/amp-powerstep.mp4"
}
```
- `uploadDate` and `description` must be accurate to the actual video, not invented — verify before publishing (same gate as any other factual field).
- `duration` (ISO 8601) can be added once confirmed against the actual file.

## 8. Article / BlogPosting — the 5 blog posts

**Finding (audit §5, item 6; audit §1):** zero JSON-LD of any kind currently exists on any of the 5 blog posts or `blog/index.html` (`grep -o '"@type"'` returns nothing). This is a real, currently-missing structured-data category, not a refinement of something existing.

**Recommendation:** add `BlogPosting` (the more specific, appropriate subtype of `Article` for blog content) to each of the 5 posts:

```json
{
  "@type": "BlogPosting",
  "headline": "Undercoating for Maryland Winters",
  "author": { "@type": "Organization", "name": "Capital Upfitters" },
  "publisher": { "@id": "https://www.capitalupfitters.com/#organization" },
  "datePublished": "__use real original publish date, not today's redesign date__",
  "dateModified": "__use real last-edited date__",
  "image": "__real post-relevant image once wired per image-strategy.md — no placeholder__",
  "mainEntityOfPage": "https://www.capitalupfitters.com/blog/undercoating-maryland-winter/"
}
```
- `datePublished`/`dateModified` must reflect the posts' actual history, not the redesign's ship date — check `sitemap.xml`'s existing `<lastmod>2026-04-09</lastmod>` for all 5 posts as a starting reference point, verify against real authorship records if available.
- `author` as `Organization` (not a named individual) unless a specific, real author is confirmed — do not invent a byline.
- Add matching `BreadcrumbList` (§4) on each post — currently also absent.
- `blog/index.html` itself can carry a `Blog` or `CollectionPage` type listing the 5 posts, optional but low-effort given the existing 5-post list is static.

## 9. AggregateRating — explicit hold, not a recommendation to add

**This is a hold, not an instruction to implement.**

The current site embeds `"aggregateRating": {"ratingValue": "5.0", "reviewCount": "96"}` in the homepage's `LocalBusiness` JSON-LD (19 `AggregateRating` occurrences sitewide). The audit flags this as a **medium-high compliance risk** (audit §5, item 4): publishing a precise, unsubstantiated rating/review count in structured data violates Google's structured-data guidelines, which require review/rating markup to reflect genuine, verifiable reviews — a mismatch between claimed and demonstrable ratings can trigger a manual action against rich-result eligibility for the whole site, not just the rating snippet.

`project-memory/FACTS-TO-VERIFY.md` lists "review ratings and counts" explicitly among the unverified claims.

**Recommendation for this redesign pass:**
- **Do not carry the `5.0`/`96` (or any other) `AggregateRating` value forward into any new or rebuilt schema.** Remove `AggregateRating` from the `AutomotiveBusiness` block entirely for now.
- If/when Ivan supplies a real, verifiable review source (Google Business Profile export, a review-platform API, or equivalent), `AggregateRating` can be added back at that point, sourced from that real data, with `ratingValue`/`reviewCount`/`bestRating`/`worstRating` matching the verified source exactly.
- Until then, trust signals on-page should rely on verifiable, specific claims only (service descriptions, process transparency, the kind of specificity called out favorably in `best-principles.md` §7c) rather than a rating badge.
- This hold applies to every occurrence of `AggregateRating`, not just the homepage's — sweep all 19 during implementation.

## 10. Cross-cutting rules

- Every JSON-LD block that currently uses the bare `capitalupfitters.com` host in a `url`/`@id`/`item` field must be normalized to `https://www.capitalupfitters.com` (ties to `seo-aeo-geo-plan.md` §3).
- Prefer `@id` references to the single `Organization` block (§1) over re-declaring `Organization`/`LocalBusiness` fields independently on every page — reduces drift risk (the exact failure mode that produced the www/non-www split in the first place).
- No schema field may assert a claim from `FACTS-TO-VERIFY.md` without Ivan's sign-off — this includes `foundingDate`, `award`, `hasCredential`, `memberOf` (for authorized-dealer/installer claims), and `aggregateRating` (§9).
- Validate all new/changed JSON-LD with Google's Rich Results Test and Schema.org validator before this ships, as part of the QA phase (`qa/final-qa-report.md`).
