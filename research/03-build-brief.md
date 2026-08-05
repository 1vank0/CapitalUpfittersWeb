# Homepage Build Brief

## Outcome

Refresh the homepage as an Apple-aligned, luxury automotive editorial experience while preserving the existing business model, navigation meaning, service catalog, quote flow, fitment selector, and lead controllers.

## Approved concept

An internal visual concept was generated and reviewed against the current production page and the user-selected Next.js reference. The production-facing media set is governed by the homepage gallery registry.

## Page structure

1. Quiet obsidian header and announcement rail.
2. Existing cinematic homepage video retained, with a quieter luxury overlay and left-aligned copy.
3. Compact vehicle-fit selector.
4. Four large audience cards in a 2×2 image-led mosaic.
5. Six services in an asymmetric mosaic with bedliner as the featured tile.
6. Full-width industrial-capability media band.
7. Craft image paired with a numbered why-us list.
8. Existing FAQ, review, service-area, final CTA, and footer surfaces, visually simplified.

## Design tokens

- `--home-obsidian: #090b0e`
- `--home-graphite: #13171c`
- `--home-panel: #1b2026`
- `--home-porcelain: #f3f1ed`
- `--home-stone: #d8d2c8`
- `--home-muted: #a8adb4`
- `--home-metal: #b8955b`
- Headlines: Manrope 600–700, line-height 0.98–1.08, tracking `-0.025em` to `-0.01em`.
- Body/UI: Inter 400–600, line-height 1.5–1.65, tracking normal.
- Card padding: 24–32px; title/body gap: 10–14px; actions align to the card bottom.
- Media radius: 20–24px desktop, 16–20px mobile.

## Media architecture

- Authoring registry: `content/gallery/homepage-media.json`.
- Public same-origin endpoint: `/api/public/homepage-media`.
- Derivative directory: `media/gallery/homepage/`.
- Frontend resolver: `homepage-media.js`.
- Markup contract: `data-media-key` only—no image paths in `index.html`.
- Formats: AVIF and WebP at 480/768/960/1440 widths where source dimensions allow.
- LCP: preserve the existing video for this phase; prevent the media registry from competing at high priority.
- Below fold: lazy loading, async decode, intrinsic dimensions/aspect ratios.
- Security: allowlisted same-origin media roots, schema and scalar validation, DOM construction without `innerHTML`.
- Truthfulness: every generated item has `kind: "illustrative"` and explicit alt/caption context.

## Responsive behavior

- Desktop shell: 1280–1360px maximum with 24–32px gutters.
- At 1100px: audience and service mosaics reduce to two columns.
- At 720px: single-column cards, 4:3 media, 44–48px minimum controls, and no horizontal overflow.
- Motion: subtle opacity/translation only, with complete visibility when JavaScript is disabled or reduced motion is requested.

## Performance decisions

- Retain both existing hero video sources and playlist logic until the owner approves a separate media change.
- Remove the idle behavior that nearly hides the headline and supporting copy.
- Add immutable caching for versioned `/media/gallery/homepage/**` derivatives.
- Keep the manifest small and edge cached with stale-while-revalidate.
- Do not ship original PNG generation files; retain only optimized public derivatives.
- Defer every non-hero image.

## Conversion invariants

- Preserve `quote.html`, all audience `start-here.html?audience=...` routes, six service destinations, telephone actions, the fit selector, and lead scripts.
- Do not change `api/lead.js`, `lead-form.js`, `quote-form.js`, or attribution behavior.
