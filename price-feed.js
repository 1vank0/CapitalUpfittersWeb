/*
 * price-feed.js: fills installed prices from the backend price feed.
 *
 * Usage on a page:
 *   <td data-price-key="bakflip-mx4"><a href="../quote.html?service=tonneau">Get installed price</a></td>
 *   <script src="/price-feed.js" data-price-group="bakflip" defer></script>
 *
 * Prices live in the backend (capital-upfitters-next, src/data/prices.ts) and
 * are served only after owner approval. If the feed is unreachable, slow, or
 * has no approved price for a key, the cell keeps its fallback link, so a
 * visitor or crawler never sees a placeholder or a stale number.
 */
(function () {
  'use strict';
  var script = document.currentScript;
  var FEED = (script && script.getAttribute('data-price-feed')) ||
    'https://capital-upfitters-next.vercel.app/api/public/prices';
  var group = script && script.getAttribute('data-price-group');
  var cells = document.querySelectorAll('[data-price-key]');
  if (!cells.length || !window.fetch) return;

  var url = FEED + (group ? '?group=' + encodeURIComponent(group) : '');
  var controller = window.AbortController ? new AbortController() : null;
  var timer = setTimeout(function () { if (controller) controller.abort(); }, 4000);

  function format(p) {
    var amount = '$' + Math.round(p.fromUsd).toLocaleString('en-US');
    return (p.kind === 'from' ? 'From ' : '') + amount + ' installed';
  }

  fetch(url, { mode: 'cors', credentials: 'omit', signal: controller ? controller.signal : undefined })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      clearTimeout(timer);
      if (!data || !data.ok || !Array.isArray(data.prices)) return;
      var byKey = {};
      data.prices.forEach(function (p) {
        if (p && typeof p.key === 'string' && typeof p.fromUsd === 'number' && p.fromUsd > 0) byKey[p.key] = p;
      });
      Array.prototype.forEach.call(cells, function (cell) {
        var p = byKey[cell.getAttribute('data-price-key')];
        if (!p) return;
        cell.textContent = format(p);
        cell.setAttribute('data-price-version', String(p.version));
      });
    })
    .catch(function () { clearTimeout(timer); });
}());
