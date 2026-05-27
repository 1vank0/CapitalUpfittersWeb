#!/usr/bin/env node
/**
 * Idempotent installer for lead-attribution wiring.
 *
 * For every .html under the project (excluding node_modules, .git, admin/CMS dirs):
 *   1. Inject  <script src="/attribution.js" defer></script>
 *              <script src="/lead-form.js"  defer></script>
 *      right before </head>, unless already present.
 *   2. For every <form data-cms-form="...">, ensure the 19 hidden
 *      attribution input fields are present immediately inside the form tag.
 *      Existing copies are left alone — the JS overwrites their .value at
 *      submit, so duplicate-injection is not a problem either way.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build',
                           '.tina', 'admin', 'tina']);

const SCRIPT_BLOCK =
  '  <script src="/attribution.js" defer></script>\n' +
  '  <script src="/lead-form.js" defer></script>\n';

const HIDDEN_FIELDS = [
  'ip_address','geo_city','geo_region','geo_country','isp',
  'landing_page','form_page','referrer','referrer_domain',
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'gclid','fbclid','msclkid','lead_source','user_agent'
];

const HIDDEN_BLOCK =
  '\n              <!-- Attribution (auto-filled by /attribution.js) -->\n' +
  HIDDEN_FIELDS.map(n => `              <input type="hidden" name="${n}" data-cu-attr="1">`).join('\n') +
  '\n';

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function injectScripts(html) {
  if (html.includes('/attribution.js') && html.includes('/lead-form.js')) return html;
  // Don't touch admin/Tina-generated bundles.
  if (!/<\/head>/i.test(html)) return html;
  return html.replace(/(\s*<\/head>)/i, '\n' + SCRIPT_BLOCK + '$1');
}

function injectHiddenFields(html) {
  // Match each <form ... data-cms-form="..." ...>  through the first newline + indentation.
  // Insert the block only if these hidden fields aren't already in the form's body.
  const formRegex = /(<form\b[^>]*\bdata-cms-form=[^>]*>)/gi;
  return html.replace(formRegex, (openTag, _g1, offset, full) => {
    // Look at the next ~3000 chars (form body) — if our marker comment is there, skip.
    const tail = full.slice(offset, offset + 4000);
    if (tail.includes('data-cu-attr="1"')) return openTag;
    return openTag + HIDDEN_BLOCK;
  });
}

const files = walk(ROOT, []);
let changedScripts = 0, changedForms = 0;
const changes = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let next = injectScripts(src);
  const afterScripts = next;
  next = injectHiddenFields(next);

  if (next !== src) {
    fs.writeFileSync(f, next);
    const scriptsChanged = afterScripts !== src;
    const formsChanged = next !== afterScripts;
    if (scriptsChanged) changedScripts++;
    if (formsChanged) changedForms++;
    changes.push({ file: path.relative(ROOT, f), scripts: scriptsChanged, forms: formsChanged });
  }
}

console.log(`Scripts injected in ${changedScripts} file(s).`);
console.log(`Hidden fields injected in ${changedForms} form-containing file(s).`);
console.log('---');
for (const c of changes) console.log(' ', c.file, '·', [
  c.scripts ? 'scripts' : null, c.forms ? 'forms' : null
].filter(Boolean).join(' + '));
