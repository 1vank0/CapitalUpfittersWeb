#!/usr/bin/env node
/**
 * Tag HTML pages with data-cms-* attributes for cms-integration.js binding.
 *
 * Uses targeted regex string patching (not full HTML parsing) to avoid
 * disturbing whitespace, entities, or doctype formatting. Idempotent.
 *
 * Run: node scripts/tag-html-with-cms-bindings.js
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

// Apply a regex-based replace only if the target hasn't been tagged yet.
function patch(html, find, replace, alreadyTaggedMarker) {
  if (alreadyTaggedMarker && html.includes(alreadyTaggedMarker)) return html
  return html.replace(find, replace)
}

// ─── BODY MARKER ───────────────────────────────────────────────────────────
function tagBody(html, pageType, slug) {
  if (/<body[^>]*\bdata-cms-page=/.test(html)) return html
  return html.replace(
    /<body([^>]*)>/,
    `<body$1 data-cms-page="${pageType}" data-cms-slug="${slug}">`
  )
}

// ─── HERO ──────────────────────────────────────────────────────────────────
function tagServiceHero(html) {
  // Badge — first .badge inside .page-hero
  if (!/<div class="badge"[^>]*data-cms-bind=/.test(html)) {
    html = html.replace(
      /(<div class="badge"[^>]*?)(>)/,
      (m, pre, gt) => {
        // Only target the badge that has the inline style set on service heroes
        if (m.includes('data-cms-bind')) return m
        return `${pre} data-cms-bind="hero.badge"${gt}`
      }
    )
  }

  // NOTE: We deliberately don't bind the hero <h1>. Service-page headlines
  // include design-only markup (<br>, <em>) that the CMS field strips, so
  // binding would degrade the visual design. Edit the headline in Tina for
  // SEO/listing copy; the on-page H1 stays static until the schema preserves
  // its inline markup.

  // Hero sub — first .page-hero-sub (not the styled secondary one)
  // We anchor on a fresh class="page-hero-sub" with no inline style attr.
  if (!/<p class="page-hero-sub"[^>]*data-cms-bind/.test(html)) {
    html = html.replace(
      /<p class="page-hero-sub">/,
      `<p class="page-hero-sub" data-cms-bind="hero.subheadline">`
    )
  }

  // Hero CTAs — primary + secondary buttons inside .hero-ctas
  // Use a single replace on the whole .hero-ctas block to avoid touching other btn-primary anchors.
  html = html.replace(
    /<div class="hero-ctas">([\s\S]*?)<\/div>/,
    (block, inner) => {
      if (block.includes('data-cms-bind')) return block

      // Primary
      inner = inner.replace(
        /<a([^>]*?)class="btn btn-primary([^"]*)"([^>]*?)href="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/,
        (m, a, cls, b, href, c, txt) => {
          // Re-emit with bindings; preserve all other attrs.
          // Choose attribute ordering that's least-surprising.
          const before = (a + b + c).trim()
          return `<a ${before} class="btn btn-primary${cls}" href="${href}" data-cms-bind="hero.primaryCtaLabel" data-cms-bind-href="hero.primaryCtaUrl">${txt}</a>`
        }
      )
      // Most service heroes write href before class — try alt ordering too
      inner = inner.replace(
        /<a href="([^"]*)" class="btn btn-primary([^"]*)"([^>]*)>([\s\S]*?)<\/a>/,
        (m, href, cls, rest, txt) => {
          if (m.includes('data-cms-bind')) return m
          return `<a href="${href}" class="btn btn-primary${cls}"${rest} data-cms-bind="hero.primaryCtaLabel" data-cms-bind-href="hero.primaryCtaUrl">${txt}</a>`
        }
      )

      // Secondary (.btn-outline)
      inner = inner.replace(
        /<a href="([^"]*)" class="btn btn-outline([^"]*)"([^>]*)>([\s\S]*?)<\/a>/,
        (m, href, cls, rest, txt) => {
          if (m.includes('data-cms-bind')) return m
          return `<a href="${href}" class="btn btn-outline${cls}"${rest} data-cms-bind="hero.secondaryCtaLabel" data-cms-bind-href="hero.secondaryCtaUrl">${txt}</a>`
        }
      )

      return `<div class="hero-ctas">${inner}</div>`
    }
  )

  return html
}

// ─── PRICING GRID ──────────────────────────────────────────────────────────
function tagPricing(html) {
  if (/<div class="pricing-grid"[^>]*data-cms-list/.test(html)) return html
  // Inject data-cms-list attr + a <template> as the first child
  const tpl = `
      <template data-cms-item><div class="pricing-card"><div class="pricing-name" data-cms-bind="label"></div><div class="pricing-price" data-cms-bind-html="price"></div><div class="pricing-sub" data-cms-bind="note"></div></div></template>`
  return html.replace(
    /<div class="pricing-grid">/,
    `<div class="pricing-grid" data-cms-list="pricing">${tpl}`
  )
}

// ─── KPI / STATS STRIP ─────────────────────────────────────────────────────
function tagKpis(html) {
  // Service pages put items inside .stats-strip > .container > .stats-grid
  // We tag the .stats-grid with data-cms-list="kpis" because that's the actual
  // items container.
  if (/<div class="stats-grid"[^>]*data-cms-list/.test(html)) return html
  const tpl = `<template data-cms-item><div style="text-align:center;"><span class="stat-number kpi-number" data-cms-bind="value"></span><span class="stat-label" data-cms-bind="label"></span></div></template>`
  return html.replace(
    /<div class="stats-grid"([^>]*)>/,
    (m, attrs) => {
      if (m.includes('data-cms-list')) return m
      return `<div class="stats-grid"${attrs} data-cms-list="kpis">${tpl}`
    }
  )
}

// ─── PROCESS STEPS ─────────────────────────────────────────────────────────
function tagProcess(html) {
  if (/<div class="process-steps"[^>]*data-cms-list/.test(html)) return html
  const tpl = `
      <template data-cms-item><div class="process-step"><div class="process-num"></div><div class="process-title" data-cms-bind="title"></div><p class="process-desc" data-cms-bind="description"></p></div></template>`
  return html.replace(
    /<div class="process-steps">/,
    `<div class="process-steps" data-cms-list="process">${tpl}`
  )
}

// ─── FAQ LIST ──────────────────────────────────────────────────────────────
function tagFaqs(html) {
  if (/<div class="faq-list[^"]*"[^>]*data-cms-list/.test(html)) return html
  const tpl = `<template data-cms-item><div class="faq-item"><button class="faq-btn" aria-expanded="false"><span class="faq-question" data-cms-bind="question"></span><span class="faq-icon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span></button><div class="faq-answer"><p data-cms-bind="answer"></p></div></div></template>`
  return html.replace(
    /<div class="faq-list([^"]*)">/,
    `<div class="faq-list$1" data-cms-list="faqs">${tpl}`
  )
}

// ─── HOMEPAGE HERO (different markup: .hero, no h1 id) ─────────────────────
function tagHomeHero(html) {
  // Subhead
  if (!/<p class="hero-sub"[^>]*data-cms-bind/.test(html)) {
    html = html.replace(
      /<p class="hero-sub">/,
      `<p class="hero-sub" data-cms-bind="hero.subheadline">`
    )
  }

  // CTAs
  html = html.replace(
    /<div class="hero-ctas">([\s\S]*?)<\/div>/,
    (block, inner) => {
      if (block.includes('data-cms-bind')) return block
      inner = inner.replace(
        /<a href="([^"]*)" class="btn btn-primary([^"]*)"([^>]*)>([\s\S]*?)<\/a>/,
        (m, href, cls, rest, txt) =>
          `<a href="${href}" class="btn btn-primary${cls}"${rest} data-cms-bind="hero.primaryCtaLabel" data-cms-bind-href="hero.primaryCtaUrl">${txt}</a>`
      )
      inner = inner.replace(
        /<a href="([^"]*)" class="btn btn-outline([^"]*)"([^>]*)>([\s\S]*?)<\/a>/,
        (m, href, cls, rest, txt) =>
          `<a href="${href}" class="btn btn-outline${cls}"${rest} data-cms-bind="hero.secondaryCtaLabel" data-cms-bind-href="hero.secondaryCtaUrl">${txt}</a>`
      )
      return `<div class="hero-ctas">${inner}</div>`
    }
  )

  return html
}

// ─── FOOTER GLOBALS (sitewide phone/email/address) ─────────────────────────
function tagGlobals(html) {
  // Footer phone — only inside <footer>...</footer>
  html = html.replace(/<footer\b([\s\S]*?)<\/footer>/, (footer) => {
    // Phone tel: links
    footer = footer.replace(
      /<a href="(tel:[^"]+)" class="footer-contact-item"([^>]*)>/g,
      (m, href, rest) => {
        if (m.includes('data-cms-global')) return m
        return `<a href="${href}" class="footer-contact-item"${rest} data-cms-global="settings.phone" data-cms-bind-href="settings.phone" data-cms-bind-href-prefix="tel:">`
      }
    )
    // Address divs (.footer-contact-item that aren't anchors)
    footer = footer.replace(
      /<div class="footer-contact-item"([^>]*)>([\s\S]*?)<\/div>/g,
      (m, attrs, inner) => {
        if (m.includes('data-cms-global')) return m
        // Only if it looks like an address
        if (!/(MD|St|Rd|Ave|Rockville|Bethesda)/.test(inner)) return m
        return `<div class="footer-contact-item"${attrs} data-cms-global="settings.address">${inner}</div>`
      }
    )
    // Email mailto: links
    footer = footer.replace(
      /<a href="(mailto:[^"]+)" class="footer-contact-item"([^>]*)>/g,
      (m, href, rest) => {
        if (m.includes('data-cms-global')) return m
        return `<a href="${href}" class="footer-contact-item"${rest} data-cms-global="settings.email" data-cms-bind-href="settings.email" data-cms-bind-href-prefix="mailto:">`
      }
    )
    return footer
  })

  return html
}

// ─── PER-FILE PROCESSORS ───────────────────────────────────────────────────
function processService(file, slug) {
  let html = fs.readFileSync(file, 'utf8')
  const before = html
  html = tagBody(html, 'service', slug)
  html = tagServiceHero(html)
  html = tagPricing(html)
  html = tagKpis(html)
  html = tagProcess(html)
  html = tagFaqs(html)
  html = tagGlobals(html)
  if (html !== before) {
    fs.writeFileSync(file, html)
    console.log(`✓ tagged service: ${path.relative(ROOT, file)}`)
  } else {
    console.log(`· no changes (already tagged): ${path.relative(ROOT, file)}`)
  }
}

function processGeo(file, slug) {
  let html = fs.readFileSync(file, 'utf8')
  const before = html
  html = tagBody(html, 'geo', slug)
  // (h1 left untagged — see note in tagServiceHero.)
  html = tagGlobals(html)
  if (html !== before) {
    fs.writeFileSync(file, html)
    console.log(`✓ tagged geo: ${path.relative(ROOT, file)}`)
  } else {
    console.log(`· no changes: ${path.relative(ROOT, file)}`)
  }
}

function processTop(file) {
  let html = fs.readFileSync(file, 'utf8')
  const before = html
  const base = path.basename(file, '.html')
  const isHome = base === 'index'
  const slug = isHome ? 'home' : base
  const pageType = isHome ? 'home' : 'page'
  html = tagBody(html, pageType, slug)
  // Top-level uses .hero (homepage) or .page-hero (others)
  if (isHome) html = tagHomeHero(html)
  else html = tagServiceHero(html) // same hero markup as service pages on .page-hero
  html = tagGlobals(html)
  if (html !== before) {
    fs.writeFileSync(file, html)
    console.log(`✓ tagged top: ${path.relative(ROOT, file)}`)
  } else {
    console.log(`· no changes: ${path.relative(ROOT, file)}`)
  }
}

function main() {
  // Service pages
  const servicesDir = path.join(ROOT, 'services')
  fs.readdirSync(servicesDir)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .forEach((f) => {
      const slug = path.basename(f, '.html')
      processService(path.join(servicesDir, f), slug)
    })

  // Geo pages
  const locationsDir = path.join(ROOT, 'locations')
  if (fs.existsSync(locationsDir)) {
    fs.readdirSync(locationsDir)
      .filter((f) => f.endsWith('.html') && f !== 'index.html')
      .forEach((f) => {
        const slug = path.basename(f, '.html')
        processGeo(path.join(locationsDir, f), slug)
      })
  }

  // Top-level pages
  const topPages = [
    'index.html',
    'fleet.html',
    'contact.html',
    'gallery.html',
    'rebates.html',
    'dealer-government.html',
    'quote.html',
    'start-here.html',
  ]
  topPages.forEach((f) => {
    const file = path.join(ROOT, f)
    if (fs.existsSync(file)) processTop(file)
  })
}

main()
