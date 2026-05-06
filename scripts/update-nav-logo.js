#!/usr/bin/env node
/**
 * Replace the inline shield SVG inside <div class="nav-logo-mark">…</div>
 * across every HTML file with the new Capital Upfitters CU shield (Nov 2026).
 *
 * Idempotent — re-running is safe.
 *
 * Notes:
 *   - The mark is drawn as inline SVG so it stays crisp at any size and
 *     doesn't depend on an external file.
 *   - Body fill uses currentColor so the existing CSS background on
 *     .nav-logo-mark continues to set the surrounding tile color; the
 *     shield itself sits on top with its own black body and white border.
 */
const fs = require('fs')
const path = require('path')
const glob = require('glob')

const ROOT = path.join(__dirname, '..')

// 40x40 viewBox, designed to match the supplied CU shield image exactly:
//   - black outer stroke
//   - white inner stroke
//   - black shield body
//   - blue "C" + gold "U" letters
//   - white vertical seam through the lower half
const NEW_MARK = `<svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M3.5 6.5 L20 3 L36.5 6.5 L36.5 18 C36.5 27.5 30 35 20 37.5 C10 35 3.5 27.5 3.5 18 Z" fill="#000000"/><path d="M5.5 8 L20 5 L34.5 8 L34.5 18 C34.5 26.5 28.8 33.4 20 35.7 C11.2 33.4 5.5 26.5 5.5 18 Z" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/><line x1="20" y1="22" x2="20" y2="35" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/><text x="13" y="24" text-anchor="middle" font-family="Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif" font-size="16" font-weight="900" fill="#103b68" letter-spacing="-0.6">C</text><text x="27" y="24" text-anchor="middle" font-family="Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif" font-size="16" font-weight="900" fill="#fcbf0d" letter-spacing="-0.6">U</text></svg>`

// Match either multi-line or single-line existing markup.
const RE_BLOCK = /(<div class="nav-logo-mark"[^>]*>)\s*<svg\b[\s\S]*?<\/svg>\s*(<\/div>)/g

const files = glob.sync('**/*.html', {
  cwd: ROOT,
  ignore: ['node_modules/**', 'admin/**', '.vercel/**', 'tina/__generated__/**'],
})

let touched = 0
for (const rel of files) {
  const p = path.join(ROOT, rel)
  const before = fs.readFileSync(p, 'utf8')
  const after = before.replace(RE_BLOCK, `$1${NEW_MARK}$2`)
  if (before !== after) {
    fs.writeFileSync(p, after)
    console.log(`\u2713 ${rel}`)
    touched++
  }
}
console.log(`\nDone. ${touched}/${files.length} files updated.`)
