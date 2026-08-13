# Facts to Verify

None of these may be published (copy, schema, badges) until confirmed by Ivan, business records, or a manufacturer/partner page. Source: Ivan's seed context, 2026-08-06 — user-provided, not yet independently verified.

- [ ] Family ownership — still unverified; Ivan chose 2026-08-06 to keep it off the site pending confirmation
- [ ] More than 30 years of combined experience (staff experience, NOT shop age — see resolved item below)
- [x] **RESOLVED 2026-08-06 by Ivan:** Shop operating **since 2015** is correct. The live site's "family-owned since 1994" / "Serving the DMV 30+ years" claims (found on ~25 pages) are **factually wrong** and must stay removed — do not restore them. See [[verified-facts]]. Ivan's separate "30+ years combined experience" refers to combined staff experience, NOT shop age — never conflate the two, and it remains unverified below.
- [ ] Patriot Liner authorization
- [ ] Patriot Fleet Solutions relationship
- [ ] Patriot Rust Defense relationship
- [ ] Waxoyl Application Center status
- [ ] RealTruck dealer status
- [ ] eTrailer installer status and rating
- [ ] Stealth Hitches installer or parts-provider status
- [ ] Audi, BMW, or Volvo certification
- [ ] Government or law-enforcement work
- [ ] Review ratings and counts
- [ ] Manufacturer logos and trademark permissions

Note: PR #11's audit (`research/04-quality-audit.md` on branch `agent/luxury-homepage-gallery`) already removed several unsupported claims of this type from its version of the homepage — worth a quick read for precedent, even though we're not building on that branch.

## Open question raised 2026-08-07 — hardcoded testimonials

18 distinct testimonial quotes are hardcoded across 15 service and
location pages, each attributed to a named person ("Mike T.",
"James R.", "Sarah M." …), each tagged with a city and the source
claim **"Google Review"**, each paired with a 5-star graphic
(`aria-label="5 out of 5 stars"`, 28 instances).

This is the same class of review content as the `aggregateRating`
5.0/96 already removed as unverified — and it goes further, because it
attributes specific words to identifiable people.

**Not changed.** Deleting attributed customer testimonials is Ivan's
call, not an agent's. The ARIA validity issue on the star markup was
fixed independently (see TASK-LOG 2026-08-07).

Note the contrast: `index.html` carries a genuine Trustindex widget that
pulls real Google reviews live. If the hardcoded ones cannot be
sourced, that widget is the honest replacement pattern.

**Needs from Ivan:** are these 18 quotes real, and is "Google Review"
accurate for each? If not verifiable, they should come down.
