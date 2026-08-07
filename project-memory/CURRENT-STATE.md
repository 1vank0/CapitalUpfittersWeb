# Current State

**Active branch:** `redesign/2026-relaunch`
**Phase:** Implementation + QA complete → push, draft PR, Vercel Preview
**Preview URL:** not yet deployed
**Production:** unchanged (`main` @ `ab77025`)

## Completed
- Repo identity resolved, cloned, branch created; durable memory scaffold
- Existing-site audit (`reports/existing-site-audit.md`)
- Competitor research, 50 sites (`research/*`) + weighted matrix, top-five, best-vs-worst
- `best-principles.md` (31 sections)
- SEO/AEO/GEO, schema, image-strategy, sitemap plans (`reports/*`)
- Three design prototypes + scoring (`experiments/*`, `reports/design-comparison-matrix.md`) → hybrid chosen
- Sitewide technical fixes (og:image, dead CMS fetches, schema type, canonical host, blog schema, `data/business.json`, `media/manifest.json`)
- Hybrid redesign implemented on `index.html`, `fleet.html`, `services/hitches.html` + `style.css`
- Sitewide unverified-claim removal (~40 pages) and 26 → 0 broken internal links
- Mobile nav CTA viewport-overflow fix
- QA pass (`qa/final-qa-report.md`)

## Not done
- Push branch, open draft PR, deploy + test Vercel Preview
- Lighthouse/axe measurement (no runner available locally — must run against Preview)
- Safari/real-device, reduced-motion, keyboard-nav testing
- Visual redesign of the other 37 pages (they have the technical/claim/link fixes only)

## Key facts for the next session
- Shop opened **2015** (Ivan, 2026-08-06). "since 1994"/"30+ years" claims were wrong and are removed — do not restore.
- All other trust claims stay off the site pending documentation.
- Hero `h1` sitting at `opacity: 0.02` is an **intentional 1.8s idle-fade**, not a bug. `.reveal` elements not having `.visible` is also correct (scroll-timeline path, not the IO fallback). See `qa/final-qa-report.md` §4 before "fixing" either.
- Lead-flow suite: 15 pass / 0 fail / 13 cancelled — identical on pristine `main`; environment artifact, not a regression.

## Blockers
None. Production authorization is still required before any merge or production deploy.

## Next action
Push `redesign/2026-relaunch`, open a **draft** PR against `main`, deploy the Vercel Preview, and verify the deployed Preview (not just local).
