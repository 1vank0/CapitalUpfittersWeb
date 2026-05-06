#!/usr/bin/env node
/**
 * Replace the old single-shield nav/footer logo SVG with the new
 * Capital Upfitters CU shield mark across all HTML files.
 *
 * Idempotent — re-running is safe.
 */
const fs = require('fs')
const path = require('path')
const glob = require('glob')

const ROOT = path.join(__dirname, '..')

// New mark — kept as a single SVG string so the markup stays inline.
// Color is `currentColor` so the nav (white) and footer (white-ish) tints work.
const NEW_MARK = `<svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 3L5 8v9c0 8.5 5.7 16.4 15 18.5 9.3-2.1 15-10 15-18.5V8L20 3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><line x1="20" y1="9" x2="20" y2="32" stroke="currentColor" stroke-width="1.2" opacity=".55"/><text x="14" y="24" text-anchor="middle" font-family="Impact, 'Arial Black', Arial, sans-serif" font-size="16" font-weight="900" fill="currentColor" letter-spacing="-0.5">C</text><text x="26" y="24" text-anchor="middle" font-family="Impact, 'Arial Black', Arial, sans-serif" font-size="16" font-weight="900" fill="#e89f05" letter-spacing="-0.5">U</text></svg>`

// Old SVG patterns (multi-line and single-line). We replace the entire
// <svg ...>...</svg> inside <div class="nav-logo-mark">.
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
