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

// ------- helpers ----------------------------------------------------------

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
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

  const utm = (body.utm_source || '').toLowerCase();
  if (utm) {
    if (/google/.test(utm))    return 'Google';
    if (/bing|microsoft/.test(utm)) return 'Microsoft Ads';
    if (/facebook|meta|instagram/.test(utm)) return 'Facebook / Instagram Ads';
    if (/yelp/.test(utm))      return 'Yelp';
    if (/youtube/.test(utm))   return 'YouTube';
    if (/chatgpt|openai|perplexity/.test(utm)) return 'ChatGPT / AI Referral';
    return body.utm_source;
  }

  const ref = ((body.referrer || '') + ' ' + (body.referrer_domain || '')).toLowerCase();
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

// ------- transport --------------------------------------------------------

async function sendEmail({ subject, html, text, replyTo }) {
  const key  = process.env.RESEND_API_KEY;
  const to   = process.env.LEAD_TO_EMAIL   || 'CapitalUpfitters@gmail.com';
  const from = process.env.LEAD_FROM_EMAIL || 'Capital Upfitters Leads <leads@capitalupfitters.com>';

  if (!key) {
    // Soft-fail: log the email body so a Vercel function log still captures
    // the lead even if Resend isn't configured yet.
    console.warn('[lead] RESEND_API_KEY missing — lead NOT emailed.');
    console.log('[lead] subject:', subject);
    console.log('[lead] body:\n', text);
    return { ok: false, reason: 'RESEND_API_KEY not configured' };
  }

  const payload = { from, to, subject, html, text };
  if (replyTo) payload.reply_to = replyTo;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    console.error('[lead] Resend error:', r.status, errText);
    return { ok: false, reason: 'email provider error' };
  }
  return { ok: true };
}

// ------- handler ----------------------------------------------------------

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST')    return send(res, 405, { error: 'POST only' });

  let body;
  try { body = await readJsonBody(req); }
  catch (_) { return send(res, 400, { error: 'invalid JSON body' }); }

  // Trivial honeypot: if any of these fields are non-empty something filled them.
  if (body.website || body.fax || body.company_url) {
    return send(res, 200, { ok: true }); // silently accept and drop
  }

  // Required minimums — keep loose so we never reject a real lead.
  const hasContact = Boolean(
    pickFirst(body, ['Email', 'Work Email']) ||
    pickFirst(body, ['Phone'])
  );
  if (!hasContact) {
    return send(res, 400, { error: 'Email or phone required.' });
  }

  const ip  = getClientIp(req);
  const geo = await geolocate(ip);
  const leadSource = body.lead_source && String(body.lead_source).trim()
    ? body.lead_source : detectLeadSourceServerSide(body);

  const message = buildEmail({ body, ip, geo, leadSource, receivedAt: new Date() });

  const result = await sendEmail(message);
  // Always respond OK to the browser if we accepted the payload — internal
  // delivery failures are logged for ops, not bounced to the visitor.
  return send(res, 200, { ok: true, delivered: result.ok });
};
