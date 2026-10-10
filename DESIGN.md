# Capital Upfitters — Design System

This is the **single authoritative source** for the site's design system.
Previous documentation (README.md's "Design System" table, and per-page HTML
comments reading "Barlow Condensed + Inter, onehourhitch.com color palette")
described an earlier iteration that was superseded by an Apple-style redesign
(see git history around `redesign/apple-palette`). Those older references are
stale — trust this file and the stylesheets it names instead.

If you are an AI agent picking up work on this repo: read this file before
touching typography, color, spacing, or button styles. Guessing at the design
system from old comments is what caused prior redesign attempts to drift.

## Source of truth

Stylesheets load in this order on every page, and later files win:

1. `base.css` — reset, type scale, spacing, radii, base tokens.
2. `style.css` — global components (nav, hero, footer, cards, forms).
3. `brand-tokens.css` — the **locked brand system (Sep 2026)**. It redefines
   the brand primitives below, so its values override `base.css`.
4. `ux-10k.css` — SKOOL "$10k polish" layer: type hierarchy, section rhythm,
   card elevation, CTA lock, focus rings, reduced-motion overrides.

Never hardcode a color, font, spacing, or radius value in a page — reference
the token. If a token is missing, add it to `brand-tokens.css` (brand colors)
or `base.css` (everything else) rather than inventing a one-off value inline.

## Typography

| Token | Value | Usage |
|---|---|---|
| `--font-display` | `'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif` | Headings, stat numbers, eyebrows, buttons |
| `--font-body` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif` | Body copy, paragraphs |

Loaded per page with a non-blocking `<link rel="preload" as="style">` to
Google Fonts plus a `<noscript>` fallback. **Do not** add Barlow Condensed;
it belongs to the pre-redesign system.

Type scale (`--text-xs` through `--text-8xl`) runs from 12px to 96px in the
usual Tailwind-like steps — see `base.css` for exact values.

## Color

Values from `brand-tokens.css` (they override the older Signal Blue values
still present in `base.css`).

| Token | Value | Usage |
|---|---|---|
| `--brand-ink` | `#1d1d1f` | Primary text on light backgrounds |
| `--brand-navy` | `#0a0a0b` | Near-black hero / nav / footer surfaces |
| `--brand-navy-mid` | `#16161a` | Raised dark surface |
| `--brand-yellow` (→ `--color-accent`) | `#fcd800` | **Action only**: filled primary CTAs, H1 accent word. Text on it uses `--brand-on-yellow` |
| `--brand-blue` | `#0066fc` | **Identity**: logo, icons, text links, chips |
| `--brand-surface` | `#f5f5f7` | Section background |
| `--brand-muted` | `#636366` | Secondary text (AA on white and on `--brand-surface`) |
| `--brand-line` | `rgba(0,0,0,0.08)` | Hairline borders |

`--brand-amber` / `--brand-amber-dark` are legacy names kept because
`style.css` uses them; they are remapped to the yellow action color.

## Buttons

- Shape: **pill** (`border-radius: var(--radius-pill)` = `9999px`) — this is
  the signature interactive-element shape sitewide, used for `.btn`,
  `.funnel-card-link`, and other CTAs.
- Padding: `0.75rem 1.75rem` for the base `.btn`.
- Font: `--font-body` (Inter), weight 500, no uppercase transform on the
  primary button; some secondary chip/label elements use `--font-display`
  with uppercase + letter-spacing for a distinct "label" voice — check
  existing usage nearby before introducing a third convention.

## Spacing

8px-based scale, `--space-1` (0.25rem/4px) through `--space-32` (8rem/128px).
Always use the token; don't hand-write `margin: 23px`.

## Radii

| Token | Value |
|---|---|
| `--radius-sm` | 0.375rem |
| `--radius-md` | 0.5rem |
| `--radius-lg` | 0.75rem |
| `--radius-xl` | 1rem |
| `--radius-2xl` | 1.25rem |
| `--radius-pill` | 9999px (buttons, pills) |

## Layout

- `--nav-height`: 64px
- `--container-max`: 1200px
- `base.css` disables generic shadows (`--shadow-*: none`). Card elevation
  comes only from `ux-10k.css` (`--shadow-card`, `--shadow-card-hover`); reuse
  those rather than adding new shadows.

## Accessibility baseline

- Every page starts with `<a class="skip-link" href="#main">` and wraps its
  content in a single `<main id="main">`, between the nav and the footer.
- One `<h1>` per page; don't skip heading levels (restyle with CSS instead).
- Click-to-call links always use `tel:+13013041419`.
- Respect `prefers-reduced-motion` (see `ux-10k.css`); autoplaying hero
  media needs a visible pause control.

## Known cleanup

- Rename the legacy `--brand-amber*` / `--color-accent-*` tokens to
  action-accurate names (`--brand-action`, etc.). This is a naming fix only,
  with no visual change, and it touches `style.css` broadly.
- `base.css` still carries the superseded Signal Blue brand values under
  `:root`; they are dead weight now that `brand-tokens.css` overrides them.
