# Image / Media Strategy — Capital Upfitters Redesign

Companion to `best-principles.md` §18 and `reports/existing-site-audit.md` §4.3/§4.5. Planning document only — no media files are moved or edited here, and no new images are generated this pass (no image-generation connector available; see `project-memory/DECISIONS.md`, 2026-08-06).

---

## 1. Real starting point

The audit is unambiguous: the live site has **no real photography wired into rendering**. A sitewide `grep` for `<img` across every HTML file returns exactly one match, and it's a JS-templated tag inside `gallery.html` that only populates if a live third-party fetch returns real URLs — otherwise the page falls back to CSS-gradient placeholder tiles. The rest of the visual system runs on 1,258 inline `<svg>` icon elements, 34 `background-image`/gradient declarations, and the one homepage hero video (`assets/amp-powerstep.mp4`, protected, unchanged).

This means the redesign is not "replace old photos" — it's "wire in photography for the first time." Two existing, unused asset pools already exist on disk and are the candidate source material for this pass:

| Pool | Location | Count | Formats | Status |
|---|---|---|---|---|
| Pool A | `media/next/` | 19 files | WebP only | Present since before this redesign branch; zero references anywhere in HTML/CSS (confirmed via repo-wide grep) |
| Pool B | `media/gallery/homepage/` | 90 files | AVIF + WebP, multiple breakpoints | Imported from PR #11 (`agent/luxury-homepage-gallery`) per Ivan's 2026-08-06 decision to reuse existing imagery rather than generate new |

**No new image generation this pass** — this document plans how to wire up what already exists, not what to create.

## 2. Pool inventory

### Pool A — `media/next/` (19 files, ~1.8MB total, WebP only)

- Audience-segment images (4): `audience-adventurers-v2.webp`, `audience-contractors-v2.webp`, `audience-fleets-v2.webp`, `audience-public-safety-v2.webp`
- Homepage hero variants (2): `home-hero-v1.webp`, `home-hero-v2.webp`
- Service hero images (13, one per most services): `bedliner-v1.webp`, `camper-shells-v1.webp`, `ceramic-coating-v1.webp`, `commercial-wraps-v1.webp`, `exterior-v1.webp`, `hitches-v1.webp`, `industrial-coatings-v1.webp`, `lighting-v1.webp`, `mobile-detailing-v1.webp`, `running-boards-v1.webp`, `stealth-hitches-v1.webp`, `suspension-v1.webp`, `tonneau-v1.webp`, `toolboxes-v1.webp`, `undercoating-v1.webp`, `window-tinting-v1.webp`
- No location/geo-specific images in this pool.
- Single format (WebP), no explicit multiple breakpoints — usable as a fallback/base layer but lower fidelity for responsive `srcset` than Pool B.

### Pool B — `media/gallery/homepage/` (90 files, AVIF + WebP, multiple breakpoints)

Base image families (12 distinct source images, each rendered at multiple breakpoints × 2 formats):
- `hero-40342b4145` — homepage hero candidate (breakpoints: 960, 1440, 1672)
- `craft-why-80490f7f14` — "why us" / craft narrative image (breakpoints: 1200, 1536)
- `audience-personal-e4999b4cf5`, `audience-fleet-0f65a3bbd8`, `audience-dealer-754aacac1f`, `audience-industrial-4ba197ed3e` — audience-segment images (breakpoints: 480, 768, 1024, 1448)
- `service-bedliner-80c7badcf7`, `service-ceramic-61c83aacf5`, `service-hitches-c899cd69d2`, `service-tonneau-d679a2b8b2`, `service-undercoating-0b673a9514`, `service-running-boards-5008658350` — service images (breakpoints: 480, 768, 1024, 1448)

Every base image ships as both `.avif` and `.webp` at each of its breakpoints — this is a proper responsive-image source set, ready for `<picture>`/`srcset` wiring with no additional processing needed for format/size variants.

### Provenance — critical distinction between the two pools

- **Pool A (`media/next/`):** provenance not fully documented in repo history available to this audit; treat as unconfirmed-origin stock/placeholder-style imagery until Ivan confirms otherwise.
- **Pool B (`media/gallery/homepage/`):** confirmed **AI-generated**, imported from PR #11. This is a hard constraint from `REQUIREMENTS.md`'s non-negotiable list: **"publish generated imagery as authentic customer work"** is explicitly forbidden. Every use of Pool B images must be captioned/alt-texted/labeled in a way that does not claim the image depicts an actual completed Capital Upfitters customer vehicle or job. Generic, accurate descriptions ("sprayed-in bedliner installation" / "technician applying ceramic coating") are fine; specific false claims ("a customer's truck we upfitted last month in Rockville") are not, regardless of how plausible the image looks.

## 3. Centralized media manifest

Per the task spec's deliverables checklist (`REQUIREMENTS.md`: "Centralized media manifest"), this pass designs — but does not yet build the rendering pipeline for — one manifest file (e.g. `media/media-manifest.json`) that becomes the single source of truth for every image used on the site. Goal: a future backend (or Ivan editing this file directly) can swap, add, or retire images without touching page HTML structure, consistent with `best-principles.md` §28's future-integration-boundary approach (same pattern as the centralized business-data JSON planned for phone/address/hours in §27).

### Manifest schema (per entry)

```json
{
  "id": "service-bedliner-hero",
  "service_category": "bedliner",
  "vehicle": "pickup truck (unspecified make/model)",
  "caption": "Sprayed-in bedliner installation",
  "alt_text": "Close-up of a sprayed-in truck bedliner, textured black finish",
  "sources": {
    "desktop": {
      "avif": "media/gallery/homepage/service-bedliner-80c7badcf7-1448.avif",
      "webp": "media/gallery/homepage/service-bedliner-80c7badcf7-1448.webp"
    },
    "mobile": {
      "avif": "media/gallery/homepage/service-bedliner-80c7badcf7-768.avif",
      "webp": "media/gallery/homepage/service-bedliner-80c7badcf7-768.webp"
    },
    "thumbnail": {
      "avif": "media/gallery/homepage/service-bedliner-80c7badcf7-480.avif",
      "webp": "media/gallery/homepage/service-bedliner-80c7badcf7-480.webp"
    }
  },
  "gallery_category": "services",
  "source_pool": "pr11-media-gallery-homepage",
  "generation_status": "ai_generated",
  "usage_rights": "internal_use_pr11_import",
  "approval_status": "pending_ivan_review"
}
```

### Field definitions

| Field | Purpose |
|---|---|
| `id` | Stable slug referenced from page templates — the manifest's primary key, and the seam a future backend swaps against without touching HTML. |
| `service_category` | Maps to the 16-service taxonomy (`bedliner`, `hitches`, `ceramic-coating`, etc.) or `audience` / `general` / `location` for non-service images. |
| `vehicle` | Vehicle type/make depicted, if applicable and identifiable ("pickup truck," "SUV") — never a specific real customer's vehicle info unless verified. |
| `caption` | Short, human-readable description shown in UI (gallery captions, etc.). |
| `alt_text` | Accessibility/SEO alt text — specific and descriptive, never implying authentic customer work for `ai_generated` entries (per `seo-aeo-geo-plan.md` §6). |
| `sources.desktop` / `.mobile` / `.thumbnail` | Breakpoint-specific file paths, each with `avif`/`webp` variants for `<picture>` wiring. Pool A entries (WebP-only, single size) populate only what exists — no fabricated breakpoints. |
| `gallery_category` | Which gallery filter/section the image belongs to (`services`, `audience`, `hero`, `craft`) — feeds `gallery.html`'s eventual manifest-driven rendering, replacing the current live-fetch dependency. |
| `source_pool` | Which pool the asset came from (`media-next` or `pr11-media-gallery-homepage`) — traceability. |
| `generation_status` | `ai_generated` (Pool B, confirmed) or `unconfirmed_origin` (Pool A, until Ivan clarifies) or `authentic_customer_photo` (reserved for real future photography — none exists yet, do not use this value for anything currently in the repo). |
| `usage_rights` | Plain-language note on what this asset can be used for (e.g., "internal_use_pr11_import" — flag for Ivan to confirm actual licensing/rights status of the PR #11 generated set before any external/paid-ad usage beyond the website itself). |
| `approval_status` | `pending_ivan_review` / `approved` / `rejected` — gates whether an entry is eligible for use on the live redesign; nothing ships to the selected direction/implementation without moving past `pending_ivan_review`. |

### Why this design

- **Decouples pages from files.** Templates reference a manifest `id`, not a hardcoded path — swapping `service-bedliner-hero`'s underlying image later (real photography, a different AI-generated image, a client-supplied photo) means editing one manifest entry, not hunting through HTML across 16+ service pages.
- **Matches the existing centralization pattern.** Consistent with the phone/address/hours JSON approach already agreed for business-identity data (`best-principles.md` §27) — one small, hand-editable JSON file, no new build system, no CMS wiring this pass.
- **Bakes in the authenticity guardrail structurally.** Because `generation_status` and `approval_status` are required fields on every entry, it's not possible to wire an image into a page template without that image having passed through an explicit status check — this directly operationalizes the "never present generated imagery as real customer work" constraint rather than relying on someone remembering it during implementation.
- **Ready for the future backend.** Per `REQUIREMENTS.md`'s integration objective (Upfit Portal, gallery-management, customer-portal), a future system that manages real customer photography can populate new manifest entries with `generation_status: "authentic_customer_photo"` following the identical schema — no page-template rework needed when that day comes.

## 4. Mapping recommendation (this pass)

Subject to Ivan's approval (every entry starts `pending_ivan_review`):

- **Homepage hero (static fallback, video remains primary):** `hero-40342b4145` (Pool B) — has the fullest breakpoint set (960/1440/1672) and both formats.
- **Service pages (16):** Pool B covers 6 directly (bedliner, ceramic-coating, hitches, tonneau, undercoating, running-boards) with full responsive sets — use those first. For the remaining 10 services, fall back to Pool A's matching `-v1.webp` single-size images (camper-shells, commercial-wraps, exterior, industrial-coatings, lighting, mobile-detailing, stealth-hitches, suspension, toolboxes, window-tinting) until higher-fidelity assets exist — mark these manifest entries `generation_status: "unconfirmed_origin"` pending Ivan's clarification of Pool A's origin.
- **Audience hubs (`fleet.html`, `dealer-government.html`, `start-here.html` router):** Pool B's `audience-fleet-0f65a3bbd8`, `audience-dealer-754aacac1f`, `audience-industrial-4ba197ed3e`, `audience-personal-e4999b4cf5` map directly to 4 of the site's 8 audience segments; Pool A's `audience-contractors-v2`, `audience-public-safety-v2`, `audience-adventurers-v2` fill 3 more. No existing asset maps cleanly to "luxury/performance owners" or "dealerships" as distinct visual categories — flag as a manifest gap for Ivan, not something to force a mismatched image onto.
- **"Why Capital Upfitters" / differentiation section:** Pool B's `craft-why-80490f7f14`.
- **Gallery page (`gallery.html`):** once manifest-driven, populate from the full set of `gallery_category: "services"`/`"audience"` entries across both pools, replacing the current live-third-party-fetch dependency (which is itself a separate, non-dead endpoint from the audit's flagged dead CMS domain, but still an unnecessary runtime dependency for what should be static content).
- **Location pages (4):** no location-specific imagery exists in either pool — use general shop/service imagery rather than fabricating city-specific photos, and flag genuine location photography as a future opportunity (ties to `recommended-sitemap.md`'s noted future template+data opportunity).

## 5. Explicitly out of scope this pass

- No new AI image generation (no connector available; Ivan's 2026-08-06 decision documented in `project-memory/DECISIONS.md`).
- No real customer photography shoot (not a redesign-phase task).
- No change to `assets/amp-powerstep.mp4` (protected).
- No automated manifest-to-page wiring code written here — this document specifies the manifest's shape and mapping recommendation; implementation phase builds the actual JSON file and template consumption.
