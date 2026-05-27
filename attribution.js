/* Capital Upfitters — attribution tracking
 *
 * Captures and persists first-touch attribution data for every visitor:
 *   - First landing page (URL + path) on first visit, never overwritten
 *   - First referrer + referrer domain on first visit
 *   - UTM parameters + click IDs from the current URL (refreshed each visit)
 *   - Detected lead source (e.g. "Google Organic", "Google Ads", "Direct")
 *
 * Stored in localStorage under key `cu_attr_v1`.
 * The page-form bridge (lead-form.js) reads from window.CUAttribution.get().
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'cu_attr_v1';

  function safeGet() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  }

  function safeSet(obj) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch (_) {}
  }

  function getDomain(url) {
    if (!url) return '';
    try { return new URL(url).hostname.replace(/^www\./i, ''); }
    catch (_) { return ''; }
  }

  function parseQuery() {
    var out = {};
    try {
      var sp = new URLSearchParams(window.location.search);
      sp.forEach(function (v, k) { out[k.toLowerCase()] = v; });
    } catch (_) {}
    return out;
  }

  // Lead-source detection. Precedence:
  //   1. Paid click IDs (gclid > fbclid > msclkid)
  //   2. UTM source (if utm_source is set)
  //   3. Referrer pattern match (organic search / social / AI)
  //   4. Fallback: Direct
  function detectLeadSource(ctx) {
    var ref = (ctx.referrer || '').toLowerCase();
    var refDomain = (ctx.referrer_domain || '').toLowerCase();
    var utmSource = (ctx.utm_source || '').toLowerCase();

    if (ctx.gclid)   return 'Google Ads';
    if (ctx.fbclid)  return 'Facebook / Instagram Ads';
    if (ctx.msclkid) return 'Microsoft Ads';

    if (utmSource) {
      if (/google/.test(utmSource))    return /cpc|ads|paid/.test((ctx.utm_medium||'').toLowerCase()) ? 'Google Ads' : 'Google';
      if (/bing|microsoft/.test(utmSource)) return 'Microsoft Ads';
      if (/facebook|meta|instagram/.test(utmSource)) return 'Facebook / Instagram Ads';
      if (/youtube/.test(utmSource))   return 'YouTube';
      if (/yelp/.test(utmSource))      return 'Yelp';
      if (/chatgpt|openai|perplexity|claude|gemini/.test(utmSource)) return 'ChatGPT / AI Referral';
      return ctx.utm_source; // honor whatever the marketer tagged
    }

    if (ref || refDomain) {
      var src = ref + ' ' + refDomain;
      if (/google\./.test(src))      return 'Google Organic';
      if (/bing\./.test(src))        return 'Bing Organic';
      if (/duckduckgo\./.test(src))  return 'DuckDuckGo Organic';
      if (/yahoo\./.test(src))       return 'Yahoo Organic';
      if (/yelp\./.test(src))        return 'Yelp';
      if (/youtube\./.test(src))     return 'YouTube';
      if (/facebook\.|fb\.com|instagram\./.test(src)) return 'Meta Social';
      if (/linkedin\./.test(src))    return 'LinkedIn';
      if (/twitter\.|x\.com|t\.co/.test(src)) return 'X / Twitter';
      if (/tiktok\./.test(src))      return 'TikTok';
      if (/reddit\./.test(src))      return 'Reddit';
      if (/chatgpt\.|openai\.|chat\.openai\.|perplexity\.|claude\.|gemini\.google\.|copilot\.microsoft\./.test(src))
        return 'ChatGPT / AI Referral';
      return 'Referral';
    }

    return 'Direct';
  }

  function buildContext() {
    var stored = safeGet();
    var query = parseQuery();
    var docReferrer = document.referrer || '';
    var currentHref = window.location.href;

    var ctx = {
      landing_page:      stored.landing_page      || currentHref,
      referrer:          stored.referrer          || docReferrer,
      referrer_domain:   stored.referrer_domain   || getDomain(docReferrer),
      first_seen_at:     stored.first_seen_at     || new Date().toISOString(),

      // Refreshed each visit (last-touch UTMs are useful too, but the form
      // captures whatever was on the URL the user submitted from — which is
      // what marketers typically want for paid attribution).
      utm_source:   query.utm_source   || stored.utm_source   || '',
      utm_medium:   query.utm_medium   || stored.utm_medium   || '',
      utm_campaign: query.utm_campaign || stored.utm_campaign || '',
      utm_term:     query.utm_term     || stored.utm_term     || '',
      utm_content:  query.utm_content  || stored.utm_content  || '',
      gclid:        query.gclid        || stored.gclid        || '',
      fbclid:       query.fbclid       || stored.fbclid       || '',
      msclkid:      query.msclkid      || stored.msclkid      || ''
    };

    ctx.lead_source = detectLeadSource(ctx);

    // Persist on first visit and whenever new UTM/click-IDs appear so the
    // stored snapshot always reflects the strongest signal we've seen.
    var next = Object.assign({}, stored, ctx);
    if (!stored.landing_page || JSON.stringify(stored) !== JSON.stringify(next)) {
      safeSet(next);
    }

    return ctx;
  }

  // Public API: window.CUAttribution.get() returns a snapshot for a form submit.
  window.CUAttribution = {
    get: function () {
      var ctx = buildContext();
      return Object.assign({}, ctx, {
        form_page:  window.location.href,
        user_agent: navigator.userAgent || ''
      });
    }
  };

  // Run once on load so we capture landing-page state even if the visitor
  // never opens a form.
  try { buildContext(); } catch (_) {}
})();
