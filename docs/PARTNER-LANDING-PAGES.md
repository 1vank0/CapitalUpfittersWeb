# Partner and product landing paths

Implemented November 3, 2026. Preview-only changes; no manufacturer listing or production publication performed.

## Pages

- `/services/stealth-hitches.html`: preserved indexed URL and sections; vehicle-first parts + labor package quote directly below the hero. Rack-only versus towing intent is retained. Corrected universal warranty, no-trimming, inventory, timing and vehicle-certification assertions.
- `/services/ecohitch.html`: preserved indexed URL, comparisons and price-feed hooks; added Torklift referral context, exact-vehicle quote and distinction between EcoHitch Stealth and the Stealth Hitches brand.
- `/services/bakflip.html`: preserved MX4 page; added BAK Preferred Dealer context, truck/bed/parts details and product-aware quote.
- `/services/retrax.html`: preserved comparison page; added Retrax Preferred Dealer context and manual/powered/rack configuration intent.
- `/services/amp-research.html`: new AMP Research landing page, linked from running boards.
- `/services/etrailer-installation.html`: new installation inquiry page, linked from hitches. Customer-supplied parts remain subject to shop acceptance.

All pages retain the shared site header/footer. The two new pages are in the sitemap. Existing canonical routes remain intact.

## Lead handoff

Forms use a same-site GET to the existing `quote.html`, not a new submission endpoint. They collect year, make, model/trim, desired product, parts ownership, intended use and optional part/fitment details. `quote-deeplink.js` selects the real service tile and writes bounded plain-text product context into the existing notes field only if it is empty. Restored customer notes are not overwritten. The existing lead controller, backend contract, spam checks and receipt flow are unchanged by this work.

Actual incoming UTMs and supported click IDs are retained. No manufacturer referral is inferred from simply viewing a brand page. The existing first-touch attribution script remains in place. The Stealth user journey does not require manufacturer cookies or prefilled vehicle data: visitors enter the vehicle again on Capital's page.

## Verified relationship sources

- Stealth Hitches installer locator: https://stealthhitches.com/apps/store-locator . ZIP 20852 lists Capital Upfitters as a preferred installer providing parts and labor.
- Torklift locator: https://www.torklift.com/where-to-buy . ZIP 20852 lists Capital for EcoHitch, NorthHitch Front Hitch and TailoredHitch installation.
- EcoHitch design reference: https://www.torklift.com/products/trailer-hitches/front-and-rear-hitches/ecohitch . Available design and ratings vary by application.
- Stealth towing/installation/warranty guidance: https://stealthhitches.com/pages/faq . Square rack receiver must not tow; some installations require unseen underbody trimming; limited warranty terms apply.
- etrailer listing: https://www.etrailer.com/installer/details/35350/rockville-md/capital-upfitters . Does not guarantee acceptance of every product or kit.
- RealTruck locator: https://realtruck.com/dealer-locator/ . ZIP 20852 lists Capital Upfitters - Patriot Liner Rockville with BAK, Retrax and AMP Research Preferred Dealer status. No blanket doubled-warranty eligibility is promised.

Additional product references: BAKFlip MX4 EZ-Lift (including its 10.5-lb opening specification) https://realtruck.com/p/bakflip-mx4-ez-lift-tonneau-cover/ ; MX4 TS GEN 3 lineup https://realtruck.com/bakflip-mx4-lineup/ ; AMP PowerStep https://realtruck.com/p/amp-research-power-step/ .

## Referral routing still requires an external update

The manufacturer listings currently link to a generic homepage or, for RealTruck, a malformed website URL. The brand pages alone cannot repair those external links. After approved publication, the owner should ask each directory to use the corresponding HTTPS brand page. Optional UTM tags can identify actual referral clicks if the directory permits them. No vehicle data needs to pass from the manufacturer.

## Instant package purchase is not implemented

The active call to action is an honest package quote request. No inactive checkout, invented stock, placeholder prices or fake booking confirmation is presented.

Before enabling purchase, confirm:

1. Approved, maintained vehicle/year/trim-to-SKU fitment matrix, including rack versus towing configuration and exclusions.
2. Exact package contents, installed labor prices, taxes, shipping or local-service handling, required add-ons and exceptions.
3. Inventory or supplier fulfillment source and who owns order acceptance, changes and refunds.
4. Approved payment provider, account access and safe server-side checkout/webhook integration. Credentials and payment handling are outside this change.
5. Installation appointment policy, deposit/full-payment choice, cancellation and return terms, warranty disclosures, and terms acceptance.
6. Server-side validation of the selected SKU, price and eligibility. The browser must not be trusted to set the order total or establish vehicle compatibility.

Once those inputs are available, the fitment/package selection can resolve to a verified catalog item and server-created checkout session; unsupported or uncertain fits should retain this quote fallback.

## Verification

- New unit/contract tests cover six routes, service aliases, bounded plain-text notes, preservation of customer input, actual campaign propagation, sitemap and category discovery.
- Aggregate `npm run check` passed during implementation, including 77 tests, chrome sync, JS syntax and UI contracts.
- Local browser QA was blocked by the environment's socket restrictions before Chromium could start. No visual or live end-to-end lead-submission success is claimed. No production leads were sent.
