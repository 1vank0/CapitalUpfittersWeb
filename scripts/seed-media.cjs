// One-time import. Named slots and future replacements live in object storage.
// node --env-file=.env.media.local scripts/seed-media.cjs /absolute/manifest.json
const fs = require('node:fs/promises');
const { createMediaStore } = require('../server/media-store');
const sharp = require('sharp');
(async () => {
  const manifestPath = process.argv[2];
  if (!manifestPath) throw new Error('Pass a JSON manifest with slug, path and optional alt.');
  const items = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const store = createMediaStore();
  for (const item of items) {
    const previous = await store.current(item.slug, true);
    if (previous) { console.log(`${item.slug}: already published; left unchanged`); continue; }
    const bytes = await sharp(await fs.readFile(item.path)).rotate().resize(1536, 1024, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    const record = await store.upload({ slot: item.slug, bytes, alt: item.alt || `Illustration of ${item.slug.replaceAll('-', ' ')}`, kind: 'illustration' });
    await store.publish(item.slug, record.version, null);
    console.log(`${item.slug}: published ${record.version}`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
