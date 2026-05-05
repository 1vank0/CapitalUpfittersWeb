#!/usr/bin/env node
/**
 * Reads content/*.md (Tina-edited) and produces a single
 * /cms-data.json manifest that the static site consumes
 * client-side via cms-integration.js.
 *
 * Runs at build time on Vercel. Idempotent.
 */
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const ROOT = path.join(__dirname, '..')
const CONTENT = path.join(ROOT, 'content')
const OUT = path.join(ROOT, 'cms-data.json')

function readDir(rel) {
  const dir = path.join(CONTENT, rel)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8')
      const { data, content } = matter(raw)
      return { ...data, body: (content || '').trim(), _file: f }
    })
}

function readJson(rel) {
  const p = path.join(CONTENT, 'globals', rel)
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

const data = {
  generatedAt: new Date().toISOString(),
  services: readDir('services')
    .filter(s => s.active !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
  geoPages: readDir('geo-pages'),
  testimonials: readDir('testimonials'),
  faqs: readDir('faqs').sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
  contentBlocks: readDir('content-blocks'),
  pages: readDir('pages'),
  settings: readJson('settings.json'),
  aiProfile: readJson('ai-profile.json'),
  organization: readJson('organization.json'),
}

fs.writeFileSync(OUT, JSON.stringify(data, null, 2))
console.log(`✓ wrote ${OUT}`)
console.log(`  services=${data.services.length} geoPages=${data.geoPages.length} testimonials=${data.testimonials.length} faqs=${data.faqs.length} blocks=${data.contentBlocks.length}`)
