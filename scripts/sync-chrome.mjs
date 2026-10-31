#!/usr/bin/env node
// Keeps the site chrome (announce bar + nav + mobile menu, and the footer) as
// single-source partials and stamps them into every page that opts in with
// markers:
//
//   <!-- cu:header -->  ...stamped, do not edit by hand...  <!-- /cu:header -->
//   <!-- cu:footer -->  ...stamped, do not edit by hand...  <!-- /cu:footer -->
//
// Plain Node, no dependencies. Pages stay static HTML.
//
//   node scripts/sync-chrome.mjs             stamp partials into marked pages
//   node scripts/sync-chrome.mjs --check     exit 1 if any marked page drifts (CI)
//   node scripts/sync-chrome.mjs --adopt     add markers to pages whose chrome
//                                            already matches the partial
//   node scripts/sync-chrome.mjs --adopt --all
//                                            add markers to every page with a
//                                            header/footer, replacing its chrome
//   node scripts/sync-chrome.mjs --extract   rebuild the partials from index.html
//
// Partials are written for a page at the site root: internal links start with
// "./". When stamping into a page in a subfolder, that "./" becomes "../".

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PAGE = 'index.html';
const SKIP_DIRS = new Set(['node_modules', '.git', '.vercel']);
const LINK_ATTR = /\b(href|src|action|poster|srcset|data-[\w-]+)="\.\//g;

// Where each chrome block lives in a page that has not been adopted yet.
const BLOCKS = {
  header: {
    file: 'partials/header.html',
    // announce bar (with its leading comment) through the end of the mobile menu
    find: /(?:<!--\s*ANNOUNCE BAR\s*-->\s*)?<div class="announce-bar"[\s\S]*?class="nav-mobile-actions"[\s\S]*?<\/div>\s*<\/div>/,
  },
  footer: {
    file: 'partials/footer.html',
    find: /<footer\b[\s\S]*?<\/footer>/,
  },
};

const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const ADOPT = args.has('--adopt');
const ALL = args.has('--all');

const markers = (name) => [`<!-- cu:${name} -->`, `<!-- /cu:${name} -->`];
const markerRe = (name) => {
  const [a, b] = markers(name);
  return new RegExp(`${a}[\\s\\S]*?${b}`);
};

function listPages(dir = ROOT, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) listPages(join(dir, e.name), out);
    } else if (e.name.endsWith('.html') && !relative(ROOT, join(dir, e.name)).startsWith('partials' + sep)) {
      out.push(join(dir, e.name));
    }
  }
  return out.sort();
}

const depthOf = (file) => relative(ROOT, file).split(sep).length - 1;
const rebase = (html, depth) =>
  depth === 0 ? html : html.replace(LINK_ATTR, (_, attr) => `${attr}="${'../'.repeat(depth)}`);
const readPartial = (name) => readFileSync(join(ROOT, BLOCKS[name].file), 'utf8').trim();

// Same markup ignoring comments, whitespace between tags and the ./ vs ../ prefix.
const canon = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\b(href|src|action|poster|srcset|data-[\w-]+)="(?:\.\.\/)+/g, '$1="./')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();

const stamped = (name, depth) => {
  const [a, b] = markers(name);
  return `${a}\n${rebase(readPartial(name), depth)}\n${b}`;
};

if (args.has('--extract')) {
  const src = readFileSync(join(ROOT, SOURCE_PAGE), 'utf8');
  mkdirSync(join(ROOT, 'partials'), { recursive: true });
  for (const [name, { file, find }] of Object.entries(BLOCKS)) {
    const m = src.match(find);
    if (!m) throw new Error(`Could not find the ${name} in ${SOURCE_PAGE}`);
    writeFileSync(join(ROOT, file), m[0].trim() + '\n');
    console.log(`extracted ${file}`);
  }
  process.exit(0);
}

for (const name of Object.keys(BLOCKS)) {
  if (!existsSync(join(ROOT, BLOCKS[name].file))) {
    console.error(`Missing ${BLOCKS[name].file}. Run: node scripts/sync-chrome.mjs --extract`);
    process.exit(2);
  }
}

const drift = [];
const changed = [];
const skipped = [];
let managed = 0;

for (const file of listPages()) {
  const rel = relative(ROOT, file);
  const depth = depthOf(file);
  const before = readFileSync(file, 'utf8');
  let html = before;

  for (const name of Object.keys(BLOCKS)) {
    const re = markerRe(name);
    if (re.test(html)) {
      html = html.replace(re, () => stamped(name, depth));
      continue;
    }
    if (!ADOPT) continue;
    const m = html.match(BLOCKS[name].find);
    if (!m) continue;
    if (!ALL && canon(m[0]) !== canon(rebase(readPartial(name), depth))) {
      skipped.push(`${rel} (${name})`);
      continue;
    }
    html = html.replace(BLOCKS[name].find, () => stamped(name, depth));
  }

  if (/<!-- cu:(header|footer) -->/.test(html)) managed++;
  if (html !== before) {
    if (CHECK) drift.push(rel);
    else {
      writeFileSync(file, html);
      changed.push(rel);
    }
  }
}

if (CHECK) {
  if (drift.length) {
    console.error('Chrome is out of sync with partials/ in:\n  ' + drift.join('\n  '));
    console.error('\nRun: npm run sync-chrome');
    process.exit(1);
  }
  console.log(`Chrome in sync (${managed} pages managed).`);
} else {
  console.log(changed.length ? `Updated ${changed.length} page(s):\n  ${changed.join('\n  ')}` : 'Nothing to change.');
  if (skipped.length)
    console.log(`\nNot adopted (chrome differs from the partial; use --adopt --all to replace):\n  ${skipped.join('\n  ')}`);
}
