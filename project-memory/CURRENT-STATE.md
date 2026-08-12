# Current State

**Active branch:** `redesign/2026-relaunch`
**Phase:** Delivered — branch pushed, draft PR #12 open, Vercel Preview live and verified
**Preview URL:** https://capital-upfitters-website-i22nek24i-ivan-s-projects-fc67197c.vercel.app (Vercel-Authentication protected; branch alias capital-upfitters-website-git-r-a1de46-ivan-s-projects-fc67197c.vercel.app)
**Draft PR:** https://github.com/1vank0/CapitalUpfittersWeb/pull/12
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
- Lighthouse scoring of the REDESIGNED pages (Unlighthouse blocks localhost; Preview timed out behind Vercel Auth). Production baseline IS measured — see `qa/skills-audit-addendum.md`.
- Remaining a11y work: label-content-name-mismatch (25 routes), color-contrast (20), target-size (14), aria-prohibited-attr (10)
- Safari/real-device, reduced-motion, keyboard-nav testing
- Visual redesign of the other 37 pages (they have the technical/claim/link fixes only)

## Quote-form work (2026-08-07)
- Fixed **quirks mode** on quote/contact/dealer-government/fleet/gallery — attribution meta/link tags sat above `<!DOCTYPE>`, so browsers discarded it (`compatMode: BackCompat`, `doctype: null`, verified live). Tags moved into `<head>`.
- Removed the **photo uploader**: it looked fully functional but `lead-form.js` skips File objects and no upload storage exists, so every photo was silently discarded after showing a success message. Replaced with tap-to-text / tap-to-email hand-off. **Do not re-add a file input until signed private uploads actually exist** (spec is in PR #3).
- Service checkbox rows 22px → 44px (WCAG 2.2 target size).
- `lead-form.js` `validate()` now focuses the services group on services errors — additive only.

## Key facts for the next session
- Shop opened **2015** (Ivan, 2026-08-06). "since 1994"/"30+ years" claims were wrong and are removed — do not restore.
- All other trust claims stay off the site pending documentation.
- Hero `h1` sitting at `opacity: 0.02` is an **intentional 1.8s idle-fade**, not a bug. `.reveal` elements not having `.visible` is also correct (scroll-timeline path, not the IO fallback). See `qa/final-qa-report.md` §4 before "fixing" either.
- Lead-flow suite: 15 pass / 0 fail / 13 cancelled — identical on pristine `main`; environment artifact, not a regression.
- **claude-seo tooling works.** Set `CLAUDE_SEO_PYTHON=/Users/ivanko/.local/bin/python3.11` then `claude-seo setup`. Default python3 is 3.9.6 and too old — that is the only reason it looked "unavailable" earlier. Chromium + Unlighthouse work after setup.

## Blockers
None. Production authorization is still required before any merge or production deploy.

## Next action
Awaiting Ivan's review of Preview + PR #12. Before any production promotion: run Lighthouse/axe against the Preview URL, do a real-device/Safari pass, and decide which trust claims can be documented and restored. **Do not merge or deploy to production without Ivan's explicit authorization.**
