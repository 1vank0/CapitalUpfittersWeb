# Homepage media registry

Homepage gallery images are intentionally path-free. `index.html` references semantic keys such as `home.audience.personal` and `home.service.bedliner`; it contains no registry-managed `/media/gallery/homepage/` path. The current homepage video and playlist remain in place by owner direction. `home.hero` is a prepared, unused registry slot for a later owner-approved video replacement.

## Authoritative locations

- Media metadata: `content/gallery/homepage-media.json`
- Public API: `/api/public/homepage-media`
- Responsive derivatives: `media/gallery/homepage/`
- Browser resolver: `homepage-media.js`

This registry is separate from customer/project proof and private quote uploads. Generated images must remain `kind: "illustrative"` and use alt/caption text that makes that status clear.

## Replace an image

1. Prepare an approved source image with no visible trademark, readable license plate, private customer data, or unsupported project claim.
2. Export hashed AVIF and WebP derivatives. Recommended widths:
   - Reserved hero image: 960, 1440, and source width.
   - Cards: 480, 768, 1024, and source width.
3. Place derivatives in `media/gallery/homepage/`.
4. Update only the matching item in `content/gallery/homepage-media.json`:
   - `fallback`
   - `sources.avif`
   - `sources.webp`
   - intrinsic `width` and `height`
   - `alt`, `caption`, `focalPoint`, and `sizes`
5. Run the media-contract test and preview the homepage at desktop and mobile widths.

The API rejects external URLs, non-homepage paths, duplicate keys, missing disclosures, invalid dimensions, and unsupported formats. It never exposes source PNGs or private media.
