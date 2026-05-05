#!/usr/bin/env node
/**
 * Deep CMS-binding tagger for service pages.
 *
 * Adds data-cms-bind hooks to:
 *   • Benefit cards   (.benefit-card .benefit-title / .benefit-desc)        → benefits.cards[i].title / .description
 *   • Benefit section heading + intro                                       → benefits.heading / .intro
 *   • Feature/expansion cards (.towing-card .name / .sub / .desc)           → featureSection.cards[i].title / .subtitle / .description
 *   • Feature section heading + intro                                       → featureSection.heading / .intro
 *   • Geo callout heading + body paragraph                                  → geoCallout.heading / .body
 *   • Section H2s (pricing, process, testimonials, faqs)                    → sectionTitles.*
 *   • The closing paragraph in the final section                            → aboutBody
 *
 * Strategy: regex-based, in place. Idempotent (re-running is a no-op when
 * data-cms-bind is already present on the target element).
 *
 * The HTML keeps its existing visible text as a fallback — the binding
 * engine in cms-integration.js only overrides text when the CMS field is
 * non-empty.
 *
 * Usage:  node scripts/tag-service-deep.js
 */

const fs = require('fs')
const path = require('path')

const SERVICES_DIR = path.resolve(__dirname, '..', 'services')

// ─── helpers ────────────────────────────────────────────────────────────────
function patchOnce(html, find, replace) {
  // Apply replace only if the resulting text isn't already present.
  // Caller's `replace` should be self-deduping via the pattern.
  return html.replace(find, replace)
}

// Add an attribute inside an opening tag, only if it isn't already there.
function addAttrIfMissing(openTag, attrName, attrValue) {
  if (new RegExp(`\\b${attrName}=`).test(openTag)) return openTag
  return openTag.replace(/>$/, ` ${attrName}="${attrValue}">`)
}

// Tag the Nth occurrence of an element matching `tagPattern` with `attrs` (object)
function tagNthMatch(html, tagPattern, attrs, n) {
  let count = 0
  return html.replace(tagPattern, (match) => {
    if (count++ !== n) return match
    let updated = match
    for (const [k, v] of Object.entries(attrs)) {
      updated = addAttrIfMissing(updated, k, v)
    }
    return updated
  })
}

// ─── tagger primitives ──────────────────────────────────────────────────────

// Tag a single H2 by its `id` attribute with one binding.
function tagH2ById(html, id, bindPath) {
  const re = new RegExp(`<h2([^>]*\\bid="${id}"[^>]*)>`, 'i')
  return html.replace(re, (m, inner) => {
    if (/data-cms-bind=/.test(inner)) return m
    return `<h2${inner} data-cms-bind="${bindPath}">`
  })
}

// Tag the first <p> immediately after an opening <h2 id="..."> as the section intro.
// Looks for: <h2 id="X" ...>...</h2>\s*<p ...>...</p>
function tagFirstParagraphAfterH2(html, h2Id, bindPath) {
  const re = new RegExp(
    `(<h2[^>]*\\bid="${h2Id}"[^>]*>[\\s\\S]*?<\\/h2>\\s*)(<p\\b[^>]*)(>)`,
    'i'
  )
  return html.replace(re, (match, before, popen, gt) => {
    if (/data-cms-bind=/.test(popen)) return match
    return `${before}${popen} data-cms-bind="${bindPath}"${gt}`
  })
}

// Tag every .benefit-card title + desc with benefits.cards[i].title / .description
function tagBenefitCards(html) {
  // Tag each ".benefit-title" with benefits.cards[i].title (i = order of appearance)
  let i = 0
  html = html.replace(/<div class="benefit-title"([^>]*)>/g, (m, attrs) => {
    if (/data-cms-bind=/.test(attrs)) return m
    const out = `<div class="benefit-title"${attrs} data-cms-bind="benefits.cards[${i}].title">`
    i++
    return out
  })
  let j = 0
  html = html.replace(/<p class="benefit-desc"([^>]*)>/g, (m, attrs) => {
    if (/data-cms-bind=/.test(attrs)) return m
    const out = `<p class="benefit-desc"${attrs} data-cms-bind="benefits.cards[${j}].description">`
    j++
    return out
  })
  return html
}

// Tag every .towing-card name/subtitle/description with featureSection.cards[i].*
function tagFeatureCards(html) {
  let iN = 0, iS = 0, iD = 0
  html = html.replace(/<div class="towing-card-name"([^>]*)>/g, (m, attrs) => {
    if (/data-cms-bind=/.test(attrs)) return m
    const out = `<div class="towing-card-name"${attrs} data-cms-bind="featureSection.cards[${iN}].title">`
    iN++
    return out
  })
  html = html.replace(/<div class="towing-card-sub"([^>]*)>/g, (m, attrs) => {
    if (/data-cms-bind=/.test(attrs)) return m
    const out = `<div class="towing-card-sub"${attrs} data-cms-bind="featureSection.cards[${iS}].subtitle">`
    iS++
    return out
  })
  html = html.replace(/<p class="towing-card-desc"([^>]*)>/g, (m, attrs) => {
    if (/data-cms-bind=/.test(attrs)) return m
    const out = `<p class="towing-card-desc"${attrs} data-cms-bind="featureSection.cards[${iD}].description">`
    iD++
    return out
  })
  return html
}

// Tag the geo-section H2 (id contains "geo-heading") and the FIRST paragraph
// after it as the body. Done with a single regex so we don't mis-slice.
function tagGeoCallout(html) {
  const h2Re = /<h2([^>]*\bid="(geo-heading[^"]*)"[^>]*)>/i
  const m = html.match(h2Re)
  if (!m) return html
  const fullId = m[2]
  html = tagH2ById(html, fullId, 'geoCallout.heading')
  // Now find the H2 closing tag and the FIRST <p> after it; tag in one pass.
  const re = new RegExp(
    `(<h2[^>]*\\bid="${fullId}"[^>]*>[\\s\\S]*?<\\/h2>[\\s\\S]*?<p\\b)([^>]*)(>)`,
    'i'
  )
  return html.replace(re, (match, before, attrs, gt) => {
    if (/data-cms-bind=/.test(attrs)) return match
    return `${before}${attrs} data-cms-bind="geoCallout.body"${gt}`
  })
}

// Tag the benefits section H2 + intro paragraph (id=benefits-heading)
function tagBenefitsSection(html) {
  html = tagH2ById(html, 'benefits-heading', 'benefits.heading')
  html = tagFirstParagraphAfterH2(html, 'benefits-heading', 'benefits.intro')
  return html
}

// Tag the feature/expansion section H2 + intro paragraph
// Heading id is typically "advanced-towing-heading" or similar — be lenient.
function tagFeatureSectionHeader(html) {
  // Find any H2 with class hint OR id that suggests "feature/towing/expansion/advanced"
  const candidates = [
    'advanced-towing-heading',
    'towing-heading',
    'feature-heading',
    'expansion-heading',
    'advanced-heading',
  ]
  for (const id of candidates) {
    if (html.includes(`id="${id}"`)) {
      html = tagH2ById(html, id, 'featureSection.heading')
      html = tagFirstParagraphAfterH2(html, id, 'featureSection.intro')
      return html
    }
  }
  return html
}

// Tag the standard section H2s by id
function tagStandardSectionTitles(html) {
  html = tagH2ById(html, 'pricing-heading', 'sectionTitles.pricing')
  html = tagH2ById(html, 'process-heading', 'sectionTitles.process')
  html = tagH2ById(html, 'faq-heading', 'sectionTitles.faqs')
  // Testimonials H2 ids vary per-page (testimonials-heading-<slug>); match prefix.
  html = html.replace(/<h2([^>]*\bid="testimonials-heading[^"]*"[^>]*)>/, (m, inner) => {
    if (/data-cms-bind=/.test(inner)) return m
    return `<h2${inner} data-cms-bind="sectionTitles.testimonials">`
  })
  return html
}

// ─── runner ─────────────────────────────────────────────────────────────────
function processFile(filePath) {
  const before = fs.readFileSync(filePath, 'utf8')
  let html = before
  html = tagBenefitCards(html)
  html = tagFeatureCards(html)
  html = tagBenefitsSection(html)
  html = tagFeatureSectionHeader(html)
  html = tagGeoCallout(html)
  html = tagStandardSectionTitles(html)
  if (html !== before) {
    fs.writeFileSync(filePath, html)
    return true
  }
  return false
}

const files = fs
  .readdirSync(SERVICES_DIR)
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .map((f) => path.join(SERVICES_DIR, f))

let touched = 0
for (const f of files) {
  if (processFile(f)) {
    console.log('tagged:', path.relative(process.cwd(), f))
    touched++
  } else {
    console.log('  ok  :', path.relative(process.cwd(), f))
  }
}
console.log(`\n${touched}/${files.length} files updated`)
