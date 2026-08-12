# Handoff

Picking this up cold: read `CURRENT-STATE.md`, `REQUIREMENTS.md`, `DECISIONS.md`, then run `git status` / `git log --oneline -12` / `gh pr list` to confirm nothing changed since 2026-08-06.

**Delivered:** Branch `redesign/2026-relaunch` pushed. Draft PR: https://github.com/1vank0/CapitalUpfittersWeb/pull/12
Preview: https://capital-upfitters-website-i22nek24i-ivan-s-projects-fc67197c.vercel.app (Vercel-Authentication protected)
**Production untouched** — still `main` @ `ab77025`.

**Traps — read before "fixing" these:**
- Hero `h1` at `opacity: 0.02` is an **intentional 1.8s idle-fade** (inline script in `index.html`), not a bug. Headless/idle browsers always capture the faded state.
- `.reveal` elements lacking `.visible` is **correct** — that class belongs to the IntersectionObserver fallback, which only runs when scroll-timeline is unsupported.
- Lead-flow suite showing 15 pass / 0 fail / 13 cancelled is the **pre-existing baseline**, identical on pristine `main`. Not a regression.
- See `qa/final-qa-report.md` §4 for the full write-up on all three.

**Do not:** re-add a photo file input to any form until signed private upload storage exists — `lead-form.js` discards File objects, so an uploader silently loses customer photos while showing success. Do not merge, deploy to production, restore any removed trust claim, reintroduce the 1994 founding year, or touch PR #11.

**Next up:** Lighthouse/axe against the Preview, real-device/Safari pass, then extend the hybrid design to the remaining 37 pages.
