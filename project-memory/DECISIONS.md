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

## 2026-08-06 — Repository identity resolved
**Decision:** `1vank0/CapitalUpfittersWeb` is the canonical production repo (of ~8 similarly-named Capital Upfitters repos on the account).
**Reasoning:** Its Vercel project (`capital-upfitters-website`) serves `capitalupfitters.com`/`www.capitalupfitters.com`, matching the deployment URLs Ivan provided directly.
**Source:** Vercel connector (`get_project`) cross-referenced against Ivan's pasted URLs.
