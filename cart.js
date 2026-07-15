/* Capital Upfitters — lightweight multi-service quote cart
 *
 * Stores a small list of services the visitor is interested in, in
 * localStorage, so they can gather several services across pages and land
 * on quote.html with everything pre-selected.
 *
 * Public API (single namespaced global): window.CUQuoteCart
 *   .add(slug, name)   add a service (deduped by slug); name optional
 *   .remove(slug)      remove a service
 *   .toggle(slug,name) add if absent, remove if present; returns true if added
 *   .has(slug)         boolean
 *   .get()             array of { slug, name }
 *   .clear()           empty the cart
 *   .count()           number of items
 *   .buildQuoteUrl()   relative URL to quote.html with ?service=a,b,c
 *   .services          the slug -> { name, match } registry
 *   .slugForValue(v)   reverse lookup: checkbox value -> slug (or null)
 *   .onChange(fn)      subscribe to changes; returns an unsubscribe fn
 *
 * Storage key is versioned so a future schema change can migrate cleanly.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'capitalUpfitters.quoteCart.v1';

  /* Single source of truth mapping a service slug to its display name and the
   * matching quote.html checkbox value. Used by the cart, the floating badge,
   * and the cart-aware quote form. Slugs match the ?service= values already
   * used by each service page's hero CTA. */
  var SERVICES = {
    'bedliner':            { name: 'Spray-On Bedliners',            match: 'Bedliner' },
    'tonneau':             { name: 'Tonneau Covers',                match: 'Tonneau Cover' },
    'running-boards':      { name: 'Running Boards & Steps',        match: 'Running Boards' },
    'ceramic-coating':     { name: 'Ceramic Coating & PPF',         match: 'Ceramic Coating' },
    'undercoating':        { name: 'Undercoating & Rust Protection', match: 'Undercoating' },
    'hitches':             { name: 'Hitches & Towing',              match: 'Hitches & Towing' },
    'camper-shells':       { name: 'Camper Shells & Caps',          match: 'Camper Shell' },
    'commercial-wraps':    { name: 'Commercial Wraps',              match: 'Commercial Wraps' },
    'exterior':            { name: 'Exterior Accessories',          match: 'Exterior Accessories' },
    'industrial-coatings': { name: 'Industrial & Protective Coatings', match: 'Industrial Coatings' },
    'lighting':            { name: 'LED Lighting',                  match: 'LED Lighting' },
    'mobile-detailing':    { name: 'Mobile Detailing',              match: 'Mobile Detailing' },
    'stealth-hitch':       { name: 'Stealth Hitch — Luxury & EV',   match: 'Hitches & Towing' },
    'suspension':          { name: 'Suspension, Lifts & Wheels',    match: 'Suspension / Lift Kit' },
    'toolboxes':           { name: 'Toolboxes & Storage',           match: 'Toolbox / Bed Storage' },
    'window-tinting':      { name: 'Window Tinting',                match: 'Window Tinting' }
  };

  var listeners = [];

  function safeParse(raw) {
    try {
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (it) {
        return it && typeof it.slug === 'string' && it.slug;
      }).map(function (it) {
        return { slug: it.slug, name: typeof it.name === 'string' && it.name ? it.name : displayName(it.slug) };
      });
    } catch (e) {
      return [];
    }
  }

  function read() {
    try {
      return safeParse(window.localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return [];
    }
  }

  function write(items) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) { /* storage unavailable / full — cart degrades to in-memory for this page */ }
    notify(items);
  }

  function dedupe(items) {
    var seen = {}, out = [];
    items.forEach(function (it) {
      if (!it.slug || seen[it.slug]) return;
      seen[it.slug] = true;
      out.push(it);
    });
    return out;
  }

  function displayName(slug) {
    return (SERVICES[slug] && SERVICES[slug].name) || slug;
  }

  function notify(items) {
    listeners.forEach(function (fn) {
      try { fn(items); } catch (e) { /* ignore listener errors */ }
    });
    try {
      window.dispatchEvent(new CustomEvent('cu-quote-cart-change', { detail: { items: items } }));
    } catch (e) { /* older browsers: listeners array still fired */ }
  }

  var api = {
    services: SERVICES,

    get: function () { return read(); },

    count: function () { return read().length; },

    has: function (slug) {
      return read().some(function (it) { return it.slug === slug; });
    },

    add: function (slug, name) {
      if (!slug) return read();
      var items = read();
      if (!items.some(function (it) { return it.slug === slug; })) {
        items.push({ slug: slug, name: name || displayName(slug) });
        items = dedupe(items);
        write(items);
      }
      return items;
    },

    remove: function (slug) {
      var items = read().filter(function (it) { return it.slug !== slug; });
      write(items);
      return items;
    },

    toggle: function (slug, name) {
      if (this.has(slug)) { this.remove(slug); return false; }
      this.add(slug, name); return true;
    },

    clear: function () { write([]); },

    slugForValue: function (value) {
      var found = null;
      Object.keys(SERVICES).forEach(function (slug) {
        if (found) return;
        if (SERVICES[slug].match === value) found = slug;
      });
      return found;
    },

    buildQuoteUrl: function () {
      var items = read();
      var base = quotePath();
      if (!items.length) return base;
      var slugs = items.map(function (it) { return it.slug; }).join(',');
      return base + '?service=' + encodeURIComponent(slugs);
    },

    onChange: function (fn) {
      if (typeof fn !== 'function') return function () {};
      listeners.push(fn);
      return function () {
        var i = listeners.indexOf(fn);
        if (i > -1) listeners.splice(i, 1);
      };
    }
  };

  /* Resolve quote.html relative to the current page. Service and location
   * pages live one directory deep; everything else is at the site root. */
  function quotePath() {
    var path = window.location.pathname;
    return /\/(services|locations)\//.test(path) ? '../quote.html' : 'quote.html';
  }

  /* ── Floating quote badge ─────────────────────────────────────────────── */
  var badge = null, badgeCount = null;

  function buildBadge() {
    if (badge || !document.body) return;
    badge = document.createElement('a');
    badge.className = 'cu-quote-badge';
    badge.setAttribute('aria-live', 'polite');
    badge.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
      '<path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3a1 1 0 0 0 .7 1.7H17"/>' +
      '<circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></svg>' +
      '<span class="cu-quote-badge-label">Quote</span>' +
      '<span class="cu-quote-badge-count" data-cu-badge-count>0</span>';
    badgeCount = badge.querySelector('[data-cu-badge-count]');
    document.body.appendChild(badge);
    refreshBadge();
  }

  function refreshBadge() {
    if (!badge) return;
    var n = read().length;
    badge.href = api.buildQuoteUrl();
    if (badgeCount) badgeCount.textContent = String(n);
    if (n > 0) {
      badge.classList.add('is-visible');
      badge.setAttribute('aria-label', 'View your quote request, ' + n + (n === 1 ? ' service' : ' services'));
    } else {
      badge.classList.remove('is-visible');
      badge.setAttribute('aria-hidden', 'true');
    }
    if (n > 0) badge.removeAttribute('aria-hidden');
  }

  function initBadge() {
    buildBadge();
    api.onChange(refreshBadge);
    // Cross-tab / cross-page sync.
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) { refreshBadge(); refreshAddButtons(); }
    });
  }

  /* ── Add-to-Quote buttons (service pages) ─────────────────────────────── */
  function addButtons() {
    return document.querySelectorAll('[data-add-to-quote]');
  }

  function refreshAddButtons() {
    addButtons().forEach(function (btn) {
      var slug = btn.getAttribute('data-add-to-quote');
      var inCart = api.has(slug);
      btn.setAttribute('data-in-cart', inCart ? '1' : '0');
      btn.setAttribute('aria-pressed', inCart ? 'true' : 'false');
    });
  }

  function initAddButtons() {
    var btns = addButtons();
    if (!btns.length) return;
    btns.forEach(function (btn) {
      var slug = btn.getAttribute('data-add-to-quote');
      if (!slug) return;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        api.toggle(slug, btn.getAttribute('data-service-name') || undefined);
      });
    });
    api.onChange(refreshAddButtons);
    refreshAddButtons();
  }

  function initAll() { initBadge(); initAddButtons(); }

  window.CUQuoteCart = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
