# Bed cover comparison and quote handoff

Base reviewed: PR #39 at `dbaf519e22fade420c1138c67315cfb03ea5f600`.

## Design and scope

The existing Stealth/EcoHitch presentation is the design reference: graphite background, white surfaces, copper actions, Geist type, large editorial headings, open section rhythm and explicit quote expectations. The bed-cover page adds one managed hero image and accessible model-selection rows, rather than repeating five product image cards. No generated photography or static media dependency was introduced.

The indexed `/services/tonneau.html` route, canonical, robots, local service coverage, shop details, related product/service links, gallery feed, shared header/footer, analytics and attribution remain. Cover and bedliner coordination is retained without unsupported bundle, warranty, stock, fuel-savings, waterproof or universal no-drilling claims. Visible FAQ text and FAQ schema are generated from the same reviewed answers.

Good/Better tiers are comparisons within the soft-roll-up and hard-folding groups, not prices or compatibility promises. Premium is the retractable option. The model list follows the requested lineup. The exact generation, part and vehicle application remain subject to shop review.

## Official product evidence

Reviewed November 4, 2026:

- TruXedo TruXport: https://realtruck.com/p/truxedo-truxport-tonneau-cover/
- TruXedo Pro X15: https://realtruck.com/p/truxedo-pro-x15-tonneau-cover/
- Westin Hard Tri-Fold: https://www.westinautomotive.com/images/9_Product_Flyers/TonneauCovers/Tonneau_Covers_SellSheet_Final.pdf
- BAKFlip MX4: https://realtruck.com/p/bakflip-mx4-tonneau-cover/
- RetraxPRO MX: https://realtruck.com/p/retraxpro-mx-tonneau-cover/rtx-80384/

TruXport and MX4 official listings currently describe newer generations, so generation-specific performance, strength and latch improvements are deliberately omitted. Retractable canister dimensions and universal fitment are not asserted. Westin can fold fully; the page does not claim it must be removed for access.

## Interaction contracts

- A native GET form sends `service=tonneau` and the selected, human-readable `product` to the existing quote page. No checkout or appointment reservation occurs.
- Five models plus Help me choose use required, labeled native radios. Choices remain usable without the enhancement script.
- No vehicle or bed-length fields are duplicated on the landing page. Incoming vehicle and real attribution parameters carry through as hidden fields when JavaScript is available. No referral source is invented.
- Quote deep linking maps only the five known model names to existing `soft`, `trifold` or `retrax` options. The selected option remains editable. Unknown names and Help me choose do not infer a type, fitment or price. Existing notes-preservation behavior is unchanged.
- The selected model updates a polite live summary. Back/forward `pageshow` refreshes it from the actual radio state. No untrusted HTML is inserted.
- Managed imagery retains its illustration/photo caption contract; the gallery shows only approved service-filtered work.

## Validation and fidelity ledger

`npm run check`: 104 tests pass, 48 shared-header pages are in sync, UI contracts and existing text-token contrast pass. Separate `node --check` checks pass for both changed controllers. Seven new tests cover native markup, selection/back behavior, incoming context, known model mapping, unknown/prototype model rejection, schema/route/media contracts and responsive/accessibility source rules.

Source review comparison points:

1. Palette and typography reuse the Stealth/EcoHitch stylesheet without changing it.
2. Hero hierarchy uses the same large graphite/white editorial treatment; a managed image is an intentional bed-cover extension.
3. Copper buttons, visible focus, native radios, 44px navigation targets and reduced-motion overrides are preserved.
4. Desktop comparison rows collapse to a two-column radio/text layout, then a single-width quote action at 700px.
5. Media stays unobscured with a backend-controlled caption, rather than being presented as completed shop work.
6. Local service and related links remain, but unverified fixed ratings/testimonials are replaced by the existing Google reviews destination.
7. Copy explicitly describes quote review rather than checkout, and all five requested products are present.

These are source-level checks, not rendered fidelity sign-off. There is no newly approved image concept to compare. Local Chromium previously failed `socket() Operation not permitted` and its escalation was denied. That action was not retried or bypassed. No new desktop/mobile screenshots, browser interaction results, visual overflow certification or hosted image-load result are claimed. Rendered desktop/mobile review remains required before production. No live leads were submitted. No production promotion is included.
