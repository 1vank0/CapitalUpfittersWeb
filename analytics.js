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
      allow_ad_personalization_signals: false
    });
    addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_MEASUREMENT_ID));
    api.ga4Enabled = true;
  }

  /* ---------- event helper (no PII: only enums, ids, short labels) ---------- */
  function clip(v, n) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n || 100); }
  function track(name, params) {
    var data = {};
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === '') return;
      data[k] = typeof v === 'number' || typeof v === 'boolean' ? v : clip(v);
    });
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
        try { var u = new URL(href, loc.href); url = u.pathname + u.search; } catch (x) { url = ''; }
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
    var root = d.querySelector('.cu-p6');
    if (!root || !d.getElementById('quote-retail')) return;
    function mode() { return root.getAttribute('data-mode') || 'retail'; }

    var started = false;
    function start() {
      if (started) return;
      started = true;
      track('quote_start', { form_type: mode() });
    }
    ['pointerdown', 'focusin', 'change', 'keydown'].forEach(function (ev) {
      d.addEventListener(ev, function (e) {
        // Only real form interaction counts (switching the Personal/Fleet/Dealer pill alone doesn't).
        var t = e.target;
        if (t && t.closest && t.closest('.cu-p6 form, #step0, #step1, #step2, #bar, .cu-p6 [data-mode-body]')) start();
      }, true);
    });

    // quote.html dispatches cu:quote-step from goStep(); initial render is not a step.
    d.addEventListener('cu:quote-step', function (e) {
      var det = e.detail || {};
      if (det.initial) return;
      start();
      track('quote_step', { step: Number(det.step) || 0, form_type: 'retail' });
    });

    // Snapshot non-personal context at submit time (lead-form.js resets the
    // form before announcing success), send quote_submit only on cu:lead-success,
    // which lead-form.js fires after the server answered ok:true.
    var pending = {};
    d.addEventListener('submit', function (e) {
      var f = e.target;
      if (!f || !/^quote-(retail|fleet|dealer)$/.test(f.id || '')) return;
      var type = f.id.replace('quote-', '');
      var services = [], vehicle = '';
      if (type === 'retail') {
        d.querySelectorAll('.tile[data-svc][aria-checked="true"]').forEach(function (t) { services.push(t.getAttribute('data-svc')); });
        var mk = d.getElementById('f-make-sel');
        vehicle = mk && mk.value ? mk.value : 'not_provided';   // dropdown enum only, never free text
      } else {
        f.querySelectorAll('input[name="services"]:checked').forEach(function (c) { services.push(c.value); });
        vehicle = type === 'fleet' ? 'fleet' : 'dealer_government';
      }
      pending[f.id] = { form_type: type, service: services.join(',') || 'none', service_count: services.length, vehicle_type: vehicle };
    }, true);
    d.addEventListener('cu:lead-success', function (e) {
      var id = (e.detail && e.detail.formId) || '';
      var p = pending[id];
      if (!p) return;
      delete pending[id];
      track('quote_submit', p);
    });
  }

  function init() { watchReviews(); quoteFunnel(); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init);
  else init();
})();
