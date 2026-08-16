const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const handler = require('../api/public/homepage-media.js');
const registrySource = require('../content/gallery/homepage-media.json');

const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MEDIA_PATH_RE = /^\/media\/gallery\/homepage\/[a-z0-9][a-z0-9-]*\.(?:avif|webp)$/;
const EXPECTED_KEYS = [
  'home.hero',
  'home.audience.personal',
  'home.audience.fleet',
  'home.audience.dealer',
  'home.audience.industrial',
  'home.service.bedliner',
  'home.service.tonneau',
  'home.service.running-boards',
  'home.service.ceramic',
  'home.service.undercoating',
  'home.service.hitches',
  'home.craft.why'
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = JSON.stringify(body);
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    end(body) {
      this.body = body;
      return this;
    }
  };
}

function invoke(method, headers = {}) {
  const res = response();
  handler({ method, headers }, res);
  return res;
}

function assertFileSignature(filePath, extension) {
  const bytes = fs.readFileSync(filePath);
  assert.ok(bytes.length > 0, `${filePath} must not be empty`);
  if (extension === 'webp') {
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
    return;
  }
  assert.equal(bytes.subarray(4, 12).toString('ascii'), 'ftypavif');
}

test('registry exposes 12 illustrative entries, including the reserved hero', () => {
  const registry = handler.sanitizeRegistry(registrySource);
  const keys = registry.items.map((item) => item.key);

  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.items.length, 12);
  assert.equal(new Set(keys).size, 12);
  assert.deepEqual([...keys].sort(), [...EXPECTED_KEYS].sort());

  for (const item of registry.items) {
    assert.equal(item.kind, 'illustrative');
    assert.match(item.alt, /^Illustrative\b/);
    assert.match(item.caption, /illustrative/i);
    assert.match(item.caption, /not a completed customer project/i);
    assert.ok(Number.isInteger(item.width) && item.width >= 240);
    assert.ok(Number.isInteger(item.height) && item.height >= 180);
    assert.ok(item.focalPoint.x >= 0 && item.focalPoint.x <= 100);
    assert.ok(item.focalPoint.y >= 0 && item.focalPoint.y <= 100);
  }
});

test('homepage keeps the existing video while image slots stay semantic and path-free', () => {
  assert.match(
    INDEX_HTML,
    /<source src="https:\/\/www\.patriotliner\.site\/commonfiles\/patriotliner\/videos\/hero-home\.mp4" type="video\/mp4">/
  );
  assert.match(INDEX_HTML, /'\.\/assets\/amp-powerstep\.mp4'/);
  assert.doesNotMatch(INDEX_HTML, /data-media-key="home\.hero"/);
  assert.doesNotMatch(INDEX_HTML, /(?:src|srcset)="\/media\/gallery\/homepage\//);

  const expectedActiveKeys = EXPECTED_KEYS.filter((key) => key !== 'home.hero');
  const activeKeys = Array.from(INDEX_HTML.matchAll(/data-media-key="([^"]+)"/g), (match) => match[1]);
  assert.deepEqual([...new Set(activeKeys)].sort(), [...expectedActiveKeys].sort());

  for (const key of expectedActiveKeys) {
    assert.match(INDEX_HTML, new RegExp(`data-media-key="${key.replace(/\./g, '\\.')}`));
  }
});

test('every responsive derivative is allowlisted, unique, present, nonzero, and correctly encoded', () => {
  const registry = handler.sanitizeRegistry(registrySource);
  const referencedPaths = new Set();

  for (const item of registry.items) {
    assert.match(item.fallback, MEDIA_PATH_RE);
    assert.ok(
      item.sources.webp.some((variant) => variant.src === item.fallback),
      `${item.key} fallback must be one of its WebP variants`
    );

    for (const format of ['avif', 'webp']) {
      const widths = item.sources[format].map((variant) => variant.width);
      assert.deepEqual(widths, [...widths].sort((a, b) => a - b), `${item.key} ${format} widths must be ascending`);
      assert.equal(new Set(widths).size, widths.length, `${item.key} ${format} widths must be unique`);

      for (const variant of item.sources[format]) {
        assert.match(variant.src, MEDIA_PATH_RE);
        assert.ok(variant.src.endsWith(`.${format}`));
        assert.ok(!variant.src.includes('/source/'));
        assert.equal(referencedPaths.has(variant.src), false, `${variant.src} must belong to one slot`);
        referencedPaths.add(variant.src);

        const relativePath = variant.src.slice(1);
        const absolutePath = path.resolve(ROOT, relativePath);
        assert.ok(absolutePath.startsWith(`${path.join(ROOT, 'media', 'gallery', 'homepage')}${path.sep}`));
        assert.equal(fs.existsSync(absolutePath), true, `${variant.src} must exist`);
        assert.ok(fs.statSync(absolutePath).isFile(), `${variant.src} must be a file`);
        assertFileSignature(absolutePath, format);
      }
    }
  }
});

test('sanitizer strips unknown fields and preserves only public media metadata', () => {
  const candidate = clone(registrySource);
  candidate.internalNotes = 'do not expose';
  candidate.items[0].sourcePng = '/media/gallery/homepage/source/hero.png';
  candidate.items[0].sources.avif[0].privateToken = 'secret';

  const sanitized = handler.sanitizeRegistry(candidate);

  assert.deepEqual(Object.keys(sanitized).sort(), ['items', 'schemaVersion', 'updatedAt']);
  assert.equal(sanitized.internalNotes, undefined);
  assert.equal(sanitized.items[0].sourcePng, undefined);
  assert.deepEqual(Object.keys(sanitized.items[0].sources.avif[0]).sort(), ['src', 'width']);
  assert.equal(sanitized.items[0].sources.avif[0].privateToken, undefined);
});

test('sanitizer rejects unsafe paths, duplicate keys, private media kinds, and invalid variants', () => {
  const cases = [
    (candidate) => { candidate.items[0].fallback = 'https://example.com/tracker.webp'; },
    (candidate) => { candidate.items[0].sources.webp[0].src = '/media/gallery/homepage/../private.webp'; },
    (candidate) => { candidate.items[1].key = candidate.items[0].key; },
    (candidate) => { candidate.items[0].kind = 'project'; },
    (candidate) => { candidate.items[0].sources.avif = []; },
    (candidate) => { candidate.items[0].sources.webp[0].width = 99999; }
  ];

  for (const mutate of cases) {
    const candidate = clone(registrySource);
    mutate(candidate);
    assert.throws(() => handler.sanitizeRegistry(candidate), TypeError);
  }
});

test('GET returns the sanitized registry with cache and integrity headers', () => {
  const res = invoke('GET');
  const expected = handler.sanitizeRegistry(registrySource);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), expected);
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.match(res.headers['cache-control'], /s-maxage=300/);
  assert.match(res.headers.etag, /^"[a-f0-9]{24}"$/);
  assert.equal(res.headers.vary, 'Accept-Encoding');
});

test('HEAD returns headers without a response body and supports ETag revalidation', () => {
  const head = invoke('HEAD');
  assert.equal(head.statusCode, 200);
  assert.equal(head.body, undefined);
  assert.match(head.headers.etag, /^"[a-f0-9]{24}"$/);

  const notModified = invoke('GET', { 'if-none-match': head.headers.etag });
  assert.equal(notModified.statusCode, 304);
  assert.equal(notModified.body, undefined);
});

test('unsupported methods return 405 and advertise GET and HEAD', () => {
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const res = invoke(method);
    assert.equal(res.statusCode, 405);
    assert.deepEqual(JSON.parse(res.body), { ok: false, error: 'Method not allowed' });
    assert.equal(res.headers.allow, 'GET, HEAD');
  }
});
