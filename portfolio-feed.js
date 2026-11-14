/*
 * gallery-feed.js: adds approved photos from the backend gallery feed.
 *
 * Usage (see gallery.html and services/*.html):
 *   <div class="gallery-grid" data-gallery-feed="grid"> ...static items... </div>
 *   <section data-gallery-feed="section" data-service="tonneau" hidden> ... </section>
 *   <script src="/gallery-feed.js" defer></script>
 *
 * Photos live in the backend (capital-upfitters-next, src/data/gallery.ts) and
 * are served only after owner review and a customer/rights release. This
 * script only ADDS to the page. Static images and text are never removed or
 * changed, and a "section" stays hidden until at least one photo arrives. If
 * the feed is unreachable, slow, empty, or malformed, the page is exactly the
 * static page. No structured data is injected.
 */
(function () {
  'use strict';
  var script = document.currentScript;
  var FEED = (script && script.getAttribute('data-gallery-feed-url')) ||
    'https://capital-upfitters-next.vercel.app/api/public/gallery';
  var MAX_ITEMS = 24;
  var targets = document.querySelectorAll('[data-gallery-feed]');
  if (!targets.length || !window.fetch) return;

  // Gallery page filter groups; services not listed fall under "accessories".
  var CATEGORY = {
    'bedliner': 'bedliner',
    'ceramic-coating': 'ceramic',
    'hitches': 'hitch',
    'stealth-hitches': 'hitch',
    'undercoating': 'undercoating',
    'commercial-wraps': 'fleet',
    'industrial-coatings': 'fleet'
  };

  function cleanUrl(value) {
    if (typeof value !== 'string') return '';
    try {
      var u = new URL(value);
      if (u.protocol !== 'https:' || u.username || u.password) return '';
      return u.href;
    } catch (e) { return ''; }
  }
  function text(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
  }
  function dim(value) {
    return typeof value === 'number' && value > 0 && value <= 10000 && Math.floor(value) === value ? String(value) : '';
  }
  function el(tag, cls, content) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (content) node.textContent = content;
    return node;
  }
  function image(p) {
    var img = document.createElement('img');
    img.src = p.url;
    img.alt = p.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    if (p.width) img.setAttribute('width', p.width);
    if (p.height) img.setAttribute('height', p.height);
    return img;
  }

  function normalizePhoto(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var url = cleanUrl(raw.url), alt = text(raw.alt, 300);
    if (!url || !alt) return null;
    return {
      url: url, alt: alt, caption: text(raw.caption, 300),
      width: dim(raw.width), height: dim(raw.height),
      service: text(raw.service, 40), illustrative: raw.provenance === 'illustrative'
    };
  }
  function normalize(data, seen) {
    var out = [];
    if (!data || data.ok !== true) return out;
    (Array.isArray(data.pairs) ? data.pairs : []).forEach(function (raw) {
      if (!raw || typeof raw !== 'object') return;
      var b = normalizePhoto(raw.before), a = normalizePhoto(raw.after);
      if (!a || !b || seen[a.url] || seen[b.url]) return;
      seen[a.url] = seen[b.url] = true;
      out.push({ pair: true, before: b, after: a, service: a.service,
        caption: text(raw.caption, 300) || a.caption,
        illustrative: raw.provenance === 'illustrative' || a.illustrative || b.illustrative });
    });
    (Array.isArray(data.photos) ? data.photos : []).forEach(function (raw) {
      var p = normalizePhoto(raw);
      if (!p || seen[p.url]) return;
      seen[p.url] = true;
      p.pair = false;
      out.push(p);
    });
    return out.slice(0, MAX_ITEMS);
  }
  function captionOf(item) {
    return item.caption + (item.illustrative ? ' (illustrative image)' : '');
  }

  function figure(item) {
    var fig = el('figure', 'gfeed-item' + (item.pair ? ' gfeed-pair' : ''));
    fig.setAttribute('data-feed-item', '');
    if (item.pair) {
      [['Before', item.before], ['After', item.after]].forEach(function (s) {
        var half = el('div', 'gfeed-half');
        half.appendChild(image(s[1]));
        half.appendChild(el('span', 'gfeed-tag', s[0]));
        fig.appendChild(half);
      });
    } else {
      fig.appendChild(image(item));
    }
    if (item.caption) fig.appendChild(el('figcaption', 'gfeed-caption', captionOf(item)));
    return fig;
  }
  function gridItem(item) {
    var wrap = el('div', 'gallery-item gfeed-grid-item' + (item.pair ? ' gfeed-pair' : ''));
    wrap.setAttribute('data-feed-item', '');
    wrap.setAttribute('data-cat', CATEGORY[item.service] || 'accessories');
    wrap.setAttribute('role', 'listitem');
    wrap.setAttribute('tabindex', '0');
    if (item.pair) {
      [['Before', item.before], ['After', item.after]].forEach(function (s) {
        var half = el('div', 'gfeed-half');
        half.appendChild(image(s[1]));
        half.appendChild(el('span', 'gfeed-tag', s[0]));
        wrap.appendChild(half);
      });
    } else {
      wrap.appendChild(image(item));
    }
    var label = captionOf(item) || item.alt;
    var overlay = el('div', 'gallery-item-overlay');
    overlay.appendChild(el('span', 'gallery-item-label', label));
    wrap.appendChild(overlay);
    return wrap;
  }

  function addStyles() {
    if (document.getElementById('gfeed-styles')) return;
    var s = document.createElement('style');
    s.id = 'gfeed-styles';
    s.textContent =
      '.gfeed-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;margin:0;padding:0}' +
      '.gfeed-item{margin:0;position:relative;overflow:hidden}' +
      '.gfeed-item img,.gfeed-grid-item img{display:block;width:100%;height:auto}' +
      '.gfeed-caption{padding:.5rem 0;font-size:.875rem;color:var(--color-text-secondary,#4b5563)}' +
      '.gfeed-pair{grid-column:span 2}' +
      '.gfeed-pair{display:flex;flex-wrap:wrap;gap:.25rem}' +
      '.gfeed-pair .gfeed-half{position:relative;flex:1 1 200px;min-width:0}' +
      '.gfeed-tag{position:absolute;left:.5rem;top:.5rem;padding:.15rem .5rem;font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:rgba(17,24,39,.85);color:#fff}' +
      '.gfeed-pair .gfeed-caption{flex:1 1 100%}' +
      '@media(max-width:560px){.gfeed-pair{grid-column:span 1}}';
    document.head.appendChild(s);
  }

  function updateCount() {
    var countEl = document.getElementById('gallery-count');
    if (!countEl) return;
    var all = document.querySelectorAll('.gallery-item').length;
    var vis = document.querySelectorAll('.gallery-item:not(.hidden)').length;
    countEl.textContent = 'Showing ' + vis + ' of ' + all + ' projects';
  }

  function render(target, items) {
    if (!items.length) return;
    addStyles();
    if (target.getAttribute('data-gallery-feed') === 'grid') {
      items.forEach(function (item) { target.appendChild(gridItem(item)); });
      var active = document.querySelector('.gallery-filter-btn.active');
      var cat = active && active.getAttribute('data-filter');
      if (cat && cat !== 'all') {
        Array.prototype.forEach.call(target.querySelectorAll('[data-feed-item]'), function (n) {
          if (n.getAttribute('data-cat') !== cat) n.classList.add('hidden');
        });
      }
      // The page's own filter only knows the static items; keep feed items in step.
      Array.prototype.forEach.call(document.querySelectorAll('.gallery-filter-btn'), function (btn) {
        btn.addEventListener('click', function () {
          var c = btn.getAttribute('data-filter');
          Array.prototype.forEach.call(target.querySelectorAll('[data-feed-item]'), function (n) {
            if (c === 'all' || n.getAttribute('data-cat') === c) n.classList.remove('hidden');
            else n.classList.add('hidden');
          });
          updateCount();
        });
      });
      updateCount();
    } else {
      var list = target.querySelector('[data-gallery-feed-list]') || target;
      items.forEach(function (item) { list.appendChild(figure(item)); });
      target.removeAttribute('hidden');
    }
  }

  var seen = {};
  // Images already on the page are never duplicated.
  Array.prototype.forEach.call(document.images, function (img) {
    var u = cleanUrl(img.currentSrc || img.src);
    if (u) seen[u] = true;
  });

  var byService = {};
  Array.prototype.forEach.call(targets, function (t) {
    var key = t.getAttribute('data-service') || '';
    (byService[key] = byService[key] || []).push(t);
  });

  Object.keys(byService).forEach(function (service) {
    var url = FEED + (service ? '?service=' + encodeURIComponent(service) : '');
    var controller = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 4000);
    fetch(url, { mode: 'cors', credentials: 'omit', signal: controller ? controller.signal : undefined })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        clearTimeout(timer);
        var items = normalize(data, seen);
        // One feed answer, one set of targets; first target takes it.
        render(byService[service][0], items);
      })
      .catch(function () { clearTimeout(timer); });
  });
}());
