'use strict';
const { createMediaStore } = require('../server/media-store');
const store = createMediaStore();
function createHandler(mediaStore = store) {
  return async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); return res.status(405).json({ error: 'Method not allowed.' }); }
    try {
      const query = new URL(req.url, 'http://localhost').searchParams;
      const slot = query.get('slot');
      if (!slot) return res.status(200).json(await mediaStore.manifest());
      mediaStore.assertSlot(slot);
      const width = query.get('width') || '1200';
      if (!['768', '1200'].includes(width)) return res.status(400).json({ error: 'Invalid image width.' });
      const record = await mediaStore.current(slot);
      if (!record) return res.status(404).json({ error: 'An image has not been published for this service.' });
      res.setHeader('Location', record.sources[width]);
      return res.status(302).end();
    } catch (error) { return res.status(error.status || 503).json({ error: error.status ? error.message : 'Image service is temporarily unavailable.' }); }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
