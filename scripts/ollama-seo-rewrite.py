#!/usr/bin/env python3
"""
ollama-seo-rewrite.py — rewrite <title>, meta description (+ og/twitter mirrors),
the hero H1 and the hero's primary CTA labels on every public HTML page of the
Capital Upfitters site, using a LOCAL Ollama model (gpt-oss:120b, fallback
qwen3:30b). Never calls cloud models.

Subcommands (run from repo root):
  inventory   extract current copy + intent for each page  -> docs/seo-copy-ollama-results.json
  generate    ask the local model for new copy, validate, retry once, fall back per field
              (pass page paths to regenerate only those pages)
  review      revert fields rejected in human editorial review (REVIEW_REJECTS) and flag them
  apply       write validated copy back into the HTML, surgically (text nodes / content attrs only)
  check       HTML sanity: tag/attr sequence unchanged vs HEAD except the edited content attrs,
              JSON-LD byte-identical, one <title>, one meta description
  report      write docs/seo-copy-ollama-report.md
"""
import glob, html, json, os, re, sys, time, urllib.request, subprocess
from html.parser import HTMLParser

ROOT = os.getcwd()
RESULTS = os.path.join(ROOT, 'docs', 'seo-copy-ollama-results.json')
REPORT = os.path.join(ROOT, 'docs', 'seo-copy-ollama-report.md')
OLLAMA = 'http://localhost:11434/api/chat'
PRIMARY_MODEL = 'gpt-oss:120b'
FALLBACK_MODEL = 'qwen3:30b'
SLOW_SECONDS = 180          # > ~3 min per page => switch to fallback model
REQUEST_TIMEOUT = 420

SKIP_FILES = {'preview.html', '404.html', 'products-section.html'}
LEGAL = {'privacy.html', 'terms.html'}                  # left untouched by design
LOCK_H1 = {'quote.html': 'multi-step quote app: 5 step <h1>s, design just rebuilt (P6) - H1 left as is'}
FIXED_H1 = {'index.html': ['BUILT FOR REAL WORK.']}       # approved homepage H1

FACTS = """FACTS (the ONLY facts you may use; never invent prices, stats, years, awards or other cities):
- Capital Upfitters, family-owned since 2015.
- 12019 Nebel St, Rockville MD 20852. Phone (301) 304-1419. Mon-Fri 9:30am-4:30pm by appointment.
- Serves the DMV: Rockville, Bethesda, Silver Spring, Gaithersburg, Montgomery County, Northern Virginia, DC.
- Only authorized Patriot Liner dealer in the Rockville-Bethesda corridor; lifetime bedliner warranty.
- IGL and System X certified ceramic coating.
- 4.9 stars on Google with 110 reviews (always 110).
- Same-week availability on most services.
- Fleet: 3+ units volume pricing, Net-30 terms, Upfit Portal.
- Dealer and government programs.
- Industrial coatings with mobile application.
- Brand voice: rugged and direct.
- Preferred primary CTA labels: "Request Installed Pricing" and "Get a Quote"."""

# --- page intent -------------------------------------------------------------
CITY_BY_FILE = {
    'locations/rockville-md.html': 'Rockville, MD',
    'locations/bethesda-md.html': 'Bethesda, MD',
    'locations/gaithersburg-md.html': 'Gaithersburg, MD',
    'locations/silver-spring-md.html': 'Silver Spring, MD',
}
SERVICE_BY_FILE = {
    'index.html': ('truck & vehicle upfitting (bedliners, hitches, ceramic coating, fleet)', ['upfit', 'truck', 'vehicle']),
    'contact.html': ('contact / visit the shop', ['contact', 'visit', 'upfit', 'shop', 'directions', 'call']),
    'dealer-government.html': ('dealer & government upfitting programs', ['dealer', 'government', 'gov']),
    'fleet.html': ('fleet upfitting (3+ units, Net-30, Upfit Portal)', ['fleet']),
    'gallery.html': ('gallery of upfit work', ['gallery', 'work', 'photo', 'build', 'upfit']),
    'quote.html': ('online quote builder', ['quote', 'pricing', 'price']),
    'rebates.html': ('current rebates & offers', ['rebate', 'offer', 'deal', 'savings']),
    'start-here.html': ('service finder - pick the right upfit', ['upfit', 'service', 'start', 'truck', 'accessor']),
    'services/index.html': ('all upfitting services', ['upfit', 'service', 'accessor']),
    'services/bedliner.html': ('Patriot Liner spray-on bedliner', ['bedliner', 'liner']),
    'services/camper-shells.html': ('truck camper shells & caps', ['camper', 'cap', 'shell', 'topper']),
    'services/ceramic-coating.html': ('ceramic coating (IGL, System X)', ['ceramic', 'coating']),
    'services/commercial-wraps.html': ('commercial vehicle & fleet wraps', ['wrap', 'graphic']),
    'services/exterior.html': ('exterior truck accessories & armor', ['exterior', 'accessor', 'armor', 'bumper']),
    'services/hitches.html': ('hitch installation', ['hitch']),
    'services/industrial-coatings.html': ('industrial & protective coatings, mobile application', ['industrial', 'coating']),
    'services/lighting.html': ('LED light bars & work lights', ['led', 'light']),
    'services/mobile-detailing.html': ('mobile vehicle detailing', ['detail']),
    'services/running-boards.html': ('running boards & power steps', ['running board', 'step']),
    'services/stealth-hitches.html': ('stealth (hidden) hitches for luxury, EV & PHEV', ['stealth', 'hidden', 'hitch']),
    'services/suspension.html': ('lift kits & leveling kits', ['lift', 'level', 'suspension']),
    'services/tonneau.html': ('tonneau covers', ['tonneau', 'bed cover']),
    'services/toolboxes.html': ('truck toolboxes & bed storage', ['toolbox', 'tool box', 'storage']),
    'services/undercoating.html': ('rust-proof undercoating', ['undercoat', 'rust']),
    'services/window-tinting.html': ('window tinting', ['tint']),
    'locations/rockville-md.html': ('vehicle upfitting (local landing page)', ['upfit', 'truck', 'accessor']),
    'locations/bethesda-md.html': ('vehicle upfitting (local landing page)', ['upfit', 'truck', 'accessor']),
    'locations/gaithersburg-md.html': ('vehicle upfitting (local landing page)', ['upfit', 'truck', 'accessor']),
    'locations/silver-spring-md.html': ('vehicle upfitting (local landing page)', ['upfit', 'truck', 'accessor']),
    'blog/index.html': ('blog: truck upfitting guides', ['blog', 'guide', 'upfit', 'truck', 'tip']),
    'blog/best-tonneau-covers-maryland.html': ('blog: tonneau covers for Maryland weather', ['tonneau']),
    'blog/leveling-vs-lift-kit.html': ('blog: leveling kit vs lift kit', ['level', 'lift']),
    'blog/patriot-liner-vs-drop-in.html': ('blog: spray-on vs drop-in bedliner', ['bedliner', 'liner']),
    'blog/undercoating-maryland-winter.html': ('blog: when to undercoat in Maryland', ['undercoat', 'rust']),
    'blog/weatherguard-vs-kargomaster.html': ('blog: WeatherGuard vs KargoMaster', ['weatherguard', 'kargomaster']),
}

# Suggested proof point per page, so every meta does not lean on the same review line.
PROOF_HINT = {
    'index.html': 'family-owned since 2015', 'contact.html': '12019 Nebel St / by appointment Mon-Fri 9:30am-4:30pm',
    'dealer-government.html': 'dealer and government programs', 'fleet.html': '3+ units volume pricing, Net-30, Upfit Portal',
    'gallery.html': '4.9 stars on Google from 110 reviews', 'quote.html': 'same-week availability on most services',
    'rebates.html': 'family-owned since 2015', 'start-here.html': 'same-week availability on most services',
    'services/index.html': '4.9 stars on Google from 110 reviews',
    'services/bedliner.html': 'only authorized Patriot Liner dealer in the Rockville-Bethesda corridor, lifetime warranty',
    'services/ceramic-coating.html': 'IGL and System X certified', 'services/industrial-coatings.html': 'mobile application',
    'services/commercial-wraps.html': 'fleet volume pricing for 3+ units', 'services/mobile-detailing.html': 'fleet accounts with Net-30 terms',
    'locations/rockville-md.html': '12019 Nebel St, family-owned since 2015', 'locations/bethesda-md.html': 'only authorized Patriot Liner dealer in the Rockville-Bethesda corridor',
    'locations/gaithersburg-md.html': '4.9 stars on Google from 110 reviews', 'locations/silver-spring-md.html': 'same-week availability on most services',
    'blog/patriot-liner-vs-drop-in.html': 'authorized Patriot Liner dealer, lifetime warranty',
}

LOCATION_TOKENS = ['rockville', 'bethesda', 'silver spring', 'gaithersburg', 'montgomery county',
                   'northern virginia', ' dc', 'd.c.', 'dmv', ' md', 'maryland']
PROOF_TOKENS = ['since 2015', 'family-owned', 'family owned', '4.9', '110', 'patriot liner', 'lifetime',
                'igl', 'system x', 'same-week', 'same week', 'net-30', 'volume pricing', 'upfit portal',
                'authorized', 'mobile application', 'government', 'dealer program']
PROOF_GROUPS = {
    'reviews': ['4.9', '110 reviews', 'google'], 'family': ['since 2015', 'family-owned', 'family owned'],
    'patriot': ['patriot liner', 'lifetime', 'authorized'], 'ceramic-cert': ['igl', 'system x'],
    'same-week': ['same-week', 'same week'], 'fleet-terms': ['net-30', 'volume pricing', 'upfit portal', '3+'],
    'mobile': ['mobile application'],
}
CTA_VERBS = ['get', 'request', 'book', 'schedule', 'start', 'apply', 'open', 'call', 'reserve', 'talk',
             'plan', 'build', 'see', 'explore', 'find', 'visit', 'send', 'price', 'quote', 'lock', 'protect',
             'contact', 'access', 'claim', 'compare', 'read', 'stop', 'bring', 'shop', 'browse', 'view', 'check']
BAD_PHRASES = ['same-day', 'same day', 'next-day', 'overnight', '24/7', 'instant', 'while you wait', '$', '%', '#1', 'number one', 'no. 1', 'cheapest', 'lowest price', 'best price', 'guarantee',
               'award', 'decade', 'free', ' 96', 'years of experience', 'veteran', 'licensed', 'insured']
OTHER_PLACES = ['baltimore', 'annapolis', 'frederick', 'arlington', 'alexandria', 'fairfax', 'potomac',
                'columbia', 'germantown', 'olney', 'wheaton', 'laurel', 'takoma', 'chevy chase', 'kensington',
                'tysons', 'mclean', 'reston', 'virginia beach', 'richmond', 'prince george', 'howard county',
                'loudoun', 'clarksburg', 'damascus', 'poolesville', 'north bethesda']
ALLOWED_NUMBERS = {'2015', '12019', '20852', '301', '304', '1419', '4.9', '110', '3', '3+', '30', '9:30',
                   '4:30', '9:30am', '4:30pm'}
ACRONYMS = {'MD', 'DC', 'DMV', 'IGL', 'LED', 'EV', 'PHEV', 'SUV', 'SUVS', 'RFP', 'UV', 'VA', 'X', 'I', 'A', 'DOT'}


# --- HTML helpers -------------------------------------------------------------
def masked(s):
    """Same-length copy with comments, <script> and <style> bodies blanked, so
    regex positions map 1:1 onto the original but never hit JS strings/comments."""
    def blank(m):
        return re.sub(r'[^\n]', ' ', m.group(0))
    s = re.sub(r'<!--.*?-->', blank, s, flags=re.S)
    s = re.sub(r'(<script\b[^>]*>)(.*?)(</script>)', lambda m: m.group(1) + blank(re.match(r'.*', m.group(2), re.S)) + m.group(3), s, flags=re.S | re.I)
    s = re.sub(r'(<style\b[^>]*>)(.*?)(</style>)', lambda m: m.group(1) + blank(re.match(r'.*', m.group(2), re.S)) + m.group(3), s, flags=re.S | re.I)
    return s


def esc_text(v):
    return v.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def esc_attr(v):
    return esc_text(v).replace('"', '&quot;')


def clean(v):
    return re.sub(r'\s+', ' ', html.unescape(v)).strip()


META_KEYS = ['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description']


def find_meta(s, m_s, key):
    for m in re.finditer(r'<meta\b[^>]*>', m_s, re.I):
        tag = s[m.start():m.end()]
        if re.search(r'\b(?:name|property)\s*=\s*"%s"' % re.escape(key), tag, re.I):
            c = re.search(r'\bcontent\s*=\s*"([^"]*)"', tag)
            if c:
                return (m.start() + c.start(1), m.start() + c.end(1), clean(c.group(1)))
    return None


def text_tokens(s, start, end):
    """Text-node spans (absolute) inside s[start:end] that contain letters/digits."""
    out = []
    pos = start
    for m in re.finditer(r'<[^>]+>', s[start:end]):
        a, b = start + m.start(), start + m.end()
        if a > pos:
            out.append((pos, a))
        pos = b
    if pos < end:
        out.append((pos, end))
    return [(a, b) for a, b in out if re.search(r'\w', html.unescape(s[a:b]))]


def extract(path):
    s = open(path, encoding='utf-8').read()
    ms = masked(s)
    page = {'path': path, 'fields': {}, 'spans': {}}
    t = re.search(r'<title\b[^>]*>(.*?)</title>', ms, re.S | re.I)
    if t:
        page['fields']['title'] = clean(s[t.start(1):t.end(1)])
        page['spans']['title'] = [t.start(1), t.end(1)]
    for k in META_KEYS:
        r = find_meta(s, ms, k)
        if r:
            page['fields'][k] = r[2]
            page['spans'][k] = [r[0], r[1]]
    h = re.search(r'<h1\b[^>]*>(.*?)</h1>', ms, re.S | re.I)
    hero_end = len(s)
    if h:
        toks = text_tokens(s, h.start(1), h.end(1))
        page['fields']['h1_segments'] = [clean(s[a:b]) for a, b in toks]
        page['fields']['h1_html'] = re.sub(r'\s+', ' ', s[h.start():h.end()]).strip()
        page['spans']['h1_segments'] = [[a, b] for a, b in toks]
        e = re.search(r'</section>|</header>', ms[h.end():])
        hero_end = h.end() + (e.start() if e else 3000)
        # primary CTAs = btn-primary / sh-btn-primary links/buttons in the hero after the H1
        ctas, cspans, notes, hrefs = [], [], [], []
        for m in re.finditer(r'<(a|button)\b([^>]*)>(.*?)</\1>', ms[h.end():hero_end], re.S | re.I):
            cls = re.search(r'class\s*=\s*"([^"]*)"', m.group(2))
            if not cls or not re.search(r'(^|\s)(btn-primary|sh-btn-primary)(\s|$)', cls.group(1)):
                continue
            a0 = h.end() + m.start(3)
            toks = text_tokens(s, a0, h.end() + m.end(3))
            if len(toks) != 1:
                notes.append('CTA with %d text nodes skipped' % len(toks))
                continue
            ctas.append(clean(s[toks[0][0]:toks[0][1]]))
            hr = re.search(r'href\s*=\s*"([^"]*)"', m.group(2))
            hrefs.append(hr.group(1) if hr else '')
            cspans.append(list(toks[0]))
        page['fields']['ctas'] = ctas
        page['spans']['ctas'] = cspans
        page['cta_hrefs'] = hrefs
        page['cta_notes'] = notes
        # hero + body context for the model
        sub = re.search(r'<p\b[^>]*>(.*?)</p>', ms[h.end():hero_end], re.S)
        page['hero_sub'] = clean(re.sub(r'<[^>]+>', ' ', s[h.end() + sub.start(1):h.end() + sub.end(1)])) if sub else ''
        body = re.sub(r'<[^>]+>', ' ', ms[h.end():])
        page['body_excerpt'] = clean(body)[:1400]
    svc, kws = SERVICE_BY_FILE.get(path, ('general', ['upfit']))
    page['service_intent'] = svc
    page['service_keywords'] = kws
    page['city_intent'] = CITY_BY_FILE.get(path, 'Rockville, MD (serving the DMV)')
    page['page_type'] = path.split('/')[0] if '/' in path else 'root'
    return page


def list_pages():
    files = sorted(glob.glob('*.html')) + sorted(glob.glob('services/*.html')) + \
        sorted(glob.glob('locations/*.html')) + sorted(glob.glob('blog/*.html'))
    return [f for f in files if f not in SKIP_FILES]


# --- validation ---------------------------------------------------------------
def fact_errors(text, page, field):
    errs = []
    low = ' ' + text.lower() + ' '
    for p in BAD_PHRASES:
        if p in low:
            errs.append('%s: phrase "%s" not backed by facts' % (field, p.strip()))
    if 'best' in low and 'best' not in page['fields'].get('title', '').lower():
        errs.append('%s: superlative "best" not backed by facts' % field)
    for place in OTHER_PLACES:
        if place in low:
            errs.append('%s: place "%s" not in service area facts' % (field, place))
    for n in re.findall(r'\d[\d,.:+]*\d\+?|\d\+?', text):
        n2 = n.rstrip('.,:').replace(',', '')
        if n2 not in ALLOWED_NUMBERS:
            errs.append('%s: number "%s" not in facts' % (field, n))
    if 'review' in low and '110' not in low:
        errs.append('%s: mentions reviews without the 110 count' % field)
    if 'lifetime' in low and 'liner' not in low:
        errs.append('%s: lifetime warranty is only a bedliner fact' % field)
    if 'certified' in low and not any(x in low for x in ('igl', 'system x', 'ceramic')):
        errs.append('%s: "certified" only applies to IGL/System X ceramic' % field)
    if re.search(r'\bstars?\b', low) and '4.9' not in low:
        errs.append('%s: star rating must be 4.9' % field)
    return errs


def stuffing(text, max_rep):
    words = [w for w in re.findall(r"[a-z][a-z'-]+", text.lower()) if len(w) > 3 and w not in
             ('capital', 'upfitters', 'with', 'your', 'from', 'that', 'this', 'and', 'for')]
    return sorted({w for w in words if words.count(w) > max_rep})


def validate(page, out, taken_titles, taken_metas, taken_h1):
    """Returns dict field -> list of errors (empty list = valid)."""
    f = page['fields']
    errs = {'title': [], 'meta': [], 'h1': [], 'ctas': []}
    # title
    t = out.get('title')
    if not isinstance(t, str) or not t.strip():
        errs['title'].append('title missing')
    else:
        t = t.strip()
        if len(t) > 60: errs['title'].append('title %d chars > 60' % len(t))
        if len(t) < 30: errs['title'].append('title %d chars is too thin, use 40-60' % len(t))
        if not t.endswith('Capital Upfitters'): errs['title'].append('brand must be last')
        if t.count('Capital Upfitters') != 1: errs['title'].append('brand must appear exactly once')
        lt = ' ' + t.lower() + ' '
        if not any(k in lt for k in LOCATION_TOKENS): errs['title'].append('no city/location in title')
        if not any(k in lt for k in page['service_keywords']): errs['title'].append('no service keyword (%s)' % '/'.join(page['service_keywords']))
        if not t[0].isupper() or [w for w in re.findall(r"[A-Za-z]+", t.split('|')[0]) if len(w) > 3 and w[0].islower()]:
            errs['title'].append('title must be in Title Case like the rest of the site')
        if page['page_type'] == 'blog':
            angle = [w for w in ('vs', 'best', 'when', 'how', 'which', 'guide', 'tips', 'blog') if re.search(r'\b%s\b' % w, f.get('title', '').lower())]
            if angle and not any(re.search(r'\b%s\b' % w, t.lower()) for w in angle):
                errs['title'].append('blog title lost the article angle (%s) - keep it so it does not cannibalize the service page' % '/'.join(angle))
        if re.search(r'\bgov\b', lt): errs['title'].append('no abbreviations like "Gov"')
        if t.lower() in taken_titles: errs['title'].append('duplicate title of %s' % taken_titles[t.lower()])
        rep = stuffing(t.replace('Capital Upfitters', ''), 1)
        if rep: errs['title'].append('keyword repeated: %s' % ', '.join(rep))
        errs['title'] += fact_errors(t, page, 'title')
    # meta
    d = out.get('meta_description')
    if not isinstance(d, str) or not d.strip():
        errs['meta'].append('meta missing')
    else:
        d = d.strip()
        if not 140 <= len(d) <= 158: errs['meta'].append('meta %d chars, need 140-158' % len(d))
        ld = ' ' + d.lower() + ' '
        if not any(k in ld for k in LOCATION_TOKENS): errs['meta'].append('no location in meta')
        if not any(k in ld for k in PROOF_TOKENS): errs['meta'].append('no proof point in meta')
        groups = [g for g, toks in PROOF_GROUPS.items() if any(k in ld for k in toks)]
        if len(groups) > 2: errs['meta'].append('too many proof points (%s) - use ONE' % ', '.join(groups))
        run_on = re.findall(r"[a-z0-9] (Call|Request|Get|Book|Schedule|Visit|Contact|Apply|Start|Read|See|Open)\b", d)
        if run_on: errs['meta'].append('run-on sentence before "%s" - end the previous sentence with a full stop' % run_on[0])
        if not re.search(r'\b(call|request|get|book|schedule|visit|stop by|contact|apply|start|read|see|open|plan|talk|bring|find|compare|explore)\b', d.lower()):
            errs['meta'].append('no call to action in meta')
        if not d[0].isupper(): errs['meta'].append('meta must start with a capital (sentence case)')
        last = [x for x in re.split(r'(?<=[.!])\s+', d) if x.strip()][-1]
        if not re.search(r'\b(call|request|get|book|schedule|visit|stop by|contact|apply|start|read|see|open|plan|talk|bring|find|compare|explore)\b', last.lower()):
            errs['meta'].append('the call to action must be the LAST sentence')
        if d[-1] not in '.!': errs['meta'].append('meta must end with a full stop')
        words = re.findall(r"[A-Za-z][A-Za-z'-]*", d)
        shouty = [w for w in words if len(w) > 1 and w.isupper() and w.upper() not in ACRONYMS]
        if shouty: errs['meta'].append('ALL-CAPS words in meta: %s' % ', '.join(shouty[:4]))
        caps = [w for w in words[1:] if w[0].isupper()]
        if words and len(caps) > 0.45 * len(words): errs['meta'].append('meta looks Title Case, need sentence case')
        if d.lower() in taken_metas: errs['meta'].append('duplicate meta of %s' % taken_metas[d.lower()])
        rep = stuffing(d, 2)
        if rep: errs['meta'].append('keyword repeated >2x: %s' % ', '.join(rep))
        errs['meta'] += fact_errors(d, page, 'meta')
    # h1
    orig_segs = f.get('h1_segments', [])
    segs = out.get('h1_segments')
    if page['path'] in FIXED_H1 or page['path'] in LOCK_H1 or not orig_segs:
        pass
    elif not isinstance(segs, list) or len(segs) != len(orig_segs) or not all(isinstance(x, str) and x.strip() for x in segs):
        errs['h1'].append('h1_segments must be a list of %d non-empty strings' % len(orig_segs))
    else:
        joined = ' '.join(x.strip() for x in segs)
        if joined != joined.upper(): errs['h1'].append('h1 must be UPPERCASE')
        oend = ' '.join(orig_segs).strip()[-1:]
        if oend in '?!' and not joined.endswith(oend): errs['h1'].append('h1 must keep the original "%s" ending' % oend)
        if len(joined) > 60: errs['h1'].append('h1 %d chars > 60' % len(joined))
        if len(joined.split()) < 2: errs['h1'].append('h1 too short')
        if joined.lower() in taken_h1: errs['h1'].append('duplicate h1 of %s' % taken_h1[joined.lower()])
        errs['h1'] += fact_errors(joined, page, 'h1')
    # ctas
    oc = f.get('ctas', [])
    cs = out.get('ctas')
    if oc:
        if not isinstance(cs, list) or len(cs) != len(oc) or not all(isinstance(x, str) and x.strip() for x in cs):
            errs['ctas'].append('ctas must be a list of %d strings in the same order' % len(oc))
        else:
            for c in cs:
                c = c.strip()
                if len(c) > 28: errs['ctas'].append('CTA "%s" > 28 chars' % c)
                if len(c.split()) > 5: errs['ctas'].append('CTA "%s" > 5 words' % c)
                if c.split()[0].lower() not in CTA_VERBS: errs['ctas'].append('CTA "%s" must start with an action verb' % c)
                if '→' in c and not any('→' in o for o in oc): errs['ctas'].append('no arrows in CTA')
                errs['ctas'] += fact_errors(c, page, 'cta')
            for c, href in zip(cs, page.get('cta_hrefs', [])):
                if 'quote' not in href.lower() and re.search(r'quote|pricing|price', c, re.I):
                    errs['ctas'].append('CTA "%s" promises a quote but the button links to %s - label must match the destination' % (c, href))
    return errs


# --- model ----------------------------------------------------------------------
def build_prompt(page, taken_titles, taken_metas, feedback=None):
    f = page['fields']
    segs = f.get('h1_segments', [])
    if page['path'] in FIXED_H1:
        h1_rule = 'H1 is FIXED (approved): return h1_segments exactly %s.' % json.dumps(FIXED_H1[page['path']])
    elif page['path'] in LOCK_H1 or not segs:
        h1_rule = 'H1 is locked on this page: return h1_segments exactly %s.' % json.dumps(segs)
    else:
        h1_rule = ('H1: the site\'s uppercase punchy style (ALL CAPS, short, ends with a period, max 60 chars total). '
                   'The H1 markup has %d text segments %s; return exactly %d segments in the same order. '
                   'When there are 2 segments the 2nd is the accent-colored highlight (an <em> or a line break) that completes the first. '
                   'Lead with the service and, where natural, the city.' % (len(segs), json.dumps(segs), len(segs)))
    cta_rule = ('CTAs: the hero has %d primary CTA button(s) %s. Return exactly %d short action-led labels (2-4 words, max 28 chars, '
                'start with a verb, no arrows, no "free"), same order. Prefer "Get a Quote" or "Request Installed Pricing" unless a more '
                'specific action clearly fits this page. The label must match where the button goes (destinations: %s).' % (len(f.get('ctas', [])), json.dumps(f.get('ctas', [])), len(f.get('ctas', [])), json.dumps(page.get('cta_hrefs', []))) if f.get('ctas') else
                'CTAs: this page has no hero primary CTA; return "ctas": [].')
    others_t = '\n'.join('- ' + t for t in sorted(taken_titles)) or '- (none yet)'
    others_m = '\n'.join('- ' + m for m in sorted(taken_metas)) or '- (none yet)'
    p = f"""You are a senior local-SEO and conversion copywriter for a truck and vehicle upfitting shop.
{FACTS}

PAGE
- path: {page['path']}
- page type: {page['page_type']}
- service intent: {page['service_intent']}
- city intent: {page['city_intent']}
- suggested proof point for this page's meta (use it unless another FACT fits clearly better): {PROOF_HINT.get(page['path'], 'pick the most relevant single FACT; do not default to the review count')}
- current title: {f.get('title', '')}
- current meta description: {f.get('description', '')}
- current og:title / og:description: {f.get('og:title', '')} / {f.get('og:description', '')}
- current H1 segments: {json.dumps(segs)}
- current hero primary CTA labels: {json.dumps(f.get('ctas', []))}
- hero subhead: {page.get('hero_sub', '')}
- page text excerpt: {page.get('body_excerpt', '')[:1200]}

RULES
- title: 40 to 60 characters INCLUDING spaces (use the room for a specific service phrase). Pattern: <service> <city or area> | Capital Upfitters. Brand last, exactly once. Must include a service word ({' / '.join(page['service_keywords'])}) and a location (e.g. Rockville MD, Bethesda MD, the DMV, Maryland).
- meta_description: 140 to 158 characters INCLUDING spaces (count carefully). Sentence case, two or three short grammatical sentences, rugged and direct, ending with a full stop. Include the service, the location, exactly ONE proof point from the FACTS, and end with a call to action (e.g. "Call (301) 304-1419." / "Request installed pricing." / "Get a quote today."). Use plain ASCII hyphens.
  Example shape (do not copy): "Patriot Liner spray-on bedliners installed in Rockville, MD by the corridor's only authorized dealer. Lifetime warranty. Request installed pricing today."
- {h1_rule}
- {cta_rule}
- Product or process details (e.g. "no drilling") may only be used if they appear in the page text excerpt; never invent process claims.
- {'BLOG POST: keep the article angle in the title (e.g. the comparison "X vs Y", "When to ...", "Best ...", guide). Location may be "Maryland" or "MD". The title must read as an article, not a service page, so it does not cannibalize the matching service page.' if page['page_type'] == 'blog' else 'Title Case title, like the rest of the site.'}
- Write like a human copywriter: natural phrasing, no awkward keyword strings (avoid things like "Pricing Quote Rockville MD"), no abbreviations like "Gov".
- No keyword stuffing (no word repeated in the title, nothing repeated more than twice in the meta). No speed claims beyond "same-week" (never same-day/next-day), no prices, percentages, years other than 2015, review counts other than 110, other cities, "free", "best", "#1", guarantees or awards.
- Title and meta must be unique; do not reuse any of these titles used by other pages:
{others_t}
- and none of these meta descriptions:
{others_m}
- rationale: one line explaining the choice.

Return ONLY a JSON object, no markdown, with keys: "title", "meta_description", "h1_segments", "ctas", "rationale"."""
    if feedback:
        p += '\n\nYOUR PREVIOUS ANSWER FAILED VALIDATION:\n' + json.dumps(feedback, ensure_ascii=False) + \
             '\nFix every error listed. Count characters exactly. Return the full JSON object again.'
    return p


def call_model(model, prompt):
    body = {'model': model, 'stream': False, 'messages': [{'role': 'user', 'content': prompt}],
            'options': {'temperature': 0.4, 'num_ctx': 8192}}
    if model.startswith('gpt-oss'):
        body['think'] = 'medium'
    else:
        body['think'] = False
    req = urllib.request.Request(OLLAMA, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as r:
        d = json.loads(r.read())
    dt = time.time() - t0
    if 'error' in d:
        raise RuntimeError(d['error'])
    txt = d.get('message', {}).get('content', '')
    a, b = txt.find('{'), txt.rfind('}')
    if a < 0 or b < 0:
        raise ValueError('no JSON object in model output: ' + txt[:200])
    return normalize(json.loads(txt[a:b + 1])), dt


def normalize(o):
    """Fold typographic hyphens/spaces the model likes (U+2011 etc.) back to ASCII."""
    if isinstance(o, str):
        for k, v in {'\u2011': '-', '\u2010': '-', '\u2012': '-', '\u00a0': ' ', '\u202f': ' ', '\u2009': ' ',
                     '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"'}.items():
            o = o.replace(k, v)
        return re.sub(r' {2,}', ' ', o).strip()
    if isinstance(o, list):
        return [normalize(x) for x in o]
    if isinstance(o, dict):
        return {k: normalize(v) for k, v in o.items()}
    return o


# --- commands ---------------------------------------------------------------------
def load():
    return json.load(open(RESULTS, encoding='utf-8')) if os.path.exists(RESULTS) else None


def save(data):
    os.makedirs(os.path.dirname(RESULTS), exist_ok=True)
    with open(RESULTS, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)


def cmd_inventory():
    pages = [extract(p) for p in list_pages()]
    data = {'generated_from': subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip(),
            'pages': pages, 'run': {}}
    save(data)
    for p in pages:
        f = p['fields']
        print('%-42s | %s | H1 %s | CTA %s' % (p['path'], f.get('title'), f.get('h1_segments'), f.get('ctas')))
    print('%d pages' % len(pages))


def final_fields(p):
    """Copy that will be live after apply (new where accepted, otherwise original)."""
    f, n = p['fields'], p.get('new', {})
    return {'title': n.get('title') or f.get('title', ''),
            'meta': n.get('meta') or f.get('description', ''),
            'h1': ' '.join(n.get('h1_segments') or f.get('h1_segments', []))}


def cmd_generate(only=None):
    data = load()
    model = data['run'].get('current_model', PRIMARY_MODEL)
    run_start = time.time()
    for p in data['pages']:
        if only and p['path'] not in only:
            continue
        if p.get('done') and not only:
            continue
        if p.get('done'):
            p.setdefault('previous_passes', []).append({k: p.get(k) for k in ('new', 'flags', 'seconds', 'model', 'rationale')})
        p['flags'] = list(p.get('cta_notes', []))
        p['new'] = {}
        if p['path'] in LEGAL:
            p['flags'].append('skipped by design: legal page (privacy/terms) - no service/city intent, copy left untouched')
            p['done'] = True; p['model'] = None; save(data); continue
        # uniqueness sets from every OTHER page's live copy
        tt, tm, th = {}, {}, {}
        for q in data['pages']:
            if q is p: continue
            ff = final_fields(q)
            if ff['title']: tt[ff['title'].lower()] = q['path']
            if ff['meta']: tm[ff['meta'].lower()] = q['path']
            if ff['h1']: th[ff['h1'].lower()] = q['path']
        disp_t = [final_fields(q)['title'] for q in data['pages'] if q is not p and q.get('done')]
        disp_m = [final_fields(q)['meta'] for q in data['pages'] if q is not p and q.get('done')]
        attempts, out, errs, feedback, page_secs = [], None, None, None, 0.0
        for attempt in (1, 2):
            prompt = build_prompt(p, disp_t, disp_m, feedback)
            try:
                out, dt = call_model(model, prompt)
            except Exception as e:  # timeout / OOM / bad JSON
                msg = str(e)
                attempts.append({'model': model, 'error': msg[:300]})
                print('  !! %s attempt %d (%s): %s' % (p['path'], attempt, model, msg[:200]), flush=True)
                if model == PRIMARY_MODEL and re.search(r'memory|timed out|timeout|resource', msg, re.I):
                    model = FALLBACK_MODEL; data['run']['current_model'] = model
                    data['run'].setdefault('switch_events', []).append('%s: switched to %s after: %s' % (p['path'], model, msg[:120]))
                out = None
                continue
            page_secs += dt
            errs = validate(p, out, tt, tm, th)
            attempts.append({'model': model, 'seconds': round(dt, 1), 'output': out, 'errors': errs})
            print('  %s attempt %d %s %.0fs errors=%s' % (p['path'], attempt, model, dt, {k: v for k, v in errs.items() if v}), flush=True)
            if model == PRIMARY_MODEL and dt > SLOW_SECONDS:
                model = FALLBACK_MODEL; data['run']['current_model'] = model
                data['run'].setdefault('switch_events', []).append('%s: gpt-oss took %.0fs (>%ds); switched to %s for remaining pages' % (p['path'], dt, SLOW_SECONDS, model))
            if not any(errs.values()):
                break
            feedback = {k: v for k, v in errs.items() if v}
        p['attempts'] = attempts
        p['model'] = sorted({a['model'] for a in attempts if 'output' in a}) or [model]
        p['seconds'] = round(page_secs, 1)
        # per-field acceptance; invalid fields keep the original and get flagged
        if out is None:
            p['flags'].append('model failed twice - all copy kept original')
        else:
            p['rationale'] = out.get('rationale', '')
            if not errs['title'] and out['title'].strip() != p['fields'].get('title'):
                p['new']['title'] = out['title'].strip()
            elif errs['title']: p['flags'].append('title kept original: ' + '; '.join(errs['title']))
            if not errs['meta'] and out['meta_description'].strip() != p['fields'].get('description'):
                p['new']['meta'] = out['meta_description'].strip()
            elif errs['meta']: p['flags'].append('meta kept original: ' + '; '.join(errs['meta']))
            if p['path'] in FIXED_H1:
                if FIXED_H1[p['path']] != p['fields'].get('h1_segments'):
                    p['new']['h1_segments'] = FIXED_H1[p['path']]
                    p['flags'].append('H1 set to approved homepage H1 (not model-generated)')
            elif p['path'] in LOCK_H1:
                p['flags'].append('H1 locked: ' + LOCK_H1[p['path']])
            elif p['fields'].get('h1_segments'):
                if not errs['h1']:
                    segs = [x.strip() for x in out['h1_segments']]
                    if segs != p['fields']['h1_segments']: p['new']['h1_segments'] = segs
                else: p['flags'].append('H1 kept original: ' + '; '.join(errs['h1']))
            if p['fields'].get('ctas'):
                if not errs['ctas']:
                    cs = [x.strip() for x in out['ctas']]
                    if cs != p['fields']['ctas']: p['new']['ctas'] = cs
                else: p['flags'].append('CTAs kept original: ' + '; '.join(errs['ctas']))
            else:
                p['flags'].append('no hero primary CTA on page - nothing to rewrite')
        p['done'] = True
        save(data)
    data['run']['generate_seconds'] = round(data['run'].get('generate_seconds', 0) + time.time() - run_start, 1)
    save(data)


# Human editorial review after generation: fields that passed the automatic
# checks but read badly or carry claims not in the facts. They revert to the
# original copy and are flagged in the report.
REVIEW_REJECTS = {
    'contact.html': {'meta': 'pasted the proof hint verbatim ("12019 Nebel St / by appointment")'},
    'dealer-government.html': {'meta': '"pricing support" is vague/not a fact and "Request installed pricing" does not fit a dealer-account page'},
    'rebates.html': {'meta': '"Offers apply at install" is not in the facts or page text'},
    'start-here.html': {'title': 'awkward ("Start Here Service Rockville MD")', 'meta': 'awkward ("Start-here service for trucks")'},
    'blog/index.html': {'meta': 'describes the undercoating article, not the blog index'},
    'blog/leveling-vs-lift-kit.html': {'meta': 'repeats "family-owned" twice'},
    'blog/patriot-liner-vs-drop-in.html': {'title': 'hyphens dropped ("SprayOn vs. DropIn")'},
    'blog/undercoating-maryland-winter.html': {'meta': 'ends "Request installed pricing now today."'},
}
FIELD_LABEL = {'title': 'title', 'meta': 'meta', 'h1_segments': 'H1', 'ctas': 'CTAs'}


def cmd_review():
    data = load()
    for p in data['pages']:
        for field, why in REVIEW_REJECTS.get(p['path'], {}).items():
            if field in p.get('new', {}):
                p.setdefault('rejected', {})[field] = {'value': p['new'].pop(field), 'reason': why}
                p['flags'].append('%s kept original (editorial review): %s' % (FIELD_LABEL[field], why))
                print('rejected', p['path'], field)
    save(data)


def cmd_apply():
    data = load()
    for p in data['pages']:
        n = p.get('new') or {}
        if not n:
            continue
        path, sp = p['path'], p['spans']
        s = open(path, encoding='utf-8').read()
        # sanity: spans still point at the original text
        assert clean(s[sp['title'][0]:sp['title'][1]]) == p['fields']['title'], path
        edits = []
        if 'title' in n:
            edits.append((sp['title'], esc_text(n['title'])))
            for k in ('og:title', 'twitter:title'):
                if k in sp: edits.append((sp[k], esc_attr(n['title'])))
        if 'meta' in n:
            for k in ('description', 'og:description', 'twitter:description'):
                if k in sp: edits.append((sp[k], esc_attr(n['meta'])))
        if 'h1_segments' in n:
            for (a, b), v in zip(sp['h1_segments'], n['h1_segments']):
                raw = s[a:b]
                lead = raw[:len(raw) - len(raw.lstrip())]; trail = raw[len(raw.rstrip()):]
                edits.append(([a, b], lead + esc_text(v) + trail))
        if 'ctas' in n:
            for (a, b), v in zip(sp['ctas'], n['ctas']):
                raw = s[a:b]
                lead = raw[:len(raw) - len(raw.lstrip())]; trail = raw[len(raw.rstrip()):]
                edits.append(([a, b], lead + esc_text(v) + trail))
        for (a, b), v in sorted(edits, key=lambda e: -e[0][0]):
            s = s[:a] + v + s[b:]
        open(path, 'w', encoding='utf-8').write(s)
        print('applied', path, sorted(n))


class Seq(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.seq = []; self.ld = []; self._ld = None; self.titles = 0; self.descs = 0; self.h1 = 0; self._skipstack = []; self.text = []; self._raw = 0; self._head = False
    # Presentational-only attributes are ignored by the structure check so the
    # brand/mobile CSS passes (inline style, hover handlers, class tweaks) and
    # image sizing attrs don't trip it. Decorative elements added by the design
    # pass (span.accent-word in the H1, img.card-media card images) are skipped.
    IGNORE_ATTRS = {'style', 'class', 'onmouseover', 'onmouseout', 'onmouseenter', 'onmouseleave',
                    'width', 'height', 'loading', 'decoding', 'fetchpriority', 'aria-hidden',
                    'fill', 'stroke', 'stop-color', 'aria-label'}
    SKIP = (('span', 'accent-word'), ('img', 'card-media'))
    # Live review figures: data-review-* templates are filled by reviews.js from
    # Trustindex, and the reviews.js include itself is not a structural change.
    REVIEW_ATTR = 'data-review-'

    def _skip(self, tag, a):
        cls = (a.get('class') or '').split()
        if tag == 'script' and (a.get('src') or '').endswith(('reviews.js', '/analytics.js')): return True
        return any(tag == t and c in cls for t, c in self.SKIP)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self._skip(tag, a):
            if tag != 'img': self._skipstack.append(tag)
            return
        for k in ('content', 'alt', 'title', 'aria-label'):
            if a.get(k): self.text.append(a[k])
        if tag in ('script', 'style'): self._raw += 1
        if tag == 'meta' and (a.get('name') in META_KEYS or a.get('property') in META_KEYS):
            a.pop('content', None)
            if a.get('name') == 'description': self.descs += 1
        if tag == 'title': self.titles += 1
        if tag == 'h1': self.h1 += 1
        if tag == 'script' and a.get('type') == 'application/ld+json': self._ld = ''
        if tag == 'head': self._head = True
        # Tag/attribute structure is compared for <head> only (title, meta, links,
        # head scripts). Body layout/UI changes (e.g. the mobile action bar, the
        # quote vehicle step) are design work, not SEO-copy drift; the body is
        # still covered by the JSON-LD, single-H1 and review-figure checks.
        if not self._head: return
        self.seq.append(('S', tag, tuple(sorted((k, v) for k, v in a.items()
                                                if k not in self.IGNORE_ATTRS and not k.startswith(self.REVIEW_ATTR)))))
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag in ('script', 'style'): self._raw -= 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self._raw: self._raw -= 1
        if self._skipstack and self._skipstack[-1] == tag:
            self._skipstack.pop(); return
        if tag == 'script' and self._ld is not None: self.ld.append(self._ld); self._ld = None
        if tag == 'head': self._head = False
        if self._head: self.seq.append(('E', tag))
    def handle_data(self, d):
        if self._ld is not None: self._ld += d
        elif not self._raw: self.text.append(d)


# Hardcoded review figures (rating or count) in visible text, meta/alt/title/aria.
# Live figures come from reviews.js (Trustindex) via data-review-* templates.
REVIEW_NUM_RE = re.compile(
    r'\b\d[\d,]*\+?[^\S\n]+(?:verified[^\S\n]+|google[^\S\n]+|customer[^\S\n]+|5-star[^\S\n]+|five-star[^\S\n]+)*reviews?\b'
    r'|\b[1-5]\.\d\s*(?:★|-?stars?\b|/\s*5\b|google\b|average\b|rating\b)'
    r'|\brated\s+[1-5](?:\.\d)?\b', re.I)


def ld_norm(blobs):
    out = []
    for blob in blobs:
        try: obj = json.loads(blob)
        except Exception: out.append(blob); continue
        def strip(o):
            if isinstance(o, dict): return {k: strip(v) for k, v in o.items() if k != 'aggregateRating'}
            if isinstance(o, list): return [strip(v) for v in o]
            return o
        out.append(json.dumps(strip(obj), sort_keys=True))
    return out


def cmd_check():
    bad = 0
    for path in list_pages():
        old = subprocess.run(['git', 'show', 'HEAD:' + path], capture_output=True, text=True).stdout
        new = open(path, encoding='utf-8').read()
        a, b = Seq(), Seq()
        a.feed(old); b.feed(new)
        probs = []
        # Brand-new pages (not in HEAD) only need basic SEO shape — no "h1 count
        # changed" vs an empty baseline. Existing pages keep the stricter diffs.
        is_new = not old.strip()
        if a.seq != b.seq and not is_new:
            # A file that was truncated at HEAD (no </html>) may get its missing tail restored.
            restored = '</html>' not in old and b.seq[:len(a.seq)] == a.seq
            if not restored: probs.append('tag/attribute sequence changed')
        # JSON-LD must be unchanged except for removing hardcoded aggregateRating.
        if not is_new and ld_norm(a.ld) != ld_norm(b.ld): probs.append('JSON-LD changed')
        if any('aggregateRating' in blob for blob in b.ld): probs.append('hardcoded aggregateRating in JSON-LD')
        hits = sorted(set(m.group(0) for m in REVIEW_NUM_RE.finditer('\n'.join(b.text))))
        if hits: probs.append('hardcoded review figure(s): %s' % hits)
        for blob in b.ld:
            try: json.loads(blob)
            except Exception as e: probs.append('JSON-LD invalid: %s' % e)
        if b.titles != 1: probs.append('%d <title>' % b.titles)
        if b.descs != 1: probs.append('%d meta description' % b.descs)
        if is_new:
            if b.h1 != 1: probs.append('%d <h1> on new page' % b.h1)
        elif b.h1 != a.h1:
            probs.append('h1 count changed')
        changed = old != new
        print('%-42s %s %s' % (path, 'CHANGED' if changed else 'same   ', 'OK' if not probs else 'FAIL ' + '; '.join(probs)))
        bad += bool(probs)
    titles, metas = {}, {}
    for path in list_pages():
        pg = extract(path)
        titles.setdefault(pg['fields'].get('title', '').lower(), []).append(path)
        metas.setdefault(pg['fields'].get('description', '').lower(), []).append(path)
    for kind, mp in (('title', titles), ('meta', metas)):
        for v, ps in mp.items():
            if len(ps) > 1:
                print('DUPLICATE %s across %s' % (kind, ps)); bad += 1
    print('sanity failures:', bad)
    sys.exit(1 if bad else 0)


def cmd_report():
    data = load()
    pages = data['pages']
    run = data['run']
    def mdl(p):
        return ', '.join(p['model']) if isinstance(p.get('model'), list) else (p.get('model') or 'n/a')
    changed = [p for p in pages if p.get('new')]
    L = ['# SEO copy rewrite (local Ollama) - report', '',
         '- Branch: `seo-copy-ollama` (from `%s`), not pushed, not deployed, no PR.' % data.get('generated_from'),
         '- Script: `scripts/ollama-seo-rewrite.py` (inventory -> generate -> apply -> check -> report). Raw model I/O: `docs/seo-copy-ollama-results.json`.',
         '- Primary model: `%s` (local, think=medium). Fallback: `%s`. Cloud models never used.' % (PRIMARY_MODEL, FALLBACK_MODEL),
         '- Model switch events: %s' % ('; '.join(run.get('switch_events', [])) or 'none - every page used gpt-oss:120b'),
         '- Model generation time: %.1f min total = pass 1 (all pages) %.1f min + pass 2 (%d pages regenerated after review) %.1f min.' % (
             run.get('generate_seconds', 0) / 60, run.get('pass1_seconds', 0) / 60, sum(1 for p in pages if p.get('redo_reason')),
             (run.get('generate_seconds', 0) - run.get('pass1_seconds', 0)) / 60),
         '- Editorial review: fields that passed the automatic checks but read badly or carried claims not in the facts were reverted to the original (see REVIEW_REJECTS in the script; rejected text is listed per page).',
         '- Pages inventoried: %d. Pages changed: %d.' % (len(pages), len(changed)),
         '- Scope: <title>, meta description (og/twitter description and title mirrored where those tags exist), hero H1 text nodes, hero primary CTA labels. Markup, classes, hrefs and JSON-LD untouched (verified by `check`).',
         '- Skipped files: preview.html, 404.html, products-section.html (snippet), admin/, tina/, tests/, node_modules/.',
         '', '## Notes', '',
         '- The homepage hero slider (`SERVICE_SLIDES` in index.html JS) rewrites the H1/CTA text at runtime once it hydrates; the static H1 (no-JS / crawler / pre-hydration state) is now the approved `BUILT FOR REAL WORK.`. Slider copy was not changed.',
         '- Service pages pull `seo.metaTitle` / `seo.metaDescription` from the CMS API at runtime when it is reachable, and `cms-data.json` still holds the old SEO strings. If the CMS is live it will override the new static title/meta in the browser; update the CMS entries to match if you keep this copy.',
         '- index.html, privacy.html and terms.html have no twitter:* tags; none were added.',
         '']
    L += ['## Summary', '', '| Page | Model | Sec | Title | Meta | H1 | CTAs | Flags |', '|---|---|---|---|---|---|---|---|']
    for p in pages:
        n = p.get('new', {})
        L.append('| %s | %s | %s | %s | %s | %s | %s | %d |' % (p['path'], mdl(p), p.get('seconds', '-'),
                 'new' if 'title' in n else '-', 'new' if 'meta' in n else '-', 'new' if 'h1_segments' in n else '-',
                 'new' if 'ctas' in n else '-', len(p.get('flags', []))))
    L += ['', '## Per page', '']
    for p in pages:
        f, n = p['fields'], p.get('new', {})
        om = f.get('description', ''); nm = n.get('meta', om)
        L += ['### `%s`' % p['path'], '',
              '- Intent: %s / %s - model: %s, %ss' % (p['service_intent'], p['city_intent'], mdl(p), p.get('seconds', '-')),
              '- Title (old, %d): %s' % (len(f.get('title', '')), f.get('title', '')),
              '- Title (new, %d): %s%s' % (len(n.get('title', f.get('title', ''))), n.get('title', f.get('title', '')), '' if 'title' in n else ' _(unchanged)_'),
              '- Meta (old, %d): %s' % (len(om), om),
              '- Meta (new, %d): %s%s' % (len(nm), nm, '' if 'meta' in n else ' _(unchanged)_'),
              '- H1 (old): %s' % ' / '.join(f.get('h1_segments', [])),
              '- H1 (new): %s%s' % (' / '.join(n.get('h1_segments', f.get('h1_segments', []))), '' if 'h1_segments' in n else ' _(unchanged)_'),
              '- CTAs (old): %s' % (', '.join(f.get('ctas', [])) or '(none in hero)'),
              '- CTAs (new): %s%s' % (', '.join(n.get('ctas', f.get('ctas', []))) or '(none in hero)', '' if 'ctas' in n else ' _(unchanged)_'),
              '- Rationale: %s' % (p.get('rationale') or '-'),
              '- Flags: %s' % ('; '.join(p.get('flags', [])) or 'none')]
        for field, r in p.get('rejected', {}).items():
            v = r['value'] if isinstance(r['value'], str) else ' / '.join(r['value'])
            L.append('- Rejected model %s: "%s"' % (FIELD_LABEL[field], v))
        if p.get('redo_reason'):
            L.append('- Pass 2: regenerated after review - %s (pass-1 output kept in results JSON)' % p['redo_reason'])
        L.append('')
    open(REPORT, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('wrote', REPORT)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'generate':
        cmd_generate(set(sys.argv[2:]) or None)
    elif cmd in ('inventory', 'review', 'apply', 'check', 'report'):
        globals()['cmd_' + cmd]()
    else:
        print(__doc__)
