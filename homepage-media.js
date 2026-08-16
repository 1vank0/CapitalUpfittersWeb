(function () {
  'use strict';

  var ENDPOINT = '/api/public/homepage-media';
  var MEDIA_PATH_RE = /^\/media\/gallery\/homepage\/[a-z0-9][a-z0-9-]*\.(?:avif|webp)$/;

  function safeMediaPath(value, extension) {
    if (typeof value !== 'string' || !MEDIA_PATH_RE.test(value) || !value.endsWith('.' + extension)) {
      return null;
    }
    var url = new URL(value, window.location.origin);
    return url.origin === window.location.origin ? url.pathname : null;
  }

  function safeVariants(variants, extension) {
    if (!Array.isArray(variants)) return [];
    return variants.reduce(function (result, variant) {
      var src = variant && safeMediaPath(variant.src, extension);
      var width = Number(variant && variant.width);
      if (src && Number.isInteger(width) && width >= 240 && width <= 2400) {
        result.push({ src: src, width: width });
      }
      return result;
    }, []);
  }

  function buildSource(type, variants, sizes) {
    if (!variants.length) return null;
    var source = document.createElement('source');
    source.type = 'image/' + type;
    source.srcset = variants.map(function (variant) {
      return variant.src + ' ' + variant.width + 'w';
    }).join(', ');
    source.sizes = sizes;
    return source;
  }

  function installMedia(slot, item) {
    if (!item || item.kind !== 'illustrative') return false;

    var avif = safeVariants(item.sources && item.sources.avif, 'avif');
    var webp = safeVariants(item.sources && item.sources.webp, 'webp');
    var fallback = safeMediaPath(item.fallback, 'webp');
    var width = Number(item.width);
    var height = Number(item.height);
    var focalX = Number(item.focalPoint && item.focalPoint.x);
    var focalY = Number(item.focalPoint && item.focalPoint.y);
    var alt = typeof item.alt === 'string' && item.alt.length <= 180 ? item.alt : '';
    var sizes = slot.dataset.mediaSizes || (typeof item.sizes === 'string' ? item.sizes : '100vw');

    if (!avif.length || !webp.length || !fallback || !Number.isInteger(width) || !Number.isInteger(height)) {
      return false;
    }

    var picture = document.createElement('picture');
    var avifSource = buildSource('avif', avif, sizes);
    var webpSource = buildSource('webp', webp, sizes);
    if (avifSource) picture.appendChild(avifSource);
    if (webpSource) picture.appendChild(webpSource);

    var image = document.createElement('img');
    var isHero = slot.dataset.mediaRole === 'hero';
    image.src = fallback;
    image.alt = alt;
    image.width = width;
    image.height = height;
    image.sizes = sizes;
    image.decoding = 'async';
    image.loading = isHero ? 'eager' : 'lazy';
    if (isHero) image.fetchPriority = 'high';

    picture.appendChild(image);
    slot.style.setProperty('--media-position', (Number.isFinite(focalX) ? focalX : 50) + '% ' + (Number.isFinite(focalY) ? focalY : 50) + '%');
    slot.dataset.mediaKind = 'illustrative';
    if (typeof item.caption === 'string') slot.dataset.mediaCaption = item.caption.slice(0, 220);
    slot.replaceChildren(picture);

    function markReady() {
      slot.classList.add('media-ready');
    }
    if (image.complete && image.naturalWidth > 0) markReady();
    else image.addEventListener('load', markReady, { once: true });
    return true;
  }

  function renderRegistry(registry) {
    if (!registry || registry.schemaVersion !== 1 || !Array.isArray(registry.items)) {
      throw new TypeError('Unsupported homepage media response');
    }

    var byKey = new Map();
    registry.items.forEach(function (item) {
      if (item && typeof item.key === 'string' && !byKey.has(item.key)) byKey.set(item.key, item);
    });

    document.querySelectorAll('[data-media-key]').forEach(function (slot) {
      var item = byKey.get(slot.dataset.mediaKey);
      if (item) installMedia(slot, item);
    });
  }

  var controller = typeof AbortController === 'function' ? new AbortController() : null;
  var timer = controller ? window.setTimeout(function () { controller.abort(); }, 5000) : null;

  fetch(ENDPOINT, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal: controller ? controller.signal : undefined
  })
    .then(function (response) {
      if (!response.ok) throw new Error('Homepage media request failed');
      return response.json();
    })
    .then(renderRegistry)
    .catch(function () {
      document.documentElement.classList.add('homepage-media-failed');
    })
    .finally(function () {
      if (timer) window.clearTimeout(timer);
    });
})();
