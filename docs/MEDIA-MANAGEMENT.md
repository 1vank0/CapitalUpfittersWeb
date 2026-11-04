# Website image management

## What is implemented

Open `/admin/media` to manage imagery. Unlock with the server's `MEDIA_ADMIN_TOKEN`, choose a slot, upload a JPG/PNG/WebP, enter alt text, choose actual photo or illustration, and set crop focus. Upload creates a draft. Check its preview, then explicitly publish. Previous versions can be previewed and republished. The key stays in tab memory and is cleared on lock/navigation; it is never saved in browser storage.

The 16 slots in `config/media.json` cover the homepage hero and all 15 directory service types. Cards, service headers, brand-page variants and related-service cards share the relevant service slot. For example, BAKFlip/Retrax/TruXedo use `tonneau`; Stealth/EcoHitch use `hitches`. Updating one slot changes its consumers without editing pages or deploying code. Icons are versioned SVG assets and are outside the media manager.

## Storage and API

- Isolated Neon project branch: `capital-upfitters-staging` / `ui-media-management` (`hidden-fire-86603190` / `br-old-unit-bcj4um3z`). No database compute was added. Existing lead storage is untouched.
- Public image bucket: `capital-site-media`. Generated images and their initial records are populated. Uploads are public assets, including saved drafts; use only photos approved for public website use.
- Retain this media branch and bucket after merging the website PR. They hold the editable content; deleting them would remove the image origin. A website deployment does not migrate storage.
- Immutable image variants: `images/<slot>/<version>/{768,1200}.webp`. Immutable record history: `records/<slot>/<version>.json`. Current pointer: `slots/<slot>/current.json`.
- `/api/media` returns a safe public slot inventory. `?slot=bedliner&width=768` redirects to the currently published backend image. No generated image path is hardcoded in HTML. Public reads need no write credentials.
- `/api/media-admin` requires a strong bearer access key. Uploads and publishing are same-origin JSON operations. Writes fail closed if credentials are missing. Image signatures, format, dimensions and size are checked; images are re-encoded to WebP and EXIF metadata is discarded. SVG and animated uploads are rejected.
- Publish checks the expected version and uses storage ETags to reject concurrent stale writes. Restore republishes an old immutable record. Existing files are not deleted.
- Public pointer lookups may remain cached for up to five seconds. Immutable image variants may be cached for a year. Admin reads bypass the pointer cache.

## Runtime configuration and release status

Server-only values: `MEDIA_S3_ENDPOINT`, `MEDIA_S3_REGION`, `MEDIA_BUCKET`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, `MEDIA_ADMIN_TOKEN`.

Local configuration exists in ignored `.env.media.local`; no secret is committed. Storage credentials are scoped to read/write object storage on the isolated branch. The intended Vercel project is `capital-upfitters-website` (`prj_pbmw2jhQq9ACUJM7zJLayMcZISA1`). Saving these six values to its production/preview/development environments was rejected by automatic approval review because the credential transfer was not explicitly authorized. **Hosted admin activation is pending the owner's approval.** Do not infer deployment authorization from credential approval.

The review branch retains automatic deployment suppression. No website deployment or merge was performed.

## Local use and checks

Use Node 24 (the existing Vercel project runtime), `npm ci`, then `npm run dev`. The development server supports the same media handlers and keeps real lead delivery disabled. A one-time import helper accepts a local manifest: `node --env-file=.env.media.local scripts/seed-media.cjs /absolute/manifest.json`. It skips populated slots.

`npm run check` includes the 45 existing tests plus six media tests: unauthorized/configuration failures; origin/content-type/size guards; unknown slots and malformed payloads; public endpoint method/size controls; real image optimization and draft/publish/restore; invalid formats/descriptions with zero storage writes.

Live checks against the isolated bucket passed for all 16 initial slots, draft isolation, publish, stale ETag rejection, history and restore. The original bedliner version was restored after the check. Browser review encountered `EAI_AGAIN` DNS failures from the managed preview to the storage origin; final image rendering and the unlocked admin UI remain unverified in that preview. No substitute screenshots or mocked images are presented as end-to-end proof.
