/* analytics.js — GA4 + Vercel Web Analytics / Speed Insights + site events.
 *
 * Loaded once per page from <head>:  <script src="/analytics.js" defer></script>
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ GA4 CONFIG — the ONLY place the measurement ID lives.               │
 * │ Replace the placeholder with the real ID (Admin → Data streams →    │
 * │ Web → Measurement ID, looks like G-ABC123XYZ9). While it is the     │
 * │ placeholder, GA4 is a no-op: nothing is requested from Google.      │
 * └─────────────────────────────────────────────────────────────────────┘
 */
(function () {
  'use strict';

  var GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // TODO(Ivan): set the real GA4 ID here
  // GA4 only runs on the production domain so previews/local QA don't pollute reports.
  var GA4_HOSTS = /(^|\.)capitalupfitters\.com$/i;

  var w = window, d = document, loc = w.location;
  var dbg = /[?&]cu_analytics=debug\b/.test(loc.search);
  var isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(loc.hostname) || loc.protocol === 'file:';

  // Public test hook: every event is also recorded here (no network effect).
  var api = w.CU_ANALYTICS = w.CU_ANALYTICS || { events: [] };
  api.ga4Enabled = false;

  function addScript(src) {
    var s = d.createElement('script');
    s.src = src; s.defer = true; s.async = true;
    (d.head || d.documentElement).appendChild(s);
    return s;
  }

  /* ---------- Vercel Web Analytics + Speed Insights ---------- */
  // Same queue shims @vercel/analytics and @vercel/speed-insights install.
  w.va = w.va || function () { (w.vaq = w.vaq || []).push(arguments); };
  w.si = w.si || function () { (w.siq = w.siq || []).push(arguments); };
  if (!isLocal || dbg) {
    addScript('/_vercel/insights/script.js');
    addScript('/_vercel/speed-insights/script.js');
  }

  /* ---------- GA4 (no-op until a real ID is set) ---------- */
  var gaReady = /^G-[A-Z0-9]{4,}$/.test(GA4_MEASUREMENT_ID) &&
                GA4_MEASUREMENT_ID !== 'G-XXXXXXXXXX' &&
                (GA4_HOSTS.test(loc.hostname) || dbg);
  if (gaReady) {
    w.dataLayer = w.dataLayer || [];
    w.gtag = w.gtag || function () { w.dataLayer.push(arguments); };
    w.gtag('js', new Date());
    w.gtag('config', GA4_MEASUREMENT_ID, {
      anonymize_ip: true,                      // GA4 never stores full IPs; explicit anyway
      allow_google_signals: false,             // no cross-device / ads signals
      allow_ad_personalization_signals: false,
      page_location: loc.origin + pagePath(),
      page_referrer: safeReferrer()
    });
    addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_MEASUREMENT_ID));
    api.ga4Enabled = true;
  }

  /* ---------- event helper (no PII: only enums, ids, short labels) ---------- */
  function clip(v, n) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n || 100); }
  // Only coarse, fixed categories are sent. Never include query strings, VINs,
  // contact fields, free-text scopes or arbitrary UTM values in analytics.
  function safeReferrer() {
    try { return new URL(d.referrer).origin; } catch (_) { return ''; }
  }
  function aiSource() {
    var source = '';
    try { source = new URLSearchParams(loc.search).get('utm_source') || new URL(d.referrer).hostname; } catch (_) {}
    source = source.toLowerCase().replace(/^www\./, '');
    if (/^(chatgpt(\.com)?|chat\.openai\.com|openai(\.com)?)$/.test(source)) return 'chatgpt';
    if (/^(perplexity(\.ai)?|claude(\.ai)?|gemini(\.google\.com)?|copilot(\.microsoft\.com)?)$/.test(source)) return source.split('.')[0];
    if (/^(brave|search\.brave\.com)$/.test(source)) return 'brave_search';
    return 'other_or_direct';
  }
  var PARAMS = ['link_location', 'page_path', 'cta_text', 'cta_location', 'link_url', 'widget', 'form_type', 'step', 'service', 'service_count', 'vehicle_type'];
  function track(name, params) {
    var data = {};
    Object.keys(params || {}).forEach(function (k) {
      if (PARAMS.indexOf(k) === -1) return;
      var v = params[k];
      if (v === undefined || v === null || v === '') return;
      data[k] = typeof v === 'number' || typeof v === 'boolean' ? v : clip(v);
    });
    data.ai_source = aiSource();
    api.events.push({ name: name, params: data });
    try { w.va('event', { name: name, data: data }); } catch (e) {}
    if (api.ga4Enabled) { try { w.gtag('event', name, data); } catch (e) {} }
    if (dbg && w.console) console.info('[cu-analytics]', name, data);
  }
  api.track = track;

  // Where on the page a link sits (first match wins).
  var LOCATIONS = [
    ['.mobile-action-bar', 'sticky_bar'],
    ['.float-cta', 'float_button'],
    ['#announce-bar, .announce-bar', 'announce_bar'],
    ['#nav-mobile', 'mobile_menu'],
    ['#nav, header, .nav', 'header'],
    ['footer, .footer', 'footer'],
    ['.hero, .page-hero, .geo-hero, .sh-hero', 'hero'],
    ['.cta-banner, .sh-cta-section', 'cta_banner'],
    ['.sidebar-cta, aside', 'sidebar'],
    ['.contact-card, .map-info-card', 'contact_card']
  ];
  function locationOf(el) {
    for (var i = 0; i < LOCATIONS.length; i++) {
      if (el.closest(LOCATIONS[i][0])) return LOCATIONS[i][1];
    }
    return 'content';
  }
  function pagePath() { return loc.pathname.replace(/\.html$/, '').replace(/\/index$/, '/') || '/'; }

  /* ---------- phone_click + cta_click (delegated) ---------- */
  var CTA_SEL = '.btn-primary, .nav-cta, .mab-quote, .float-cta-btn, .nav-mega-footer-cta--primary, ' +
                '.sh-btn-primary, .announce-bar-cta, .audience-card-cta, .pricing-cta, .package-cta, .callout-cta';
  d.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var a = t.closest('a[href], button');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/^tel:/i.test(href)) {
      track('phone_click', { link_location: locationOf(a), page_path: pagePath() });
      return; // a yellow "Call" button counts as a phone click, not a CTA click
    }
    if (a.closest(CTA_SEL) && !a.closest('#quote-retail, #quote-fleet, #quote-dealer, #bar')) {
      var url = '';
      if (href && !/^(mailto:|javascript:|#)/i.test(href)) {
        try { var u = new URL(href, loc.href); url = u.pathname; } catch (x) { url = ''; }
      }
      track('cta_click', {
        cta_text: clip(a.textContent, 60),
        cta_location: locationOf(a),
        link_url: url,
        page_path: pagePath()
      });
    }
  }, true);

  /* ---------- reviews_view (Trustindex widget enters the viewport) ---------- */
  function watchReviews() {
    var el = d.querySelector('.trustindex-widget');
    if (!el || !('IntersectionObserver' in w)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          track('reviews_view', { widget: 'trustindex', page_path: pagePath() });
          io.disconnect();
        }
      });
    }, { threshold: 0.25 });
    io.observe(el);
  }

  /* ---------- quote funnel: quote_start / quote_step / quote_submit ---------- */
  function quoteFunnel() {
    var pending = {}, started = {};
    function typeOf(form) {
      var type = form && form.getAttribute('data-cms-form');
      return /^(retail|fleet|dealer|project)$/.test(type || '') ? type : null;
    }
    function start(form) {
      var type = typeOf(form);
      if (!type || started[form.id]) return;
      started[form.id] = true;
      track('quote_start', { form_type: type, page_path: pagePath() });
    }
    ['pointerdown', 'focusin', 'change', 'keydown'].forEach(function (ev) {
      d.addEventListener(ev, function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var form = t.closest('form[data-cms-form]');
        // The retail wizard has interaction controls outside its final form.
        if (!form && t.closest('#step0, #step1, #step2, #bar')) form = d.getElementById('quote-retail');
        if (form) start(form);
      }, true);
    });
    d.addEventListener('cu:quote-step', function (e) {
      var det = e.detail || {};
      if (det.initial) return;
      start(d.getElementById('quote-retail'));
      track('quote_step', { step: Number(det.step) || 0, form_type: 'retail', page_path: pagePath() });
    });
    d.addEventListener('submit', function (e) {
      var form = e.target, type = typeOf(form);
      if (!type || !form.id) return;
      start(form);
      pending[form.id] = { form_type: type, page_path: pagePath() };
    }, true);
    // This event is emitted only after the lead endpoint returns ok:true.
    // A click/submit attempt, validation error or rejected request is not a lead.
    d.addEventListener('cu:lead-success', function (e) {
      var id = (e.detail && e.detail.formId) || '', context = pending[id];
      if (!context) return;
      delete pending[id];
      track('quote_submit', context);
      if (api.ga4Enabled) {
        try { w.gtag('event', 'generate_lead', Object.assign({ ai_source: aiSource() }, context)); } catch (_) {}
      }
      delete started[id];
    });
  }

  function init() { watchReviews(); quoteFunnel(); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init);
  else init();
})();
