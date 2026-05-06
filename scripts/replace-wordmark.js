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
  const FONT =
    "'Arial Black', 'Helvetica Neue', Impact, 'Arial Narrow Bold', sans-serif"
  // viewBox 0 0 600 160 — gives plenty of vertical room for the separator
  // and tagline to sit *below* UPFITTERS' descender area without overlap.
  //   y  64        CAPITAL baseline  (font 70, ~77% wide via textLength)
  //   y 124        UPFITTERS baseline (font 60, full width)
  //   y 134        separator         (blue 0..255 / gold 255..600)
  //   y 156        tagline baseline  (font 14)
  // Aspect ratio 600:160 = 3.75:1 matches the reference image.
  return [
    `<svg class="${className}" width="300" height="80" viewBox="0 0 600 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Capital Upfitters \u2014 Auto Styling / Performance / Protection">`,
    // CAPITAL (white on dark — black on light in source reference)
    `<text x="0" y="68" font-family="${FONT}" font-weight="900" font-size="78" fill="#ffffff" letter-spacing="0" textLength="460" lengthAdjust="spacingAndGlyphs">CAPITAL</text>`,
    // UPFITTERS (brand gold, stretched to full width)
    `<text x="0" y="126" font-family="${FONT}" font-weight="900" font-size="60" fill="#fcbf0d" letter-spacing="0" textLength="600" lengthAdjust="spacingAndGlyphs">UPFITTERS</text>`,
    // Separator: navy left ~42%, gold right ~58%
    `<line x1="0" y1="136" x2="255" y2="136" stroke="#103b68" stroke-width="4"/>`,
    `<line x1="255" y1="136" x2="600" y2="136" stroke="#fcbf0d" stroke-width="4"/>`,
    // Tagline: white words, gold slashes — positioned with explicit x to
    // avoid relying on font-metric kerning for layout.
    `<text y="156" font-family="${FONT}" font-weight="700" font-size="15" letter-spacing="1.4">`,
    `<tspan x="0" fill="#ffffff">AUTO STYLING</tspan>`,
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
