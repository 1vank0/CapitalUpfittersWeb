# Open Questions

## Open
- None blocking at this time.
- **Minor, non-blocking:** 4 additional non-www URL instances found during the sitewide fix pass (`fleet.html`, `contact.html`, `services/commercial-wraps.html`, `services/stealth-hitches.html` — canonical/og:url/breadcrumb items), out of the originally-scoped fix list. Low severity per the original audit. Deferred to a follow-up pass rather than expanding this fix's scope.

## Closed
- ~~Which Capital Upfitters repo is canonical?~~ → `1vank0/CapitalUpfittersWeb`, resolved 2026-08-06 via Vercel cross-reference.
- ~~Build on PR #11 or start fresh?~~ → Start fresh, resolved 2026-08-06 (Ivan).
- ~~Firecrawl unavailable — block or fallback?~~ → Fallback to WebSearch/WebFetch, resolved 2026-08-06 (Ivan).
- ~~Image generation unavailable — block or fallback?~~ → Reuse existing imagery, resolved 2026-08-06 (Ivan).
