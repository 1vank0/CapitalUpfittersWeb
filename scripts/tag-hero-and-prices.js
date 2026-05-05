#!/usr/bin/env node
/**
 * Adds `data-cms-hero` to every <section class="page-hero"> in services/*.html.
 * Idempotent — re-running is safe.
 *
 * Also (intentionally minimal): leaves price strings untouched. Pricing single-
 * source is achieved by:
 *   - Homepage / services-index card grids → JS-rendered from CMS (already)
 *   - Service-page pricing tables → already bound via data-cms-list="pricing"
 *   - Schema.org / hero copy → those are written content, kept as fallback
 */
const fs = require('fs')
const path = require('path')

const SERVICES_DIR = path.join(__dirname, '..', 'services')
const files = fs.readdirSync(SERVICES_DIR).filter((f) => f.endsWith('.html') && f !== 'index.html')

let touched = 0
for (const f of files) {
  const p = path.join(SERVICES_DIR, f)
  let html = fs.readFileSync(p, 'utf8')
  const before = html

  // 1. Add data-cms-hero to page-hero section if not already there
  html = html.replace(
    /<section class="page-hero"(?![^>]*data-cms-hero)([^>]*)>/g,
    '<section class="page-hero" data-cms-hero$1>'
  )

  if (html !== before) {
    fs.writeFileSync(p, html)
    touched++
    console.log(`✓ ${f}`)
  } else {
    console.log(`= ${f} (already tagged)`)
  }
}
console.log(`\nDone. ${touched}/${files.length} files updated.`)
