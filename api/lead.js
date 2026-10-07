// Vercel serverless function: POST /api/lead
//
// Receives JSON-serialized form data from the public site, captures the real
// visitor IP from trusted request headers, persists supported lead requests
// through the shared lead service, then sends a branded HTML notification
// email to the Capital Upfitters inbox.
//
// Required env vars:
//   RESEND_API_KEY     — transactional sender (https://resend.com)
//   LEAD_TO_EMAIL      — destination inbox (default: CapitalUpfitters@gmail.com)
//   LEAD_FROM_EMAIL    — verified sender (default: leads@capitalupfitters.com)
// Optional:
//   LEAD_PERSISTENCE_URL    — shared durable lead endpoint (production default below)
//   LEAD_PERSISTENCE_ORIGIN — allowlisted canonical site origin
//   LEAD_BRIDGE_SECRET      — 32+ byte secret shared with the durable lead API;
//                             authenticates the visitor address across Vercel hops
//   LEAD_PERSISTENCE_BYPASS_SECRET — Vercel protection bypass for preview persistence
//   LEAD_ALLOWED_ORIGIN     — comma-separated browser origins (same-host previews
//                             are also accepted dynamically)
//   LEAD_PERSISTENCE_TIMEOUT_MS — durable endpoint deadline (default 25000)
//   LEAD_RESEND_TIMEOUT_MS      — per-email deadline (default 5000)
//
// Shop email layout:
//   1. Customer contact and one-click actions
//   2. Quote request at a glance
//   3. Only the job details that were actually provided
//   4. Compact source / receipt metadata

const { createHmac, randomUUID } = require('node:crypto');
const { isIP } = require('node:net');

const MAX_JSON_BYTES = 128 * 1024;
const LEAD_SCHEMA_VERSION = '2026-07-15';
const DEFAULT_PERSISTENCE_URL = 'https://capital-upfitters-next.vercel.app/api/leads/';
const DEFAULT_SITE_ORIGIN = 'https://capitalupfitters.com';
// The shared lead service has a relatively expensive cold start. Five seconds
// was too aggressive in production and caused successfully emailed leads to
// lose their durable reference. Keep this below the function's overall limit,
// but long enough for the upstream service to wake and commit the lead.
const DEFAULT_PERSISTENCE_TIMEOUT_MS = 25000;
const DEFAULT_RESEND_TIMEOUT_MS = 5000;
const BRIDGE_SIGNATURE_VERSION = 'capital-upfitters-lead-bridge-v1';
const BRIDGE_CLIENT_IP_HEADER = 'X-Capital-Bridge-Client-IP';
const BRIDGE_TIMESTAMP_HEADER = 'X-Capital-Bridge-Timestamp';
const BRIDGE_SIGNATURE_HEADER = 'X-Capital-Bridge-Signature';
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 8;
const MAX_FIELD_CHARS = 8000;
const MAX_SERVICE_CHARS = 240;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-.\s\d]+$/;
const SUPPORTED_FORMS = new Map([
  ['quote-retail', 'retail'],
  ['quote-fleet', 'fleet'],
  ['quote-dealer', 'dealer'],
  ['callback-form', 'retail'],
  ['apply-form', 'dealer']
]);
const PERSISTENCE_FALLBACK_CODES = new Set([
  'PERSISTENCE_UNAVAILABLE',
  'SUBMISSION_UNAVAILABLE',
  'SUBMISSION_FAILED'
]);
const localRateBuckets = new Map();

const FORM_LABEL = {
  'quote-retail': 'Retail Quote',
  'quote-fleet': 'Fleet / Business Quote',
  'quote-dealer': 'Dealer / Government Inquiry',
  'callback-form': 'Callback Request',
  'apply-form': 'Dealer / Government Application'
};

// ------- helpers ----------------------------------------------------------

function configuredOrigins() {
  const configured = String(process.env.LEAD_ALLOWED_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set([DEFAULT_SITE_ORIGIN, 'https://www.capitalupfitters.com', ...configured])];
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', res.cuCorsOrigin || configuredOrigins()[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function headerValue(req, name) {
  const value = req.headers && req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ? String(value[0]).trim() : '';
  return value == null ? '' : String(value).trim();
}

function firstHeaderToken(req, name) {
  return headerValue(req, name).split(',')[0].trim();
}

function requestHostOrigin(req) {
  const host = firstHeaderToken(req, 'x-forwarded-host') || firstHeaderToken(req, 'host');
  if (!host || !/^[a-z0-9.\-:[\]]+(?::\d+)?$/i.test(host)) return '';
  const forwardedProto = firstHeaderToken(req, 'x-forwarded-proto').toLowerCase();
  const loopbackHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
  const proto = forwardedProto || (loopbackHost ? 'http' : 'https');
  if (proto !== 'https' && proto !== 'http') return '';
  try {
    const parsed = new URL(`${proto}://${host}`);
    const loopback = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '[::1]' || parsed.hostname === '::1';
    if (proto !== 'https' && !loopback) return '';
    return parsed.origin;
  } catch (_) {
    return '';
  }
}

function validateRequestOrigin(req) {
  const incoming = headerValue(req, 'origin');
  if (!incoming || incoming === 'null') return { ok: false, origin: '' };
  let normalized;
  try { normalized = new URL(incoming).origin; }
  catch (_) { return { ok: false, origin: '' }; }
  if (normalized !== incoming.replace(/\/$/, '')) return { ok: false, origin: '' };
  const allowed = new Set(configuredOrigins());
  const sameHost = requestHostOrigin(req);
  if (sameHost) allowed.add(sameHost);
  return { ok: allowed.has(normalized), origin: normalized };
}

function timeoutFromEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value >= 10 && value <= 30000 ? value : fallback;
}

async function fetchWithTimeout(url, options, timeoutMs, consume) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return consume ? await consume(response) : response;
  } finally {
    clearTimeout(timer);
  }
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      if (tooLarge) return;
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_JSON_BYTES) {
        tooLarge = true;
        const error = new Error('request body too large');
        error.code = 'BODY_TOO_LARGE';
        reject(error);
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      if (tooLarge) return;
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// Vercel overwrites x-forwarded-for at its network boundary. Do not trust
// caller-controlled cf-connecting-ip or x-real-ip values here.
function getClientIp(req) {
  const forwarded = firstHeaderToken(req, 'x-forwarded-for');
  if (isIP(forwarded)) return forwarded;
  const socketIp = req.socket && String(req.socket.remoteAddress || '').trim();
  return isIP(socketIp) ? socketIp : '';
}

function createBridgeHeaders({ clientIp, idempotencyKey, origin }) {
  const secret = String(process.env.LEAD_BRIDGE_SECRET || '').trim();
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    return {
      ok: false,
      code: 'BRIDGE_CONFIGURATION_ERROR',
      error: 'Secure lead storage is not configured. Please call or email the shop directly.'
    };
  }
  if (!clientIp || !isIP(clientIp)) {
    return {
      ok: false,
      code: 'BRIDGE_CLIENT_IP_UNAVAILABLE',
      error: 'Secure lead storage is temporarily unavailable. Please call or email the shop directly.'
    };
  }

  const normalizedClientIp = clientIp.toLowerCase();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const canonical = [
    BRIDGE_SIGNATURE_VERSION,
    timestamp,
    normalizedClientIp,
    idempotencyKey,
    origin
  ].join('\n');
  const signature = createHmac('sha256', secret).update(canonical).digest('hex');

  return {
    ok: true,
    headers: {
      [BRIDGE_CLIENT_IP_HEADER]: normalizedClientIp,
      [BRIDGE_TIMESTAMP_HEADER]: timestamp,
      [BRIDGE_SIGNATURE_HEADER]: signature
    }
  };
}

function takeRateLimit(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  let bucket = localRateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
    bucket = { count: 0, startedAt: now };
  }
  bucket.count += 1;
  localRateBuckets.set(key, bucket);

  if (localRateBuckets.size > 2000) {
    for (const [bucketKey, value] of localRateBuckets) {
      if (now - value.startedAt >= RATE_LIMIT_WINDOW_MS) localRateBuckets.delete(bucketKey);
    }
  }

  const retryAfter = Math.max(1, Math.ceil(
    (bucket.startedAt + RATE_LIMIT_WINDOW_MS - now) / 1000
  ));
  return { allowed: bucket.count <= RATE_LIMIT_MAX, retryAfter };
}

// Re-detect lead source server-side as a safety net in case the hidden field
// was empty (script-blocked browsers, curl probes, etc).
function scalarString(value, maxLength = MAX_FIELD_CHARS) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function detectLeadSourceServerSide(body) {
  if (scalarString(body.gclid))   return 'Google Ads';
  if (scalarString(body.fbclid))  return 'Facebook / Instagram Ads';
  if (scalarString(body.msclkid)) return 'Microsoft Ads';

  const utmSource = scalarString(body.utm_source);
  const utm = utmSource.toLowerCase();
  if (utm) {
    if (/google/.test(utm))    return 'Google';
    if (/bing|microsoft/.test(utm)) return 'Microsoft Ads';
    if (/facebook|meta|instagram/.test(utm)) return 'Facebook / Instagram Ads';
    if (/yelp/.test(utm))      return 'Yelp';
    if (/youtube/.test(utm))   return 'YouTube';
    if (/chatgpt|openai|perplexity/.test(utm)) return 'ChatGPT / AI Referral';
    return utmSource;
  }

  const ref = `${scalarString(body.referrer)} ${scalarString(body.referrer_domain)}`.toLowerCase();
  if (ref.trim()) {
    if (/google\./.test(ref))      return 'Google Organic';
    if (/bing\./.test(ref))        return 'Bing Organic';
    if (/duckduckgo\./.test(ref))  return 'DuckDuckGo Organic';
    if (/yelp\./.test(ref))        return 'Yelp';
    if (/youtube\./.test(ref))     return 'YouTube';
    if (/facebook\.|instagram\.|fb\.com/.test(ref)) return 'Meta Social';
    if (/chatgpt\.|openai\.|perplexity\./.test(ref)) return 'ChatGPT / AI Referral';
    return 'Referral';
  }
  return 'Direct';
}

function formatEastern(date) {
  // e.g. "May 27, 2026 at 11:14 AM EDT"
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    }).format(date).replace(',', '').replace(/(\d{4}) (\d)/, '$1 at $2');
  } catch (_) { return date.toISOString(); }
}

function esc(v) {
  if (v === undefined || v === null) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function pickFirst(body, names) {
  for (const n of names) {
    const value = scalarString(body[n]);
    if (value) return value;
  }
  return '';
}

function asJoinedString(v) {
  if (Array.isArray(v)) return v.map((item) => scalarString(item, MAX_SERVICE_CHARS)).filter(Boolean).join(', ');
  return scalarString(v, MAX_SERVICE_CHARS);
}

function optionalString(value, maxLength = MAX_FIELD_CHARS) {
  const normalized = scalarString(value, maxLength);
  return normalized || undefined;
}

function normalizeServiceId(value) {
  const service = scalarString(value, MAX_SERVICE_CHARS);
  if (!service) return '';
  if (/^[a-z0-9][a-z0-9_-]*$/i.test(service)) return service;
  return service
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_SERVICE_CHARS);
}

function normalizeServices(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map(normalizeServiceId).filter(Boolean))];
}


const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','guerrillamail.net','10minutemail.com',
  'tempmail.com','trashmail.com','yopmail.com','sharklasers.com','getnada.com',
  'discard.email','temp-mail.org'
]);

function softSpamReason(body) {
  const started = Date.parse(String(body.submission_started_at || ''));
  if (Number.isFinite(started)) {
    const ageMs = Date.now() - started;
    // Form opened less than 3s ago → almost certainly automated.
    if (ageMs >= 0 && ageMs < 3000) return 'too-fast';
    // Future timestamp or >24h old is already handled elsewhere; ignore here.
  }
  const message = pickFirst(body, ['Message', 'message']);
  const urlHits = (message.match(/https?:\/\/|www\./gi) || []).length;
  if (urlHits > 2) return 'message-urls';
  const email = pickFirst(body, ['Email', 'Business Email', 'Work Email', 'email']).toLowerCase();
  const at = email.lastIndexOf('@');
  if (at > 0) {
    const domain = email.slice(at + 1);
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return 'disposable-email';
  }
  return '';
}

function validatePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.getPrototypeOf(body) !== Object.prototype) {
    return 'Request body must be a JSON object.';
  }

  const entries = Object.entries(body);
  if (entries.length > 80) return 'Request contains too many fields.';
  for (const [key, value] of entries) {
    if (key.length > 100) return 'Request contains an invalid field name.';
    if (key === 'services') {
      const services = Array.isArray(value) ? value : [value];
      if (services.length > 12 || services.some((item) =>
        typeof item !== 'string' || item.length > MAX_SERVICE_CHARS)) {
        return 'Please select no more than 12 valid services.';
      }
      continue;
    }
    if (typeof value !== 'string' || value.length > MAX_FIELD_CHARS) {
      return 'Request fields must be bounded text values.';
    }
  }

  const formId = scalarString(body.form_id, 80);
  const expectedType = SUPPORTED_FORMS.get(formId);
  if (!expectedType) return 'This form is not supported.';
  if (scalarString(body.form_type, 40) !== expectedType) {
    return 'Form identity does not match the requested form.';
  }

  if (formId === 'callback-form') {
    const name = pickFirst(body, ['Name']);
    const callbackPhone = pickFirst(body, ['Phone']);
    if (!name) return 'Please enter your name.';
    if (name.length > 120) return 'Please keep your name under 120 characters.';
    if (!callbackPhone) return 'Please enter the phone number we should call.';
    if (pickFirst(body, ['Best Time to Call']).length > 120) {
      return 'Please choose a shorter callback time preference.';
    }
    if (pickFirst(body, ['Message']).length > 4000) {
      return 'Please keep your message under 4,000 characters.';
    }
  }

  if (formId === 'apply-form') {
    const requiredApplicationFields = [
      ['Business Name', 'Please enter your business name.'],
      ['Contact Name', 'Please enter a contact name.'],
      ['Work Email', 'Please enter your work email.'],
      ['Phone', 'Please enter your phone number.'],
      ['Business Type', 'Please select a business type.'],
      ['Monthly Volume', 'Please select a monthly volume estimate.']
    ];
    for (const [field, message] of requiredApplicationFields) {
      if (!pickFirst(body, [field])) return message;
    }
    if (pickFirst(body, ['Business Name']).length > 200) {
      return 'Please keep your business name under 200 characters.';
    }
    if (pickFirst(body, ['Contact Name']).length > 120) {
      return 'Please keep the contact name under 120 characters.';
    }
    if (pickFirst(body, ['Message']).length > 4000) {
      return 'Please keep your message under 4,000 characters.';
    }
  }

  const email = pickFirst(body, ['Email', 'Business Email', 'Work Email', 'email']);
  const phone = pickFirst(body, ['Phone', 'phone']);
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) {
    return 'Please enter a valid email address.';
  }
  const phoneDigits = phone.replace(/\D/g, '');
  if (phone && (!PHONE_RE.test(phone) || phone.length > 30 ||
      phoneDigits.length < 7 || phoneDigits.length > 15)) {
    return 'Please enter a valid phone number.';
  }
  if (!email && !phone) return 'Email or phone required.';

  return '';
}

function buildPersistenceAttribution(body) {
  const attribution = {
    source: optionalString(body.utm_source, 120),
    medium: optionalString(body.utm_medium, 120),
    campaign: optionalString(body.utm_campaign, 200),
    term: optionalString(body.utm_term, 200),
    content: optionalString(body.utm_content, 200),
    referrer: optionalString(body.referrer, 2048),
    landingPage: optionalString(body.landing_page, 2048)
  };
  Object.keys(attribution).forEach((key) => {
    if (attribution[key] === undefined) delete attribution[key];
  });
  return Object.keys(attribution).length ? attribution : undefined;
}

function buildPersistenceContact(body, preferenceOverride) {
  const firstName = optionalString(pickFirst(body, ['First Name', 'first_name']), 120);
  const lastName = optionalString(pickFirst(body, ['Last Name', 'last_name']), 120);
  const fullName = ([firstName, lastName].filter(Boolean).join(' ') ||
    optionalString(pickFirst(body, ['Contact Name', 'Name']), 120) ||
    'Not provided').slice(0, 120);
  const phone = optionalString(pickFirst(body, ['Phone', 'phone']), 30);
  const email = optionalString(
    pickFirst(body, ['Email', 'Business Email', 'Work Email', 'email']),
    254
  );
  const zip = optionalString(pickFirst(body, ['ZIP', 'zip']), 10);

  return {
    fullName,
    phone,
    email,
    postalCode: zip && /^\d{5}(?:-\d{4})?$/.test(zip) ? zip : undefined,
    preference: preferenceOverride || (phone && email ? 'either' : phone ? 'phone' : 'email')
  };
}

function buildPersistencePayload(body) {
  const formId = String(body.form_id || '');
  const quoteMatch = /^quote-(retail|fleet|dealer)$/.exec(formId);
  const audience = quoteMatch
    ? quoteMatch[1]
    : formId === 'callback-form'
      ? 'callback'
      : formId === 'apply-form'
        ? 'application'
        : '';
  if (!audience) return null;

  const selectedServices = normalizeServices(body.services);
  const services = selectedServices.length
    ? selectedServices
    : audience === 'callback'
      ? ['callback_request']
      : audience === 'application'
        ? ['account_application']
        : selectedServices;
  const idempotencyCandidate = String(
    pickFirst(body, ['idempotency_key', 'idempotencyKey']) || ''
  ).trim();
  const idempotencyKey = UUID_V4_RE.test(idempotencyCandidate)
    ? idempotencyCandidate : randomUUID();
  const contact = buildPersistenceContact(body, audience === 'callback' ? 'phone' : undefined);
  const attribution = buildPersistenceAttribution(body);
  const envelope = {
    schemaVersion: LEAD_SCHEMA_VERSION,
    idempotencyKey,
    contact,
    // The visitor asked us to process this request. This is not marketing consent.
    consent: true,
    attribution
  };

  if (audience === 'retail' || audience === 'callback') {
    const isCallback = audience === 'callback';
    const year = Number.parseInt(pickFirst(body, ['Vehicle Year', 'year']), 10);
    const currentYear = new Date().getFullYear();
    const requestDetails = [
      ['Quote type', pickFirst(body, ['Parts Supply'])],
      ['Hitch use', pickFirst(body, ['Hitch Use'])],
      ['Hitch style', pickFirst(body, ['Hitch Style'])],
      ['Customer parts', pickFirst(body, ['Customer Parts'])],
      ['Trailer details', pickFirst(body, ['Trailer Details'])],
      ['Installation location', pickFirst(body, ['Installation Location'])],
      ['Service address', pickFirst(body, ['Service Address'])],
      ['Workspace confirmed', pickFirst(body, ['Workspace Confirmed'])],
      ['Mobile prepayment accepted', pickFirst(body, ['Mobile Prepayment Accepted'])]
    ].filter((entry) => entry[1]).map((entry) => `${entry[0]}: ${entry[1]}`);
    const customerNotes = optionalString(pickFirst(body, ['Message', 'message']), 4000);
    const notes = [...requestDetails, customerNotes].filter(Boolean).join('\n').slice(0, 4000);
    return {
      ...envelope,
      kind: 'retail',
      services,
      vehicle: {
        year: !isCallback && Number.isInteger(year) && year >= 1980 && year <= currentYear + 2
          ? year : 'unknown',
        make: isCallback
          ? 'Unknown'
          : optionalString(pickFirst(body, ['Vehicle Make', 'make']), 80) || 'Unknown',
        model: isCallback
          ? 'Unknown'
          : optionalString(pickFirst(body, ['Vehicle Model', 'model']), 80) || 'Unknown',
        trim: isCallback
          ? undefined
          : optionalString(pickFirst(body, ['Vehicle Trim', 'trim']), 100)
      },
      preferences: {
        notes: notes || undefined,
        timing: optionalString(pickFirst(body, [
          isCallback ? 'Best Time to Call' : 'Preferred Date'
        ]), 120)
      }
    };
  }

  const isApplication = audience === 'application';
  const orgType = optionalString(
    pickFirst(body, ['Organization Type', 'Business Type']),
    200
  ) || '';
  const business = optionalString(pickFirst(body, ['Business Name', 'business']), 200);
  const quantityRaw = audience === 'dealer' || isApplication
    ? pickFirst(body, ['Monthly Volume'])
    : pickFirst(body, ['Vehicle Count']);
  const quantity = Number.parseInt(String(quantityRaw || ''), 10);
  const requestType = /government|municipal/i.test(orgType)
    ? 'government'
    : isApplication && /fleet/i.test(orgType)
      ? 'fleet'
      : isApplication && /dealership/i.test(orgType)
        ? 'dealer'
        : isApplication
          ? 'work_vehicle'
          : audience;

  return {
    ...envelope,
    kind: 'commercial',
    requestType,
    scope: {
      services,
      notes: optionalString(pickFirst(body, ['Message', 'message']), 4000)
    },
    assets: {
      description: isApplication
        ? `${orgType || 'Business'} account application`.slice(0, 1000)
        : (orgType || business ||
          (audience === 'dealer' ? 'Dealer / government inquiry' : 'Fleet upfit inquiry'))
          .slice(0, 1000),
      quantity: !isApplication && Number.isInteger(quantity) && quantity > 0 && quantity <= 10000
        ? quantity : undefined
    },
    logistics: {
      timing: optionalString(pickFirst(body, ['Timeline']), 120),
      notes: isApplication && quantityRaw
        ? `Monthly volume estimate: ${scalarString(quantityRaw, 120)}`.slice(0, 4000)
        : undefined
    },
    organization: {
      name: business
    }
  };
}

async function persistLeadRequest(body, req) {
  const payload = buildPersistencePayload(body);
  if (!payload) return { required: false, ok: true };

  const url = process.env.LEAD_PERSISTENCE_URL || DEFAULT_PERSISTENCE_URL;
  const origin = process.env.LEAD_PERSISTENCE_ORIGIN || DEFAULT_SITE_ORIGIN;
  const headers = {
    'Content-Type': 'application/json',
    'Origin': origin,
    'Idempotency-Key': payload.idempotencyKey
  };
  const protectionBypass = process.env.LEAD_PERSISTENCE_BYPASS_SECRET;
  if (typeof protectionBypass === 'string' && protectionBypass.length > 0) {
    headers['x-vercel-protection-bypass'] = protectionBypass;
  }
  const clientIp = getClientIp(req);
  const bridge = createBridgeHeaders({
    clientIp,
    idempotencyKey: payload.idempotencyKey,
    origin
  });
  if (!bridge.ok) {
    console.error('[lead] persistence bridge unavailable:', bridge.code);
    return {
      required: true,
      ok: false,
      status: 503,
      allowEmailFallback: false,
      upstreamCode: bridge.code,
      idempotencyKey: payload.idempotencyKey,
      error: bridge.error
    };
  }
  Object.assign(headers, bridge.headers);

  let response;
  let result = null;
  try {
    const upstream = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }, timeoutFromEnv('LEAD_PERSISTENCE_TIMEOUT_MS', DEFAULT_PERSISTENCE_TIMEOUT_MS),
    async (upstreamResponse) => {
      let upstreamResult = null;
      try { upstreamResult = await upstreamResponse.json(); }
      catch (error) {
        if (error && error.name === 'AbortError') throw error;
        // A bounded non-JSON response is an upstream protocol failure.
      }
      return { response: upstreamResponse, result: upstreamResult };
    });
    response = upstream.response;
    result = upstream.result;
  } catch (error) {
    console.error('[lead] persistence transport error:', error);
    return {
      required: true,
      ok: false,
      status: 503,
      allowEmailFallback: true,
      upstreamCode: error && error.name === 'AbortError'
        ? 'PERSISTENCE_TIMEOUT' : 'PERSISTENCE_TRANSPORT_ERROR',
      idempotencyKey: payload.idempotencyKey,
      error: 'We could not save your request. Please retry or contact the shop directly.'
    };
  }

  if (!response.ok || !result || result.persisted !== true) {
    const upstreamMessage = result && result.error && typeof result.error.message === 'string'
      ? result.error.message : '';
    const upstreamCode = result && result.error && typeof result.error.code === 'string'
      ? result.error.code : '';
    const upstreamStatus = response.status >= 400 && response.status <= 599
      ? response.status : 503;
    const allowEmailFallback = upstreamStatus >= 500 &&
      PERSISTENCE_FALLBACK_CODES.has(upstreamCode);
    console.error('[lead] persistence rejected:', response.status, upstreamCode, upstreamMessage);
    return {
      required: true,
      ok: false,
      status: upstreamStatus,
      upstreamCode,
      allowEmailFallback,
      idempotencyKey: payload.idempotencyKey,
      error: upstreamMessage ||
        'We could not save your request. Please retry or contact the shop directly.'
    };
  }

  return {
    required: true,
    ok: true,
    reference: result.reference || (result.lead && result.lead.reference) || '',
    idempotencyKey: payload.idempotencyKey
  };
}

// ------- email rendering --------------------------------------------------

function buildEmail({ body, ip, geo, leadSource, receivedAt }) {
  const formLabel = FORM_LABEL[body.form_id] || 'Lead';

  // Customer fields (the input names vary across the three forms — pick first match).
  const firstName  = pickFirst(body, ['First Name', 'first_name']);
  const lastName   = pickFirst(body, ['Last Name', 'last_name']);
  const fullName   = [firstName, lastName].filter(Boolean).join(' ') ||
                     pickFirst(body, ['Contact Name', 'Name']);
  const email      = pickFirst(body, ['Email', 'Business Email', 'Work Email', 'email']);
  const phone      = pickFirst(body, ['Phone', 'phone']);
  const business   = pickFirst(body, ['Business Name', 'business']);
  const orgType    = pickFirst(body, ['Organization Type', 'Business Type']);
  const zip        = pickFirst(body, ['ZIP', 'zip']);

  // Vehicle fields
  const vYear  = pickFirst(body, ['Vehicle Year', 'year']);
  const vMake  = pickFirst(body, ['Vehicle Make', 'make']);
  const vModel = pickFirst(body, ['Vehicle Model', 'model']);
  const vTrim  = pickFirst(body, ['Vehicle Trim', 'trim']);
  const vColor = pickFirst(body, ['Vehicle Color', 'color']);
  const vin    = pickFirst(body, ['VIN', 'vin']);
  const plate  = pickFirst(body, ['License Plate']);
  const plateState = pickFirst(body, ['Plate State']);

  // Request
  const services = asJoinedString(body.services);
  const prefDate = pickFirst(body, ['Preferred Date']);
  const callTime = pickFirst(body, ['Best Time to Call']);
  const message  = pickFirst(body, ['Message', 'message']);
  const monthlyVol = pickFirst(body, ['Monthly Volume']);
  const partsSupply = pickFirst(body, ['Parts Supply']);
  const hitchUse = pickFirst(body, ['Hitch Use']);
  const hitchStyle = pickFirst(body, ['Hitch Style']);
  const customerParts = pickFirst(body, ['Customer Parts']);
  const trailerDetails = pickFirst(body, ['Trailer Details']);
  const installLocation = pickFirst(body, ['Installation Location']);
  const serviceAddress = pickFirst(body, ['Service Address']);
  const workspaceConfirmed = pickFirst(body, ['Workspace Confirmed']);
  const mobilePrepayment = pickFirst(body, ['Mobile Prepayment Accepted']);
  const vehicle = [vYear, vMake, vModel, vTrim].filter(Boolean).join(' ');

  const serviceLabels = {
    bedliner: 'Spray-In Bedliner',
    hitches: 'Hitches & Towing',
    'hitches_and_towing': 'Hitches & Towing',
    undercoating: 'Undercoating & Rust Protection',
    tonneau: 'Tonneau Cover',
    boards: 'Running Boards & Steps',
    ceramic: 'Ceramic Coating',
    tint: 'Window Tinting',
    detailing: 'Mobile Detailing',
    suspension: 'Suspension / Lift',
    led: 'LED Lighting',
    wraps: 'Wraps & Branding',
    industrial: 'Industrial Coatings'
  };

  function friendly(value, labels = {}) {
    const raw = scalarString(value, 800);
    if (!raw) return '';
    return labels[raw.toLowerCase()] || raw.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function friendlyServices(value) {
    return scalarString(value, 800).split(/\s*,\s*/).filter(Boolean)
      .map((item) => friendly(item, serviceLabels)).join(', ');
  }

  function displayPhone(value) {
    const digits = scalarString(value, 40).replace(/\D/g, '');
    if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    if (digits.length === 11 && digits[0] === '1') return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    return scalarString(value, 40);
  }

  const serviceDisplay = friendlyServices(services) || formLabel;
  const phoneHref = phone ? phone.replace(/[^\d+]/g, '') : '';

  function pagePath(value) {
    const raw = scalarString(value, 1000);
    if (!raw) return '';
    try {
      const parsed = new URL(raw);
      return `${parsed.pathname}${parsed.search}`;
    } catch (_) {
      return raw;
    }
  }

  function row(label, value, options = {}) {
    if (value === '' || value === undefined || value === null) return '';
    const valueHtml = options.link
      ? `<a href="${esc(options.link)}" style="color:#075fbd;font-weight:${options.emphasis ? '700' : '600'};text-decoration:underline;word-break:break-word;">${esc(value)}</a>`
      : `<span style="font-weight:${options.emphasis ? '700' : '500'};">${esc(value)}</span>`;
    return `
      <tr>
        <td style="padding:6px 14px 6px 0;color:#667085;font-size:13px;font-weight:700;white-space:nowrap;vertical-align:top;width:132px;">${esc(label)}</td>
        <td style="padding:6px 0;color:#101828;font-size:14px;line-height:1.45;vertical-align:top;word-break:break-word;">${valueHtml}</td>
      </tr>`;
  }

  function action(label, href) {
    if (!href) return '';
    return `<a href="${esc(href)}" style="display:inline-block;margin:7px 6px 0 0;padding:7px 11px;background:#eef5ff;border:1px solid #c7dcf7;border-radius:6px;color:#075fbd;font-size:11px;font-weight:800;letter-spacing:.04em;text-decoration:none;text-transform:uppercase;">${esc(label)}</a>`;
  }

  function contactRow(number, label, value, href, actions = '') {
    const displayValue = value || 'Not provided';
    const valueHtml = href && value
      ? `<a href="${esc(href)}" style="color:#075fbd;font-size:17px;font-weight:750;line-height:1.35;text-decoration:underline;word-break:break-word;user-select:all;">${esc(displayValue)}</a>`
      : `<span style="color:${value ? '#101828' : '#98a2b3'};font-size:17px;font-weight:750;line-height:1.35;word-break:break-word;user-select:all;">${esc(displayValue)}</span>`;
    return `
      <tr>
        <td style="padding:11px 14px;border-bottom:${number < 3 ? '1px solid #e4e7ec' : 'none'};background:#ffffff;">
          <div style="margin-bottom:3px;color:#667085;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;">${number} · ${esc(label)}</div>
          <div>${valueHtml}</div>
          ${actions ? `<div>${actions}</div>` : ''}
        </td>
      </tr>`;
  }

  function section(title, rowsHtml) {
    if (!rowsHtml.replace(/\s+/g, '')) return '';
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:9px 14px;background:#123f70;color:#ffc328;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;border-radius:6px 6px 0 0;">${esc(title)}</td>
        </tr>
        <tr>
          <td style="padding:8px 14px;background:#ffffff;border:1px solid #e4e7ec;border-top:none;border-radius:0 0 6px 6px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rowsHtml}</table>
          </td>
        </tr>
      </table>`;
  }

  const contactHtml = section('Customer Contact',
    contactRow(1, 'Name', fullName) +
    contactRow(2, 'Phone', displayPhone(phone), phoneHref ? `tel:${phoneHref}` : '',
      action('Call', phoneHref ? `tel:${phoneHref}` : '') + action('Text', phoneHref ? `sms:${phoneHref}` : '')) +
    contactRow(3, 'Email', email, email ? `mailto:${email}` : '', action('Email', email ? `mailto:${email}` : '')));

  const summaryHtml = section('Quote Request',
    row('Service', serviceDisplay, { emphasis: true }) +
    row('Vehicle', vehicle, { emphasis: true }) +
    row('VIN', vin) +
    row('Plate', plate ? plate + (plateState ? ' (' + plateState + ')' : '') : '') +
    row('ZIP', zip) + row('Business / Agency', business) + row('Organization Type', orgType) +
    row('Preferred Date', prefDate) + row('Best Time to Call', callTime));

  const jobHtml = section('Job Details',
    row('Pricing', friendly(partsSupply, {
      'parts-labor': 'Parts + installation',
      csp: 'Labor only — customer supplies parts'
    })) + row('Hitch Use', friendly(hitchUse, {
      rack: 'Bike rack / cargo carrier',
      towing: 'Trailer towing',
      both: 'Towing + rack / cargo carrier'
    })) +
    row('Hitch Style', friendly(hitchStyle, {
      standard: 'Standard exposed receiver',
      stealth: 'Hidden / removable receiver',
      ecohitch: 'Low-profile EcoHitch'
    })) + row('Customer Parts', customerParts) +
    row('Trailer Details', trailerDetails) + row('Install Location', friendly(installLocation, {
      shop: 'Capital Upfitters shop',
      mobile: 'Mobile installation'
    })) +
    row('Service Address', serviceAddress) + row('Workspace Ready', friendly(workspaceConfirmed, {
      yes: 'Yes',
      no: 'No'
    })) +
    row('Mobile Prepayment Accepted', friendly(mobilePrepayment, {
      yes: 'Yes',
      no: 'No'
    })) + row('Monthly Volume', monthlyVol) +
    row('Vehicle Color', vColor) + row('Customer Notes', message, { emphasis: true }));

  const sourceParts = [
    leadSource,
    body.utm_source ? `UTM source: ${scalarString(body.utm_source, 160)}` : '',
    body.utm_medium ? `Medium: ${scalarString(body.utm_medium, 160)}` : '',
    body.utm_campaign ? `Campaign: ${scalarString(body.utm_campaign, 160)}` : '',
    [geo.city, geo.region].filter(Boolean).join(', '),
    pagePath(body.form_page || body.landing_page)
  ].filter(Boolean).join(' · ');

  const headline = serviceDisplay;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:18px 10px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="660" style="max-width:660px;width:100%;">
        <tr><td style="padding:14px 18px;background:#101828;border-radius:8px 8px 0 0;">
          <div style="color:#fcbf0d;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">Capital Upfitters · New Lead</div>
          <div style="color:#ffffff;font-size:21px;font-weight:750;line-height:1.25;margin-top:5px;">${esc(headline)}</div>
          <div style="color:#aeb7c6;font-size:12px;margin-top:4px;">${esc([fullName, vehicle, formatEastern(receivedAt)].filter(Boolean).join(' · '))}</div>
        </td></tr>
        <tr><td style="padding:14px;background:#f8fafc;border-left:1px solid #e4e7ec;border-right:1px solid #e4e7ec;">
          ${contactHtml}${summaryHtml}${jobHtml}
          <div style="padding:2px 2px 0;color:#6b7280;font-size:11px;line-height:1.45;">${esc(sourceParts)}</div>
        </td></tr>
        <tr><td style="padding:11px 18px;background:#101828;border-radius:0 0 8px 8px;text-align:center;">
          <div style="color:#9ca3af;font-size:12px;">Capital Upfitters · Rockville, MD · (301) 304-1419</div>
          <div style="color:#667085;font-size:11px;margin-top:3px;">Reply to contact ${esc(fullName || email || 'the customer')}.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  // Plaintext fallback
  const lines = [
    `CAPITAL UPFITTERS — ${services || formLabel}`,
    `Submitted: ${formatEastern(receivedAt)}`,
    '',
    `Name: ${fullName}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    zip && `ZIP: ${zip}`,
    business && `Business: ${business}`,
    '',
    vehicle && `Vehicle: ${vehicle}`,
    vin && `VIN: ${vin}`,
    '',
    services && `Services: ${services}`,
    partsSupply && `Quote Type: ${partsSupply}`,
    hitchUse && `Hitch Use: ${hitchUse}`,
    hitchStyle && `Hitch Style: ${hitchStyle}`,
    customerParts && `Customer Parts: ${customerParts}`,
    trailerDetails && `Trailer Details: ${trailerDetails}`,
    installLocation && `Installation Location: ${installLocation}`,
    serviceAddress && `Service Address: ${serviceAddress}`,
    workspaceConfirmed && `Workspace Ready: ${workspaceConfirmed}`,
    mobilePrepayment && `Prepayment Accepted: ${mobilePrepayment}`,
    prefDate && `Preferred Date: ${prefDate}`,
    callTime && `Best Time to Call: ${callTime}`,
    message && `Message: ${message}`,
    '',
    `Source: ${sourceParts || leadSource}`
  ].filter(Boolean);

  const subjectLead = serviceDisplay;
  const subjectWho = fullName || business || vehicle || email || 'New lead';

  return {
    subject: `[CU] ${subjectLead} — ${subjectWho}`.slice(0, 180),
    html, text: lines.join('\n'),
    replyTo: email || undefined
  };
}

// ------- customer confirmation -------------------------------------------

function buildCustomerConfirmation({ body, leadSource, receivedAt }) {
  const firstName = pickFirst(body, ['First Name', 'first_name']) ||
                    (pickFirst(body, ['Contact Name', 'Name']).split(' ')[0]) || 'there';
  const email = pickFirst(body, ['Email', 'Business Email', 'Work Email', 'email']);
  if (!email) return null;

  const services = asJoinedString(body.services);
  const vYear = pickFirst(body, ['Vehicle Year', 'year']);
  const vMake = pickFirst(body, ['Vehicle Make', 'make']);
  const vModel = pickFirst(body, ['Vehicle Model', 'model']);
  const vehicleStr = [vYear, vMake, vModel].filter(Boolean).join(' ');
  const formLabel = FORM_LABEL[body.form_id] || 'request';

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
        <tr><td style="padding:24px 24px 20px;background:#111827;border-radius:8px 8px 0 0;text-align:center;">
          <div style="color:#fcbf0d;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">Capital Upfitters</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:8px;line-height:1.3;">We got your request, ${esc(firstName)}.</div>
        </td></tr>
        <tr><td style="padding:28px 28px 16px;background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;color:#111827;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 14px;">Thanks for reaching out to Capital Upfitters. We received your ${esc(formLabel.toLowerCase())} and one of our team members will follow up <strong>within one business day</strong> &mdash; usually the same business day.</p>
          <p style="margin:0 0 14px;">Need to talk sooner? Call us at <a href="tel:+13013041419" style="color:#103b68;font-weight:600;">(301) 304-1419</a>, Mon&ndash;Fri 9:30am&ndash;4:30pm.</p>
        </td></tr>
        <tr><td style="padding:0 28px 20px;background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
            <tr><td style="padding:14px 16px;">
              <div style="color:#6b7280;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">Summary of your request</div>
              ${vehicleStr ? `<div style="color:#111827;font-size:14px;margin:2px 0;"><strong>Vehicle:</strong> ${esc(vehicleStr)}</div>` : ''}
              ${services ? `<div style="color:#111827;font-size:14px;margin:2px 0;"><strong>Services:</strong> ${esc(services)}</div>` : ''}
              <div style="color:#111827;font-size:14px;margin:2px 0;"><strong>Submitted:</strong> ${esc(formatEastern(receivedAt))}</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 28px 28px;background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
          <p style="margin:14px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">If you didn't submit this request, please ignore this message or reply and let us know.</p>
        </td></tr>
        <tr><td style="padding:14px 24px;text-align:center;">
          <div style="color:#6b7280;font-size:12px;">Capital Upfitters &middot; Rockville, MD &middot; <a href="tel:+13013041419" style="color:#6b7280;">(301) 304-1419</a></div>
          <div style="color:#9ca3af;font-size:11px;margin-top:4px;"><a href="https://capitalupfitters.com" style="color:#9ca3af;">capitalupfitters.com</a> &middot; <a href="https://capitalupfitters.com/privacy.html" style="color:#9ca3af;">Privacy Policy</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `Hi ${firstName},`,
    '',
    `Thanks for reaching out to Capital Upfitters. We received your ${formLabel.toLowerCase()} and one of our team members will follow up within one business day — usually the same business day.`,
    '',
    'Need to talk sooner? Call us at (301) 304-1419, Mon–Fri 9:30am–4:30pm.',
    '',
    'Summary of your request:',
    vehicleStr && `  Vehicle: ${vehicleStr}`,
    services   && `  Services: ${services}`,
    `  Submitted: ${formatEastern(receivedAt)}`,
    '',
    'If you didn\'t submit this request, please ignore this message.',
    '',
    '— Capital Upfitters',
    'Rockville, MD · (301) 304-1419',
    'capitalupfitters.com'
  ].filter(Boolean).join('\n');

  return {
    to: email,
    subject: 'We got your request — Capital Upfitters',
    html, text
  };
}

// ------- transport --------------------------------------------------------

async function sendViaResend({ from, to, subject, html, text, replyTo, key, idempotencyKey }) {
  const payload = { from, to, subject, html, text };
  if (replyTo) payload.reply_to = replyTo;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  try {
    const resend = await fetchWithTimeout('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }, timeoutFromEnv('LEAD_RESEND_TIMEOUT_MS', DEFAULT_RESEND_TIMEOUT_MS),
    async (response) => ({
      response,
      errorText: response.ok ? '' : await response.text()
    }));
    const r = resend.response;
    if (!r.ok) {
      const errText = resend.errorText;
      console.error('[lead] Resend error:', r.status, errText);
      return { ok: false, reason: errText || ('HTTP ' + r.status) };
    }
    return { ok: true };
  } catch (error) {
    console.error('[lead] Resend transport error:', error);
    return { ok: false, reason: error && error.message ? error.message : 'transport error' };
  }
}

async function sendEmails({ internal, customer, idempotencyKey }) {
  const key  = process.env.RESEND_API_KEY;
  const to   = process.env.LEAD_TO_EMAIL    || 'CapitalUpfitters@gmail.com';
  const fromInternal = process.env.LEAD_FROM_EMAIL ||
                       'Capital Upfitters Leads <onboarding@resend.dev>';
  // Use the same verified-sender for customer mail. If a branded sender is
  // configured (LEAD_CUSTOMER_FROM_EMAIL), prefer that for outbound to
  // customers (it must be on a verified domain).
  const fromCustomer = process.env.LEAD_CUSTOMER_FROM_EMAIL ||
                       process.env.LEAD_FROM_EMAIL ||
                       'Capital Upfitters <onboarding@resend.dev>';

  if (!key) {
    console.warn('[lead] RESEND_API_KEY missing — lead NOT emailed.');
    console.log('[lead] internal subject:', internal.subject);
    console.log('[lead] internal text:\n', internal.text);
    if (customer) console.log('[lead] customer confirmation -> ' + customer.to);
    return { internal: { ok: false, reason: 'RESEND_API_KEY not configured' },
             customer: customer ? { ok: false, reason: 'RESEND_API_KEY not configured' } : null };
  }

  const internalResult = await sendViaResend({
    from: fromInternal, to, subject: internal.subject,
    html: internal.html, text: internal.text, replyTo: internal.replyTo, key,
    idempotencyKey: idempotencyKey ? `${idempotencyKey}-internal` : undefined
  });
  if (!internalResult.ok || !customer) {
    return { internal: internalResult, customer: null };
  }

  const customerResult = await sendViaResend({
    from: fromCustomer, to: customer.to, subject: customer.subject,
    html: customer.html, text: customer.text,
    replyTo: 'CapitalUpfitters@gmail.com', key,
    idempotencyKey: idempotencyKey ? `${idempotencyKey}-customer` : undefined
  });
  return { internal: internalResult, customer: customerResult };
}

// ------- handler ----------------------------------------------------------

module.exports = async function handler(req, res) {
  const originCheck = validateRequestOrigin(req);
  if (originCheck.ok) res.cuCorsOrigin = originCheck.origin;

  if (req.method === 'OPTIONS') {
    return originCheck.ok
      ? send(res, 204, {})
      : send(res, 403, { ok: false, delivered: false, error: 'Origin not allowed.' });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (!originCheck.ok) {
    return send(res, 403, { ok: false, delivered: false, error: 'Origin not allowed.' });
  }

  const contentType = headerValue(req, 'content-type').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return send(res, 415, {
      ok: false,
      delivered: false,
      error: 'Content-Type must be application/json.'
    });
  }

  const contentLength = Number.parseInt(headerValue(req, 'content-length'), 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    return send(res, 413, { ok: false, delivered: false, error: 'Request body too large.' });
  }

  const ip = getClientIp(req);
  const rate = takeRateLimit(ip);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfter));
    return send(res, 429, {
      ok: false,
      delivered: false,
      error: 'Too many requests. Please wait a few minutes and try again.'
    });
  }

  let body;
  try { body = await readJsonBody(req); }
  catch (error) {
    if (error && error.code === 'BODY_TOO_LARGE') {
      return send(res, 413, { ok: false, delivered: false, error: 'Request body too large.' });
    }
    return send(res, 400, { ok: false, delivered: false, error: 'invalid JSON body' });
  }

  const validationError = validatePayload(body);
  if (validationError) {
    return send(res, 400, { ok: false, delivered: false, error: validationError });
  }

  // Trivial honeypot: if any of these fields are non-empty something filled them.
  if (body.website || body.fax || body.company_url) {
    return send(res, 200, {
      ok: true,
      persisted: null,
      delivered: true,
      customer_confirmation: false,
      delivery_mode: 'discarded'
    }); // silently accept and drop
  }

  // Soft spam traps (same silent-accept pattern as the honeypot).
  const spamReason = softSpamReason(body);
  if (spamReason) {
    console.warn('[lead] soft-spam discard:', spamReason);
    return send(res, 200, {
      ok: true,
      persisted: null,
      delivered: true,
      customer_confirmation: false,
      delivery_mode: 'discarded'
    });
  }

  const persistence = await persistLeadRequest(body, req);
  const persistenceRejected = persistence.required && !persistence.ok &&
    !persistence.allowEmailFallback;
  if (persistenceRejected) {
    return send(res, persistence.status || 503, {
      ok: false,
      persisted: false,
      delivered: false,
      error: persistence.error
    });
  }

  // Keep Resend payloads deterministic for a given browser idempotency key.
  // Network-derived IP/geolocation can change between retries, which makes
  // Resend reject an otherwise safe retry with 409. Only client-captured
  // context (part of the fingerprinted payload) is included in email content.
  const emailIp = pickFirst(body, ['ip_address']);
  const emailGeo = {
    city: pickFirst(body, ['geo_city']),
    region: pickFirst(body, ['geo_region']),
    country: pickFirst(body, ['geo_country']),
    isp: pickFirst(body, ['isp'])
  };
  const leadSource = scalarString(body.lead_source)
    ? scalarString(body.lead_source) : detectLeadSourceServerSide(body);

  const now = new Date();
  const submittedAt = new Date(scalarString(body.submission_started_at) || '');
  const receivedAt = !Number.isNaN(submittedAt.getTime()) &&
    Math.abs(now.getTime() - submittedAt.getTime()) <= 24 * 60 * 60 * 1000
    ? submittedAt : now;
  const internal = buildEmail({
    body,
    ip: emailIp,
    geo: emailGeo,
    leadSource,
    receivedAt
  });
  const customer = buildCustomerConfirmation({ body, leadSource, receivedAt });
  const bodyIdempotency = scalarString(body.idempotency_key, 80);
  const emailIdempotencyKey = persistence.idempotencyKey ||
    (UUID_V4_RE.test(bodyIdempotency) ? bodyIdempotency : randomUUID());

  const result = await sendEmails({
    internal,
    customer,
    idempotencyKey: emailIdempotencyKey
  });
  const internalDelivered = Boolean(result.internal && result.internal.ok);
  if (!internalDelivered) {
    const internalReason = result.internal && result.internal.reason ? String(result.internal.reason) : '';
    const customerReason = result.customer && result.customer.reason ? String(result.customer.reason) : '';
    console.error('[lead] internal delivery failed', { reference: persistence.reference || '', internalReason, customerReason });

    // Fail-open safety net: if the lead was durably persisted, don't
    // penalize the customer with a 502. The lead is safe in the store;
    // Ivan can pick it up from there while we chase the Resend issue.
    if (persistence.required && persistence.ok) {
      return send(res, 200, {
        ok: true,
        persisted: true,
        reference: persistence.reference || '',
        delivered: false,
        customer_confirmation: Boolean(result.customer && result.customer.ok),
        delivery_mode: 'persisted_only',
        warning: 'Your request was saved but our automated notification is delayed. We\'ll still see it and respond.',
        delivery_diagnostic: {
          internal_reason: internalReason,
          customer_reason: customerReason
        }
      });
    }

    // Both persistence and internal email failed — real hard error.
    return send(res, 502, {
      ok: false,
      persisted: persistence.required ? persistence.ok === true : null,
      reference: persistence.reference || '',
      delivered: false,
      customer_confirmation: Boolean(result.customer && result.customer.ok),
      error: persistence.required && persistence.ok
        ? 'Your request was saved, but we could not confirm the shop notification. Please call or email the shop directly.'
        : 'We could not confirm delivery. Please call or email the shop directly.',
      delivery_diagnostic: {
        internal_reason: internalReason,
        customer_reason: customerReason
      }
    });
  }

  return send(res, 200, {
    ok: true,
    persisted: persistence.required ? persistence.ok === true : null,
    reference: persistence.reference || '',
    delivered: true,
    customer_confirmation: Boolean(result.customer && result.customer.ok),
    delivery_mode: !persistence.required
      ? 'email_only'
      : !persistence.ok ? 'email_fallback' : 'persisted_and_emailed',
    warning: persistence.required && !persistence.ok
      ? 'Durable storage was unavailable; the shop notification was delivered.' : ''
  });
};
