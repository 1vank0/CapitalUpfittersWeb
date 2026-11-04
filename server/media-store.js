'use strict';
const { randomUUID } = require('node:crypto');
const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const http = require('node:http');
const https = require('node:https');
const defaults = require('../config/media.json');

class MediaError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function createMediaStore(options = {}) {
  const endpoint = options.endpoint || process.env.MEDIA_S3_ENDPOINT || defaults.endpoint;
  const bucket = options.bucket || process.env.MEDIA_BUCKET || defaults.bucket;
  const region = options.region || process.env.MEDIA_S3_REGION || defaults.region;
  let client = options.client;
  const cache = new Map();
  const assertSlot = slot => { if (!Object.hasOwn(defaults.slots, slot)) throw new MediaError(400, 'Choose a valid image slot.'); };
  const url = key => `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`;
  function s3() {
    if (client) return client;
    const accessKeyId = process.env.MEDIA_S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.MEDIA_S3_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) throw new MediaError(503, 'Media storage is not configured for changes.');
    client = new S3Client({ endpoint, region, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey }, requestHandler: { httpAgent: http.globalAgent, httpsAgent: https.globalAgent, connectionTimeout: 6000, requestTimeout: 12000 }, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
    return client;
  }
  async function publicRead(key) {
    if (options.readPublic) return options.readPublic(key);
    const response = await fetch(url(key), { signal: AbortSignal.timeout(12000), cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) throw new MediaError(503, 'Image service is temporarily unavailable.');
    return { value: await response.json(), etag: response.headers.get('etag') };
  }
  function safeRecord(value, slot) {
    if (!value || value.slot !== slot || !/^[0-9]{13}-[a-f0-9-]{36}$/.test(value.version || '')) throw new MediaError(502, 'Invalid image record.');
    if (!['photo', 'illustration'].includes(value.kind) || typeof value.alt !== 'string' || value.alt.length > 180) throw new MediaError(502, 'Invalid image description.');
    for (const width of [768, 1200]) {
      if (value.sources?.[width] !== url(`images/${slot}/${value.version}/${width}.webp`)) throw new MediaError(502, 'Invalid image source.');
    }
    return value;
  }
  async function current(slot, fresh = false) {
    assertSlot(slot);
    const hit = cache.get(slot);
    if (!fresh && hit && hit.expires > Date.now()) return hit.record;
    const result = await publicRead(`slots/${slot}/current.json`);
    const record = result ? safeRecord(result.value, slot) : null;
    cache.set(slot, { record, etag: result?.etag, expires: Date.now() + 5000 });
    return record;
  }
  async function manifest(fresh = false) {
    const entries = await Promise.all(Object.entries(defaults.slots).map(async ([slot, label]) => ({ slot, label, current: await current(slot, fresh) })));
    return { slots: entries };
  }
  async function upload({ slot, bytes, alt, kind, focus = 'centre' }) {
    assertSlot(slot);
    if (!Buffer.isBuffer(bytes) || bytes.length > 2500000 || bytes.length < 20) throw new MediaError(413, 'Choose an image under 2.5 MB after optimization.');
    if (typeof alt !== 'string' || alt.trim().length < 5 || alt.length > 180) throw new MediaError(400, 'Add a useful description (5–180 characters).');
    if (!['photo', 'illustration'].includes(kind)) throw new MediaError(400, 'Choose photo or illustration.');
    if (!['centre', 'north', 'south', 'east', 'west'].includes(focus)) throw new MediaError(400, 'Choose a valid crop focus.');
    const raster = bytes[0] === 0xff && bytes[1] === 0xd8 || bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
    if (!raster) throw new MediaError(400, 'Use a JPG, PNG or WebP image.');
    let metadata;
    try { metadata = await sharp(bytes, { limitInputPixels: 40000000, animated: false }).metadata(); }
    catch { throw new MediaError(400, 'This file could not be read as an image.'); }
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1 || metadata.width < 600 || metadata.height < 400) throw new MediaError(400, 'Use a JPG, PNG or WebP at least 600 × 400 pixels.');
    const version = `${Date.now()}-${randomUUID()}`;
    const sources = {};
    for (const width of [768, 1200]) {
      const image = await sharp(bytes, { limitInputPixels: 40000000 }).rotate().resize(width, width * 2 / 3, { fit: 'cover', position: focus }).webp({ quality: 82 }).toBuffer();
      const key = `images/${slot}/${version}/${width}.webp`;
      await s3().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: image, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }));
      sources[width] = url(key);
    }
    const record = { slot, version, alt: alt.trim(), kind, sources, focus, createdAt: new Date().toISOString() };
    await s3().send(new PutObjectCommand({ Bucket: bucket, Key: `records/${slot}/${version}.json`, Body: JSON.stringify(record), ContentType: 'application/json', CacheControl: 'no-store' }));
    return record;
  }
  async function publish(slot, version, expectedVersion) {
    assertSlot(slot);
    if (!/^[0-9]{13}-[a-f0-9-]{36}$/.test(version || '')) throw new MediaError(400, 'Choose a valid image version.');
    const existing = await current(slot, true);
    const etag = cache.get(slot)?.etag;
    if ((existing?.version || null) !== expectedVersion) throw new MediaError(409, 'This image changed in another session. Refresh before publishing.');
    let object;
    try { object = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: `records/${slot}/${version}.json` })); }
    catch (error) { if (error.$metadata?.httpStatusCode === 404 || error.name === 'NoSuchKey') throw new MediaError(404, 'Image version not found.'); throw error; }
    const record = safeRecord(JSON.parse(await object.Body.transformToString()), slot);
    try {
      await s3().send(new PutObjectCommand({ Bucket: bucket, Key: `slots/${slot}/current.json`, Body: JSON.stringify(record), ContentType: 'application/json', CacheControl: 'no-store', ...(existing && etag ? { IfMatch: etag } : { IfNoneMatch: '*' }) }));
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 412 || error.name === 'PreconditionFailed') throw new MediaError(409, 'Another update was published first. Refresh and try again.');
      throw error;
    }
    cache.delete(slot);
    return record;
  }
  async function history(slot) {
    assertSlot(slot);
    let cursor;
    const keys = [];
    do {
      const page = await s3().send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `records/${slot}/`, ContinuationToken: cursor }));
      keys.push(...(page.Contents || []).map(item => item.Key));
      cursor = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (cursor);
    return Promise.all(keys.sort().reverse().slice(0, 30).map(async key => {
      const item = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return safeRecord(JSON.parse(await item.Body.transformToString()), slot);
    }));
  }
  return { current, manifest, upload, publish, history, assertSlot };
}
module.exports = { createMediaStore, MediaError, slots: defaults.slots };
