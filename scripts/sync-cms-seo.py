#!/usr/bin/env python3
"""Mirror the committed SEO copy (title, meta description, hero H1, hero primary CTA)
from the HTML into cms-data.json. Only fields whose HTML text was rewritten since
BASE are touched; keys/structure/formatting stay identical (indent=2, UTF-8)."""
import importlib.util, json, os, subprocess, sys, tempfile

BASE = sys.argv[1] if len(sys.argv) > 1 else '667c26a'
spec = importlib.util.spec_from_file_location('seo', 'scripts/ollama-seo-rewrite.py')
seo = importlib.util.module_from_spec(spec); spec.loader.exec_module(seo)

PAGE_FILE = {'home': 'index.html', 'contact': 'contact.html', 'dealer-government': 'dealer-government.html',
             'fleet': 'fleet.html', 'gallery': 'gallery.html', 'quote': 'quote.html', 'rebates': 'rebates.html',
             'start-here': 'start-here.html'}


def fields_at(path, rev=None):
    if rev is None:
        return seo.extract(path)['fields']
    src = subprocess.run(['git', 'show', '%s:%s' % (rev, path)], capture_output=True, text=True, check=True).stdout
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as fh:
        fh.write(src); tmp = fh.name
    try:
        return seo.extract(tmp)['fields']
    finally:
        os.unlink(tmp)


raw = open('cms-data.json', encoding='utf-8').read()
data = json.loads(raw)
assert json.dumps(data, indent=2, ensure_ascii=False) + '\n' == raw, 'formatting would not round-trip'
changes = []
targets = [(s, 'services/%s.html' % s['slug']) for s in data['services']] + \
          [(g, 'locations/%s.html' % g['slug']) for g in data['geoPages']] + \
          [(p, PAGE_FILE.get(p['slug'], '')) for p in data['pages']]
for entry, path in targets:
    if not path or not os.path.exists(path):
        continue
    old, new = fields_at(path, BASE), fields_at(path)
    hero = entry.get('hero') or {}
    pairs = [('seoTitle', entry, 'seoTitle', old.get('title'), new.get('title')),
             ('seoDescription', entry, 'seoDescription', old.get('description'), new.get('description')),
             ('hero.headline', hero, 'headline', ' '.join(old.get('h1_segments', [])), ' '.join(new.get('h1_segments', []))),
             ('hero.primaryCtaLabel', hero, 'primaryCtaLabel', (old.get('ctas') or [None])[0], (new.get('ctas') or [None])[0])]
    for label, obj, key, o, n in pairs:
        if key in obj and o != n and n and obj[key] != n:   # field exists, HTML text was rewritten
            changes.append((entry['slug'], path, label, obj[key], n))
            obj[key] = n
out = json.dumps(data, indent=2, ensure_ascii=False) + '\n'
json.loads(out)
open('cms-data.json', 'w', encoding='utf-8').write(out)
for c in changes:
    print('%-20s %-36s %-22s %r -> %r' % c)
print('fields changed:', len(changes))
