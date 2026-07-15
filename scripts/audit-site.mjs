#!/usr/bin/env node

import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const errors = [];
const warnings = [];

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

if (!await exists(join(root, 'assets', 'og-default.png'))) {
  warnings.push('assets/og-default.png: social preview image is still pending');
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
