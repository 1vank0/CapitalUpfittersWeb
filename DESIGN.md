# Capital Upfitters — Design System

This is the **single authoritative source** for the site's design system.
It describes the **premium brand (Oct 2026)**: quiet, precise, premium. White
space, black type, soft greys. Colour appears only in the logo mark.

The brand is defined visually on the "0 · Brand system" board in the design
canvas; this file is its written form. Earlier documentation (the README's old
"Design System" table, per-page comments about "Barlow Condensed + Inter", and
the Sep 2026 "yellow action / blue identity" system) is superseded. Trust this
file and the stylesheets it names.

If you are an AI agent picking up work on this repo: read this file before
touching typography, color, spacing, or button styles.

## Shared header and footer

The announce bar, nav, mobile menu and footer live once in `partials/header.html`
and `partials/footer.html`. Pages opt in with `<!-- cu:header -->…<!-- /cu:header -->`
and `<!-- cu:footer -->…<!-- /cu:footer -->` markers; never edit between them by hand.

- `npm run sync-chrome` stamps the partials into every marked page (idempotent).
- `npm run check-chrome` exits 1 if any marked page has drifted (use in CI).
- `node scripts/sync-chrome.mjs --adopt` marks pages whose chrome already matches;
  add `--all` to replace the chrome on every page.
- Partials use `./` links; the script rewrites them to `../` for pages in subfolders.

## Source of truth

Stylesheets load in this order on every page, and later files win:

1. `base.css` — reset, type scale, spacing, radii, base tokens.
2. `style.css` — global components (nav, hero, footer, cards, forms).
3. `brand-tokens.css` — the **locked premium brand**. Locks the palette,
   remaps the legacy blue/yellow token names to ink, and skins the global
   components: logo, nav, buttons, dark bands, proof strips, footer.
4. `ux-10k.css` — page polish layer: type hierarchy, section rhythm, card
   elevation, form fields, CTA lock, focus rings, reduced-motion overrides,
   and the global sentence-case guard.

`hitch-quote.html` loads only `base.css` + `hitch-quote.css`, so `base.css`
mirrors the palette primitives and fonts.

Never hardcode a color, font, spacing, or radius value in a page — reference
the token. If a token is missing, add it to `brand-tokens.css` (brand colors)
or `base.css` (everything else) rather than inventing a one-off value inline.

## Typography

One family: **Geist** (Google Fonts), weights 400 / 500 / 600 / 700.

| Token | Value |
|---|---|
| `--font-display` | `'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif` |
| `--font-body` | same stack — display and body are the same family |

Loaded per page with a non-blocking `<link rel="preload" as="style">` to
Google Fonts plus a `<noscript>` fallback:
`https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap`.
Do not reintroduce Manrope, Inter, Barlow Condensed, or Archivo.

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Display (h1) | up to 64px (`--type-display`) | 600 | -0.035em |
| Title (h2) | up to 40px (`--type-h2`) | 600 | -0.03em |
| Heading (h3) | up to 24px (`--type-h3`) | 600 | -0.02em |
| Body | 17px (`--type-body`) | 400 | 0 |
| Caption | 13px | 400 | 0 |

**Sentence case everywhere. No all-caps, no wide tracking.** `ux-10k.css`
enforces `text-transform: none` globally (it also beats legacy inline styles),
and nothing may add positive `letter-spacing`. Prices and figures use
`font-variant-numeric: tabular-nums`.

## Color

Values from `brand-tokens.css` (mirrored in `base.css`).

| Token | Value | Usage |
|---|---|---|
| `--brand-white` | `#ffffff` | Page background |
| `--brand-surface` | `#f5f5f7` | Mist — alternate sections, tiles, proof strips |
| `--brand-line` | `#e5e5ea` | Hairline borders |
| `--brand-line-strong` | `#d2d2d7` | Input borders |
| `--brand-ink` | `#1d1d1f` | Text, buttons, dark bands |
| `--brand-ink-hover` | `#424245` | Ink button hover |
| `--brand-body` | `#424245` | Paragraph text |
| `--brand-muted` | `#6e6e73` | Graphite — secondary text (AA on white and mist) |
| `--brand-muted-on-dark` | `#a1a1a6` | Secondary text on an ink band |
| `--brand-navy` / `--brand-navy-mid` | `#1d1d1f` / `#2b2b2e` | Legacy names: a dark band is ink; raised surface on it |
| `--brand-fit` / `-text` / `-soft` | `#1e6b3a` / `#1e5a32` / `#dceadf` | "Fits" confirmations only |
| `--logo-blue` | `#0057b7` | **Logo mark only** |
| `--logo-yellow` | `#ffd700` | **Logo mark only** |

### Colour rules

- Blue and yellow appear **only in the logo mark** (top half flag blue, bottom
  half flag yellow, in a rounded square). Never use `--logo-blue` or
  `--logo-yellow` for UI, text, icons, buttons, or stars.
- The old token names `--brand-blue*`, `--brand-yellow*`, `--brand-amber*`,
  `--color-brand*`, `--color-accent*`, `--color-action*`, `--color-rating`, and
  `--color-focus` are **legacy aliases that now resolve to ink or graphite**.
  They are kept so `style.css` keeps working. Never point them at a colour.
- Dark bands (hero over imagery, CTA band, `.section--dark`, footer, announce
  bar) are ink `#1d1d1f`. Type on them is white; secondary type is
  `--brand-muted-on-dark`.
- Image cards keep their photography under a dark legibility overlay.
- Semantic colours that remain: form error red, the "fits" green, and
  status greens on location pages. Third-party brand badges (e.g. vehicle
  makes on the Stealth Hitch page) keep their own colours.
- The logo is drawn in CSS (`.nav-logo-mark`), so every page gets the same
  mark regardless of the legacy inline SVG inside it, which is hidden.
  `favicon.svg` is the same mark.

## Buttons

- Shape: **pill** (`--radius-pill` = `980px`) for `.btn`, nav CTA, chips and
  filters.
- Type: Geist 600, 16px (base `.btn`), no uppercase, no tracking.
- **Primary** (`.btn-primary`, `.nav-cta`, `.vs-btn`, `.float-cta-btn`): ink
  background, white text, hover `#424245`. No coloured glow.
- **On a dark band** the primary flips to a **white pill with ink text**
  (hover `#e5e5ea`). Hook for inline-styled dark sections: add class
  `band-ink`.
- **Secondary** (`.btn-outline`): 1.5px ink border, ink text; fills ink on
  hover. On dark bands: white border and text, fills white on hover.
- **Tertiary** (`.btn-ghost`): ink, underlined (4px offset).
- Minimum height 48px (44px touch target floor).

## Spacing

8px-based scale, `--space-1` (0.25rem/4px) through `--space-32` (8rem/128px).
Always use the token; don't hand-write `margin: 23px`. Section padding uses
`--space-section` / `--space-section-sm` from `ux-10k.css`.

## Radii

| Token | Value | Use |
|---|---|---|
| `--radius-card` | 20px | Cards |
| `--radius-input` | 12px | Inputs and selects |
| `--radius-pill` | 980px | Buttons, chips, filters |
| `--radius-sm` … `--radius-2xl` | 0.375rem … 1.25rem | Existing component radii |

## Layout

- `--nav-height`: 64px. The nav is **white** (88% with a backdrop blur), ink
  type, hairline bottom border; mega menu and mobile sheet are white too.
- `--container-max`: 1200px
- `base.css` disables generic shadows (`--shadow-*: none`). Card elevation
  comes only from `ux-10k.css` (`--shadow-card`, `--shadow-card-hover`); both
  are very soft. Reuse them rather than adding new shadows.
- Section rhythm alternates white and mist (`.section--surface`). The proof
  strips (`.trust-bar`, `.stats-strip`) are mist. Ink bands are used sparingly.

## Accessibility baseline

- Every page starts with `<a class="skip-link" href="#main">` and wraps its
  content in a single `<main id="main">`, between the nav and the footer.
- One `<h1>` per page; don't skip heading levels (restyle with CSS instead).
- Click-to-call links always use `tel:+13013041419`.
- Focus ring: 2px ink outline, 3px offset (white on dark bands).
- Text contrast: ink on white/mist, graphite `#6e6e73` for secondary text
  (≥ 4.5:1 on both); don't use `#a1a1a6` on a light background.
- Respect `prefers-reduced-motion` (see `ux-10k.css`); autoplaying hero
  media needs a visible pause control.

## Known cleanup

- Rename the legacy `--brand-blue*` / `--brand-yellow*` / `--brand-amber*` /
  `--color-accent-*` / `--color-brand*` tokens to ink-accurate names
  (`--brand-action`, etc.). Naming fix only, no visual change; touches
  `style.css` broadly.
- Many headings are typed in capitals in the HTML (e.g. "WHAT ARE YOU
  BUILDING?"). CSS cannot convert those to sentence case without breaking
  acronyms (SUV, DMV, PPF), so they need a copy edit.
- `og.png` (the social share image) still carries the old palette; it is an
  image, not a style file.
- `preview.html` and `products-section.html` are noindex mockups with their own
  inline styles; they only got the font and colour remap.
- The hidden legacy shield SVGs inside `.nav-logo-mark` can be deleted from the
  markup now that the mark is drawn in CSS.

## Web rules (check before calling any page done)

Measurable rules adopted from the owner's web-design course notes. They sharpen
this design system; they never override it. Check them on every new or
changed page, at **390×844** and **1366×768**.

**First screen (5-second test)**
- Within the first screen a stranger can tell what we do, for whom, where
  (Rockville / DMV), and what to do next.
- Exactly one `<h1>`, **≤12 words**, naming the service and town on service and
  location pages. Subline ≤20 words.
- One primary CTA per view (filled yellow); secondary actions are outline or
  text links. CTA labels are verb-first and ≤4 words ("Get my quote", "Call the shop").

**Type, spacing, touch**
- Two font families at most (currently one: Geist). Body ≥16px, line-height ≥1.5.
- Form controls ≥16px font (iOS zoom), visible labels (never placeholder-only),
  correct `type` / `autocomplete` / `inputmode`.
- Stand-alone tap targets ≥44px with ≥8px between them. Links inside sentences are exempt.
- Spacing from the 8-point scale only.

**Colour and states**
- Text contrast 4.5:1 (3:1 for large text, UI parts and focus rings).
- Never colour alone for meaning: add an icon or text.
- Yellow stays ≤10% of any screen.
- Every interactive element has default, hover, focus-visible (≥2px ring),
  active and disabled states. Design the empty, loading, error and success states too.
- Motion 150–300ms, `transform`/`opacity` only, and `prefers-reduced-motion` honoured
  (global rule in `brand-tokens.css`).

**Performance**
- LCP < 2.5s, CLS < 0.1, INP < 200ms.
- Hero image ≤200KB WebP/AVIF with `width`/`height`, never lazy-loaded.
  Everything below the fold lazy-loads.

**SEO and local**
- Title ≤60 characters (service + town first, brand last). Description ≤155 characters.
- Open Graph image 1200×630.
- Business structured data uses `AutoRepair` (a `LocalBusiness` subtype); name,
  address and phone are identical everywhere. FAQ text on the page matches the
  `FAQPage` schema word for word.
- Location pages only with genuine local content (real jobs in that town).
  Near-duplicate city pages are doorway pages.

**Proof (non-negotiable)**
- Never invent prices, ratings, review counts, testimonials, years,
  certifications, warranties, customer names or job photos. Use a marked
  placeholder instead.
- Before/after photos are real Capital Upfitters jobs only. Use one crop ratio
  and matched angles, with a caption naming the vehicle and the service.
- Reviews are requested from every customer (no filtering for happy ones) and
  never written on a customer's behalf.

**Copy**
- Specific beats clever: name the vehicle, service, town and turnaround.
- Avoid filler words ("elevate", "transform", "world-class", "game-changer") unless
  they're literally true; "seamless coating" describing a coating with no seams is fine.

## Look premium, not generated

From studying Apple, Tesla and Airbnb (Oct 2026) and the frontend-design and
make-interfaces-feel-better skills. These are the commonest reasons a page
reads as AI-made; avoid them unless a page truly needs one.

**One idea per screen**
- About a dozen words and two actions per full-width block (Apple ~11 words
  per 650px block). Let one real photo carry it.
- Spend boldness in one place per page. Everything else stays quiet.
- The vehicle is the search: Year / Make / Model is the first thing on the
  home page, like Airbnb's Where / When / Who.

**Remove template chrome**
- No ALL-CAPS headlines or labels; sentence case everywhere.
- No eyebrow label above every heading.
- No badge/pill rows, stat strips or glass panels in heroes.
- No strings joined with middle dots ("A · B · C"), no "→" on links or buttons.
- No numbered markers (01 / 02 / 03) unless the content really is a sequence.
- No identical rounded cards with the same grey shadow; use photos and space instead.
- No accenting a single word in a headline with colour or italics.

**Photography**
- Real Capital Upfitters jobs, the bay and the team only. AI renders or stock
  are never shown as our work.
- One crop ratio per set, matched angles, consistent light. A subtle 1px
  `rgba(0,0,0,0.06)` outline on photos.

**Polish details**
- `text-wrap: balance` on headings, `text-wrap: pretty` on body text.
- `font-variant-numeric: tabular-nums` on prices and phone numbers.
- Nested corners are concentric: outer radius = inner radius + padding.
- Buttons press slightly on click (`transform: scale(0.97)`, 120ms).
- Never `transition: all`; name the property. `will-change` only on transform or opacity.
- Motion only on purpose: one orchestrated moment per page at most, never a
  fade-up on every section.

## Structure: three doors (2026-11-02)

The site serves three customers, and the navigation says so. One dropdown
per door, one column each, no badges, stars or emoji:

| Door | Lands on | Covers |
|---|---|---|
| Trucks & SUVs | `services/` | bedliners, covers, boards, hidden hitches, protection |
| Dealers & Fleets | `fleet.html` | pre-sale add-ons, van upfits, branding, account pricing |
| Government & Field | `dealer-government.html#government` | protective coatings, agency fleets, DOT and EMS |

Rules that follow from it:

- A service appears in exactly one door. Repeating bedliners under three
  headings is what made the old nav unreadable.
- The home page asks the audience question once. Hero, vehicle picker,
  three doors, what we install, proof. No second funnel row.
- Every dropdown link points at a page that exists. No link invents an
  anchor; `#dealer` and `#government` open their own tab panel.
- The shop phone number sits in the nav above 1180px and in the phone
  menu. Below that, the sitewide `.mobile-action-bar` is the only sticky
  bar — do not add a second one.

### Never dim the offer

The hero carried an idle script that faded the headline and subtitle to
2% opacity after 1.8s without mouse, touch or key input. A phone sends no
mouse movement, so the pitch disappeared about two seconds after landing.
Removed 2026-11-02. Hero copy stays legible; if the video needs more
presence, change the overlay, never the text.
