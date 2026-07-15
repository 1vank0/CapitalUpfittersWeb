import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOCIAL_URL = 'https://www.capitalupfitters.com/assets/social/og-capital-upfitters-v1.jpg';
const STALE_CMS_ORIGIN = 'https://capital-upfitters-6iq57bc73-ivan-s-projects-fc67197c.vercel.app';

const SERVICE_SLUGS = new Set([
  'bedliner',
  'tonneau',
  'running-boards',
  'industrial-coatings',
  'commercial-wraps',
  'ceramic-coating',
  'undercoating',
  'window-tinting',
  'mobile-detailing',
  'hitches',
  'stealth-hitches',
  'toolboxes',
  'lighting',
  'suspension',
  'camper-shells',
  'exterior'
]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'admin') return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function withClasses(existing, ...added) {
  return [...new Set(existing.split(/\s+/).filter(Boolean).concat(added))].join(' ');
}

function decorateFirstClass(markup, targetClass, mediaSlug) {
  const re = new RegExp(`class="([^"]*\\b${targetClass}\\b[^"]*)"`);
  return markup.replace(re, (_, classes) => {
    if (/\bmedia-[\w-]+\b/.test(classes)) return `class="${classes}"`;
    return `class="${withClasses(classes, 'media-bg', `media-${mediaSlug}`)}"`;
  });
}

function slugFromHref(href) {
  const clean = String(href || '').split(/[?#]/)[0];
  const base = path.posix.basename(clean).replace(/\.html$/i, '');
  if (SERVICE_SLUGS.has(base)) return base;
  if (base === 'fleet') return 'home-hero';
  if (base === 'dealer-government') return 'commercial-wraps';
  return '';
}

function decorateAnchorBlocks(html, anchorClass, targetClass) {
  const re = new RegExp(`<a\\b(?=[^>]*class="[^"]*\\b${anchorClass}\\b[^"]*")[^>]*>[\\s\\S]*?<\\/a>`, 'g');
  return html.replace(re, (block) => {
    const href = block.match(/href="([^"]+)"/i)?.[1] || '';
    const slug = slugFromHref(href);
    return slug ? decorateFirstClass(block, targetClass, slug) : block;
  });
}

function addSocialMetadata(html) {
  const hasSocialImage = /<meta\s+property="og:image"/i.test(html);
  const isIndexableDocument = /<meta\s+name="robots"\s+content="index,\s*follow"/i.test(html);
  if (!hasSocialImage && !isIndexableDocument) return html;

  html = html
    .replace(/\s*<meta\s+property="og:image(?::(?:secure_url|type|width|height|alt))?"[^>]*>\s*/gi, '\n')
    .replace(/\s*<meta\s+name="twitter:(?:card|image|image:alt)"[^>]*>\s*/gi, '\n');

  const block = [
    `<meta property="og:image" content="${SOCIAL_URL}">`,
    `<meta property="og:image:secure_url" content="${SOCIAL_URL}">`,
    '<meta property="og:image:type" content="image/jpeg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="Capital Upfitters — vehicle upfitting for retail, fleet, dealer, and government customers in Rockville, Maryland">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:image" content="${SOCIAL_URL}">`,
    '<meta name="twitter:image:alt" content="Capital Upfitters — Equip. Protect. Perform.">'
  ].join('\n');

  const ogDescription = /(<meta\s+property="og:description"[^>]*>)/i;
  if (ogDescription.test(html)) return html.replace(ogDescription, `$1\n${block}`);
  return html.replace('</head>', `${block}\n</head>`);
}

function decorateHomepage(html) {
  html = decorateFirstClass(html, 'hero-bg-gradient', 'home-hero');
  html = decorateAnchorBlocks(html, 'service-card', 'service-card-grad');

  html = html.replace(/<article\b(?=[^>]*class="[^"]*\bfunnel-card\b[^"]*")[^>]*>[\s\S]*?<\/article>/g, (block) => {
    const href = block.match(/href="([^"]+)"/i)?.[1] || '';
    let slug = '';
    if (/audience=retail/.test(href)) slug = 'bedliner';
    else if (/audience=fleet/.test(href)) slug = 'home-hero';
    else if (/audience=dealer/.test(href)) slug = 'commercial-wraps';
    else if (/industrial-coatings/.test(href)) slug = 'industrial-coatings';
    if (!slug) return block;

    const withNamedBackground = block.replace(/class="(funnel-card-bg-[123])"/, (_, classes) =>
      `class="${withClasses(classes, 'media-bg', `media-${slug}`)}"`);
    if (withNamedBackground !== block) return withNamedBackground;

    return block.replace(
      /<div style="position:absolute; inset:0; background:[^"]+">/,
      (tag) => tag.replace('<div ', `<div class="media-bg media-${slug}" `)
    );
  });

  html = decorateFirstClass(html, 'why-visual-placeholder', 'mobile-detailing');
  return html;
}

function decorateBlogCards(html) {
  const categoryMap = {
    Undercoating: 'undercoating',
    Suspension: 'suspension',
    Bedliners: 'bedliner',
    Fleet: 'toolboxes',
    'Tonneau Covers': 'tonneau'
  };

  return html.replace(/<article class="blog-card">[\s\S]*?<\/article>/g, (block) => {
    if (/blog-card-media/.test(block)) return block;
    const category = block.match(/<span class="blog-category">([^<]+)<\/span>/)?.[1] || '';
    const slug = categoryMap[category];
    if (!slug) return block;
    return block.replace(
      '<div class="blog-card-body">',
      `<div class="blog-card-media media-bg media-${slug}" role="img" aria-label="Illustrative ${category.toLowerCase()} service"></div>\n        <div class="blog-card-body">`
    );
  });
}

function decorateDocument(file, html) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  const base = path.basename(file, '.html');

  html = addSocialMetadata(html);

  // Decorate the three desktop navigation panels without adding mobile weight.
  html = html
    .replace(/class="nav-dropdown nav-mega" role="menu"/g, 'class="nav-dropdown nav-mega nav-media-services" role="menu"')
    .replace(/class="nav-dropdown nav-mega nav-mega-wide" role="menu"/g, 'class="nav-dropdown nav-mega nav-mega-wide nav-media-fleet" role="menu"')
    .replace(/class="nav-dropdown" role="menu" style="left: auto; right: 0;/g, 'class="nav-dropdown nav-media-dealer" role="menu" style="left: auto; right: 0;');

  // Route every fleet CTA to the supported audience parameter.
  html = html
    .replace(/\?service=fleet-detailing/g, '?audience=fleet&amp;service=mobile-detailing')
    .replace(/\?service=fleet(?=["'])/g, '?audience=fleet')
    .replace(/\?type=commercial/g, '?audience=fleet');

  // The old external CMS origin fails CORS. Keep static fallbacks quiet until
  // a same-origin /api/public gateway is connected.
  html = html
    .replaceAll(STALE_CMS_ORIGIN, '')
    .replace(/(?<!&& )\bfetch\(CMS_BASE \+/g, 'CMS_BASE && fetch(CMS_BASE +')
    .replace(/(?<!&& )\bfetch\(CMS \+/g, 'CMS && fetch(CMS +');

  if (rel === 'index.html') html = decorateHomepage(html);
  if (rel === 'blog/index.html') html = decorateBlogCards(html);

  if (rel === 'services/index.html') {
    html = decorateFirstClass(html, 'svc-hero-bg', 'home-hero');
    html = decorateAnchorBlocks(html, 'service-hub-card', 'service-hub-card-bg');
  }

  if (rel.startsWith('services/') && SERVICE_SLUGS.has(base)) {
    html = decorateFirstClass(html, 'svc-hero-bg', base);
    html = decorateAnchorBlocks(html, 'related-card', 'related-card-bg');
  }

  if (rel === 'fleet.html') {
    html = decorateFirstClass(html, 'page-hero-bg', 'home-hero');
    html = decorateAnchorBlocks(html, 'fleet-service-card', 'fleet-service-card-img');
    html = html.replace(
      /<a href="\.\/quote\.html\?audience=fleet" class="btn btn-outline"([^>]*)>Call \(301\) 304-1419<\/a>/,
      '<a href="tel:3013041419" class="btn btn-outline"$1>Call (301) 304-1419</a>'
    );
  }

  if (rel === 'dealer-government.html') html = decorateFirstClass(html, 'page-hero-bg', 'commercial-wraps');
  if (rel === 'gallery.html') {
    html = decorateFirstClass(html, 'page-hero-bg', 'home-hero');
    html = decorateAnchorBlocks(html, 'cat-card', 'cat-card-bg');
  }
  if (rel === 'start-here.html') html = decorateFirstClass(html, 'start-hero-bg', 'home-hero');
  if (rel.startsWith('locations/')) html = decorateFirstClass(html, 'geo-hero-bg', 'home-hero');

  return html;
}

let changed = 0;
for (const file of walk(ROOT).filter((candidate) => candidate.endsWith('.html'))) {
  const before = fs.readFileSync(file, 'utf8');
  const after = decorateDocument(file, before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed += 1;
  }
}

console.log(`Applied versioned media and social metadata to ${changed} HTML files.`);
