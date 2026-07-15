#!/usr/bin/env node

import { access, readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const errors = [];
const warnings = [];
const socialImageUrl = 'https://www.capitalupfitters.com/assets/social/og-capital-upfitters-v1.jpg';
const socialImagePath = join(root, 'assets', 'social', 'og-capital-upfitters-v1.jpg');
const staleCmsOrigin = 'capital-upfitters-6iq57bc73-ivan-s-projects-fc67197c.vercel.app';
const requiredMedia = [
  'home-hero', 'bedliner', 'tonneau', 'running-boards', 'industrial-coatings',
  'commercial-wraps', 'ceramic-coating', 'undercoating', 'window-tinting',
  'mobile-detailing', 'hitches', 'stealth-hitches', 'toolboxes', 'lighting',
  'suspension', 'camper-shells', 'exterior'
];

async function filesIn(directory, extensions) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['.git', 'node_modules', 'tina'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path, extensions));
    else if (extensions.includes(extname(entry.name))) files.push(path);
  }
  return files;
}

function report(collection, file, message) {
  collection.push(`${relative(root, file)}: ${message}`);
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  const sizeMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + length + 2 > buffer.length) return null;
    if (sizeMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }
    offset += length + 2;
  }
  return null;
}

const htmlFiles = await filesIn(root, ['.html']);
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const isDocument = /<!doctype\s+html/i.test(html);
  if (!isDocument) continue;

  if (!/<\/html>\s*$/i.test(html)) report(errors, file, 'missing closing </html>');
  if (!/<\/body>\s*<\/html>/i.test(html)) report(errors, file, 'missing closing </body>');
  if (!/class="skip-link"/.test(html)) report(errors, file, 'missing skip link');
  if (!/<main[^>]*id="main-content"/i.test(html)) report(errors, file, 'missing #main-content landmark');
  if ((html.match(/<main\b/gi) || []).length !== 1 || (html.match(/<\/main>/gi) || []).length !== 1) {
    report(errors, file, 'must contain exactly one balanced main landmark');
  }
  if ((html.match(/class="skip-link"/g) || []).length !== 1) report(errors, file, 'must contain exactly one skip link');
  if (/(<meta\s+property="og:url"[^>]*>)>/i.test(html)) report(errors, file, 'malformed og:url tag');
  if (/cdn\.trustindex\.io/i.test(html)) report(errors, file, 'Trustindex trial loader remains');
  if (/patriotliner\.site[^"']*hero-home\.mp4/i.test(html)) report(errors, file, 'external heavyweight hero video remains');
  if (/assets\/amp-powerstep\.mp4/i.test(html)) report(errors, file, 'single-service vendor video still drives the homepage hero');
  if (html.includes(staleCmsOrigin)) report(errors, file, 'stale cross-origin CMS deployment remains');
  if (/youtube\.com\/embed\/jNQXAC9IVRw/i.test(html)) report(errors, file, 'unrelated YouTube placeholder remains');
  if (/\?type=commercial/i.test(html)) report(errors, file, 'unsupported commercial quote parameter remains');
  if (/href="#">(?:Terms|Terms of Service|Privacy Policy)<\/a>/i.test(html)) report(errors, file, 'placeholder legal link remains');
  if (/<form[^>]*data-cms-form[^>]*novalidate/i.test(html)) report(errors, file, 'lead form bypasses native validation');
  if (/addEventListener\s*\(\s*['"]submit['"]/i.test(html)) report(errors, file, 'inline submit handler can compete with lead-form.js');
  if (/class="(?:float-cta|sticky-cta-bar)"[^>]*aria-hidden="true"/i.test(html)) {
    report(errors, file, 'focusable CTA is hidden from assistive technology');
  }

  const description = html.match(/<meta\s+name="description"[^>]*>/i);
  if (description && !/^<meta\s+name="description"\s+content="[^"]+">$/i.test(description[0].trim())) {
    report(errors, file, 'description tag has unexpected or malformed attributes');
  }

  const isIndexableDocument = /<meta\s+name="robots"\s+content="index,\s*follow"/i.test(html);
  if (isIndexableDocument && !/<meta\s+property="og:image"/i.test(html)) {
    report(errors, file, 'indexable page is missing Open Graph image metadata');
  }

  if (/<meta\s+property="og:image"/i.test(html)) {
    if (!html.includes(`<meta property="og:image" content="${socialImageUrl}">`)) {
      report(errors, file, 'Open Graph image is not the versioned absolute social asset');
    }
    if (!/<meta property="og:image:width" content="1200">/i.test(html) ||
        !/<meta property="og:image:height" content="630">/i.test(html)) {
      report(errors, file, 'Open Graph image dimensions are missing or incorrect');
    }
    if (!/<meta name="twitter:card" content="summary_large_image">/i.test(html) ||
        !html.includes(`<meta name="twitter:image" content="${socialImageUrl}">`)) {
      report(errors, file, 'Twitter large-image metadata is incomplete');
    }
  }

  const localRefs = html.matchAll(/(?:href|src)="([^"#]+)"/gi);
  for (const match of localRefs) {
    const raw = match[1];
    if (/[+'`]/.test(raw) || /\bsettings\./.test(raw)) continue;
    if (/^(?:https?:|mailto:|tel:|sms:|data:|javascript:)/i.test(raw)) continue;
    const pathname = raw.split(/[?#]/)[0];
    if (!pathname || pathname === '/') continue;
    let target = pathname.startsWith('/') ? join(root, pathname) : join(dirname(file), pathname);
    target = normalize(target);
    if (pathname.endsWith('/')) target = join(target, 'index.html');
    if (!await exists(target)) report(errors, file, `missing local target ${raw}`);
  }
}

const codeFiles = await filesIn(root, ['.js', '.mjs', '.json']);
for (const file of codeFiles) {
  const source = await readFile(file, 'utf8');
  if (file.endsWith('lead-form.js') && /instanceof File\) return/.test(source)) {
    report(errors, file, 'selected files are silently discarded');
  }
}

for (const slug of requiredMedia) {
  const mediaPath = join(root, 'assets', 'media', `${slug}-v1.webp`);
  if (!await exists(mediaPath)) errors.push(`assets/media/${slug}-v1.webp: required marketing media is missing`);
}

if (!await exists(socialImagePath)) {
  errors.push('assets/social/og-capital-upfitters-v1.jpg: social preview image is missing');
} else {
  const image = await readFile(socialImagePath);
  const dimensions = jpegDimensions(image);
  if (!dimensions || dimensions.width !== 1200 || dimensions.height !== 630) {
    errors.push('assets/social/og-capital-upfitters-v1.jpg: expected an actual 1200x630 JPEG');
  }
  const imageStat = await stat(socialImagePath);
  if (imageStat.size > 700 * 1024) errors.push('assets/social/og-capital-upfitters-v1.jpg: must remain under 700 KB');
}

const servicesIndex = await readFile(join(root, 'services', 'index.html'), 'utf8');
if ((servicesIndex.match(/class="service-hub-card"/g) || []).length !== 16) {
  errors.push('services/index.html: expected exactly 16 service hub cards');
}

if (warnings.length) {
  console.warn(`\nWarnings (${warnings.length})`);
  warnings.forEach((warning) => console.warn(`  - ${warning}`));
}

if (errors.length) {
  console.error(`\nSite audit failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exitCode = 1;
} else {
  console.log(`\nSite audit passed across ${htmlFiles.length} HTML files.`);
}
