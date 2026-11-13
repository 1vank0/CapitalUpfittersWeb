'use strict';
const { createMediaStore } = require('../server/media-store');
const store = createMediaStore();
const editorialDefaults = require('../config/editorial-media.json');
const slotLabels = require('../config/media.json').slots;
function createHandler(mediaStore = store, editorial = editorialDefaults) {
  function choose(slot, record) {
    const item = editorial[slot];
    if (!item || (record && record.kind !== 'illustration')) return record;
    return { slot, kind: 'photo', alt: item.alt, caption: item.caption, source: item.source, sources: {768: item.asset, 1200: item.asset}, version: 'editorial-2026-11-13' };
  }
  return async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); return res.status(405).json({ error: 'Method not allowed.' }); }
    try {
      const query = new URL(req.url, 'http://localhost').searchParams;
      const slot = query.get('slot');
      if (!slot) {
        let manifest;
        try { manifest = await mediaStore.manifest(); } catch (error) {
          if (!Object.keys(editorial).length) throw error;
          manifest = {slots: Object.keys(slotLabels).map(slot => ({slot, label: slotLabels[slot], current: null}))};
        }
        manifest.slots = manifest.slots.map(item => ({...item, current: choose(item.slot, item.current)}));
        return res.status(200).json(manifest);
      }
      mediaStore.assertSlot(slot);
      const width = query.get('width') || '1200';
      if (!['768', '1200'].includes(width)) return res.status(400).json({ error: 'Invalid image width.' });
      let current;
      try { current = await mediaStore.current(slot); } catch (error) { if (!editorial[slot]) throw error; }
      const record = choose(slot, current);
      if (!record) return res.status(404).json({ error: 'An image has not been published for this service.' });
      res.setHeader('Location', record.sources[width]);
      return res.status(302).end();
    } catch (error) { return res.status(error.status || 503).json({ error: error.status ? error.message : 'Image service is temporarily unavailable.' }); }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
