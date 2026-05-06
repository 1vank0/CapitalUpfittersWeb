#!/usr/bin/env node
/**
 * Replace the text-based "Capital Upfitters" wordmark in the nav and
 * footer with an inline SVG wordmark that matches the brand reference
 * (CAPITAL in white / UPFITTERS in gold + tagline + colored underline).
 *
 * Targets:
 *   - <div class="nav-logo-text">Capital<span>Upfitters</span></div>
 *   - <div class="footer-brand-name">Capital<span>Upfitters</span></div>
 *
 * Idempotent: re-running re-replaces the same nodes without nesting.
 *
 * Notes:
 *   - The nav background is dark, so "CAPITAL" is rendered white instead of
 *     black (otherwise it would be invisible). "UPFITTERS" is brand gold.
 *   - The shield logo to the left is left untouched.
 */
const fs = require('fs')
const path = require('path')
const glob = require('glob')

const ROOT = path.join(__dirname, '..')

// SVG wordmark — full version with separator underline + tagline
function wordmarkSVG(className) {
  return `<svg class="${className}" width="220" height="46" viewBox="0 0 320 70" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Capital Upfitters \u2014 Auto Styling, Performance, Protection"><text x="0" y="26" font-family="Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif" font-weight="900" font-size="28" fill="#ffffff" letter-spacing="2">CAPITAL</text><text x="0" y="52" font-family="Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif" font-weight="900" font-size="28" fill="#fcbf0d" letter-spacing="2">UPFITTERS</text><line x1="0" y1="56" x2="105" y2="56" stroke="#103b68" stroke-width="2"/><line x1="105" y1="56" x2="220" y2="56" stroke="#fcbf0d" stroke-width="2"/><text x="0" y="68" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="700" font-size="7" fill="#cbd5e1" letter-spacing="1.4">AUTO STYLING&#160;&#160;/&#160;&#160;PERFORMANCE&#160;&#160;/&#160;&#160;PROTECTION</text></svg>`
}

// Each replacement pair: regex matching the original text wrapper, and the
// SVG wordmark wrapped in the same outer div so we keep CSS selectors valid.
const REPLACEMENTS = [
  {
    name: 'nav',
    re: /<div class="nav-logo-text">Capital<span>Upfitters<\/span><\/div>/g,
    out: `<div class="nav-logo-text">${wordmarkSVG('nav-wordmark-svg')}</div>`,
  },
  {
    name: 'footer',
    re: /<div class="footer-brand-name">Capital<span>Upfitters<\/span><\/div>/g,
    out: `<div class="footer-brand-name">${wordmarkSVG('footer-wordmark-svg')}</div>`,
  },
  // Legacy blog footer: <span>Capital<strong>Upfitters</strong></span>
  {
    name: 'footer-legacy',
    re: /<span>Capital<strong>Upfitters<\/strong><\/span>/g,
    out: `<span class="footer-brand-name">${wordmarkSVG('footer-wordmark-svg')}</span>`,
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
  for (const r of REPLACEMENTS) html = html.replace(r.re, r.out)
  if (html !== before) {
    fs.writeFileSync(p, html)
    console.log(`\u2713 ${rel}`)
    touched++
  }
}
console.log(`\nDone. ${touched}/${files.length} files updated.`)
