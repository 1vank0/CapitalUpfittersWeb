# Decisions

## 2026-08-06 — Start fresh, not building on PR #11
**Decision:** Redesign proceeds from scratch on new branch `redesign/2026-relaunch`, not by extending PR #11 (`agent/luxury-homepage-gallery`).
**Alternatives considered:** (a) build on PR #11's research + luxury homepage, (b) review PR #11 with Ivan before deciding.
**Reasoning:** Ivan's explicit choice when presented with the tradeoff (PR #11 duplicates ~70% of scope but doesn't match the fuller spec — full memory system, three-direction experiment, weighted competitor matrix, Firecrawl-scale research).
**Source:** Ivan, via AskUserQuestion, 2026-08-06.

## 2026-08-06 — Competitor research without Firecrawl
**Decision:** Use WebSearch/WebFetch instead of Firecrawl for the competitor research phase.
**Reasoning:** Firecrawl connector unavailable in this environment; Ivan chose to proceed rather than pause and connect it.
**Source:** Ivan, via AskUserQuestion, 2026-08-06.

## 2026-08-06 — No new AI-generated imagery this pass
**Decision:** Reuse existing repository photography and PR #11's already-generated media (`media/gallery/homepage/*`) instead of generating new images.
**Reasoning:** OpenAI Images API not connected; Ivan chose to reuse existing assets rather than pause or configure the key.
**Source:** Ivan, via AskUserQuestion, 2026-08-06.

## 2026-08-06 — Keep static hand-authored HTML; do not wire Tina CMS this pass
**Decision:** `cms-data.json`/Tina CMS scaffolding stays orphaned (unwired) for this redesign. Instead, centralize the worst hardcoded-duplication offenders (phone/address/hours, currently duplicated 30+ files) into one small JSON data file + minimal existing-pattern script.
**Alternatives considered:** (a) fully wire Tina CMS rendering into the static build, (b) leave hardcoded duplication as-is.
**Reasoning:** Full CMS wiring is a larger scope than "redesign" and would mean adding real build-system behavior, which needs explicit approval under REQUIREMENTS.md's static-architecture constraint. The audit (`reports/existing-site-audit.md` §4.2) explicitly flagged this as "a decision, not a bug to silently fix." A lightweight centralized data file fixes the actual pain point (30+ files to edit for one phone-number change) without expanding the build system. Full CMS wiring is documented as a future integration boundary in `best-principles.md` §28.
**Source:** Claude judgment call per `best-principles.md` §27, consistent with Auto Mode bias toward proceeding on non-blocking decisions; revisit with Ivan if he wants Tina wired up in a later phase.

## 2026-08-06 — Repository identity resolved
**Decision:** `1vank0/CapitalUpfittersWeb` is the canonical production repo (of ~8 similarly-named Capital Upfitters repos on the account).
**Reasoning:** Its Vercel project (`capital-upfitters-website`) serves `capitalupfitters.com`/`www.capitalupfitters.com`, matching the deployment URLs Ivan provided directly.
**Source:** Vercel connector (`get_project`) cross-referenced against Ivan's pasted URLs.
