'use strict';
const { createHash, timingSafeEqual } = require('node:crypto');
const { createMediaStore, MediaError } = require('../server/media-store');
const store = createMediaStore();
const MAX_BODY = 3500000;
async function bodyOf(req) {
  if (Number(req.headers['content-length']) > MAX_BODY) throw new MediaError(413, 'Image request is too large.');
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    if (Buffer.byteLength(JSON.stringify(req.body)) > MAX_BODY) throw new MediaError(413, 'Image request is too large.');
    return req.body;
  }
  let body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : null;
  if (body === null) {
    const chunks = []; let size = 0;
    for await (const chunk of req) { const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += bytes.length; if (size > MAX_BODY) throw new MediaError(413, 'Image request is too large.'); chunks.push(bytes); }
    body = Buffer.concat(chunks);
  }
  if (Buffer.byteLength(body) > MAX_BODY) throw new MediaError(413, 'Image request is too large.');
  try { return JSON.parse(String(body)); } catch { throw new MediaError(400, 'Invalid JSON request.'); }
}
function createHandler({ mediaStore = store, token = () => process.env.MEDIA_ADMIN_TOKEN } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const expected = token();
      if (!expected || expected.length < 32) throw new MediaError(503, 'Media management is not configured.');
      const supplied = String(req.headers.authorization || '').replace(/^Bearer /, '');
      const digest = value => createHash('sha256').update(value).digest();
      if (!supplied || !timingSafeEqual(digest(supplied), digest(expected))) throw new MediaError(401, 'Access key not accepted.');
      const query = new URL(req.url, 'http://localhost').searchParams;
      if (req.method === 'GET') {
        if (query.get('session') === '1') return res.status(200).json({ ok: true });
        const slot = query.get('slot');
        return res.status(200).json(slot ? { current: await mediaStore.current(slot, true), history: await mediaStore.history(slot) } : await mediaStore.manifest(true));
      }
      if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); throw new MediaError(405, 'Method not allowed.'); }
      const origin = req.headers.origin;
      let sameOrigin = false;
      try { const parsed = new URL(origin); sameOrigin = parsed.host === req.headers.host && (parsed.protocol === 'https:' || (process.env.VERCEL !== '1' && parsed.protocol === 'http:')); } catch {}
      if (!sameOrigin) throw new MediaError(403, 'Open the media manager on this website to make changes.');
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw new MediaError(415, 'Use a JSON request.');
      const body = await bodyOf(req);
      if (!body || Array.isArray(body) || typeof body !== 'object') throw new MediaError(400, 'Invalid media request.');
      mediaStore.assertSlot(body.slot);
      if (body.action === 'upload') {
        if (typeof body.base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.base64)) throw new MediaError(400, 'Choose a valid image file.');
        const record = await mediaStore.upload({ slot: body.slot, bytes: Buffer.from(body.base64, 'base64'), alt: body.alt, kind: body.kind, focus: body.focus });
        return res.status(201).json({ record });
      }
      if (body.action === 'publish') {
        if (!(body.expectedVersion === null || typeof body.expectedVersion === 'string')) throw new MediaError(400, 'Refresh the current image before publishing.');
        const record = await mediaStore.publish(body.slot, body.version, body.expectedVersion);
        return res.status(200).json({ record });
      }
      throw new MediaError(400, 'Unknown media action.');
    } catch (error) { return res.status(error.status || 503).json({ error: error.status ? error.message : 'Image changes are temporarily unavailable. Please try again.' }); }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
