// Vercel serverless function: POST /api/lead
//
// Receives JSON-serialized form data from the public site, captures the real
// visitor IP from request headers, performs an IP geolocation lookup, then
// sends a branded HTML notification email to the Capital Upfitters inbox.
//
// Required env vars:
//   RESEND_API_KEY     — transactional sender (https://resend.com)
//   LEAD_TO_EMAIL      — destination inbox (default: CapitalUpfitters@gmail.com)
//   LEAD_FROM_EMAIL    — verified sender (default: leads@capitalupfitters.com)
// Optional:
//   IPINFO_TOKEN       — token for ipinfo.io (better data than the no-auth fallback)
//
// Lead email layout (matches the spec):
//   1. Customer Information
//   2. Vehicle Information
//   3. Requested Service
//   4. Message
//   5. Lead Attribution
//   6. Visitor Location
//   7. Receipt Information

const FORM_LABEL = {
  retail: 'Retail Quote',
  fleet:  'Fleet / Business Quote',
  dealer: 'Dealer / Government Inquiry'
};

const MAX_BODY_BYTES = 100 * 1024;
const MAX_FIELDS = 80;
const MAX_FIELD_LENGTH = 5000;

// ------- helpers ----------------------------------------------------------

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let tooLarge = false;
    req.on('data', (chunk) => {
      if (tooLarge) return;
      data += chunk;
      if (Buffer.byteLength(data, 'utf8') > MAX_BODY_BYTES) {
        tooLarge = true;
      }
    });
    req.on('end', () => {
      if (tooLarge) {
        const error = new Error('request body too large');
        error.statusCode = 413;
        reject(error);
        return;
      }
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function normalizeBody(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const output = {};
  Object.entries(input).slice(0, MAX_FIELDS).forEach(([rawKey, rawValue]) => {
    const key = String(rawKey).slice(0, 100);
    if (Array.isArray(rawValue)) {
      output[key] = rawValue.slice(0, 20).map((value) =>
        String(value == null ? '' : value).slice(0, MAX_FIELD_LENGTH));
      return;
    }
    output[key] = String(rawValue == null ? '' : rawValue).slice(0, MAX_FIELD_LENGTH);
  });
  return output;
}

function validateContact(body) {
  const email = String(pickFirst(body, ['Email', 'Work Email', 'email']) || '').trim();
  const phone = String(pickFirst(body, ['Phone', 'phone']) || '').trim();
  if (!email && !phone) return 'Email or phone required.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return 'Enter a valid phone number.';
  }
  return '';
}

// Real-IP detection: cf-connecting-ip > x-forwarded-for > x-real-ip > socket.
function getClientIp(req) {
  const h = req.headers || {};
  const cf = h['cf-connecting-ip'];
  if (cf) return String(cf).trim();
  const xff = h['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  const xr = h['x-real-ip'];
  if (xr) return String(xr).trim();
  return (req.socket && req.socket.remoteAddress) || '';
}

// Re-detect lead source server-side as a safety net in case the hidden field
// was empty (script-blocked browsers, curl probes, etc).
function detectLeadSourceServerSide(body) {
  if (body.gclid)   return 'Google Ads';
  if (body.fbclid)  return 'Facebook / Instagram Ads';
  if (body.msclkid) return 'Microsoft Ads';

  const utm = String(body.utm_source || '').toLowerCase();
  if (utm) {
    if (/google/.test(utm))    return 'Google';
    if (/bing|microsoft/.test(utm)) return 'Microsoft Ads';
    if (/facebook|meta|instagram/.test(utm)) return 'Facebook / Instagram Ads';
    if (/yelp/.test(utm))      return 'Yelp';
    if (/youtube/.test(utm))   return 'YouTube';
    if (/chatgpt|openai|perplexity/.test(utm)) return 'ChatGPT / AI Referral';
    return body.utm_source;
  }

  const ref = (String(body.referrer || '') + ' ' + String(body.referrer_domain || '')).toLowerCase();
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

async function geolocate(ip) {
  const empty = { city: '', region: '', country: '', isp: '' };
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') ||
      ip.startsWith('192.168.') || ip.startsWith('172.')) {
    return empty;
  }
  const token = process.env.IPINFO_TOKEN;
  const url = token
    ? `https://ipinfo.io/${encodeURIComponent(ip)}?token=${token}`
    : `https://ipinfo.io/${encodeURIComponent(ip)}/json`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return empty;
    const j = await r.json();
    return {
      city:    j.city    || '',
      region:  j.region  || '',
      country: j.country || '',
      isp:     j.org     || j.isp || ''
    };
  } catch (_) { return empty; }
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
    const v = body[n];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

function asJoinedString(v) {
  if (Array.isArray(v)) return v.join(', ');
  return v == null ? '' : String(v);
}

// ------- email rendering --------------------------------------------------

function buildEmail({ body, ip, geo, leadSource, receivedAt }) {
  const formType  = body.form_type || 'lead';
  const formLabel = FORM_LABEL[formType] || 'Lead';

  // Customer fields (the input names vary across the three forms — pick first match).
  const firstName  = pickFirst(body, ['First Name', 'first_name']);
  const lastName   = pickFirst(body, ['Last Name', 'last_name']);
  const fullName   = [firstName, lastName].filter(Boolean).join(' ') ||
                     pickFirst(body, ['Contact Name', 'Name']);
  const email      = pickFirst(body, ['Email', 'Work Email', 'email']);
  const phone      = pickFirst(body, ['Phone', 'phone']);
  const business   = pickFirst(body, ['Business Name', 'business']);
  const orgType    = pickFirst(body, ['Organization Type']);
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

  function row(label, value) {
    if (value === '' || value === undefined || value === null) return '';
    return `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap;vertical-align:top;width:180px;">${esc(label)}</td>
        <td style="padding:6px 0;color:#111827;font-size:14px;vertical-align:top;word-break:break-word;">${esc(value)}</td>
      </tr>`;
  }

  function section(title, rowsHtml) {
    if (!rowsHtml.replace(/\s+/g, '')) return '';
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 16px;background:#103b68;color:#fcbf0d;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border-radius:6px 6px 0 0;">${esc(title)}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 6px 6px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rowsHtml}</table>
          </td>
        </tr>
      </table>`;
  }

  const customerHtml = section('Customer Information',
    row('Name', fullName) + row('Email', email) + row('Phone', phone) +
    row('ZIP', zip) + row('Business / Agency', business) + row('Organization Type', orgType));

  const vehicleHtml = section('Vehicle Information',
    row('Year', vYear) + row('Make', vMake) + row('Model', vModel) +
    row('Trim', vTrim) + row('Color', vColor) + row('VIN', vin) +
    row('License Plate', plate ? plate + (plateState ? ' (' + plateState + ')' : '') : ''));

  const serviceHtml = section('Requested Service',
    row('Services', services) + row('Monthly Volume', monthlyVol) +
    row('Preferred Date', prefDate) + row('Best Time to Call', callTime));

  const messageHtml = message ? section('Message',
    `<tr><td style="padding:6px 0;color:#111827;font-size:14px;line-height:1.55;white-space:pre-wrap;">${esc(message)}</td></tr>`) : '';

  const attribHtml = section('Lead Attribution',
    row('Lead Source', leadSource) +
    row('Referrer Domain', body.referrer_domain) +
    row('Referrer URL', body.referrer) +
    row('Landing Page', body.landing_page) +
    row('Form Page', body.form_page) +
    row('UTM Source', body.utm_source) +
    row('UTM Medium', body.utm_medium) +
    row('UTM Campaign', body.utm_campaign) +
    row('UTM Term', body.utm_term) +
    row('UTM Content', body.utm_content) +
    row('GCLID', body.gclid) +
    row('FBCLID', body.fbclid) +
    row('MSCLKID', body.msclkid));

  const locationHtml = section('Visitor Location',
    row('IP Address', ip) +
    row('City', geo.city) +
    row('Region', geo.region) +
    row('Country', geo.country) +
    row('ISP / Organization', geo.isp) +
    row('User Agent', body.user_agent));

  const receiptHtml = section('Receipt Information',
    row('Form', formLabel) +
    row('Form ID', body.form_id) +
    row('Submission ID', body.submission_id) +
    row('Submitted', formatEastern(receivedAt)));

  const headline = (() => {
    const who = fullName || email || 'New visitor';
    return `${who} — ${formLabel}`;
  })();

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;width:100%;">
        <tr><td style="padding:16px 20px;background:#111827;border-radius:8px 8px 0 0;">
          <div style="color:#fcbf0d;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">Capital Upfitters · New Lead</div>
          <div style="color:#ffffff;font-size:20px;font-weight:700;margin-top:4px;">${esc(headline)}</div>
          <div style="color:#9ca3af;font-size:13px;margin-top:4px;">${esc(formatEastern(receivedAt))}</div>
        </td></tr>
        <tr><td style="padding:20px;background:#f9fafb;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          ${customerHtml}${vehicleHtml}${serviceHtml}${messageHtml}${attribHtml}${locationHtml}${receiptHtml}
        </td></tr>
        <tr><td style="padding:14px 20px;background:#111827;border-radius:0 0 8px 8px;text-align:center;">
          <div style="color:#9ca3af;font-size:12px;">Capital Upfitters · Rockville, MD · (301) 304-1419</div>
          <div style="color:#6b7280;font-size:11px;margin-top:4px;">Submitted via capitalupfitters.com — reply directly to ${esc(email || 'the customer')}.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  // Plaintext fallback
  const lines = [
    `CAPITAL UPFITTERS — NEW LEAD (${formLabel})`,
    formatEastern(receivedAt),
    '',
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    business && `Business: ${business}`,
    '',
    vYear && `Vehicle: ${[vYear, vMake, vModel, vTrim].filter(Boolean).join(' ')}`,
    vin && `VIN: ${vin}`,
    '',
    services && `Services: ${services}`,
    message && `Message: ${message}`,
    '',
    `Lead Source: ${leadSource}`,
    `Landing Page: ${body.landing_page || ''}`,
    `Referrer: ${body.referrer || ''}`,
    body.utm_source && `UTM: ${body.utm_source} / ${body.utm_medium || ''} / ${body.utm_campaign || ''}`,
    body.gclid && `GCLID: ${body.gclid}`,
    body.fbclid && `FBCLID: ${body.fbclid}`,
    '',
    `IP: ${ip}`,
    `Location: ${[geo.city, geo.region, geo.country].filter(Boolean).join(', ')}`,
    geo.isp && `ISP: ${geo.isp}`,
    `User Agent: ${body.user_agent || ''}`
  ].filter(Boolean);

  return {
    subject: `[CU Lead] ${headline}`,
    html, text: lines.join('\n'),
    replyTo: email || undefined
  };
}

// ------- customer confirmation -------------------------------------------

function buildCustomerConfirmation({ body, leadSource, receivedAt }) {
  const firstName = pickFirst(body, ['First Name', 'first_name']) ||
                    (pickFirst(body, ['Contact Name', 'Name']).split(' ')[0]) || 'there';
  const email = pickFirst(body, ['Email', 'Work Email', 'email']);
  if (!email) return null;

  const services = asJoinedString(body.services);
  const vYear = pickFirst(body, ['Vehicle Year', 'year']);
  const vMake = pickFirst(body, ['Vehicle Make', 'make']);
  const vModel = pickFirst(body, ['Vehicle Model', 'model']);
  const vehicleStr = [vYear, vMake, vModel].filter(Boolean).join(' ');
  const formType  = body.form_type || 'lead';
  const formLabel = FORM_LABEL[formType] || 'request';

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
          <p style="margin:0 0 14px;">Need to talk sooner? Call us at <a href="tel:3013041419" style="color:#103b68;font-weight:600;">(301) 304-1419</a>, Mon&ndash;Fri 9:30am&ndash;4:30pm.</p>
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
          <div style="color:#6b7280;font-size:12px;">Capital Upfitters &middot; Rockville, MD &middot; <a href="tel:3013041419" style="color:#6b7280;">(301) 304-1419</a></div>
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

async function sendViaResend({ from, to, subject, html, text, replyTo, key }) {
  const payload = { from, to, subject, html, text };
  if (replyTo) payload.reply_to = replyTo;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('[lead] Resend error:', r.status, errText);
      return { ok: false, reason: errText || ('HTTP ' + r.status) };
    }
    const responseBody = await r.json().catch(() => ({}));
    return { ok: true, providerId: responseBody.id || '' };
  } catch (error) {
    console.error('[lead] Resend request failed:', error && error.message ? error.message : error);
    return { ok: false, reason: 'Resend request failed' };
  }
}

async function sendEmails({ internal, customer }) {
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

  // Internal delivery must succeed before telling the customer their request
  // was received. This prevents contradictory confirmations.
  const internalResult = await sendViaResend({
    from: fromInternal, to, subject: internal.subject,
    html: internal.html, text: internal.text, replyTo: internal.replyTo, key
  });
  if (!internalResult.ok) return { internal: internalResult, customer: null };

  const customerResult = customer
    ? await sendViaResend({
      from: fromCustomer, to: customer.to, subject: customer.subject,
      html: customer.html, text: customer.text,
      replyTo: 'CapitalUpfitters@gmail.com', key
    })
    : null;
  return { internal: internalResult, customer: customerResult };
}

// ------- handler ----------------------------------------------------------

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST')    return send(res, 405, { error: 'POST only' });

  const contentType = String((req.headers && req.headers['content-type']) || '');
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return send(res, 415, { error: 'application/json required' });
  }

  let rawBody;
  try { rawBody = await readJsonBody(req); }
  catch (error) {
    return send(res, error && error.statusCode === 413 ? 413 : 400, {
      error: error && error.statusCode === 413 ? 'Request body too large.' : 'Invalid JSON body.'
    });
  }

  const body = normalizeBody(rawBody);
  if (!body) return send(res, 400, { error: 'JSON object required.' });

  // Trivial honeypot: if any of these fields are non-empty something filled them.
  if (body.website || body.fax || body.company_url) {
    return send(res, 200, { ok: true, delivered: true }); // silently accept and drop
  }

  const contactError = validateContact(body);
  if (contactError) return send(res, 400, { error: contactError });

  const ip  = getClientIp(req);
  const geo = await geolocate(ip);
  const leadSource = body.lead_source && String(body.lead_source).trim()
    ? body.lead_source : detectLeadSourceServerSide(body);

  const receivedAt = new Date();
  const internal = buildEmail({ body, ip, geo, leadSource, receivedAt });
  const customer = buildCustomerConfirmation({ body, leadSource, receivedAt });

  const result = await sendEmails({ internal, customer });
  if (!result.internal || !result.internal.ok) {
    return send(res, 502, {
      ok: false,
      delivered: false,
      error: 'We could not confirm delivery. Please call (301) 304-1419.',
      submission_id: body.submission_id || ''
    });
  }

  return send(res, 200, {
    ok: true,
    delivered: true,
    customer_confirmation: Boolean(result.customer && result.customer.ok),
    submission_id: body.submission_id || '',
    provider_id: result.internal.providerId || ''
  });
};
