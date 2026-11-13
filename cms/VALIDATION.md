# Validation record · November 2026

- `npm test` (CMS): **8/8 passed**, including a real isolated SQLite/Payload integration test with temporary synthetic images and users. Covers draft isolation, disabled public registration, editor role-escalation denial, publication gates, WebP generation, immutable replacement preserving original bytes, metadata editing, and hiding jobs after referenced media is unpublished.
- `npm run typecheck` (CMS): **passed**.
- `npm run build` (CMS): **passed**, optimized Next.js build with `/admin`, `/api/[...slug]`, gated content projection, `/gallery` and `/gallery/[slug]` routes.
- Root website `npm run check`: **passed**, all **158 tests**, 49-page shared chrome and UI contracts.
- HTTP checks against a temporary local CMS: gallery **200** with noindex and truthful empty state; disabled public projection **404**; anonymous offers **403**; public first-user registration **403**.
- Independent code review identified and corrected immutable media replacement, early upload pixel validation, local optimized-image paths and fresh-checkout data directory creation.

## Not verified / not activated

- Browser rendering and interaction QA: the connected browser could not reach this executor's loopback (`ERR_CONNECTION_REFUSED`). No screenshots or visual-pass claim substitute for that test.
- Hosted PostgreSQL migrations, Blob writes, mail recovery, hosted owner login and published-job visual QA require approved infrastructure and real content. SQLite is local validation, not proof of those hosted integrations.
- No live site switch, provider creation, credentials transferred, accounts provisioned, video migration, production deploy, external webhook, GBP update or sitemap replacement occurred.
- Full static-website content consumption remains intentionally gated by the measurement-first release sequence.

Production remains fail-closed. See README.md for exact activation prerequisites and the remaining Step 5 work.
