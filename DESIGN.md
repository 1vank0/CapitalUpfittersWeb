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
