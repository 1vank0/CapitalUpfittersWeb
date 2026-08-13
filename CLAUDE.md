# Capital Upfitters Website — Agent Instructions

This repository is the static HTML website for **Capital Auto Upfitters & Protective Coatings** (Rockville, MD). Production is live at `capitalupfitters.com` via Vercel project `capital-upfitters-website`. Production must never be changed without Ivan's explicit authorization.

## Session start routing

Every session working on the redesign must read, in order:

1. `project-memory/INDEX.md` — what every other file contains
2. `project-memory/CURRENT-STATE.md` — active branch, phase, blockers, next action
3. `project-memory/REQUIREMENTS.md` — non-negotiable constraints
4. `project-memory/DECISIONS.md` — material decisions already made (don't re-litigate)
5. Then whichever files are relevant to the active phase (see INDEX.md)

Then inspect actual repo state (`git status`, `git log`, `git branch -a`, open PRs via `gh pr list`) before trusting an old handoff — memory can go stale.

## Non-negotiable architecture rule

This site stays static HTML/CSS/vanilla JS. No React, Next.js, Vue, Angular, Tailwind, Bootstrap, SPA, or unnecessary build system. See `project-memory/REQUIREMENTS.md` for the full constraint list.

## Prior/parallel work

Branch `agent/luxury-homepage-gallery` (PR #11, draft, unmerged) contains an earlier redesign pass with its own `research/` files. Per Ivan's 2026-08-06 decision, this redesign starts fresh and does not build on PR #11 — but PR #11 remains open and untouched; do not close or overwrite it without asking.

## Deliverables and file ownership

See `project-memory/REQUIREMENTS.md` for the full deliverable list and `project-memory/CURRENT-STATE.md` for what's done vs. outstanding.
