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
  // Site display font = Barlow Condensed (already loaded site-wide via
  // base.css). Using it here keeps the wordmark consistent with every
  // headline on the site. Falls back to Arial Narrow / Impact if Barlow
  // hasn't loaded yet.
  const FONT =
    "'Barlow Condensed', 'Arial Narrow', Impact, 'Arial Narrow Bold', sans-serif"
  // viewBox 0 0 600 160 — plenty of vertical room so the separator and
  // tagline sit below UPFITTERS' descender area without overlap.
  //   y  78        CAPITAL baseline   (full width via textLength=600)
  //   y 132        UPFITTERS baseline (full width via textLength=600)
  //   y 142        separator          (white 0..255 / gold 255..600)
  //   y 158        tagline baseline   (Barlow Condensed)
  return [
    `<svg class="${className}" width="300" height="80" viewBox="0 0 600 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Capital Upfitters \u2014 Auto Styling / Performance / Protection">`,
    // CAPITAL — same width as UPFITTERS via identical textLength
    `<text x="0" y="78" font-family="${FONT}" font-weight="900" font-size="96" fill="#ffffff" letter-spacing="0" textLength="600" lengthAdjust="spacingAndGlyphs">CAPITAL</text>`,
    // UPFITTERS — brand gold, full width
    `<text x="0" y="132" font-family="${FONT}" font-weight="900" font-size="68" fill="#fcbf0d" letter-spacing="0" textLength="600" lengthAdjust="spacingAndGlyphs">UPFITTERS</text>`,
    // Separator: white left ~42%, gold right ~58%
    `<line x1="0" y1="142" x2="255" y2="142" stroke="#ffffff" stroke-width="4"/>`,
    `<line x1="255" y1="142" x2="600" y2="142" stroke="#fcbf0d" stroke-width="4"/>`,
    // Tagline in Barlow Condensed — white words, gold slashes
    `<text y="158" font-family="${FONT}" font-weight="700" font-size="16" letter-spacing="1.6">`,
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
