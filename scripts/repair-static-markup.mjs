#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'tina') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (extname(entry.name) === '.html') files.push(path);
  }
  return files;
}

let changed = 0;
for (const file of await htmlFiles(root)) {
  const original = await readFile(file, 'utf8');
  let repaired = original
    .replace(/(<meta\s+property="og:url"[^>]*>)>/g, '$1')
    .replace(/href="#">Terms of Service<\/a>/g, 'href="/terms.html">Terms of Service</a>')
    .replace(/href="#">Terms<\/a>/g, 'href="/terms.html">Terms</a>')
    .replace(/href="#">Privacy Policy<\/a>/g, 'href="/privacy.html">Privacy Policy</a>')
    .replace(/href="\.\/wraps\.html"/g, 'href="./commercial-wraps.html"')
    .replace(/href="\.\/accessories\.html"/g, 'href="./exterior.html"')
    .replace(/href="\.\.\/rockville\.html"/g, 'href="../locations/rockville-md.html"')
    .replace(/href="\.\.\/bethesda\.html"/g, 'href="../locations/bethesda-md.html"')
    .replace(/href="\.\.\/silver-spring\.html"/g, 'href="../locations/silver-spring-md.html"')
    .replace(/href="\.\.\/gaithersburg\.html"/g, 'href="../locations/gaithersburg-md.html"')
    .replace(/href="\.\.\/potomac\.html"/g, 'href="../contact.html"')
    .replace(/href="\.\.\/north-bethesda\.html"/g, 'href="../locations/bethesda-md.html"')
    .replace(/<div class="float-cta" aria-hidden="true">/g, '<div class="float-cta" aria-label="Quick quote action">')
    .replace(/<div class="sticky-cta-bar" aria-hidden="true">/g, '<div class="sticky-cta-bar" aria-label="Quick actions">');

  const relativePath = file.slice(root.length).replaceAll('\\', '/');
  if (relativePath === 'gallery.html') repaired = repaired.replace(/href="\.\.\/quote\.html"/g, 'href="./quote.html"');
  if (relativePath.startsWith('locations/')) repaired = repaired.replace(/href="\.\/index\.html"/g, 'href="../index.html"');

  if (!repaired.includes('class="skip-link"')) {
    repaired = repaired.replace(
      /(<body[^>]*>)/i,
      '$1\n<a href="#main-content" class="skip-link">Skip to main content</a>'
    );
  }

  if (/<main\b/i.test(repaired)) {
    repaired = repaired.replace(/<main(?![^>]*\bid=)([^>]*)>/i, '<main id="main-content" tabindex="-1"$1>');
  } else {
    const sectionAt = repaired.search(/<section\b/i);
    const footerAt = repaired.search(/<footer\b/i);
    const bodyCloseAt = repaired.search(/<\/body>/i);
    const closeAt = footerAt > sectionAt ? footerAt : bodyCloseAt;
    if (sectionAt !== -1 && closeAt > sectionAt) {
      repaired = repaired.slice(0, sectionAt) + '<main id="main-content" tabindex="-1">\n' +
        repaired.slice(sectionAt, closeAt) + '</main>\n' + repaired.slice(closeAt);
    }
  }

  if (repaired !== original) {
    await writeFile(file, repaired);
    changed += 1;
  }
}

console.log(`Repaired static markup in ${changed} HTML file(s).`);
