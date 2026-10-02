/* reviews.js — live Google rating + review count from Trustindex.
 *
 * Nothing on the site hardcodes a rating or review count. Elements opt in with:
 *   data-review-text="{rating}★ · {count} Google Reviews"
 *     Template; {rating} and {count} are filled from Trustindex. The element's
 *     own text is the fallback and must not contain a number.
 *   data-review-rating / data-review-count
 *     Element text becomes the bare rating / count (fallback = existing text).
 *   data-review-aria="Rated {rating} out of 5 on Google"
 *     Same template syntax, written to aria-label.
 *
 * Source: the public content file of the same Trustindex widget the homepage
 * embeds (cdn.trustindex.io/widgets/<id>/content.html, CORS *). Cached in
 * localStorage for 6h. If the fetch or parsing fails, the fallback wording
 * stays: never a stale or invented number.
 */
(function () {
  'use strict';
  var PID = '4b0fb84780ce380f4576092cef2';
  var URL = 'https://cdn.trustindex.io/widgets/' + PID.slice(0, 2) + '/' + PID + '/content.html';
  var KEY = 'cu_ti_reviews_v1';
  var TTL = 6 * 60 * 60 * 1000;
  var SEL = '[data-review-text],[data-review-rating],[data-review-count],[data-review-aria]';

  function valid(d) {
    return d && isFinite(d.rating) && d.rating >= 1 && d.rating <= 5 &&
      isFinite(d.count) && d.count > 0 && Math.floor(d.count) === d.count;
  }

  function fill(tpl, d) {
    return tpl.replace(/\{rating\}/g, d.rating.toFixed(1))
              .replace(/\{count\}/g, d.count.toLocaleString('en-US'));
  }

  function apply(d) {
    if (!valid(d)) return;
    window.CU_REVIEWS = d;
    document.querySelectorAll(SEL).forEach(function (el) {
      var t = el.getAttribute('data-review-text');
      if (t !== null) el.textContent = fill(t, d);
      else if (el.hasAttribute('data-review-rating')) el.textContent = d.rating.toFixed(1);
      else if (el.hasAttribute('data-review-count')) el.textContent = d.count.toLocaleString('en-US');
      var a = el.getAttribute('data-review-aria');
      if (a !== null) el.setAttribute('aria-label', fill(a, d));
      el.classList.add('review-live');
    });
    document.dispatchEvent(new CustomEvent('cu:reviews', { detail: d }));
  }

  function parse(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var r = doc.querySelector('.ti-header-rating');
    var c = doc.querySelector('.ti-header-rating-reviews');
    if (!r || !c) return null;
    var rating = parseFloat(r.textContent.replace(',', '.'));
    var m = c.textContent.replace(/[,.\s](?=\d{3}\b)/g, '').match(/\d+/);
    return { rating: rating, count: m ? parseInt(m[0], 10) : NaN, source: 'trustindex' };
  }

  function cached() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      return c && valid(c) && Date.now() - c.t < TTL ? c : null;
    } catch (e) { return null; }
  }

  function run() {
    if (!document.querySelector(SEL)) return;
    var c = cached();
    if (c) { apply(c); return; }
    if (!window.fetch || !window.DOMParser) return;
    fetch(URL, { mode: 'cors', credentials: 'omit' })
      .then(function (res) { if (!res.ok) throw new Error(res.status); return res.text(); })
      .then(function (html) {
        var d = parse(html);
        if (!valid(d)) return;
        d.t = Date.now();
        try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
        apply(d);
      })
      .catch(function () { /* keep the number-free fallback wording */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
