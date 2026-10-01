# SEO copy rewrite (local Ollama) - report

- Branch: `seo-copy-ollama` (from `667c26a`), not pushed, not deployed, no PR.
- Script: `scripts/ollama-seo-rewrite.py` (inventory -> generate -> apply -> check -> report). Raw model I/O: `docs/seo-copy-ollama-results.json`.
- Primary model: `gpt-oss:120b` (local, think=medium). Fallback: `qwen3:30b`. Cloud models never used.
- Model switch events: none - every page used gpt-oss:120b
- Model generation time: 64.7 min total = pass 1 (all pages) 39.3 min + pass 2 (12 pages regenerated after review) 25.4 min.
- Editorial review: fields that passed the automatic checks but read badly or carried claims not in the facts were reverted to the original (see REVIEW_REJECTS in the script; rejected text is listed per page).
- Pages inventoried: 37. Pages changed: 32.
- Scope: <title>, meta description (og/twitter description and title mirrored where those tags exist), hero H1 text nodes, hero primary CTA labels. Markup, classes, hrefs and JSON-LD untouched (verified by `check`).
- Skipped files: preview.html, 404.html, products-section.html (snippet), admin/, tina/, tests/, node_modules/.

## Notes

- The homepage hero slider (`SERVICE_SLIDES` in index.html JS) rewrites the H1/CTA text at runtime once it hydrates; the static H1 (no-JS / crawler / pre-hydration state) is now the approved `BUILT FOR REAL WORK.`. Slider copy was not changed.
- Service pages pull `seo.metaTitle` / `seo.metaDescription` from the CMS API at runtime when it is reachable, and `cms-data.json` still holds the old SEO strings. If the CMS is live it will override the new static title/meta in the browser; update the CMS entries to match if you keep this copy.
- index.html, privacy.html and terms.html have no twitter:* tags; none were added.

## Summary

| Page | Model | Sec | Title | Meta | H1 | CTAs | Flags |
|---|---|---|---|---|---|---|---|
| contact.html | gpt-oss:120b | 112.1 | new | - | - | - | 2 |
| dealer-government.html | gpt-oss:120b | 150.8 | - | - | - | - | 3 |
| fleet.html | gpt-oss:120b | 38.4 | new | new | - | new | 0 |
| gallery.html | gpt-oss:120b | 36.3 | new | new | - | - | 1 |
| index.html | gpt-oss:120b | 154.9 | new | new | new | - | 1 |
| privacy.html | n/a | - | - | - | - | - | 1 |
| quote.html | gpt-oss:120b | 37.5 | new | new | - | - | 2 |
| rebates.html | gpt-oss:120b | 105.7 | new | - | - | new | 1 |
| start-here.html | gpt-oss:120b | 118.8 | - | - | - | - | 3 |
| terms.html | n/a | - | - | - | - | - | 1 |
| services/bedliner.html | gpt-oss:120b | 53.3 | new | new | - | new | 0 |
| services/camper-shells.html | gpt-oss:120b | 58.5 | new | new | - | - | 0 |
| services/ceramic-coating.html | gpt-oss:120b | 45.0 | new | new | - | new | 0 |
| services/commercial-wraps.html | gpt-oss:120b | 37.5 | new | new | - | new | 0 |
| services/exterior.html | gpt-oss:120b | 84.1 | new | new | - | - | 0 |
| services/hitches.html | gpt-oss:120b | 152.0 | new | new | - | new | 0 |
| services/index.html | gpt-oss:120b | 61.2 | new | new | - | - | 1 |
| services/industrial-coatings.html | gpt-oss:120b | 43.8 | new | new | - | - | 0 |
| services/lighting.html | gpt-oss:120b | 40.4 | new | new | - | - | 0 |
| services/mobile-detailing.html | gpt-oss:120b | 52.6 | new | new | - | new | 0 |
| services/running-boards.html | gpt-oss:120b | 73.2 | new | new | - | new | 0 |
| services/stealth-hitches.html | gpt-oss:120b | 83.3 | new | new | new | new | 0 |
| services/suspension.html | gpt-oss:120b | 75.2 | new | new | - | - | 0 |
| services/tonneau.html | gpt-oss:120b | 84.2 | new | new | - | new | 0 |
| services/toolboxes.html | gpt-oss:120b | 44.4 | new | new | - | - | 0 |
| services/undercoating.html | gpt-oss:120b | 124.9 | new | new | - | new | 0 |
| services/window-tinting.html | gpt-oss:120b | 76.5 | new | new | - | - | 0 |
| locations/bethesda-md.html | gpt-oss:120b | 60.0 | new | new | - | - | 0 |
| locations/gaithersburg-md.html | gpt-oss:120b | 50.7 | new | new | - | - | 0 |
| locations/rockville-md.html | gpt-oss:120b | 40.7 | new | new | - | - | 0 |
| locations/silver-spring-md.html | gpt-oss:120b | 48.5 | new | new | - | - | 0 |
| blog/best-tonneau-covers-maryland.html | gpt-oss:120b | 185.1 | new | new | - | - | 1 |
| blog/index.html | gpt-oss:120b | 199.3 | - | - | - | - | 3 |
| blog/leveling-vs-lift-kit.html | gpt-oss:120b | 109.9 | new | - | - | - | 2 |
| blog/patriot-liner-vs-drop-in.html | gpt-oss:120b | 141.9 | - | new | - | - | 2 |
| blog/undercoating-maryland-winter.html | gpt-oss:120b | 101.7 | new | - | - | - | 2 |
| blog/weatherguard-vs-kargomaster.html | gpt-oss:120b | 60.2 | new | new | - | - | 1 |

## Per page

### `contact.html`

- Intent: contact / visit the shop / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 112.1s
- Title (old, 55): Contact Capital Upfitters | Rockville MD | 301-304-1419
- Title (new, 50): Visit Our Shop In Rockville MD | Capital Upfitters
- Meta (old, 145): Contact Capital Upfitters in Rockville, MD. Call (301) 304-1419, email, or visit us at 12019 Nebel Street. Mon–Fri 9:30am–4:30pm. By appointment.
- Meta (new, 145): Contact Capital Upfitters in Rockville, MD. Call (301) 304-1419, email, or visit us at 12019 Nebel Street. Mon–Fri 9:30am–4:30pm. By appointment. _(unchanged)_
- H1 (old): FIND US. / CALL US. COME IN.
- H1 (new): FIND US. / CALL US. COME IN. _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: Title follows the required pattern with a service verb and location, stays within 40-60 characters, and places the brand only after the pipe. Meta description uses sentence case, includes the exact proof point from the facts, mentions the service and location, and ends with a clear CTA while meeting the 140-158 character limit. H1 segments are kept exactly as provided, and no primary hero CTA is needed.
- Flags: no hero primary CTA on page - nothing to rewrite; meta kept original (editorial review): pasted the proof hint verbatim ("12019 Nebel St / by appointment")
- Rejected model meta: "Visit our shop in Rockville, MD at 12019 Nebel St / by appointment Mon-Fri 9:30am-4:30pm. Same-week service on most jobs. Call (301) 304-1419."
- Pass 2: regenerated after review - meta failed validation twice in pass 1 (no proof point) (pass-1 output kept in results JSON)

### `dealer-government.html`

- Intent: dealer & government upfitting programs / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 150.8s
- Title (old, 52): Dealer & Government Upfitting | Capital Upfitters MD
- Title (new, 52): Dealer & Government Upfitting | Capital Upfitters MD _(unchanged)_
- Meta (old, 152): Pre-delivery customization, state contract support, and dealer pricing for dealerships and government agencies in the DMV. Upfit Portal access included.
- Meta (new, 152): Pre-delivery customization, state contract support, and dealer pricing for dealerships and government agencies in the DMV. Upfit Portal access included. _(unchanged)_
- H1 (old): DEALER & GOVERNMENT / SOLUTIONS.
- H1 (new): DEALER & GOVERNMENT / SOLUTIONS. _(unchanged)_
- CTAs (old): Apply for Dealer Account
- CTAs (new): Apply for Dealer Account _(unchanged)_
- Rationale: Title meets length and pattern, includes service and location. Meta uses the required proof point, stays within 140-158 characters, and ends with a CTA. H1 follows the two-segment uppercase style. CTA matches the dealer registration link and uses the preferred verb phrase.
- Flags: title kept original: title 61 chars > 60; CTAs kept original: CTA "Request Installed Pricing" promises a quote but the button links to https://upfit-portal-58190af9.base44.app/DealerRegister - label must match the destination; meta kept original (editorial review): "pricing support" is vague/not a fact and "Request installed pricing" does not fit a dealer-account page
- Rejected model meta: "Dealer and government programs for upfitting in Rockville, MD with pricing support. Same-week service for the DMV. Request installed pricing."
- Pass 2: regenerated after review - CTA "Request Installed Pricing" did not match its destination (DealerRegister portal) (pass-1 output kept in results JSON)

### `fleet.html`

- Intent: fleet upfitting (3+ units, Net-30, Upfit Portal) / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 38.4s
- Title (old, 97): Fleet & Commercial Upfitting | Van Shelving, Ladder Racks & More | Capital Upfitters Rockville MD
- Title (new, 48): Fleet Upfitting Rockville MD | Capital Upfitters
- Meta (old, 154): Commercial fleet upfitting in Rockville MD — Weatherguard & Kargomaster van shelving, Backrack ladder racks, bedliners, wraps, and full vehicle upfitting.
- Meta (new, 141): Fleet upfitting for businesses in Rockville, MD with Net-30 terms and same-week service. Rugged builds, DOT-ready. Call (301) 304-1419 today.
- H1 (old): FLEET UPFITTING / THAT KEEPS YOUR BUSINESS MOVING.
- H1 (new): FLEET UPFITTING / THAT KEEPS YOUR BUSINESS MOVING. _(unchanged)_
- CTAs (old): Get Fleet Quote
- CTAs (new): Get a Quote
- Rationale: Title includes the service and city, fits length limits, and follows the required pattern. Meta uses one proof point (Net-30 terms), stays within character limits, and ends with a clear call to action.
- Flags: none

### `gallery.html`

- Intent: gallery of upfit work / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 36.3s
- Title (old, 45): Work Gallery | Capital Upfitters Rockville MD
- Title (new, 45): Work Gallery Rockville MD | Capital Upfitters
- Meta (old, 159): Browse Capital Upfitters' completed installs — bedliners, ceramic coatings, hitches, undercoating, fleet upfits, and commercial wraps. Real jobs, Rockville MD.
- Meta (new, 145): Explore our work gallery of truck and van upfits in Rockville, MD. We earned 4.9 stars on Google from 110 reviews. Request installed pricing now.
- H1 (old): OUR WORK / SPEAKS FOR ITSELF.
- H1 (new): OUR WORK / SPEAKS FOR ITSELF. _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: Title and meta highlight the gallery service in Rockville, include the 4.9-star proof point, stay within length limits, and end with a clear call to action.
- Flags: no hero primary CTA on page - nothing to rewrite

### `index.html`

- Intent: truck & vehicle upfitting (bedliners, hitches, ceramic coating, fleet) / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 154.9s
- Title (old, 51): Capital Upfitters | Vehicle Upfitting Rockville, MD
- Title (new, 48): Truck Upfitting Rockville MD | Capital Upfitters
- Meta (old, 139): Family-owned vehicle upfitter in Rockville, MD. Patriot Liner bedliners, ceramic coatings, hitches, undercoating, and full fleet solutions.
- Meta (new, 157): Truck upfitting in Rockville, MD by a family-owned shop since 2015. Builds for work and play. Bedliners, hitches, ceramic coating. Request installed pricing.
- H1 (old): Built for What Comes Next.
- H1 (new): BUILT FOR REAL WORK.
- CTAs (old): Request Installed Pricing
- CTAs (new): Request Installed Pricing _(unchanged)_
- Rationale: Title meets length and includes service and location. Meta uses one proof point (family-owned since 2015), stays within character limits, and ends with a clear CTA. H1 and CTA follow specifications.
- Flags: H1 set to approved homepage H1 (not model-generated)
- Pass 2: regenerated after review - meta read awkwardly ("serving DMV since 2015") (pass-1 output kept in results JSON)

### `privacy.html`

- Intent: general / Rockville, MD (serving the DMV) - model: n/a, -s
- Title (old, 47): Privacy Policy | Capital Upfitters Rockville MD
- Title (new, 47): Privacy Policy | Capital Upfitters Rockville MD _(unchanged)_
- Meta (old, 109): How Capital Upfitters collects, uses, and protects information from website visitors and quote-request forms.
- Meta (new, 109): How Capital Upfitters collects, uses, and protects information from website visitors and quote-request forms. _(unchanged)_
- H1 (old): Privacy Policy
- H1 (new): Privacy Policy _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: -
- Flags: skipped by design: legal page (privacy/terms) - no service/city intent, copy left untouched

### `quote.html`

- Intent: online quote builder / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 37.5s
- Title (old, 49): Get a Free Quote | Capital Upfitters Rockville MD
- Title (new, 46): Quote Builder Rockville MD | Capital Upfitters
- Meta (old, 148): Request a free upfitting quote from Capital Upfitters. We respond same business day. Retail, fleet, and dealer quote forms available. Rockville, MD.
- Meta (new, 142): Request a detailed upfitting quote in Rockville, MD. We offer same-week availability on most services. Get a quote today. Call (301) 304-1419.
- H1 (old): Build your quote.
- H1 (new): Build your quote. _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: The title fits the required 40-60 character range, follows the exact pattern, and includes a service term (Quote) and the location (Rockville MD). The meta description meets the 140-158 character limit, uses sentence case, mentions the quote service, the Rockville location, the proof point of same-week availability, and ends with a clear call to action. No prohibited words or extra proof points are used.
- Flags: H1 locked: multi-step quote app: 5 step <h1>s, design just rebuilt (P6) - H1 left as is; no hero primary CTA on page - nothing to rewrite

### `rebates.html`

- Intent: current rebates & offers / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 105.7s
- Title (old, 57): Current Rebates & Offers | Capital Upfitters Rockville MD
- Title (new, 45): Rebate Deals Rockville MD | Capital Upfitters
- Meta (old, 169): Active manufacturer rebates and limited-time offers on bedliners, tonneau covers, hitches, ceramic coating, and more. Capital Upfitters, Rockville MD. Updated regularly.
- Meta (new, 169): Active manufacturer rebates and limited-time offers on bedliners, tonneau covers, hitches, ceramic coating, and more. Capital Upfitters, Rockville MD. Updated regularly. _(unchanged)_
- H1 (old): CURRENT REBATES & OFFERS.
- H1 (new): CURRENT REBATES & OFFERS. _(unchanged)_
- CTAs (old): Get a Free Quote
- CTAs (new): Get a Quote
- Rationale: Title includes a rebate keyword and the city, fits length limits, and follows the required pattern. Meta description mentions the service, location, the family-owned proof point, and ends with a clear call to action within the 140-158 character range. H1 matches the required uppercase segment. CTA is concise, action-oriented, and points to the quote page.
- Flags: meta kept original (editorial review): "Offers apply at install" is not in the facts or page text
- Rejected model meta: "Get current rebate deals on bedliners and coatings in Rockville, MD. Family-owned since 2015. Offers apply at install. Call (301) 304-1419 now."
- Pass 2: regenerated after review - meta claimed "we apply offers at service", not in facts or page text (pass-1 output kept in results JSON)

### `start-here.html`

- Intent: service finder - pick the right upfit / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 118.8s
- Title (old, 46): Start Here — Capital Upfitters | Rockville, MD
- Title (new, 46): Start Here — Capital Upfitters | Rockville, MD _(unchanged)_
- Meta (old, 150): Tell us what brings you in — personal vehicle, fleet, or dealer account. Capital Upfitters in Rockville, MD points you to the right service path fast.
- Meta (new, 150): Tell us what brings you in — personal vehicle, fleet, or dealer account. Capital Upfitters in Rockville, MD points you to the right service path fast. _(unchanged)_
- H1 (old): WHAT BRINGS YOU IN?
- H1 (new): WHAT BRINGS YOU IN? _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: Title meets length and pattern requirements, includes a service word and location. Meta description uses sentence case, two short sentences, includes the single required proof point and ends with a clear call to action. H1 segment is returned exactly as specified.
- Flags: no hero primary CTA on page - nothing to rewrite; title kept original (editorial review): awkward ("Start Here Service Rockville MD"); meta kept original (editorial review): awkward ("Start-here service for trucks")
- Rejected model title: "Start Here Service Rockville MD | Capital Upfitters"
- Rejected model meta: "Start-here service for trucks and vans in Rockville, MD. Same-week availability on most services. Request installed pricing today. Call (301) 304-1419."
- Pass 2: regenerated after review - H1 lost its question mark ("WHAT BRINGS YOU IN.") (pass-1 output kept in results JSON)

### `terms.html`

- Intent: general / Rockville, MD (serving the DMV) - model: n/a, -s
- Title (old, 49): Terms of Service | Capital Upfitters Rockville MD
- Title (new, 49): Terms of Service | Capital Upfitters Rockville MD _(unchanged)_
- Meta (old, 130): Terms of service for capitalupfitters.com — website use, quote requests, estimates, work authorization, warranties, and liability.
- Meta (new, 130): Terms of service for capitalupfitters.com — website use, quote requests, estimates, work authorization, warranties, and liability. _(unchanged)_
- H1 (old): Terms of Service
- H1 (new): Terms of Service _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: -
- Flags: skipped by design: legal page (privacy/terms) - no service/city intent, copy left untouched

### `services/bedliner.html`

- Intent: Patriot Liner spray-on bedliner / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 53.3s
- Title (old, 53): Spray-On Bedliner Rockville MD | Patriot Liner Dealer
- Title (new, 55): Patriot Liner Bedliner Rockville MD | Capital Upfitters
- Meta (old, 119): Patriot Liner spray-on bedliners in Rockville MD — trucks, trailers, marine, floors, steps and more. Lifetime warranty.
- Meta (new, 151): Patriot Liner spray-on bedliners installed in Rockville, MD by the corridor's only authorized dealer. Same-week service available. Call (301) 304-1419.
- H1 (old): THE LAST BEDLINER / YOUR TRUCK WILL EVER NEED.
- H1 (new): THE LAST BEDLINER / YOUR TRUCK WILL EVER NEED. _(unchanged)_
- CTAs (old): Get a Free Quote
- CTAs (new): Request Installed Pricing
- Rationale: The title follows the required pattern, includes the service term 'Bedliner' and the location 'Rockville MD', and stays within 40-60 characters. The meta description meets the 140-158 character limit, uses sentence case, presents two concise sentences plus a call to action, and features the single proof point about being the only authorized Patriot Liner dealer in the corridor. The H1 segments are kept exactly as provided, preserving the site's uppercase punchy style. The CTA is changed to the preferred action-led label 'Request Installed Pricing' to align with brand guidelines.
- Flags: none

### `services/camper-shells.html`

- Intent: truck camper shells & caps / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 58.5s
- Title (old, 78): Truck Camper Shells & Caps Rockville MD | Ranch Fiberglass | Capital Upfitters
- Title (new, 46): Camper Shells Rockville MD | Capital Upfitters
- Meta (old, 152): Ranch fiberglass truck caps and camper shells in Rockville MD. 7 models from Echo to XD. Installed same week. Serving Rockville, Bethesda, Gaithersburg.
- Meta (new, 155): Rugged fiberglass camper shells installed in Rockville, MD with same-week availability. Lockable, weatherproof, factory-color matched. Call (301) 304-1419.
- H1 (old): TRUCK CAMPER SHELLS & CAPS.
- H1 (new): TRUCK CAMPER SHELLS & CAPS. _(unchanged)_
- CTAs (old): Get a Quote
- CTAs (new): Get a Quote _(unchanged)_
- Rationale: The title fits the 40-60 character limit, includes a primary service term (Camper Shells) and the target location (Rockville MD), and follows the required brand pattern. The meta description uses sentence case, stays within 140-158 characters, mentions the service, location, the proof point of same-week availability, and ends with a clear call to action. The existing H1 segment is retained unchanged as required. The CTA keeps the preferred verb-lead label "Get a Quote" which aligns with the hero button and brand voice.
- Flags: none

### `services/ceramic-coating.html`

- Intent: ceramic coating (IGL, System X) / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 45.0s
- Title (old, 55): Ceramic Coating Rockville MD | IGL & System X Certified
- Title (new, 48): Ceramic Coating Rockville MD | Capital Upfitters
- Meta (old, 143): IGL Coatings and System X certified ceramic coating installer in Rockville, MD. Professional hydrophobic paint protection. Call (301) 304-1419.
- Meta (new, 151): Professional ceramic coating in Rockville, MD by IGL and System X certified installers. Rugged, hydrophobic protection that lasts. Call (301) 304-1419.
- H1 (old): CERAMIC COATING THAT / ACTUALLY LASTS.
- H1 (new): CERAMIC COATING THAT / ACTUALLY LASTS. _(unchanged)_
- CTAs (old): Get a Free Quote
- CTAs (new): Get a Quote
- Rationale: The title follows the required pattern, fits the 40-60 character limit, and includes the service and location with the brand at the end. The meta description meets the 140-158 character range, uses sentence case, mentions ceramic coating, Rockville MD, the IGL and System X certification proof point, and ends with a clear call to action. The H1 segments are returned exactly as specified. The CTA is concise, action-oriented, and aligns with the preferred primary label.
- Flags: none

### `services/commercial-wraps.html`

- Intent: commercial vehicle & fleet wraps / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 37.5s
- Title (old, 54): Commercial Vehicle Wraps Rockville MD | Fleet Branding
- Title (new, 57): Commercial Vehicle Wraps Rockville MD | Capital Upfitters
- Meta (old, 151): Commercial vehicle wraps and fleet branding in Rockville, MD. Full wraps, partial wraps, vinyl lettering for retail, fleet, and government. 3M & Avery.
- Meta (new, 150): Commercial vehicle wraps installed in Rockville, MD for fleets and businesses. Get fleet volume pricing for 3+ units. Request installed pricing today.
- H1 (old): TURN YOUR VEHICLES INTO / MOVING BILLBOARDS.
- H1 (new): TURN YOUR VEHICLES INTO / MOVING BILLBOARDS. _(unchanged)_
- CTAs (old): Get a Free Quote
- CTAs (new): Request Installed Pricing
- Rationale: The title follows the required pattern, includes the service term "wraps" and the location "Rockville MD", and stays within the 40-60 character limit. The meta description meets the 140-158 character range, uses sentence case, highlights the single proof point of fleet volume pricing for 3+ units, and ends with a clear call to action. The H1 segments are returned exactly as specified. The CTA is concise, action-oriented, and fits the preferred phrasing without using the word "free".
- Flags: none

### `services/exterior.html`

- Intent: exterior truck accessories & armor / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 84.1s
- Title (old, 94): Exterior Accessories | Fender Flares, Bumpers & Grille Guards | Capital Upfitters Rockville MD
- Title (new, 47): Exterior Armor Rockville MD | Capital Upfitters
- Meta (old, 119): Exterior truck accessories installed in Rockville MD — fender flares, mud flaps, grille guards, bumpers, and bull bars.
- Meta (new, 152): Exterior accessories in Rockville, MD with same-week service. Fender flares, mud flaps, guards and bumpers shield your truck. Request installed pricing.
- H1 (old): EXTERIOR ACCESSORIES / & ARMOR.
- H1 (new): EXTERIOR ACCESSORIES / & ARMOR. _(unchanged)_
- CTAs (old): Get a Quote
- CTAs (new): Get a Quote _(unchanged)_
- Rationale: The title fits the 40-60 character limit, includes a clear service term (Exterior Armor) and the target location (Rockville MD), and follows the required brand pattern. The meta description meets the 140-158 character range, uses sentence case, mentions the service and location, highlights the single proof point of same-week availability, and ends with a direct call to action. H1 segments are kept exactly as provided, preserving the site's uppercase, punchy style. The CTA retains the preferred "Get a Quote" label, matching the hero button and brand voice.
- Flags: none

### `services/hitches.html`

- Intent: hitch installation / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 152.0s
- Title (old, 94): Hitch Installation | 5th Wheel, Gooseneck & Brake Controllers | Capital Upfitters Rockville MD
- Title (new, 51): Hitch Installation Rockville MD | Capital Upfitters
- Meta (old, 158): Hitch installation in Rockville MD — Class I through V, Stealth Hitch, 5th wheel, gooseneck, brake controllers, and weight distribution systems. All vehicles.
- Meta (new, 157): Professional hitch installation in Rockville MD with same-week availability. Our technicians torque to spec for safe towing. Request installed pricing today.
- H1 (old): HITCH INSTALLATION / DONE RIGHT. DONE FAST.
- H1 (new): HITCH INSTALLATION / DONE RIGHT. DONE FAST. _(unchanged)_
- CTAs (old): Get a Free Quote
- CTAs (new): Get a Quote
- Rationale: The title follows the required pattern, includes the service and location, and fits the character limit. The meta description uses sentence case, two short sentences, includes the proof point of same-week availability, and ends with a clear call to action while staying within the 140-158 character range. The H1 segments match the given uppercase style and length constraints. The CTA is concise, action-oriented, and replaces the prohibited "Free" wording.
- Flags: none

### `services/index.html`

- Intent: all upfitting services / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 61.2s
- Title (old, 49): Vehicle Services | Capital Upfitters Rockville MD
- Title (new, 60): Full Vehicle Upfit Services Rockville MD | Capital Upfitters
- Meta (old, 158): A full range of installed vehicle upfitting solutions in Rockville, MD — bedliners, hitches, ceramic coating, undercoating, tonneau covers and running boards.
- Meta (new, 153): Full vehicle upfit services installed in Rockville, MD with a 4.9-star rating from 110 Google reviews. Same-week availability. Request installed pricing.
- H1 (old): EVERY SERVICE YOUR VEHICLE NEEDS.
- H1 (new): EVERY SERVICE YOUR VEHICLE NEEDS. _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: The title fits the 40-60 character limit, includes a service term (Upfit) and the target location (Rockville MD), and follows the required brand placement. The meta description meets the 140-158 character range, uses sentence case, mentions the service and location, adds the mandated proof point (4.9-star rating from 110 Google reviews), and ends with a clear call to action. The H1 is kept exactly as provided, and no hero CTAs are added per the brief.
- Flags: no hero primary CTA on page - nothing to rewrite

### `services/industrial-coatings.html`

- Intent: industrial & protective coatings, mobile application / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 43.8s
- Title (old, 86): Industrial & Protective Coatings Rockville MD | Mobile Application | Capital Upfitters
- Title (new, 52): Industrial Coatings Rockville MD | Capital Upfitters
- Meta (old, 155): Professional industrial coating solutions in the DMV — polyurea, epoxy, and protective coatings for commercial vehicles, government fleets, equipment, and.
- Meta (new, 158): Industrial coating experts serve Rockville, MD and the DMV with mobile application to your site. Same-week service and rugged protection. Call (301) 304-1419.
- H1 (old): INDUSTRIAL & PROTECTIVE / COATING SOLUTIONS.
- H1 (new): INDUSTRIAL & PROTECTIVE / COATING SOLUTIONS. _(unchanged)_
- CTAs (old): Get a Quote
- CTAs (new): Get a Quote _(unchanged)_
- Rationale: Title includes the service and location within length limits. Meta uses the required mobile application proof point, stays within character count, and ends with a clear call to action. H1 follows the existing two-segment uppercase format, and the CTA matches the preferred label.
- Flags: none

### `services/lighting.html`

- Intent: LED light bars & work lights / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 40.4s
- Title (old, 87): LED Light Bars & Work Lights Rockville MD | RIGID Industries, Putco | Capital Upfitters
- Title (new, 47): LED Light Bars Rockville MD | Capital Upfitters
- Meta (old, 169): LED light bars, work lights, and off-road lighting installed in Rockville MD. RIGID Industries, Putco, and more. Fleet and commercial lighting packages. Serving the DMV.
- Meta (new, 153): LED light bars and work lights installed in Rockville, MD with same-week availability. Family-owned shop serving the DMV since 2015. Call (301) 304-1419.
- H1 (old): LED LIGHT BARS & WORK LIGHTS.
- H1 (new): LED LIGHT BARS & WORK LIGHTS. _(unchanged)_
- CTAs (old): Get a Quote
- CTAs (new): Get a Quote _(unchanged)_
- Rationale: The title fits the 40-60 character limit, includes the service keyword (LED) and location (Rockville MD), and follows the required pattern with the brand at the end. The meta description meets the 140-158 character range, uses sentence case, highlights the key proof point of same-week availability, mentions the family-owned nature for credibility, and ends with a clear call to action. The H1 is kept exactly as provided, and the CTA retains the preferred "Get a Quote" label.
- Flags: none

### `services/mobile-detailing.html`

- Intent: mobile vehicle detailing / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 52.6s
- Title (old, 86): Mobile Vehicle Detailing | Fleet, Retail & Government | Capital Upfitters Rockville MD
- Title (new, 57): Mobile Vehicle Detailing Rockville MD | Capital Upfitters
- Meta (old, 137): Professional mobile vehicle detailing in Rockville MD — we come to you. Interior and exterior packages for retail, fleet, and government.
- Meta (new, 146): Mobile vehicle detailing comes to you in Rockville, MD. We serve fleet accounts with Net-30 terms and same-week availability. Call (301) 304-1419.
- H1 (old): MOBILE VEHICLE DETAILING.
- H1 (new): MOBILE VEHICLE DETAILING. _(unchanged)_
- CTAs (old): Book a Detail
- CTAs (new): Get a Quote
- Rationale: The title meets the 40-60 character limit, includes the service keyword "detail" and the location "Rockville MD", and follows the required brand format. The meta description is 146 characters, uses sentence case, contains two concise sentences plus a CTA, and features the single proof point "fleet accounts with Net-30 terms". The H1 retains the exact required segment. The CTA is changed to the preferred "Get a Quote" wording, keeping it short, action-oriented, and within the 2-4 word limit.
- Flags: none

### `services/running-boards.html`

- Intent: running boards & power steps / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 73.2s
- Title (old, 74): Running Boards & Steps | Powered & Manual | Capital Upfitters Rockville MD
- Title (new, 55): Running Boards & Steps Rockville MD | Capital Upfitters
- Meta (old, 156): Running boards, nerf bars, and AMP Research PowerStep electric running boards installed in Rockville MD. Manual and powered options for all trucks and SUVs.
- Meta (new, 153): Running boards and steps installed in Rockville, MD with same-week availability. Family-owned shop serving the DMV since 2015. Request installed pricing.
- H1 (old): RUNNING BOARDS & STEPS / FOR TRUCKS AND SUVS.
- H1 (new): RUNNING BOARDS & STEPS / FOR TRUCKS AND SUVS. _(unchanged)_
- CTAs (old): Get a Free Quote
- CTAs (new): Get a Quote
- Rationale: The title fits the 40-60 character limit, includes the service phrase and location, and follows the required pattern. The meta description uses the most relevant proof point (same-week availability), mentions the service and Rockville MD, stays within 140-158 characters, and ends with a clear call to action. The H1 retains the prescribed two-segment uppercase format. The CTA label follows the preferred phrasing and length guidelines.
- Flags: none

### `services/stealth-hitches.html`

- Intent: stealth (hidden) hitches for luxury, EV & PHEV / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 83.3s
- Title (old, 82): Stealth Hitch Installation — Luxury & EV Vehicles | Capital Upfitters Rockville MD
- Title (new, 46): Stealth Hitch Rockville MD | Capital Upfitters
- Meta (old, 118): Authorized Stealth Hitch installer for BMW, Audi, Mercedes, Tesla, Volvo, Porsche, Land Rover and 60+ luxury vehicles.
- Meta (new, 149): Stealth hitch installed in Rockville, MD with same-week availability. Rugged, hidden design preserves your warranty. Request installed pricing today.
- H1 (old): Stealth Hitch / Installation.
- H1 (new): STEALTH HITCH / INSTALLATION.
- CTAs (old): Get a Free Quote
- CTAs (new): Get a Quote
- Rationale: The title meets length limits, includes the service keyword and location, and follows the required pattern. The meta description is 149 characters, uses sentence case, highlights the stealth hitch service, Rockville location, the proof point of same-week availability, and ends with a clear call to action. H1 segments are uppercase, two-part as specified, with the second segment ending in a period. The CTA follows the preferred phrasing and length.
- Flags: none

### `services/suspension.html`

- Intent: lift kits & leveling kits / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 75.2s
- Title (old, 85): Lift Kits & Leveling Kits Rockville MD | ReadyLIFT, Rough Country | Capital Upfitters
- Title (new, 53): Lift & Leveling Kits Rockville MD | Capital Upfitters
- Meta (old, 158): Lift kits and leveling kits installed in Rockville MD. ReadyLIFT, Rough Country, and more. Trucks and SUVs. Serving Rockville, Bethesda, Gaithersburg, Silver.
- Meta (new, 156): Lift and leveling kits installed in Rockville, MD with same-week availability. Raise stance, fit larger tires. Family-owned since 2015. Call (301) 304-1419.
- H1 (old): LIFT KITS & / LEVELING KITS.
- H1 (new): LIFT KITS & / LEVELING KITS. _(unchanged)_
- CTAs (old): Get a Quote
- CTAs (new): Get a Quote _(unchanged)_
- Rationale: The title fits the required 40-60 character range, includes a service keyword (Lift & Leveling Kits) and the location (Rockville MD), and follows the brand pattern. The meta description is 156 characters, uses sentence case, contains two concise sentences plus a call to action, and highlights the most relevant proof point – same-week availability – while also noting the family-owned heritage. The H1 segments match the existing two-part uppercase style, and the CTA retains the preferred "Get a Quote" label.
- Flags: none

### `services/tonneau.html`

- Intent: tonneau covers / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 84.2s
- Title (old, 50): Tonneau Covers Rockville MD | 150+ Brands In Stock
- Title (new, 47): Tonneau Covers Rockville MD | Capital Upfitters
- Meta (old, 151): Folding, roll-up, retractable, and hard panel tonneau covers in Rockville, MD. 150+ brands installed with a factory fit and no drilling on most trucks.
- Meta (new, 157): Tonneau covers installed in Rockville, MD with same-week availability. Rugged fit, zero drilling, and factory-style install. Request installed pricing today.
- H1 (old): TONNEAU COVERS FOR / EVERY TRUCK AND BUDGET.
- H1 (new): TONNEAU COVERS FOR / EVERY TRUCK AND BUDGET. _(unchanged)_
- CTAs (old): Get a Free Quote
- CTAs (new): Get a Quote
- Rationale: The title follows the required pattern, includes the service and location, places the brand at the end, and meets the 40-60 character limit. The meta description uses sentence case, mentions the service and Rockville MD, features the single proof point "same-week availability," adds relevant product details from the excerpt, and ends with a clear call to action, staying within 140-158 characters. The H1 segments are kept exactly as provided, preserving the site's uppercase style and accent highlight. The CTA label is changed to the preferred "Get a Quote" wording, matching the destination URL for tonneau cover quotes.
- Flags: none
- Pass 2: regenerated after review - title came back lowercase ("tonneau covers ...") (pass-1 output kept in results JSON)

### `services/toolboxes.html`

- Intent: truck toolboxes & bed storage / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 44.4s
- Title (old, 91): Truck Toolboxes & Bed Storage | CamLocker, DECKED, Dee Zee | Capital Upfitters Rockville MD
- Title (new, 48): Truck Toolboxes Rockville MD | Capital Upfitters
- Meta (old, 151): Truck toolboxes and bed storage systems installed in Rockville MD. CamLocker, Dee Zee, DECKED drawer systems, and UWS crossover boxes. Serving the DMV.
- Meta (new, 155): Truck toolboxes installed in Rockville, MD by a family-owned shop serving the DMV since 2015. Same-week service available. Request installed pricing today.
- H1 (old): TOOLBOXES & BED STORAGE / SYSTEMS.
- H1 (new): TOOLBOXES & BED STORAGE / SYSTEMS. _(unchanged)_
- CTAs (old): Get a Quote
- CTAs (new): Get a Quote _(unchanged)_
- Rationale: The title fits the 40-60 character limit, includes the service term (toolboxes) and location (Rockville MD), and ends with the brand name once as required. The meta description meets the 140-158 character range, uses sentence case, provides two concise sentences, highlights the family-owned since 2015 fact as the single proof point, mentions same-week service, and ends with a clear call to action. The H1 retains the prescribed two-segment uppercase format, and the CTA uses the preferred verb-lead label.
- Flags: none

### `services/undercoating.html`

- Intent: rust-proof undercoating / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 124.9s
- Title (old, 52): Undercoating Rockville MD | Rust Protection Maryland
- Title (new, 45): Undercoating Rockville MD | Capital Upfitters
- Meta (old, 150): Stop Maryland road salt damage with professional undercoating in Rockville, MD. Rubberized and oil-based rust protection, plus used-vehicle rust prep.
- Meta (new, 153): Rugged undercoating protects your Rockville, MD vehicle from DMV road-salt corrosion. Same-week availability on most services. Request installed pricing.
- H1 (old): STOP RUST / BEFORE IT STARTS.
- H1 (new): STOP RUST / BEFORE IT STARTS. _(unchanged)_
- CTAs (old): Get a Free Quote
- CTAs (new): Get a Quote
- Rationale: The title meets the 40-60 character limit, includes the service word (undercoating) and location (Rockville MD), and follows the required brand pattern. The meta description is 153 characters, uses sentence case, mentions the service, location, the DMV, and the single proof point "Same-week availability on most services." It ends with a clear call to action. The H1 segments are returned exactly as specified. The CTA follows the preferred "Get a Quote" wording, fitting the hero button constraints.
- Flags: none

### `services/window-tinting.html`

- Intent: window tinting / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 76.5s
- Title (old, 73): Window Tinting Rockville MD | Ceramic & Standard Tint | Capital Upfitters
- Title (new, 47): Window Tinting Rockville MD | Capital Upfitters
- Meta (old, 124): Professional window tinting in Rockville MD — standard dyed, carbon, and ceramic tint films. Maryland legal VLT percentages.
- Meta (new, 151): Window tinting in Rockville, MD with same-week availability. Ceramic, carbon or dyed film cuts heat and blocks UV for any vehicle. Call (301) 304-1419.
- H1 (old): WINDOW TINTING / DONE RIGHT.
- H1 (new): WINDOW TINTING / DONE RIGHT. _(unchanged)_
- CTAs (old): Get a Quote
- CTAs (new): Get a Quote _(unchanged)_
- Rationale: The title fits the 40-60 character limit, includes the service (tinting) and location (Rockville MD), and follows the required pattern. The meta description uses sentence case, three concise sentences, highlights the key proof point (same-week availability), mentions the service and location, and ends with a direct call to action. H1 retains the prescribed two-segment, all-caps format. The CTA uses the preferred primary label.
- Flags: none

### `locations/bethesda-md.html`

- Intent: vehicle upfitting (local landing page) / Bethesda, MD - model: gpt-oss:120b, 60.0s
- Title (old, 54): Vehicle Upfitting Near Bethesda MD | Capital Upfitters
- Title (new, 47): Truck Upfitting Bethesda MD | Capital Upfitters
- Meta (old, 145): Serving Bethesda, MD from our Rockville shop — 15 minutes away. Bedliners, hitches, ceramic coating, undercoating, and more. Call (301) 304-1419.
- Meta (new, 152): Truck upfitting for Bethesda, MD from the corridor's only authorized Patriot Liner dealer. Lifetime warranty and same-week service. Call (301) 304-1419.
- H1 (old): VEHICLE UPFITTING / FOR BETHESDA, MD.
- H1 (new): VEHICLE UPFITTING / FOR BETHESDA, MD. _(unchanged)_
- CTAs (old): Get a Quote
- CTAs (new): Get a Quote _(unchanged)_
- Rationale: The title follows the required pattern, includes a service term and the Bethesda location, and stays within the 40-60 character limit. The meta description meets the 140-158 character range, uses sentence case, mentions the service, location, the mandated proof point about being the only authorized Patriot Liner dealer, adds a rugged benefit, and ends with a clear call to action. The H1 retains the two-segment uppercase format with the period, and the CTA uses the preferred verb-lead label.
- Flags: none

### `locations/gaithersburg-md.html`

- Intent: vehicle upfitting (local landing page) / Gaithersburg, MD - model: gpt-oss:120b, 50.7s
- Title (old, 58): Vehicle Upfitting Near Gaithersburg MD | Capital Upfitters
- Title (new, 51): Truck Upfitting Gaithersburg MD | Capital Upfitters
- Meta (old, 135): Serving Gaithersburg and Montgomery County from our Rockville shop — under 10 minutes. Fleet and retail upfitting. Call (301) 304-1419.
- Meta (new, 155): Truck upfitting for Gaithersburg, MD delivered from our Rockville shop. Rated 4.9 stars on Google from 110 reviews. Same-week service. Call (301) 304-1419.
- H1 (old): VEHICLE UPFITTING / FOR GAITHERSBURG, MD.
- H1 (new): VEHICLE UPFITTING / FOR GAITHERSBURG, MD. _(unchanged)_
- CTAs (old): Get a Quote
- CTAs (new): Get a Quote _(unchanged)_
- Rationale: Title adds the specific service and city while staying within length limits and avoiding duplicate titles. Meta includes the service, location, the required 4.9-star proof point, a rugged tone, and a clear call to action within the character range. H1 and CTA follow the existing site conventions.
- Flags: none

### `locations/rockville-md.html`

- Intent: vehicle upfitting (local landing page) / Rockville, MD - model: gpt-oss:120b, 40.7s
- Title (old, 53): Vehicle Upfitting in Rockville MD | Capital Upfitters
- Title (new, 56): Vehicle Upfit Solutions Rockville MD | Capital Upfitters
- Meta (old, 159): Capital Upfitters is Rockville's neighborhood upfitter at 12019 Nebel Street — spray-on bedliners, hitches, ceramic coating and fleet upfitting by appointment.
- Meta (new, 144): Rugged vehicle upfitting in Rockville, MD at 12019 Nebel St, family-owned since 2015. Same-week service on most jobs. Request installed pricing.
- H1 (old): VEHICLE UPFITTING / IN ROCKVILLE, MD.
- H1 (new): VEHICLE UPFITTING / IN ROCKVILLE, MD. _(unchanged)_
- CTAs (old): Get a Quote
- CTAs (new): Get a Quote _(unchanged)_
- Rationale: The title adds a fresh service phrase while staying within length limits and avoids existing titles; the meta uses the required proof point, concise rugged copy, and a clear CTA within the character range.
- Flags: none

### `locations/silver-spring-md.html`

- Intent: vehicle upfitting (local landing page) / Silver Spring, MD - model: gpt-oss:120b, 48.5s
- Title (old, 59): Vehicle Upfitting Near Silver Spring MD | Capital Upfitters
- Title (new, 54): Vehicle Upfitting Silver Spring MD | Capital Upfitters
- Meta (old, 132): Serving Silver Spring, MD from our Rockville shop — 20 min via I-495 or Georgia Ave. All upfitting services, same-week availability.
- Meta (new, 142): Vehicle upfitting for Silver Spring, MD delivered from our Rockville shop. Same-week availability on most services. Call (301) 304-1419 today.
- H1 (old): VEHICLE UPFITTING / FOR SILVER SPRING, MD.
- H1 (new): VEHICLE UPFITTING / FOR SILVER SPRING, MD. _(unchanged)_
- CTAs (old): Get a Quote
- CTAs (new): Get a Quote _(unchanged)_
- Rationale: Title follows the required pattern, includes a service term and the city, and fits the character limit. Meta description meets length, uses sentence case, mentions the service, location, the proof point of same-week availability, and ends with a clear call to action. H1 segments match the specified format, and the CTA uses the preferred label.
- Flags: none

### `blog/best-tonneau-covers-maryland.html`

- Intent: blog: tonneau covers for Maryland weather / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 185.1s
- Title (old, 73): Best Tonneau Covers for Maryland Weather (2026 Guide) | Capital Upfitters
- Title (new, 60): Best Tonneau Covers for Maryland Weather | Capital Upfitters
- Meta (old, 159): Hot summers, heavy rain, freezing winters, road salt. We carry 7 brands and these are the ones that hold up best in Maryland's climate — and the ones to avoid.
- Meta (new, 155): Rugged tonneau covers installed in Rockville, MD stand up to Maryland's heat, rain and road-salt. Same-week availability on most services. Request pricing.
- H1 (old): BEST TONNEAU COVERS FOR MARYLAND WEATHER.
- H1 (new): BEST TONNEAU COVERS FOR MARYLAND WEATHER. _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: The title stays within the 40-60 character limit, includes the service word "tonneau" and the location "Maryland", and retains the guide angle. The meta description meets the 140-158 character requirement, uses sentence case, presents two concise sentences plus a call to action, and highlights the proof point "Same-week availability on most services" from the provided facts. The H1 matches the required uppercase, single-segment format, and no hero CTAs are needed.
- Flags: no hero primary CTA on page - nothing to rewrite
- Pass 2: regenerated after review - pass 1 title duplicated the service page and meta was 159 chars (pass-1 output kept in results JSON)

### `blog/index.html`

- Intent: blog: truck upfitting guides / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 199.3s
- Title (old, 69): Truck Upfitting Tips & Guides | Capital Upfitters Blog | Rockville MD
- Title (new, 69): Truck Upfitting Tips & Guides | Capital Upfitters Blog | Rockville MD _(unchanged)_
- Meta (old, 169): Expert truck upfitting guides from Capital Upfitters — Rockville MD's trusted shop since 2015. Bedliners, undercoating, lift kits, van shelving, and DMV-specific advice.
- Meta (new, 169): Expert truck upfitting guides from Capital Upfitters — Rockville MD's trusted shop since 2015. Bedliners, undercoating, lift kits, van shelving, and DMV-specific advice. _(unchanged)_
- H1 (old): THE UPFITTER'S BLOG.
- H1 (new): THE UPFITTER'S BLOG. _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: The title follows the required pattern, includes a clear article angle (When to...), the service word 'Truck', the location 'Maryland', and places 'Capital Upfitters' last within the 40-60 character limit. The meta description meets the 140-158 character range, uses sentence case, provides two short sentences, includes the proof point of our 4.9-star Google rating with 110 reviews, and ends with a direct call to action. The H1 matches the existing segment exactly, and no hero CTAs are needed.
- Flags: title kept original: blog title lost the article angle (tips/blog) - keep it so it does not cannibalize the service page; no hero primary CTA on page - nothing to rewrite; meta kept original (editorial review): describes the undercoating article, not the blog index
- Rejected model meta: "Learn when to undercoat your truck in Maryland from Rockville's trusted upfitter. Rated 4.9 stars on Google with 110 reviews. Call (301) 304-1419."
- Pass 2: regenerated after review - re-run with blog rule for consistency (pass-1 output kept in results JSON)

### `blog/leveling-vs-lift-kit.html`

- Intent: blog: leveling kit vs lift kit / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 109.9s
- Title (old, 81): Leveling Kit vs. Lift Kit: Which One Is Right for Your Truck? | Capital Upfitters
- Title (new, 57): Leveling vs Lift Kits in Rockville MD | Capital Upfitters
- Meta (old, 146): Leveling kit or full lift? Here's the real difference for your truck — tire size, use case, alignment requirements, and Maryland inspection notes.
- Meta (new, 146): Leveling kit or full lift? Here's the real difference for your truck — tire size, use case, alignment requirements, and Maryland inspection notes. _(unchanged)_
- H1 (old): LEVELING KIT VS. LIFT KIT.
- H1 (new): LEVELING KIT VS. LIFT KIT. _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: The title clearly states the comparison topic and location, the meta adds a concise service overview, a single proof point, and a direct CTA.
- Flags: no hero primary CTA on page - nothing to rewrite; meta kept original (editorial review): repeats "family-owned" twice
- Rejected model meta: "Leveling vs lift kits for trucks in Rockville, MD. Same-week availability from a family-owned shop, family-owned since 2015—request installed pricing today."
- Pass 2: regenerated after review - title dropped the article angle and cannibalized services/suspension (pass-1 output kept in results JSON)

### `blog/patriot-liner-vs-drop-in.html`

- Intent: blog: spray-on vs drop-in bedliner / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 141.9s
- Title (old, 75): Patriot Liner vs. Drop-In Bedliner: The Real Difference | Capital Upfitters
- Title (new, 75): Patriot Liner vs. Drop-In Bedliner: The Real Difference | Capital Upfitters _(unchanged)_
- Meta (old, 149): Drop-ins trap salt and crack. Here's what actually happens to your truck bed over 5 Maryland winters — and why spray application temperature matters.
- Meta (new, 157): Spray-on bedliners installed in Rockville, MD by an authorized Patriot Liner dealer. Rugged protection for Maryland winters. Request installed pricing today.
- H1 (old): SPRAY-ON VS. DROP-IN BEDLINER.
- H1 (new): SPRAY-ON VS. DROP-IN BEDLINER. _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: Title fits length and pattern, meta meets character limits, includes one proof point, and H1 matches required markup.
- Flags: no hero primary CTA on page - nothing to rewrite; title kept original (editorial review): hyphens dropped ("SprayOn vs. DropIn")
- Rejected model title: "SprayOn vs. DropIn Bedliner Rockville MD | Capital Upfitters"
- Pass 2: regenerated after review - title dropped the article angle and cannibalized services/bedliner (pass-1 output kept in results JSON)

### `blog/undercoating-maryland-winter.html`

- Intent: blog: when to undercoat in Maryland / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 101.7s
- Title (old, 83): When to Undercoat Your Truck in Maryland (Before It's Too Late) | Capital Upfitters
- Title (new, 53): When to Undercoat in Rockville MD | Capital Upfitters
- Meta (old, 137): Maryland roads get 200,000+ tons of road salt per winter. Here's the right window to undercoat your truck — and what happens if you wait.
- Meta (new, 137): Maryland roads get 200,000+ tons of road salt per winter. Here's the right window to undercoat your truck — and what happens if you wait. _(unchanged)_
- H1 (old): WHEN TO UNDERCOAT YOUR TRUCK IN MARYLAND.
- H1 (new): WHEN TO UNDERCOAT YOUR TRUCK IN MARYLAND. _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: The title fits the 40-60 character limit, includes the service word (undercoat) and the location (Rockville MD), and reads like a blog guide. The meta description stays within 140-158 characters, uses sentence case, highlights the undercoating service for Maryland road-salt corrosion, features the most relevant proof point (same-week service), and ends with a clear call to action. The H1 matches the required uppercase format, and no hero CTAs are needed.
- Flags: no hero primary CTA on page - nothing to rewrite; meta kept original (editorial review): ends "Request installed pricing now today."
- Rejected model meta: "Undercoat your truck to stop Maryland road-salt rust. Same-week service from Rockville's trusted upfitter. Request installed pricing now today."
- Pass 2: regenerated after review - title dropped the article angle; CTA was not the last sentence (pass-1 output kept in results JSON)

### `blog/weatherguard-vs-kargomaster.html`

- Intent: blog: WeatherGuard vs KargoMaster / Rockville, MD (serving the DMV) - model: gpt-oss:120b, 60.2s
- Title (old, 85): Weatherguard vs. Kargomaster: Which Van Shelving System Is Right? | Capital Upfitters
- Title (new, 57): Weatherguard vs Kargomaster Rockville | Capital Upfitters
- Meta (old, 146): Steel vs. aluminum van shelving — both are industry standards, but the right choice depends on your trade, vehicle, and how often you reconfigure.
- Meta (new, 148): Weatherguard and Kargomaster van shelving options compared for Rockville, MD trades. Same-week availability on most services. Request pricing today.
- H1 (old): WEATHERGUARD VS. KARGOMASTER.
- H1 (new): WEATHERGUARD VS. KARGOMASTER. _(unchanged)_
- CTAs (old): (none in hero)
- CTAs (new): (none in hero) _(unchanged)_
- Rationale: The title clearly states the comparison and location, the meta adds a key proof point and a direct call to action, and the H1 follows the site's punchy uppercase style.
- Flags: no hero primary CTA on page - nothing to rewrite
- Pass 2: regenerated after review - re-run with blog-angle rule for consistency (pass-1 output kept in results JSON)

