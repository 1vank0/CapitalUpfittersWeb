#!/usr/bin/env node
/**
 * Replace the "Capital Upfitters" wordmark in the nav and footer with an
 * inline SVG that matches the latest brand reference (CAPITAL on top,
 * UPFITTERS in gold and full-width below, blue/gold separator that spans
 * the full mark, then a tagline reading
 * "AUTO STYLING / PERFORMANCE / PROTECTION" with gold slashes).
 *
 * Targets (any of):
 *   - <div class="nav-logo-text">Capital<span>Upfitters</span></div>
 *   - <div class="nav-logo-text"><svg class="nav-wordmark-svg" ...></svg></div>
 *   - <div class="footer-brand-name">Capital<span>Upfitters</span></div>
 *   - <div class="footer-brand-name"><svg class="footer-wordmark-svg" ...></svg></div>
 *   - <span>Capital<strong>Upfitters</strong></span>            (legacy blog footer)
 *   - <span class="footer-brand-name"><svg class="footer-wordmark-svg" ...></svg></span>
 *
 * This script is idempotent: re-running re-replaces the wrapper contents
 * with a fresh SVG (no nesting, no duplication).
 *
 * On dark backgrounds (the current nav/footer use #111827) CAPITAL and the
 * tagline are rendered white so they remain readable. The reference image
 * uses black-on-white; only the colors are flipped, the layout matches.
 */
const fs = require('fs')
const path = require('path')
const glob = require('glob')

const ROOT = path.join(__dirname, '..')

// SVG wordmark — full version with separator underline + tagline.
//
// Layout reference (viewBox 0 0 360 90):
//   y  6 -> 50   CAPITAL    black on light, here white on dark, ~75% width
//   y 56 -> 78   UPFITTERS  gold, full width via textLength stretch
//   y 82         separator  blue 0..150 / gold 150..360
//   y 90         tagline    AUTO STYLING / PERFORMANCE / PROTECTION (gold slashes)
function wordmarkSVG(className) {
  // Brand wordmark font: Ash (CherryLane Designs, dafont.com).
  // Self-hosted at /fonts/Ash.woff2 + .woff via @font-face in base.css.
  // Falls back to Barlow Condensed / Impact if Ash hasn't loaded yet.
  const FONT =
    "'Ash', 'Barlow Condensed', Impact, 'Arial Narrow Bold', sans-serif"
  //
  // Layout (viewBox 0 0 740 200) — NO textLength stretching, so glyphs
  // keep their natural shape and don't get squished or clipped.
  //
  //   Ash measured natural widths (per 1px of font-size):
  //     CAPITAL    ≈ 6.89
  //     UPFITTERS  ≈ 9.19
  //     tagline    ≈ 40.7  (with letter-spacing: 1.4)
  //
  //   To make CAPITAL and UPFITTERS the SAME visible width, we use
  //   different font sizes so their natural widths match (≈ 689 px):
  //     CAPITAL    font-size 100 → 689
  //     UPFITTERS  font-size  75 → 689
  //     tagline    font-size  17 → ≈ 692
  //
  //   25 px of padding on the left/right (canvas 740 = 689 + 2×25 + a few
  //   pixels of safety) and 18 px on top so CAPITAL doesn't kiss the
  //   viewBox edge.
  //
  //   Vertical:
  //     y  98  CAPITAL baseline   (cap-height ≈ 75; sits 18..98)
  //     y 165  UPFITTERS baseline (sits  ~108..165)
  //     y 175  separator line     (white 25..370 / gold 370..715)
  //     y 195  tagline baseline   (sits ~180..197)
  //
  return [
    `<svg class="${className}" width="370" height="100" viewBox="0 0 740 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Capital Upfitters \u2014 Auto Styling / Performance / Protection">`,
    // CAPITAL — white, font-size 100
    `<text x="25" y="98" font-family="${FONT}" font-weight="400" font-size="100" fill="#ffffff">CAPITAL</text>`,
    // UPFITTERS — brand gold, font-size 75 (matches CAPITAL's natural width)
    `<text x="25" y="165" font-family="${FONT}" font-weight="400" font-size="75" fill="#fcbf0d">UPFITTERS</text>`,
    // Separator under UPFITTERS: white left ~50%, gold right ~50%
    `<line x1="25" y1="175" x2="370" y2="175" stroke="#ffffff" stroke-width="4"/>`,
    `<line x1="370" y1="175" x2="715" y2="175" stroke="#fcbf0d" stroke-width="4"/>`,
    // Tagline — sized so its natural width matches the wordmark width
    `<text x="25" y="195" font-family="${FONT}" font-weight="400" font-size="17" letter-spacing="1.4">`,
    `<tspan fill="#ffffff">AUTO STYLING</tspan>`,
    `<tspan fill="#fcbf0d"> / </tspan>`,
    `<tspan fill="#ffffff">PERFORMANCE</tspan>`,
    `<tspan fill="#fcbf0d"> / </tspan>`,
    `<tspan fill="#ffffff">PROTECTION</tspan>`,
    `</text>`,
    `</svg>`,
  ].join('')
}

// Replacement pairs. Each {wrapperOpen, wrapperClose} pair is matched and
// the inner content is replaced with a fresh SVG so re-runs stay clean.
const REPLACEMENTS = [
  // Nav (current SVG version OR original text version)
  {
    name: 'nav',
    re: /<div class="nav-logo-text">[\s\S]*?<\/div>/g,
    out: () =>
      `<div class="nav-logo-text">${wordmarkSVG('nav-wordmark-svg')}</div>`,
  },
  // Modern footer (div wrapper)
  {
    name: 'footer-div',
    re: /<div class="footer-brand-name">[\s\S]*?<\/div>/g,
    out: () =>
      `<div class="footer-brand-name">${wordmarkSVG('footer-wordmark-svg')}</div>`,
  },
  // Legacy blog footer (span wrapper, set by earlier replace pass)
  {
    name: 'footer-span',
    re: /<span class="footer-brand-name">[\s\S]*?<\/span>/g,
    out: () =>
      `<span class="footer-brand-name">${wordmarkSVG('footer-wordmark-svg')}</span>`,
  },
  // Original legacy blog footer (in case someone reverted): <span>Capital<strong>Upfitters</strong></span>
  {
    name: 'footer-original-legacy',
    re: /<span>Capital<strong>Upfitters<\/strong><\/span>/g,
    out: () =>
      `<span class="footer-brand-name">${wordmarkSVG('footer-wordmark-svg')}</span>`,
  },
]

const files = glob.sync('**/*.html', {
  cwd: ROOT,
  ignore: ['node_modules/**', 'admin/**', '.vercel/**', 'tina/__generated__/**'],
})

let touched = 0
for (const rel of files) {
  const p = path.join(ROOT, rel)
  let html = fs.readFileSync(p, 'utf8')
  const before = html
  for (const r of REPLACEMENTS) {
    html = html.replace(r.re, r.out())
  }
  if (html !== before) {
    fs.writeFileSync(p, html)
    console.log(`\u2713 ${rel}`)
    touched++
  }
}
console.log(`\nDone. ${touched}/${files.length} files updated.`)
