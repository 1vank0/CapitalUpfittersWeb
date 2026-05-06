#!/usr/bin/env node
/**
 * Update legacy Upfit Portal routes to the new canonical routes.
 *
 *   /PortalChoice    -> /portal/login
 *   /DealerRegister  -> /portal/register
 *
 * Root URL (https://upfit-portal-58190af9.base44.app) is left as-is.
 * Idempotent: safe to run multiple times.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOST = 'upfit-portal-58190af9.base44.app';

const REPLACEMENTS = [
  { from: new RegExp(`https://${HOST}/PortalChoice`, 'g'),   to: `https://${HOST}/portal/login` },
  { from: new RegExp(`https://${HOST}/DealerRegister`, 'g'), to: `https://${HOST}/portal/register` },
];

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.tina']);
const FILE_EXTS = new Set(['.html', '.md', '.mdx', '.js', '.ts', '.tsx', '.jsx', '.css', '.json']);

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (FILE_EXTS.has(path.extname(entry.name))) out.push(p);
  }
  return out;
}

const files = walk(ROOT, []);
let touched = 0;
const changedPaths = [];

for (const f of files) {
  let src;
  try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
  let next = src;
  for (const r of REPLACEMENTS) next = next.replace(r.from, r.to);
  if (next !== src) {
    fs.writeFileSync(f, next);
    touched++;
    changedPaths.push(path.relative(ROOT, f));
  }
}

console.log(`Updated ${touched} file(s):`);
for (const p of changedPaths) console.log('  ' + p);
