#!/usr/bin/env node
/**
 * One-shot seeder for the new Brand Library and Gallery collections.
 *
 * Brands are seeded from the trust-bar entries on the homepage (no logo
 * files exist yet, so the library starts with brand names + taglines and
 * the editor uploads logos later).
 *
 * Gallery items are seeded from the existing data-cat / data-label entries
 * on gallery.html. Images are left blank — the editor uploads photos later.
 *
 * Idempotent: if the target file already exists, it's left alone.
 */
const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')

const ROOT = path.join(__dirname, '..')

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function writeIfMissing(file, payload) {
  if (fs.existsSync(file)) {
    console.log(`  = exists: ${path.relative(ROOT, file)}`)
    return false
  }
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n')
  console.log(`  + wrote: ${path.relative(ROOT, file)}`)
  return true
}

// ─── BRANDS ──────────────────────────────────────────────────────────────
function seedBrands() {
  console.log('\nBrands:')
  const dir = path.join(ROOT, 'content', 'brands')
  ensureDir(dir)
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  const $ = cheerio.load(html)
  const items = []
  $('.trust-bar-inner .trust-item').each((i, el) => {
    const name = $(el).find('strong').first().text().trim()
    const tagline = $(el).find('span').first().text().trim()
    if (!name) return
    const key = slugify(name)
    items.push({ key, name, tagline, sortOrder: (i + 1) * 10 })
  })
  if (!items.length) {
    console.log('  ! no trust-bar entries found')
    return
  }
  items.forEach((b) => writeIfMissing(path.join(dir, `${b.key}.json`), b))
}

// ─── GALLERY ─────────────────────────────────────────────────────────────
function seedGallery() {
  console.log('\nGallery:')
  const dir = path.join(ROOT, 'content', 'gallery')
  ensureDir(dir)
  const html = fs.readFileSync(path.join(ROOT, 'gallery.html'), 'utf8')
  const $ = cheerio.load(html)
  const seenLabels = new Set()
  let i = 0
  $('.gallery-grid .gallery-item').each((_, el) => {
    const cat = $(el).attr('data-cat') || ''
    const label = $(el).attr('data-label') || ''
    if (!label) return
    // size hint from existing class (.tall / .med / .short)
    const ph = $(el).find('.gallery-placeholder').attr('class') || ''
    const size = /\btall\b/.test(ph) ? 'tall' : /\bshort\b/.test(ph) ? 'short' : 'med'
    // dedupe identical labels (gallery has some repeats)
    let baseKey = slugify(label)
    let key = baseKey
    let n = 1
    while (seenLabels.has(key)) {
      n += 1
      key = `${baseKey}-${n}`
    }
    seenLabels.add(key)
    i += 1
    const payload = {
      label,
      category: cat,
      size,
      tags: cat ? [cat] : [],
      sortOrder: i * 10,
      active: true,
    }
    writeIfMissing(path.join(dir, `${key}.json`), payload)
  })
  if (!i) console.log('  ! no gallery entries found')
}

// ─── ENSURE every service has priceFrom ──────────────────────────────────
function ensurePriceFrom() {
  console.log('\nServices priceFrom check:')
  const matter = require('gray-matter')
  const dir = path.join(ROOT, 'content', 'services')
  fs.readdirSync(dir).filter((f) => f.endsWith('.md')).forEach((f) => {
    const p = path.join(dir, f)
    const raw = fs.readFileSync(p, 'utf8')
    const parsed = matter(raw)
    if (parsed.data.priceFrom == null || parsed.data.priceFrom === '') {
      console.log(`  ! ${f} missing priceFrom (left blank \u2014 editor will fill)`)
    } else {
      console.log(`  \u2713 ${f}: ${parsed.data.priceFrom}`)
    }
  })
}

seedBrands()
seedGallery()
ensurePriceFrom()
console.log('\nDone.')
