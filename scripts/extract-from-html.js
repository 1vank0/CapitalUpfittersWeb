#!/usr/bin/env node
/**
 * Extract content from the live site HTML and populate Tina markdown files.
 * Reads:  services/*.html, locations/*.html, index.html, contact.html
 * Writes: content/services/*.md, content/geo-pages/*.md,
 *         content/testimonials/*.md, content/faqs/*.md, content/content-blocks/*.md,
 *         content/globals/settings.json
 *
 * Idempotent — re-running just refreshes the data.
 */
const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const matter = require('gray-matter')

const ROOT = path.resolve(__dirname, '..')

// ---------- helpers ----------
const clean = (s) =>
  (s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Pull text from a Cheerio node, but replace <br> with a space so adjacent
// text doesn't get glued together (e.g. "Premium Upfitting.<br>DMV's Most Trusted").
const textWithBreaks = ($, $node) => {
  if (!$node || !$node.length) return ''
  const $clone = $node.clone()
  $clone.find('br').replaceWith(' ')
  return clean($clone.text())
}

const slugify = (s) =>
  clean(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const writeMd = (filePath, data, body = '') => {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  // Strip any null/empty values so frontmatter stays tidy
  const cleanData = {}
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined || v === '') continue
    cleanData[k] = v
  }
  const out = matter.stringify(body || '', cleanData)
  fs.writeFileSync(filePath, out)
}

const writeJson = (filePath, obj) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n')
}

// Convert basic HTML inside a node to markdown (paragraphs, lists, h2/h3)
function htmlToMarkdown($, $node) {
  const lines = []
  $node.contents().each((_, el) => {
    if (el.type === 'text') {
      const t = clean($(el).text())
      if (t) lines.push(t)
      return
    }
    const $el = $(el)
    const tag = el.tagName?.toLowerCase()
    if (!tag) return
    if (['script', 'style', 'svg', 'button', 'nav'].includes(tag)) return
    if (tag === 'h1') lines.push(`# ${clean($el.text())}`)
    else if (tag === 'h2') lines.push(`## ${clean($el.text())}`)
    else if (tag === 'h3') lines.push(`### ${clean($el.text())}`)
    else if (tag === 'h4') lines.push(`#### ${clean($el.text())}`)
    else if (tag === 'p') {
      const t = clean($el.text())
      if (t) lines.push(t)
    } else if (tag === 'ul' || tag === 'ol') {
      $el.find('> li').each((__, li) => {
        const t = clean($(li).text())
        if (t) lines.push(`- ${t}`)
      })
    } else if (tag === 'div' || tag === 'section' || tag === 'article') {
      const inner = htmlToMarkdown($, $el)
      if (inner) lines.push(inner)
    }
  })
  return lines.filter(Boolean).join('\n\n')
}

// ---------- SERVICES ----------
const SERVICE_MAP = {
  // file slug => { canonical slug for content/services/<slug>.md, category, sortOrder, icon }
  'bedliner':            { slug: 'bedliner', category: 'bedliners', sortOrder: 1, icon: 'truck' },
  'tonneau':             { slug: 'tonneau', category: 'truck-accessories', sortOrder: 2, icon: 'box' },
  'running-boards':      { slug: 'running-boards', category: 'truck-accessories', sortOrder: 3, icon: 'arrow-down-up' },
  'ceramic-coating':     { slug: 'ceramic-coating', category: 'protection', sortOrder: 4, icon: 'sparkles' },
  'undercoating':        { slug: 'undercoating', category: 'protection', sortOrder: 5, icon: 'shield' },
  'window-tinting':      { slug: 'window-tinting', category: 'protection', sortOrder: 6, icon: 'sun' },
  'mobile-detailing':    { slug: 'mobile-detailing', category: 'protection', sortOrder: 7, icon: 'droplets' },
  'hitches':             { slug: 'hitches', category: 'truck-accessories', sortOrder: 8, icon: 'link' },
  'camper-shells':       { slug: 'camper-shells', category: 'truck-accessories', sortOrder: 9, icon: 'home' },
  'toolboxes':           { slug: 'toolboxes', category: 'truck-accessories', sortOrder: 10, icon: 'briefcase' },
  'suspension':          { slug: 'suspension', category: 'truck-accessories', sortOrder: 11, icon: 'arrow-up-down' },
  'exterior':            { slug: 'exterior', category: 'truck-accessories', sortOrder: 12, icon: 'wrench' },
  'lighting':            { slug: 'lighting', category: 'truck-accessories', sortOrder: 13, icon: 'lightbulb' },
  'commercial-wraps':    { slug: 'commercial-wraps', category: 'fleet', sortOrder: 14, icon: 'palette' },
  'industrial-coatings': { slug: 'industrial-coatings', category: 'industrial', sortOrder: 15, icon: 'factory' },
}

function extractPriceFrom($, html) {
  // Try meta description "starting at $575" or hero text
  const desc = $('meta[name="description"]').attr('content') || ''
  const ogDesc = $('meta[property="og:description"]').attr('content') || ''
  const heroSub = $('.page-hero-sub').first().text() || ''
  const candidate = `${desc} ${ogDesc} ${heroSub} ${html.slice(0, 4000)}`
  const m = candidate.match(/(?:starting at|from|starts at)\s*\$\s*(\d{2,5})/i)
  return m ? Number(m[1]) : null
}

function extractServiceBody($, $hero) {
  // Take the hero subtitle + first 1-3 narrative sections (h2 + paragraphs that follow),
  // skipping FAQ/testimonial/CTA/related sections.
  const heroSub = clean($hero.find('.page-hero-sub').first().text())
  const intro = heroSub ? `${heroSub}\n\n` : ''

  const SKIP_HEADINGS = /(common questions|real customers|ready to|while you'?re here|the patriot liner process|frequently asked|reviews?)/i
  const sections = []

  $('section').each((_, sec) => {
    const $sec = $(sec)
    if ($sec.hasClass('page-hero')) return
    const $h2 = $sec.find('h2').first()
    if (!$h2.length) return
    const heading = clean($h2.text())
    if (!heading) return
    if (SKIP_HEADINGS.test(heading)) return
    // Pull paragraphs (skip ones that are clearly UI copy)
    const paras = []
    $sec.find('p').each((__, p) => {
      const $p = $(p)
      // skip CTAs / button-like p
      if ($p.parents('.hero-ctas, .geo-hero-ctas, .cta-banner-content').length) return
      if ($p.hasClass('section-eyebrow')) return
      if ($p.hasClass('faq-question')) return
      const t = clean($p.text())
      if (!t || t.length < 20) return
      // Avoid pricing-list duplicates etc.
      paras.push(t)
    })
    // Lists (benefits, features, etc.)
    const listItems = []
    $sec.find('ul li, ol li').each((__, li) => {
      const $li = $(li)
      if ($li.parents('nav, .nav, .nav-mobile, .nav-mobile-section, .footer, .breadcrumb').length) return
      const t = clean($li.text())
      if (t && t.length < 200) listItems.push(t)
    })

    if (paras.length || listItems.length) {
      let block = `## ${heading}\n\n`
      if (paras.length) block += paras.slice(0, 4).join('\n\n')
      if (listItems.length) {
        block += (paras.length ? '\n\n' : '') + listItems.slice(0, 8).map((t) => `- ${t}`).join('\n')
      }
      sections.push(block)
    }
  })
  return (intro + sections.slice(0, 4).join('\n\n')).trim()
}

function extractService(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8')
  const $ = cheerio.load(html)

  const fileSlug = path.basename(htmlPath, '.html')
  const cfg = SERVICE_MAP[fileSlug]
  if (!cfg) return null

  const $hero = $('.page-hero').first()
  const h1 = textWithBreaks($, $hero.find('h1').first()) || textWithBreaks($, $('h1').first())
  const heroSub = clean($hero.find('.page-hero-sub').first().text())
  const seoTitle = clean($('title').text())
  const seoDescription = $('meta[name="description"]').attr('content') || ''

  // Title — prefer a short, sentence-cased version of the H1 (without screaming caps)
  const niceH1 = h1
    .replace(/\.+$/, '')
    .replace(/<[^>]+>/g, '')
  const titleCase =
    niceH1.length && niceH1 === niceH1.toUpperCase()
      ? niceH1.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
      : niceH1

  const priceFrom = extractPriceFrom($, html)
  const body = extractServiceBody($, $hero)

  return {
    file: path.join(ROOT, 'content/services', `${cfg.slug}.md`),
    data: {
      title: titleCase || cfg.slug,
      slug: cfg.slug,
      category: cfg.category,
      summary: heroSub || null,
      icon: cfg.icon,
      priceFrom: priceFrom ?? null,
      sortOrder: cfg.sortOrder,
      active: true,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
    },
    body,
  }
}

// ---------- GEO PAGES ----------
function extractGeo(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8')
  const $ = cheerio.load(html)

  const fileSlug = path.basename(htmlPath, '.html') // e.g. bethesda-md
  const parts = fileSlug.split('-')
  const state = parts[parts.length - 1].toUpperCase()
  const city = parts
    .slice(0, -1)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')

  const h1 = textWithBreaks($, $('h1').first())
  const titleCase =
    h1 === h1.toUpperCase() ? h1.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : h1

  const seoTitle = clean($('title').text())
  const seoDescription = $('meta[name="description"]').attr('content') || ''
  const heroSub = clean($('.geo-hero-sub').first().text())

  // Body: take "Local heading" intro and any "directions" / "about" copy
  const bodyParts = []
  if (heroSub) bodyParts.push(heroSub)
  $('.local-text').each((_, el) => {
    const $el = $(el)
    $el.find('h2').each((__, h) => bodyParts.push(`## ${clean($(h).text())}`))
    $el.find('p').each((__, p) => {
      const t = clean($(p).text())
      if (t && t.length > 25) bodyParts.push(t)
    })
  })
  $('section').each((_, sec) => {
    const $sec = $(sec)
    const $h2 = $sec.find('h2').first()
    const heading = clean($h2.text())
    if (!heading) return
    if (!/MINUTES AWAY|DIRECTIONS|FROM/i.test(heading)) return
    bodyParts.push(`## ${heading}`)
    $sec.find('p').each((__, p) => {
      const t = clean($(p).text())
      if (t && t.length > 25) bodyParts.push(t)
    })
  })

  return {
    file: path.join(ROOT, 'content/geo-pages', `${fileSlug}.md`),
    data: {
      title: titleCase || `${city}, ${state}`,
      slug: fileSlug,
      city,
      state,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
    },
    body: bodyParts.join('\n\n').trim(),
  }
}

// ---------- TESTIMONIALS ----------
function extractTestimonials(htmlPaths) {
  // De-dupe by quote text
  const seen = new Map()
  htmlPaths.forEach((p) => {
    const $ = cheerio.load(fs.readFileSync(p, 'utf8'))
    $('.testimonial-card').each((_, card) => {
      const $c = $(card)
      const quote = clean($c.find('.testimonial-quote').text()).replace(/^"|"$/g, '')
      if (!quote || quote.length < 20) return
      const author = clean($c.find('.testimonial-author strong').text())
      const meta = clean($c.find('.testimonial-author span').text())
      const stars = ($c.find('.testimonial-stars svg').length) || 5
      if (!seen.has(quote)) {
        seen.set(quote, { author, meta, rating: Math.min(5, stars), quote })
      }
    })
  })

  const out = []
  let i = 1
  for (const t of seen.values()) {
    const slug = slugify(`${t.author || 'review'}-${i}`)
    out.push({
      file: path.join(ROOT, 'content/testimonials', `${slug}.md`),
      data: {
        author: t.author || `Customer ${i}`,
        rating: t.rating || 5,
        featured: i <= 3,
      },
      body: `${t.quote}${t.meta ? `\n\n_${t.meta}_` : ''}`,
    })
    i++
  }
  return out
}

// ---------- FAQs ----------
function extractFaqs(htmlPaths) {
  const seen = new Map()
  htmlPaths.forEach((p) => {
    const $ = cheerio.load(fs.readFileSync(p, 'utf8'))
    $('.faq-item').each((_, item) => {
      const $i = $(item)
      const q = clean($i.find('.faq-question').text())
      const a = clean($i.find('.faq-answer').text())
      if (!q || !a) return
      if (!seen.has(q)) seen.set(q, { question: q, answer: a })
    })
  })
  const out = []
  let n = 1
  for (const f of seen.values()) {
    const slug = slugify(f.question).slice(0, 70)
    out.push({
      file: path.join(ROOT, 'content/faqs', `${slug || `faq-${n}`}.md`),
      data: { question: f.question, sortOrder: n },
      body: f.answer,
    })
    n++
  }
  return out
}

// ---------- CONTENT BLOCKS ----------
// Reusable pieces we want editable across the site: announce bar, hero (homepage),
// CTA banner, stats strip.
function extractContentBlocks(homepagePath) {
  const $ = cheerio.load(fs.readFileSync(homepagePath, 'utf8'))
  const blocks = []

  const announce = clean($('#announce-bar').text()).replace(/\s*×\s*$/, '')
  if (announce) {
    blocks.push({
      slug: 'announce-bar',
      title: 'Announcement Bar',
      type: 'announce',
      body: announce,
    })
  }

  const heroH1 = textWithBreaks($, $('h1').first())
  const heroSub = clean($('.hero-sub').first().text())
  if (heroH1) {
    blocks.push({
      slug: 'home-hero',
      title: 'Homepage Hero',
      type: 'hero',
      body: `# ${heroH1}\n\n${heroSub}`,
    })
  }

  const ctaH = clean($('.cta-banner h2, .cta-banner-content h2').first().text())
  const ctaP = clean($('.cta-banner p, .cta-banner-content p').first().text())
  if (ctaH) {
    blocks.push({
      slug: 'cta-banner',
      title: 'Bottom CTA Banner',
      type: 'cta',
      body: `## ${ctaH}\n\n${ctaP}`,
    })
  }

  const statRows = []
  $('.stats-strip .stat-number, .stats-grid .stat-number').each((_, el) => {
    const $el = $(el)
    const num = clean($el.text())
    const label = clean($el.next('.stat-label').text() || $el.parent().find('.stat-label').text())
    if (num && label) statRows.push(`- **${num}** — ${label}`)
  })
  if (statRows.length) {
    blocks.push({
      slug: 'stats-strip',
      title: 'Stats Strip',
      type: 'stats',
      body: `## By the numbers\n\n${statRows.join('\n')}`,
    })
  }

  return blocks.map((b) => ({
    file: path.join(ROOT, 'content/content-blocks', `${b.slug}.md`),
    data: { slug: b.slug, title: b.title, type: b.type },
    body: b.body,
  }))
}

// ---------- SETTINGS ----------
function extractSettings(homepagePath, contactPath) {
  const settingsFile = path.join(ROOT, 'content/globals/settings.json')
  const existing = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))

  const $ = cheerio.load(fs.readFileSync(contactPath, 'utf8'))

  // Phone — first tel: link
  const phone = clean(
    $('a[href^="tel:"]').first().text() || existing.phone
  )
  // Email
  const emailHref = $('a[href^="mailto:"]').first().attr('href')
  const email = emailHref ? emailHref.replace('mailto:', '').split('?')[0] : existing.email
  // Address — pull from JSON-LD PostalAddress if present, else fallback
  let address = existing.address
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text())
      const list = Array.isArray(data) ? data : [data]
      for (const item of list) {
        const a = item?.address
        if (a && a.streetAddress) {
          const street = a.streetAddress
          const city = a.addressLocality || ''
          const region = a.addressRegion || ''
          const postal = a.postalCode || ''
          address = clean(`${street}, ${city} ${region} ${postal}`)
          return false
        }
      }
    } catch (_) {}
  })
  if (!/Nebel/i.test(address)) {
    // last resort: search visible text but only short tight matches
    $('a[href*="maps.google"]').each((_, el) => {
      const t = clean($(el).text()).replace(/\s+/g, ' ')
      if (/Nebel/i.test(t) && t.length < 80) { address = t; return false }
    })
  }

  // Social URLs — sniff hrefs sitewide
  const $home = cheerio.load(fs.readFileSync(homepagePath, 'utf8'))
  const findHref = (re) => {
    let found = ''
    $home('a[href]').each((_, a) => {
      const href = $home(a).attr('href') || ''
      if (re.test(href)) { found = href; return false }
    })
    return found
  }
  const facebook = findHref(/facebook\.com/i) || existing.facebook_url
  const instagram = findHref(/instagram\.com/i) || existing.instagram_url
  const youtube = findHref(/youtube\.com/i) || existing.youtube_url
  const gmb = findHref(/(maps\.google|google\.com\/maps|share\.google)/i) || existing.google_business_url

  // Keep existing default SEO (homepage title is too narrow); only update if homepage has site-wide copy.
  const seoTitle = existing.default_seo_title
  const seoDesc = existing.default_seo_description

  // Announce bar = urgency_message_1 if present
  const announce = clean($home('#announce-bar').text()).replace(/\s*×\s*$/, '')

  return {
    ...existing,
    phone,
    email,
    address,
    facebook_url: facebook,
    instagram_url: instagram,
    youtube_url: youtube,
    google_business_url: gmb,
    default_seo_title: seoTitle,
    default_seo_description: seoDesc,
    urgency_message_1: announce || existing.urgency_message_1,
  }
}

// ---------- PAGES ----------
function extractPages() {
  const pages = [
    { file: 'index.html', slug: 'home', label: 'Home' },
    { file: 'fleet.html', slug: 'fleet', label: 'Fleet' },
    { file: 'contact.html', slug: 'contact', label: 'Contact' },
    { file: 'gallery.html', slug: 'gallery', label: 'Gallery' },
    { file: 'rebates.html', slug: 'rebates', label: 'Rebates & Offers' },
    { file: 'dealer-government.html', slug: 'dealer-government', label: 'Dealer & Government' },
    { file: 'quote.html', slug: 'quote', label: 'Get a Quote' },
    { file: 'start-here.html', slug: 'start-here', label: 'Start Here' },
  ]
  const out = []
  for (const p of pages) {
    const fp = path.join(ROOT, p.file)
    if (!fs.existsSync(fp)) continue
    const $ = cheerio.load(fs.readFileSync(fp, 'utf8'))
    const seoTitle = clean($('title').text())
    const seoDescription = $('meta[name="description"]').attr('content') || ''
    const h1 = textWithBreaks($, $('h1').first())
    const heroSub = clean($('.page-hero-sub, .hero-sub').first().text())

    const titleCase =
      h1 && h1 === h1.toUpperCase() ? h1.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : h1

    out.push({
      file: path.join(ROOT, 'content/pages', `${p.slug}.md`),
      data: {
        title: titleCase || p.label,
        slug: p.slug,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      },
      body: heroSub ? heroSub : '',
    })
  }
  return out
}

// ---------- RUNNER ----------
function run() {
  const written = { services: 0, geo: 0, testimonials: 0, faqs: 0, blocks: 0, pages: 0 }

  // Services
  const servicesDir = path.join(ROOT, 'services')
  fs.readdirSync(servicesDir)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .forEach((f) => {
      const out = extractService(path.join(servicesDir, f))
      if (out) {
        writeMd(out.file, out.data, out.body)
        written.services++
      }
    })

  // Service files without a matching HTML page (e.g. dealer, fleet, government) are kept as-is
  // so they remain available in Tina for editorial use even if the live site doesn't render a dedicated page yet.

  // Geo pages — only keep ones that actually have HTML pages
  const locationsDir = path.join(ROOT, 'locations')
  const geoSlugs = new Set()
  fs.readdirSync(locationsDir)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .forEach((f) => {
      const out = extractGeo(path.join(locationsDir, f))
      writeMd(out.file, out.data, out.body)
      geoSlugs.add(out.data.slug)
      written.geo++
    })
  // Geo pages without a matching HTML file are kept as-is (for SEO/future use).

  // Collect HTML for testimonials/faqs from services + locations + homepage
  const allHtml = [
    ...fs.readdirSync(servicesDir).filter((f) => f.endsWith('.html')).map((f) => path.join(servicesDir, f)),
    ...fs.readdirSync(locationsDir).filter((f) => f.endsWith('.html')).map((f) => path.join(locationsDir, f)),
    path.join(ROOT, 'index.html'),
  ].filter((p) => fs.existsSync(p))

  // Wipe + rewrite testimonials and faqs to keep things clean
  for (const sub of ['testimonials', 'faqs']) {
    const d = path.join(ROOT, 'content', sub)
    if (fs.existsSync(d)) {
      fs.readdirSync(d).forEach((f) => fs.unlinkSync(path.join(d, f)))
    }
  }

  extractTestimonials(allHtml).forEach((t) => {
    writeMd(t.file, t.data, t.body)
    written.testimonials++
  })
  extractFaqs(allHtml).forEach((f) => {
    writeMd(f.file, f.data, f.body)
    written.faqs++
  })

  // Content blocks — wipe Payload-era cruft and write fresh
  const blocksDir = path.join(ROOT, 'content/content-blocks')
  if (fs.existsSync(blocksDir)) {
    fs.readdirSync(blocksDir).forEach((f) => fs.unlinkSync(path.join(blocksDir, f)))
  }
  extractContentBlocks(path.join(ROOT, 'index.html')).forEach((b) => {
    writeMd(b.file, b.data, b.body)
    written.blocks++
  })

  // Pages
  extractPages().forEach((p) => {
    writeMd(p.file, p.data, p.body)
    written.pages++
  })

  // Settings
  const settings = extractSettings(
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'contact.html')
  )
  writeJson(path.join(ROOT, 'content/globals/settings.json'), settings)

  console.log('Extraction summary:', written)
}

run()
