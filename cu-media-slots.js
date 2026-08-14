/**
 * cu-media-slots.js — managed media contract.
 *
 * A slot renders an image ONLY when it holds an explicitly approved
 * asset. Adding a verified photograph later is a data change in this
 * file — one object — not another section rebuild.
 *
 * Why this exists: the repo carries 29 images under media/next/ with no
 * provenance record of any kind (project-memory/ASSET-INVENTORY.md does
 * not exist on this branch, and the set arrived in ddf0047 undocumented;
 * the relaunch branch describes the same set as "already-generated
 * media"). None of them can honestly be published as Capital Upfitters'
 * own work, so none is marked approved here. Do not flip `approved` on
 * an asset without a real provenance answer.
 *
 * Slot shape:
 *   src           path to the asset, or null
 *   provenance    where it came from, in plain words
 *   source        who supplied/shot it
 *   approved      true ONLY when a human has confirmed it depicts real
 *                 Capital Upfitters work and may be published as such
 *   alt           accessible description (required when approved)
 *   caption       optional visible caption
 *   lastVerified  ISO date the approval was last confirmed
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CUMediaSlots = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SLOTS = {
    /* Industrial & infrastructure teaser (#6B).
       NEEDS: one real photograph of a Capital Upfitters industrial or
       facility coating project, cleared for public use. */
    'homepage-industrial': {
      src: null,
      provenance: null,
      source: null,
      approved: false,
      alt: null,
      caption: null,
      lastVerified: null
    },

    /* Why Choose Us facility image (#6C).
       NEEDS: one real photograph of the Rockville shop, the team, or an
       approved completed project. A neutral caption is acceptable:
       "Capital Upfitters — Rockville, Maryland". */
    'homepage-facility': {
      src: null,
      provenance: null,
      source: null,
      approved: false,
      alt: null,
      caption: null,
      lastVerified: null
    }
  };

  /** A slot is publishable only if it is approved AND actually complete. */
  function isReady(id) {
    var s = SLOTS[id];
    return !!(s && s.approved === true &&
              typeof s.src === 'string' && s.src.trim() !== '' &&
              typeof s.alt === 'string' && s.alt.trim() !== '');
  }

  function get(id) {
    var s = SLOTS[id];
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  /**
   * Render a slot's <figure> into `host`, or leave the DOM untouched.
   *
   * When a slot is not ready this deliberately renders NOTHING — no
   * empty frame, grey box, skeleton or "photo coming soon". The host is
   * removed from the layout so the surrounding text reflows to the full
   * width and the section reads as an intentional text-first design
   * rather than a page with a hole in it.
   */
  function render(id, host) {
    if (!host) return false;
    if (!isReady(id)) {
      host.hidden = true;
      host.setAttribute('data-slot-state', 'empty');
      host.innerHTML = '';
      return false;
    }
    var s = SLOTS[id];
    var fig = document.createElement('figure');
    fig.className = 'cu-slot-figure';
    var img = document.createElement('img');
    img.src = s.src;
    img.alt = s.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    fig.appendChild(img);
    if (s.caption) {
      var cap = document.createElement('figcaption');
      cap.textContent = s.caption;
      fig.appendChild(cap);
    }
    host.innerHTML = '';
    host.appendChild(fig);
    host.hidden = false;
    host.setAttribute('data-slot-state', 'ready');
    return true;
  }

  /** Render every [data-media-slot] host on the page. */
  function hydrateAll(doc) {
    (doc || document).querySelectorAll('[data-media-slot]').forEach(function (host) {
      render(host.getAttribute('data-media-slot'), host);
    });
  }

  return { SLOTS: SLOTS, get: get, isReady: isReady, render: render, hydrateAll: hydrateAll };
});
