# Capital Upfitters — Design System

This is the **single authoritative source** for the site's design system.
Previous documentation (README.md's "Design System" table, and per-page HTML
comments reading "Barlow Condensed + Inter, onehourhitch.com color palette")
described an earlier iteration that was superseded by an Apple-style redesign
(see git history around `redesign/apple-palette`). Those older references are
stale — trust this file and `base.css` instead.

If you are an AI agent picking up work on this repo: read this file before
touching typography, color, spacing, or button styles. Guessing at the design
system from old comments is what caused prior redesign attempts to drift.

## Source of truth

All tokens below are CSS custom properties defined once in `base.css`
(`:root` block). Never hardcode a color, font, spacing, or radius value in a
page — reference the token. If a token is missing for something you need, add
it to `base.css` rather than inventing a one-off value inline.

## Typography

| Token | Value | Usage |
|---|---|---|
| `--font-display` | `'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif` | Headings, stat numbers, eyebrows, buttons |
| `--font-body` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif` | Body copy, paragraphs |

Loaded once via `base.css`'s own `@import` of Manrope + Inter from Google
Fonts — every page picks this up automatically through `<link
rel="stylesheet" href="base.css">` (or `../base.css` for subpages). **Do not**
add a separate Barlow Condensed `<link>`/`@import` to a page; a number of
`services/*.html` files still do this as a leftover from the pre-redesign
system, and it's a wasted network request since `--font-display` no longer
points at Barlow Condensed. Cleaning those out is a good, zero-risk follow-up
(see "Known cleanup" below).

Type scale (`--text-xs` through `--text-8xl`) runs from 12px to 96px in the
usual Tailwind-like steps — see `base.css` for exact values.

## Color

| Token | Value | Usage |
|---|---|---|
| `--brand-ink` | `#1d1d1f` | Primary text on light backgrounds |
| `--brand-navy` | `#000000` | Hero / nav / footer background (true onyx) |
| `--brand-navy-mid` | `#1d1d1f` | Raised dark surface |
| `--brand-amber` (→ `--color-accent`) | `#0071e3` | **"Signal Blue"** — primary accent, filled CTAs, links |
| `--brand-amber-dark` (→ `--color-accent-hover`) | `#0066cc` | Accent hover/active state |
| `--brand-white` | `#ffffff` | Paper / light background |
| `--brand-surface` | `#f5f5f7` | Section background ("Eggshell") |
| `--brand-muted` | `#6e6e73` | Secondary/muted text |
| `--brand-line` | `transparent` | Borders — this system uses zero visible borders by default (Apple-style) |

The token names (`--brand-amber`, `--color-accent-light` using an amber rgba)
are a holdover from an earlier amber-accented palette and are due for a
rename to avoid confusing future contributors — the *value* is Signal Blue,
the *name* still says amber. Don't let the name mislead you; the computed
color is what matters until the rename happens.

Full semantic color tokens (`--color-bg`, `--color-text-muted`,
`--color-border`, etc.) are all derived from the brand tokens above — see
`base.css` lines ~39–69.

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
- Shadows are intentionally disabled sitewide (`--shadow-*: none`) — this is
  an Apple-style flat design; don't add drop shadows to new components.

## Known cleanup (not yet done — flagged, not fixed, in this pass)

- Remove the redundant Barlow Condensed Google Fonts `<link>`/`@import` from
  the ~15 `services/*.html` pages that still load it. It has zero visual
  effect (nothing references it) and costs a render-blocking network
  request.
- Rename `--brand-amber` / `--brand-amber-dark` / `--color-accent-light` to
  something Signal-Blue-accurate (`--brand-accent-blue`, etc.) — purely a
  naming/maintainability fix, no visual change.
- `README.md`'s "Design System" table still describes the pre-redesign
  system (Barlow Condensed, `#203055` navy, `onehourhitch.com` palette).
  Update or remove it in favor of pointing at this file.
