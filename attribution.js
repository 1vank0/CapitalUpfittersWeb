/* Minimized first-party lead attribution. No analytics vendor requests or visitor IDs.
 * The same sanitizer is used by the browser and /api/lead. Only known public
 * routes, fixed campaign tags and known referrer origins survive. Unknown tags
 * are deliberately dropped rather than copying possible personal data.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document) return;
  var key = 'cu_attr_v2_session';
  function capture() {
    var stored = {};
    try { stored = JSON.parse(root.sessionStorage.getItem(key) || '{}'); } catch (_) {}
    var query = new URLSearchParams(root.location.search);
    var input = { landing_page: stored.landing_page || root.location.pathname,
      form_page: root.location.pathname, referrer: stored.referrer || root.document.referrer };
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (name) { input[name] = query.get(name) || stored[name] || ''; });
    var value = api.sanitize(input);
    // This only holds coarse source data for a browser tab; it is not a visitor ID.
    try { root.sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
    return value;
  }
  root.CUAttribution = { get: capture, sanitize: api.sanitize };
  try { root.localStorage.removeItem('cu_attr_v1'); } catch (_) {}
  capture();
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  var routes = ["/", "/404", "/blog", "/blog/best-tonneau-covers-maryland", "/blog/leveling-vs-lift-kit", "/blog/patriot-liner-vs-drop-in", "/blog/undercoating-maryland-winter", "/blog/weatherguard-vs-kargomaster", "/contact", "/dealer-government", "/faq", "/fleet", "/portfolio", "/portfolio/f150-patriot-liner", "/portfolio/mcs-maverick-fleet", "/services/amp-research", "/services/bakflip", "/services/retrax", "/blog/bakflip-vs-retrax-maryland-winters", "/hitch-quote", "/index", "/locations/bethesda-md", "/locations/gaithersburg-md", "/locations/rockville-md", "/locations/silver-spring-md", "/preview", "/privacy", "/products-section", "/quote", "/rebates", "/services", "/services/bedliner", "/services/camper-shells", "/services/ceramic-coating", "/services/commercial-wraps", "/services/exterior", "/services/hitches", "/services/industrial-coatings", "/services/lighting", "/services/mobile-detailing", "/services/running-boards", "/services/stealth-hitches", "/services/ecohitch", "/services/etrailer-installation", "/services/wheels-tires", "/services/power-steps", "/services/van-upfitting", "/services/suspension", "/services/tonneau", "/services/toolboxes", "/services/undercoating", "/services/window-tinting", "/start-here", "/terms"];
  var allowed = {
    utm_source: ['gbp', 'chatgpt.com', 'chatgpt', 'openai', 'perplexity.ai', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com', 'facebook', 'instagram', 'nextdoor', 'yard-sign', 'referral', 'google', 'bing', 'youtube', 'yelp', 'stealthhitches', 'etrailer', 'realtruck', 'industrial-page'],
    utm_medium: ['organic', 'profile', 'social', 'print', 'qr', 'referral', 'email', 'cpc', 'paid'],
    utm_campaign: ['winter-undercoating', 'work-truck-season', 'hero-price', 'mobile-hitch']
  };
  var origins = ['google.com','bing.com','duckduckgo.com','search.yahoo.com','facebook.com','instagram.com','nextdoor.com','yelp.com','youtube.com','linkedin.com','reddit.com','t.co','x.com','chatgpt.com','chat.openai.com','perplexity.ai','claude.ai','gemini.google.com','copilot.microsoft.com','search.brave.com','stealthhitches.com','etrailer.com','realtruck.com','capitalupfitters.com'];
  function route(value) {
    try {
      var u = new URL(String(value || ''), 'https://capitalupfitters.com');
      if (!/^https?:$/.test(u.protocol)) return '';
      var path = u.pathname.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/\/$/, '') || '/';
      return routes.indexOf(path) >= 0 ? path : '';
    } catch (_) { return ''; }
  }
  function origin(value) {
    try {
      var u = new URL(String(value || ''));
      var host = u.hostname.replace(/^www\./, '');
      return /^https?:$/.test(u.protocol) && origins.indexOf(host) >= 0 ? 'https://' + host : '';
    } catch (_) { return ''; }
  }
  function sanitize(input) {
    input = input || {};
    var out = { landing_page: route(input.landing_page), form_page: route(input.form_page), referrer: origin(input.referrer) };
    out.referrer_domain = out.referrer.replace('https://', '');
    Object.keys(allowed).forEach(function (key) {
      var value = typeof input[key] === 'string' ? input[key].toLowerCase() : '';
      out[key] = allowed[key].indexOf(value) >= 0 ? value : '';
    });
    // Do not collect free-text tags, ad click identifiers, geolocation or user agents.
    ['utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid', 'ip_address', 'geo_city', 'geo_region', 'geo_country', 'isp', 'user_agent'].forEach(function (k) { out[k] = ''; });
    var source = out.utm_source || out.referrer_domain;
    out.lead_source = /^(chatgpt(\.com)?|openai|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com)$/.test(source) ? 'AI Referral' :
      source === 'search.brave.com' ? 'Brave Search' :
      /^(google|google\.com)$/.test(source) ? (out.utm_medium === 'cpc' ? 'Google Ads' : 'Google Organic') :
      source === 'gbp' ? 'Google Business Profile' :
      /^(facebook|instagram)(\.com)?$/.test(source) ? 'Meta Social' :
      source ? 'Referral' : 'Direct';
    return out;
  }
  return { sanitize: sanitize, route: route, origin: origin };
});
