// Public runtime flags for this static site. Never exposes secrets or other env.
module.exports = function handler(req, res) {
  const ga = String(process.env.NEXT_PUBLIC_GA4_ID || '').trim();
  const clarity = String(process.env.NEXT_PUBLIC_CLARITY_ID || '').trim();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({
    ga4Id: /^G-[A-Z0-9]{4,20}$/.test(ga) && ga !== 'G-XXXXXXXXXX' ? ga : '',
    clarityId: /^[a-z0-9]{5,20}$/.test(clarity) ? clarity : ''
  }));
};
