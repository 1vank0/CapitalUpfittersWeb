#!/usr/bin/env node
/**
 * Backfill content/services/*.md frontmatter with content extracted from
 * services/*.html so the CMS has real values for the deeper bindings:
 *   - benefits.heading / benefits.intro / benefits.cards[].title|description
 *   - featureSection.heading / .intro / .cards[].title|subtitle|description
 *   - geoCallout.heading / .body
 *   - sectionTitles.{pricing,process,testimonials,faqs}
 *   - aboutBody (best-effort: last <p> in the document body region)
 *
 * Existing values in the .md frontmatter are PRESERVED — we only fill in
 * fields that are currently missing, null, or empty string. Re-running is
 * therefore safe and idempotent.
 *
 * Usage: node scripts/backfill-cms-from-html.js
 */

const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const matter = require('gray-matter')

const ROOT = path.resolve(__dirname, '..')
const SERVICES_HTML = path.join(ROOT, 'services')
const SERVICES_MD = path.join(ROOT, 'content', 'services')

// ─── helpers ────────────────────────────────────────────────────────────────
const isEmpty = (v) => v == null || (typeof v === 'string' && v.trim() === '')

// Set obj.path = value, only if existing slot is empty / missing.
function setIfEmpty(obj, path, value) {
  if (isEmpty(value)) return
  const keys = path.split('.')
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}
    cur = cur[k]
  }
  const last = keys[keys.length - 1]
  if (isEmpty(cur[last])) cur[last] = value
}

// Tidy whitespace + decode common entities (cheerio.text() returns decoded text already).
const clean = (s) =>
  (s || '')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim()

// ─── extractor ──────────────────────────────────────────────────────────────
function extract(html) {
  const $ = cheerio.load(html, { decodeEntities: true })
  const out = {}

  // Benefits
  const benefitsHeading = clean($('#benefits-heading').first().text())
  if (benefitsHeading) {
    out.benefits = out.benefits || {}
    out.benefits.heading = benefitsHeading
    // First <p> after the H2 in the same section
    const intro = $('#benefits-heading').nextAll('p').first()
    if (intro.length === 0) {
      // Try inside the same parent
      const p = $('#benefits-heading').parent().find('p').first()
      if (p.length) out.benefits.intro = clean(p.text())
    } else {
      out.benefits.intro = clean(intro.text())
    }
  }
  const benefitCards = []
  $('.benefit-card').each((_, el) => {
    const $el = $(el)
    benefitCards.push({
      title: clean($el.find('.benefit-title').text()),
      description: clean($el.find('.benefit-desc').text()),
    })
  })
  if (benefitCards.length) {
    out.benefits = out.benefits || {}
    out.benefits.cards = benefitCards
  }

  // Feature/expansion section (towing-card style)
  // Find an H2 whose id includes "advanced", "towing", "feature", "expansion"
  const featureH2 = $('h2').filter(function () {
    const id = ($(this).attr('id') || '').toLowerCase()
    return /advanced|towing|feature|expansion/.test(id)
  }).first()
  if (featureH2.length) {
    out.featureSection = out.featureSection || {}
    out.featureSection.heading = clean(featureH2.text())
    const intro = featureH2.nextAll('p').first()
    if (intro.length) out.featureSection.intro = clean(intro.text())
    else {
      const p = featureH2.parent().find('p').first()
      if (p.length) out.featureSection.intro = clean(p.text())
    }
  }
  const featureCards = []
  $('.towing-card').each((_, el) => {
    const $el = $(el)
    featureCards.push({
      title: clean($el.find('.towing-card-name').text()),
      subtitle: clean($el.find('.towing-card-sub').text()),
      description: clean($el.find('.towing-card-desc').text()),
    })
  })
  if (featureCards.length) {
    out.featureSection = out.featureSection || {}
    out.featureSection.cards = featureCards
  }

  // Geo callout
  const geoH2 = $('h2[id^="geo-heading"]').first()
  if (geoH2.length) {
    out.geoCallout = out.geoCallout || {}
    out.geoCallout.heading = clean(geoH2.text())
    // First <p> after the geo H2
    const p = geoH2.nextAll('p').first()
    if (p.length) {
      out.geoCallout.body = clean(p.text())
    } else {
      // Fall back to first paragraph inside the same section parent
      const sec = geoH2.closest('section')
      const fp = sec.find('p').first()
      if (fp.length) out.geoCallout.body = clean(fp.text())
    }
  }

  // Section title overrides
  const titleMap = {
    pricing: '#pricing-heading',
    process: '#process-heading',
    faqs: '#faq-heading',
  }
  for (const [k, sel] of Object.entries(titleMap)) {
    const t = clean($(sel).first().text())
    if (t) {
      out.sectionTitles = out.sectionTitles || {}
      out.sectionTitles[k] = t
    }
  }
  // Testimonials heading id varies (testimonials-heading-<slug>)
  const tH2 = $('h2[id^="testimonials-heading"]').first()
  if (tH2.length) {
    out.sectionTitles = out.sectionTitles || {}
    out.sectionTitles.testimonials = clean(tH2.text())
  }

  // About / closing paragraph (best-effort): the LAST visible <p> inside the page-hero
  // area is rarely useful — instead grab the last paragraph in a section that contains
  // "Capital Upfitters" or appears near the bottom. Heuristic: pick the longest paragraph
  // not already used as an intro/desc/etc.
  const usedTexts = new Set()
  ;[
    out.benefits?.intro,
    out.featureSection?.intro,
    out.geoCallout?.body,
    ...(out.benefits?.cards || []).map((c) => c.description),
    ...(out.featureSection?.cards || []).map((c) => c.description),
  ]
    .filter(Boolean)
    .forEach((t) => usedTexts.add(t))

  // aboutBody is intentionally LEFT EMPTY here. The previous heuristic kept
  // grabbing testimonial quotes / unrelated paragraphs, which is worse than no
  // value. Editors can fill aboutBody manually in Tina if they want one.

  return out
}

// ─── runner ─────────────────────────────────────────────────────────────────
function processOne(slug) {
  const htmlPath = path.join(SERVICES_HTML, `${slug}.html`)
  const mdPath = path.join(SERVICES_MD, `${slug}.md`)
  if (!fs.existsSync(htmlPath)) return { slug, status: 'no-html' }
  if (!fs.existsSync(mdPath)) return { slug, status: 'no-md' }

  const html = fs.readFileSync(htmlPath, 'utf8')
  const extracted = extract(html)

  const raw = fs.readFileSync(mdPath, 'utf8')
  const parsed = matter(raw)
  const data = parsed.data || {}

  // Merge: only fill fields that are currently empty in the .md frontmatter.
  if (extracted.benefits) {
    data.benefits = data.benefits || {}
    setIfEmpty(data, 'benefits.heading', extracted.benefits.heading)
    setIfEmpty(data, 'benefits.intro', extracted.benefits.intro)
    if (
      (!Array.isArray(data.benefits.cards) || data.benefits.cards.length === 0) &&
      Array.isArray(extracted.benefits.cards) &&
      extracted.benefits.cards.length
    ) {
      data.benefits.cards = extracted.benefits.cards
    }
  }
  if (extracted.featureSection) {
    data.featureSection = data.featureSection || {}
    setIfEmpty(data, 'featureSection.heading', extracted.featureSection.heading)
    setIfEmpty(data, 'featureSection.intro', extracted.featureSection.intro)
    if (
      (!Array.isArray(data.featureSection.cards) || data.featureSection.cards.length === 0) &&
      Array.isArray(extracted.featureSection.cards) &&
      extracted.featureSection.cards.length
    ) {
      data.featureSection.cards = extracted.featureSection.cards
    }
  }
  if (extracted.geoCallout) {
    data.geoCallout = data.geoCallout || {}
    setIfEmpty(data, 'geoCallout.heading', extracted.geoCallout.heading)
    setIfEmpty(data, 'geoCallout.body', extracted.geoCallout.body)
  }
  if (extracted.sectionTitles) {
    data.sectionTitles = data.sectionTitles || {}
    for (const [k, v] of Object.entries(extracted.sectionTitles)) {
      setIfEmpty(data, `sectionTitles.${k}`, v)
    }
  }
  setIfEmpty(data, 'aboutBody', extracted.aboutBody)

  const newRaw = matter.stringify(parsed.content, data, {
    // Keep YAML formatting calm
    lineWidth: 200,
  })
  if (newRaw !== raw) {
    fs.writeFileSync(mdPath, newRaw)
    return { slug, status: 'updated' }
  }
  return { slug, status: 'unchanged' }
}

const slugs = fs
  .readdirSync(SERVICES_HTML)
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .map((f) => f.replace(/\.html$/, ''))

const results = slugs.map(processOne)
results.forEach((r) => console.log(`${r.status.padEnd(10)} ${r.slug}`))
const updated = results.filter((r) => r.status === 'updated').length
console.log(`\n${updated}/${slugs.length} markdown files updated`)
