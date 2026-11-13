# Capital Upfitters content backend (staging only)

Payload CMS 3.93.0 / Next.js 16.4.6, isolated from the existing static website. This is a tested local implementation, **not an activated production CMS**. No lead handling, analytics, indexed website route, current media endpoint, existing database or Vercel project configuration was changed.

## What is implemented

- `/admin`: Payload authentication, admin/editor roles, 30 saved content versions and explicit drafts/publishing. Editors cannot create users or elevate their role. Public first-user registration is disabled. Initial provisioning is deliberate and developer-run.
- `business` global; `offers`, `jobs`, `media`, `reviews` and `faq` collections. Prices/hours have verification and next-review dates. Source/approval notes are private.
- Publishing rejects unapproved records, stale/unverified prices and incomplete jobs. Jobs need 3–5 distinct install-specific notes, 4–8 genuine photos including different before/after images, actual vehicle/date and owner attestation. No fabricated sample jobs, prices, holiday closures or review counts are seeded.
- Real image uploads: JPG/PNG/WebP, maximum 3 MB/40 million pixels, minimum 600×400, no animation, descriptive filenames, WebP re-encoding without EXIF, 640/1600 responsive derivatives. Original bytes are validated before Payload transforms them. **Replacement/crop is deliberately disabled** so old versions retain their files: upload a new media record, then change the job's selection. Metadata remains editable. Deletes are disabled.
- `/gallery`: single filterable index, up to four before/after comparisons, linked `/gallery/{slug}` pages, keyboard sliders, `next/image`, per-job metadata/breadcrumb/ImageObject schema and existing quote/service links. All staging pages have `noindex,nofollow`; nothing is added to the live sitemap.
- A sanitized published-content adapter. Drafts/private notes are never projected; stale offers and jobs referencing unpublished/wrong-job/unapproved photos are withheld. `/api/public/content` is off by default. Local previews use same-origin image paths; external JSON exports use absolute approved asset URLs.
- Explicit offline export creates published JSON, matching business/offer schema, additive gallery sitemap and a GBP reference file. It does **not** edit the website, submit to Google, call a deployment hook or replace existing sitemap entries.

## Local development

From this directory, use Node 22+ (verified with Node 24):

```sh
npm ci
cp .env.example .env
# Set CMS_DEPLOYMENT_SCOPE=local and a new private PAYLOAD_SECRET of 32+ characters.
npm run generate:types
npm run generate:importmap
npm run dev
```

The app uses `http://localhost:3100`. `.data/` is created automatically; local SQLite and uploads remain ignored. Do not use local SQLite or filesystem uploads on Vercel. Do not reuse a production secret. Normal Next/Payload commands load `.env`; standalone scripts can use `node --env-file=.env --import tsx ...`.

### Initial administrator

No real account has been created. After the owner approves the identity and credential storage, a developer uses `scripts/create-admin.ts` once with `CMS_ALLOW_BOOTSTRAP=true` and JSON `{ "email": "approved address", "password": "unique 16+ character password" }` via stdin, never command arguments or Git. The helper refuses a second bootstrap. Disable the flag immediately. The admin can then create the owner's editor account and the owner signs in at `/admin`.

Do not use the generic first-user form: public registration is blocked server-side. Email/password-reset delivery is intentionally disabled rather than printing reset secrets into logs. An approved mail provider and recovery test are required before hosted owner onboarding. No API key, email subscription or external authentication service was created.

### Editing workflow

1. Create a draft job, then upload its rights-cleared real before/during/after images.
2. Publish each selected image, add job-specific notes/vehicle/date, confirm evidence and publish the job.
3. Use draft mode for price or holiday edits. Explicit publish changes the isolated preview immediately; the static live website is still unchanged.
4. Replace a photo by creating a new media record and repointing the job. Unpublishing a referenced photo hides that job from the public projection. Blob files already distributed publicly are not made private by unpublishing.
5. Reviews require a source URL and republication permission. No aggregate rating is inferred from selected testimonials.

**All uploaded images must already be safe for public use, even drafts.** The Blob adapter uses public object URLs. Remove plates/customer details and obtain needed rights before uploading. Keep raw camera originals and sensitive material out of this CMS.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

Tests run against synthetic fixtures in a temporary SQLite database and temporary media directory, then remove those fixtures. No live storage or customer records are touched. Coverage includes role escalation, disabled public registration, draft-versus-published values, publish gates, image processing, immutable replacement preserving bytes, metadata edits, unpublish behavior, private-field projection, quote route contracts and production fail-closed settings. Root `npm run check` remains the independent website regression suite.

## Hosted preview and release blockers

1. **Approve dedicated infrastructure.** Select a separate PostgreSQL database and Blob store. Set `CMS_DATABASE_URL`, `CMS_BLOB_READ_WRITE_TOKEN`, `CMS_ASSET_ORIGIN`, `CMS_SERVER_URL` and private `PAYLOAD_SECRET` only after the required authorization. Generic `DATABASE_URL` and existing lead/media credentials are never read. No provider was provisioned or credential transferred.
2. **Generate/review the PostgreSQL migration** against that empty dedicated staging DB, then run it there. Postgres schema push is disabled. The local SQLite schema is not a production migration. No fabricated provider ID or migration has been substituted.
3. **Deploy a separate preview project rooted at `cms/`**, with `CMS_DEPLOYMENT_SCOPE=preview` and access protection. Never merge this whole visual-pilot branch as a CMS release. Cherry-pick the CMS-only commit onto the intended integration branch. Review the static project's packaging/exclusions before carrying this subdirectory into its deployable source.
4. Provision the initial approved admin and editor, configure mail recovery, and verify login/edit/draft/publish/restore on desktop and phone. The intended future same-domain `/admin` proxy requires a separately reviewed route change; existing `/admin/media` must remain intact until a controlled transition.
5. Owner supplies real launch jobs/photos/notes and verifies actual offers, business hours and holiday exceptions. Nothing is imported from stale `cms-data.json` or the plan's illustrative data.
6. Complete the measurement baseline gate **before** enabling live page replacements. Then wire the static build to consume one atomic snapshot for visible NAP/prices/hours/schema, map every current offer placement, retain existing routes/measurement contracts, add the gallery routes and bidirectional service links, validate complete sitemap, and obtain release approval. This static frontend cutover is intentionally not activated here.
7. Configure approved video storage and a large-file direct-upload path, then migrate/validate existing clips. Current media support is images only; no 6 MB clips/raw originals were silently routed through Vercel serverless uploads. No video moved or deleted.

Production execution deliberately throws when `VERCEL_ENV=production`. Lifting that guard is a reviewed release change after the above checks, not an environment-only shortcut. The approximately two-minute publishing/Google display/GBP-sync claims in the plan are not promised or implemented.

## Architecture sources

- https://payloadcms.com/docs/getting-started/installation
- https://payloadcms.com/docs/database/postgres
- https://payloadcms.com/docs/upload/storage-adapters
- https://github.com/payloadcms/payload (MIT; standard Next App Router wiring)

The existing site is static HTML/JS plus Vercel serverless, not the Next.js site assumed by the plan. Keeping Payload separate avoids a framework rewrite, an accidental lead database migration, and contamination of the measurement-first release sequence.
