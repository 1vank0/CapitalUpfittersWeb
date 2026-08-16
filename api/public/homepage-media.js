const { createHash } = require('node:crypto');
const registrySource = require('../../content/gallery/homepage-media.json');

const KEY_RE = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const MEDIA_PATH_RE = /^\/media\/gallery\/homepage\/[a-z0-9][a-z0-9-]*\.(?:avif|webp)$/;
const FORMAT_TYPES = new Set(['avif', 'webp']);

function assertString(value, name, maxLength) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new TypeError(`Invalid ${name}`);
  }
  return value;
}

function sanitizeVariant(variant, format) {
  if (!variant || typeof variant !== 'object' || Array.isArray(variant)) {
    throw new TypeError('Invalid media variant');
  }
  const src = assertString(variant.src, 'variant src', 240);
  const width = Number(variant.width);
  if (!MEDIA_PATH_RE.test(src) || !src.endsWith(`.${format}`)) {
    throw new TypeError('Media variant is outside the public homepage allowlist');
  }
  if (!Number.isInteger(width) || width < 240 || width > 2400) {
    throw new TypeError('Invalid media variant width');
  }
  return { src, width };
}

function sanitizeRegistry(source) {
  if (!source || source.schemaVersion !== 1 || !Array.isArray(source.items)) {
    throw new TypeError('Unsupported homepage media registry');
  }

  const seenKeys = new Set();
  const items = source.items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new TypeError('Invalid homepage media item');
    }

    const key = assertString(item.key, 'media key', 100);
    if (!KEY_RE.test(key) || seenKeys.has(key)) {
      throw new TypeError('Invalid or duplicate homepage media key');
    }
    seenKeys.add(key);

    if (item.kind !== 'illustrative') {
      throw new TypeError('Homepage generated media must remain illustrative');
    }

    const width = Number(item.width);
    const height = Number(item.height);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 240 || height < 180 || width > 3000 || height > 3000) {
      throw new TypeError('Invalid homepage media dimensions');
    }

    const focalX = Number(item.focalPoint && item.focalPoint.x);
    const focalY = Number(item.focalPoint && item.focalPoint.y);
    if (!Number.isFinite(focalX) || !Number.isFinite(focalY) || focalX < 0 || focalX > 100 || focalY < 0 || focalY > 100) {
      throw new TypeError('Invalid homepage media focal point');
    }

    const fallback = assertString(item.fallback, 'fallback', 240);
    if (!MEDIA_PATH_RE.test(fallback) || !fallback.endsWith('.webp')) {
      throw new TypeError('Invalid homepage media fallback');
    }

    const sources = {};
    for (const format of FORMAT_TYPES) {
      const variants = item.sources && item.sources[format];
      if (!Array.isArray(variants) || variants.length < 1 || variants.length > 6) {
        throw new TypeError(`Invalid ${format} source list`);
      }
      sources[format] = variants.map((variant) => sanitizeVariant(variant, format));
    }

    return {
      key,
      kind: 'illustrative',
      alt: assertString(item.alt, 'alt text', 180),
      caption: assertString(item.caption, 'caption', 220),
      width,
      height,
      focalPoint: { x: focalX, y: focalY },
      sizes: assertString(item.sizes, 'sizes', 240),
      fallback,
      sources
    };
  });

  return {
    schemaVersion: 1,
    updatedAt: assertString(source.updatedAt, 'updatedAt', 32),
    items
  };
}

let registryPayload;
let registryEtag;
let registryError;

try {
  registryPayload = JSON.stringify(sanitizeRegistry(registrySource));
  registryEtag = `"${createHash('sha256').update(registryPayload).digest('hex').slice(0, 24)}"`;
} catch (error) {
  registryError = error;
}

function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
  res.setHeader('Vary', 'Accept-Encoding');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (registryError || !registryPayload) {
    return res.status(500).json({ ok: false, error: 'Homepage media is temporarily unavailable' });
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('ETag', registryEtag);

  if (req.headers['if-none-match'] === registryEtag) {
    return res.status(304).end();
  }

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  return res.status(200).send(registryPayload);
}

module.exports = handler;
module.exports.sanitizeRegistry = sanitizeRegistry;
