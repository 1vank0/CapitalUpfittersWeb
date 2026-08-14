/**
 * cu-quote-draft.js — single source of truth for the quote draft.
 *
 * One versioned object, one key: cu_quote_draft_v1. Holds only what is
 * needed to carry a visitor from Find My Fit into the quote form:
 *
 *   { v, updatedAt, vehicle:{year,make,model}, services:[id], audience, source }
 *
 * DELIBERATELY NOT STORED: contact details, VIN, free-text notes, and
 * uploaded photos. Those are either personal data or too large for
 * localStorage, and a quote draft that survives in a shared browser must
 * not carry anything identifying.
 *
 * Loaded as a plain script in the browser (window.CUQuoteDraft) and via
 * require() in Node. There is exactly one copy of this logic — the tests
 * execute this file, not a transcription of it.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;   // Node
  root.CUQuoteDraft = api;                                                  // browser
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var KEY        = 'cu_quote_draft_v1';
  var LEGACY_KEY = 'cu_vehicle';
  var SCHEMA     = 1;
  var MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days
  var AUDIENCES  = ['retail', 'fleet', 'dealer'];
  var MAX_SERVICES = 12;                      // matches the picker's own cap
  // Preserve older service-page links while storing only the current picker
  // vocabulary. Bundle aliases deliberately expand to every included service.
  var SERVICE_ALIASES = {
    'ceramic-coating': ['ceramic_coating'],
    'window-tinting': ['window_tinting'],
    'tonneau': ['tonneau_cover'],
    'tonneau-package': ['tonneau_cover', 'bedliner'],
    'bundle': ['bedliner', 'tonneau_cover'],
    'running-boards': ['running_boards'],
    'amp-powerstep': ['amp_powerstep'],
    'hitches': ['hitches_towing'],
    'stealth-hitch': ['hitches_towing'],
    'stealth-hitch-rack': ['hitches_towing'],
    'stealth-hitch-combo': ['hitches_towing'],
    'camper-shells': ['camper_shell'],
    'suspension': ['suspension_lift'],
    'leveling-kit': ['suspension_lift'],
    'exterior': ['exterior_accessories'],
    'lighting': ['led_lighting'],
    'commercial-wraps': ['wraps_branding'],
    'industrial-coatings': ['industrial_coatings'],
    'mobile-detailing': ['mobile_detailing'],
    'fleet-detailing': ['mobile_detailing'],
    'van-shelving': ['van_shelving'],
    'ladder-rack': ['ladder_racks'],
    'tint-ceramic-bundle': ['window_tinting', 'ceramic_coating']
  };

  // ── helpers ──────────────────────────────────────────────────────────
  function isStr(v) { return typeof v === 'string' && v.trim() !== ''; }
  function clean(v) { return isStr(v) ? v.trim() : null; }

  /** Service ids are stable slugs. Reject anything that is not one. */
  function cleanServiceIds(list) {
    if (!Array.isArray(list)) return [];
    var seen = Object.create(null), out = [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (typeof s !== 'string') continue;
      s = s.trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(s)) continue;   // slug shape only
      var targets = SERVICE_ALIASES[s] || [s];
      for (var j = 0; j < targets.length; j++) {
        var target = targets[j];
        if (seen[target]) continue;                            // dedupe
        seen[target] = 1; out.push(target);
        if (out.length >= MAX_SERVICES) return out;
      }
    }
    return out;
  }

  function cleanAudience(a) {
    if (!isStr(a)) return null;
    a = a.trim().toLowerCase();
    return AUDIENCES.indexOf(a) === -1 ? null : a;
  }

  function emptyDraft() {
    return { v: SCHEMA, updatedAt: 0, vehicle: null, services: [], audience: null, source: null };
  }

  /**
   * Validate a parsed object into a draft, or null.
   * Fails closed on: wrong/missing schema, missing or non-numeric
   * updatedAt, expired age, and non-object input.
   */
  function validate(obj, now) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    if (obj.v !== SCHEMA) return null;                                  // schema mismatch
    if (typeof obj.updatedAt !== 'number' || !isFinite(obj.updatedAt)) return null;  // missing ts fails closed
    if (obj.updatedAt <= 0) return null;
    if ((now - obj.updatedAt) >= MAX_AGE_MS) return null;               // expired (boundary = expired)

    var vehicle = null;
    if (obj.vehicle && typeof obj.vehicle === 'object') {
      var y = clean(obj.vehicle.year), mk = clean(obj.vehicle.make), md = clean(obj.vehicle.model);
      // A vehicle is only meaningful with a year; partial records are kept
      // as-is rather than invented, but never fabricated across sources.
      if (y) vehicle = { year: y, make: mk, model: md };
    }
    return {
      v: SCHEMA,
      updatedAt: obj.updatedAt,
      vehicle: vehicle,
      services: cleanServiceIds(obj.services),
      audience: cleanAudience(obj.audience),
      source: clean(obj.source)
    };
  }

  // ── storage (every access fails closed) ──────────────────────────────
  function read(storage, now) {
    try {
      var raw = storage.getItem(KEY);
      if (raw) {
        var d = validate(JSON.parse(raw), now);
        if (d) return d;
      }
      // Migrate the old cu_vehicle shape: {year,make,model,ts}
      var legacy = storage.getItem(LEGACY_KEY);
      if (legacy) {
        var L = JSON.parse(legacy);
        if (L && typeof L === 'object' && isStr(L.year) &&
            typeof L.ts === 'number' && (now - L.ts) < MAX_AGE_MS) {
          return validate({
            v: SCHEMA, updatedAt: L.ts,
            vehicle: { year: L.year, make: L.make, model: L.model },
            services: [], audience: null, source: 'migrated'
          }, now);
        }
      }
    } catch (e) { /* unavailable, corrupt, or throwing — fail closed */ }
    return null;
  }

  function write(storage, draft, now) {
    try {
      var d = {
        v: SCHEMA,
        updatedAt: typeof now === 'number' ? now : Date.now(),
        vehicle: draft && draft.vehicle ? draft.vehicle : null,
        services: cleanServiceIds(draft && draft.services),
        audience: cleanAudience(draft && draft.audience),
        source: clean(draft && draft.source)
      };
      storage.setItem(KEY, JSON.stringify(d));
      try { storage.removeItem(LEGACY_KEY); } catch (e2) {}   // migration is one-way
      return d;
    } catch (e) { return null; }   // private mode etc. — never throw into the page
  }

  /**
   * Resolve what the quote page should show.
   *
   * Precedence, per field family:
   *  - VEHICLE: if ANY vehicle param is on the URL, the URL vehicle is
   *    authoritative and the stored vehicle is discarded WHOLE. Never mix
   *    a URL year with a stored model — that invents a vehicle nobody chose.
   *  - SERVICES / AUDIENCE: a URL value overrides only its own field.
   *  - Unrelated params (utm_*, ?ref=) touch nothing.
   */
  function resolve(opts) {
    opts = opts || {};
    var now      = typeof opts.now === 'number' ? opts.now : Date.now();
    var params   = new URLSearchParams(opts.search || '');
    var storage  = opts.storage || null;
    var stored   = storage ? read(storage, now) : null;

    var out = emptyDraft();
    out.updatedAt = stored ? stored.updatedAt : 0;

    // vehicle
    var uy = clean(params.get('year')), um = clean(params.get('make')), ud = clean(params.get('model'));
    var urlHasVehicle = !!(uy || um || ud);
    var vehicleSource = null;
    if (urlHasVehicle) {
      out.vehicle = { year: uy, make: um, model: ud };
      vehicleSource = 'url';
    } else if (stored && stored.vehicle) {
      out.vehicle = stored.vehicle;
      vehicleSource = 'storage';
    }

    // services — URL overrides only this field
    var usvc = params.get('service');
    var servicesSource = null;
    if (isStr(usvc)) {
      out.services = cleanServiceIds(usvc.split(','));
      servicesSource = 'url';
    } else if (stored) {
      out.services = stored.services;
      servicesSource = stored.services.length ? 'storage' : null;
    }

    // audience — URL overrides only this field
    var uaud = cleanAudience(params.get('audience'));
    var audienceSource = null;
    if (uaud) {
      out.audience = uaud; audienceSource = 'url';
    } else if (stored && stored.audience) {
      out.audience = stored.audience; audienceSource = 'storage';
    }

    out.source = clean(params.get('source')) || (stored && stored.source) || null;
    out.carried = {
      vehicle: vehicleSource === 'storage',
      services: servicesSource === 'storage',
      audience: audienceSource === 'storage',
      any: vehicleSource === 'storage' || servicesSource === 'storage' || audienceSource === 'storage'
    };
    out.from = { vehicle: vehicleSource, services: servicesSource, audience: audienceSource };
    return out;
  }

  return {
    KEY: KEY, LEGACY_KEY: LEGACY_KEY, SCHEMA: SCHEMA, MAX_AGE_MS: MAX_AGE_MS,
    AUDIENCES: AUDIENCES.slice(), MAX_SERVICES: MAX_SERVICES,
    SERVICE_ALIASES: SERVICE_ALIASES,
    resolve: resolve, read: read, write: write,
    cleanServiceIds: cleanServiceIds, cleanAudience: cleanAudience, validate: validate
  };
});
