#!/usr/bin/env node
/**
 * Remove the leftover Payload-CMS hydration script blocks from every HTML
 * page. These blocks try to fetch from the old Payload backend
 * (capital-upfitters-6iq57bc73-...) which is dead and triggers CORS errors
 * in the browser console.
 *
 * Pattern: <script>\n/* CMS hydration ...*\/\n(function() { ... CMS_BASE ... })();\n</script>
 *
 * Idempotent — does nothing if the script block is already gone.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

function strip(html) {
  // Match any <script>...</script> block that references the dead Payload host.
  // Use a bounded pattern that won't accidentally swallow following scripts.
  const re = /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?capital-upfitters-6iq57bc73(?:(?!<\/script>)[\s\S])*?<\/script>\s*/g
  return html.replace(re, '')
}

function walk(dir, list = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.vercel' || entry.name === 'admin' || entry.name.startsWith('.')) continue
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, list)
    else if (entry.name.endsWith('.html')) list.push(p)
  }
  return list
}

const files = walk(ROOT)
let touched = 0
for (const f of files) {
  const before = fs.readFileSync(f, 'utf8')
  const after = strip(before)
  if (after !== before) {
    fs.writeFileSync(f, after)
    console.log('cleaned:', path.relative(ROOT, f))
    touched++
  }
}
console.log(`\n${touched}/${files.length} files cleaned`)
