/*!
 * quote-form.js — Capital Upfitters
 *
 * Handles the /quote.html page:
 *  - Mobile nav + scroll reveal
 *  - Audience tab switching (personal / fleet / dealer)
 *  - URL param preselect (?audience=fleet, ?service=bedliner,tonneau)
 *  - Service-picker checkboxes (18 current groups) + step progress
 *
 * Lead submission is intentionally owned by /lead-form.js. Keeping this file
 * UI-only prevents one quote from being posted to multiple lead endpoints.
 *
 * Extracted from an inline <script> block on 2026-08-04 to fix a launch
 * blocker: a literal end-script tag sequence appeared inside a JS comment,
 * causing the browser to terminate the script early and render the rest
 * of the block as visible page text after the footer. The literal
 * end-script tag in the comment has been removed and the entire block is
 * wrapped in an IIFE to avoid polluting the global scope.
 */

(function () {
'use strict';

(function(){const b=document.getElementById('hamburger'),m=document.getElementById('nav-mobile'),c=document.getElementById('nav-close');if(b&&m){b.addEventListener('click',()=>{m.classList.add('open');b.setAttribute('aria-expanded','true');document.body.style.overflow='hidden'});if(c)c.addEventListener('click',()=>{m.classList.remove('open');b.setAttribute('aria-expanded','false');document.body.style.overflow=''})}})();
(function(){const e=document.querySelectorAll('.reveal');if(!e.length)return;const i=new IntersectionObserver(v=>{v.forEach(el=>{if(el.isIntersecting){el.target.classList.add('visible');i.unobserve(el.target)}})},{threshold:0.1,rootMargin:'0px 0px -40px 0px'});e.forEach(el=>i.observe(el))})();

// Audience tab switching
const tabs = document.querySelectorAll('.audience-tab');
const panels = document.querySelectorAll('.form-panel');

function activateTab(tab) {
  tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
  panels.forEach(p => p.setAttribute('hidden', ''));
  tab.classList.add('active');
  tab.setAttribute('aria-selected', 'true');
  const panelId = tab.dataset.panel;
  const panel = document.getElementById(panelId);
  if (panel) panel.removeAttribute('hidden');
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => activateTab(tab));
});

// Check URL param on load
(function(){
  const params = new URLSearchParams(window.location.search);
  const audience = params.get('audience');
  if (audience === 'fleet') {
    const fleetTab = document.getElementById('tab-fleet');
    if (fleetTab) activateTab(fleetTab);
  } else if (audience === 'dealer') {
    const dealerTab = document.getElementById('tab-dealer');
    if (dealerTab) activateTab(dealerTab);
  }
})();

// ── Phase 2: Service Picker (quote-cart retrofit) ────────────────────────────
// Grid of service chips above the form. Selections persist across audience
// tabs, sync to the checkboxes in retail/fleet/dealer panels, and survive
// page reloads via localStorage. Reads ?service=X,Y,Z URL params so service
// pages can deep-link with pre-selected items.
(function() {
  const STORAGE_KEY = 'cu:quote-cart:selected';
  const MAX_SERVICES = 12;

  // Canonical service list.
  //  • `value`  = API-safe slug sent to the leads endpoint (must match the
  //               regex /^[a-z0-9][a-z0-9_-]*$/i required by the backend).
  //  • `label`  = human-readable name shown on chips and cart summaries.
  //  • `legacy` = old checkbox `value=""` strings used in the retail/fleet/
  //               dealer forms so we can migrate any pre-existing form state.
  //  When the picker syncs to form checkboxes, we ALSO overwrite each
  //  checkbox's `value` attribute to the new slug so submissions carry the
  //  slug — the visible <label> text stays legacy for the human.
  const SERVICES = [
    { value: 'bedliner',              label: 'Bedliner',              badge: 'Top', legacy: 'Bedliner' },
    { value: 'ceramic_coating',       label: 'Ceramic Coating',       badge: '',    legacy: 'Ceramic Coating' },
    { value: 'undercoating',          label: 'Undercoating',          badge: '',    legacy: 'Undercoating' },
    { value: 'window_tinting',        label: 'Window Tinting',        badge: '',    legacy: 'Window Tinting' },
    { value: 'tonneau_cover',         label: 'Tonneau Cover',         badge: '',    legacy: 'Tonneau Cover' },
    { value: 'running_boards',        label: 'Running Boards',        badge: '',    legacy: 'Running Boards' },
    { value: 'hitches_towing',        label: 'Hitches & Towing',      badge: '',    legacy: 'Hitches & Towing' },
    { value: 'ladder_racks',          label: 'Ladder Racks',          badge: '',    legacy: 'Ladder Racks' },
    { value: 'van_shelving',          label: 'Van Shelving',          badge: '',    legacy: 'Van Shelving' },
    { value: 'camper_shell',          label: 'Camper Shell',          badge: '',    legacy: 'Camper Shell' },
    { value: 'toolboxes',             label: 'Toolboxes',             badge: '',    legacy: 'Toolbox / Bed Storage' },
    { value: 'amp_powerstep',         label: 'AMP PowerStep',         badge: '',    legacy: 'AMP PowerStep' },
    { value: 'suspension_lift',       label: 'Suspension / Lift',     badge: '',    legacy: 'Suspension / Lift Kit' },
    { value: 'exterior_accessories',  label: 'Exterior Accessories',  badge: '',    legacy: 'Exterior Accessories' },
    { value: 'led_lighting',          label: 'LED Lighting',          badge: '',    legacy: 'LED Lighting' },
    { value: 'wraps_branding',        label: 'Wraps & Branding',      badge: '',    legacy: 'Commercial Wraps' },
    { value: 'industrial_coatings',   label: 'Industrial Coatings',   badge: '',    legacy: 'Industrial Coatings' },
    { value: 'mobile_detailing',      label: 'Mobile Detailing',      badge: '',    legacy: 'Mobile Detailing' },
  ];
  // Build lookup: legacy label → slug
  const LEGACY_TO_SLUG = Object.fromEntries(SERVICES.map(s => [s.legacy, s.value]));

  const grid       = document.getElementById('service-picker-grid');
  const cartBar    = document.getElementById('picker-cart-bar');
  const countEl    = document.getElementById('picker-cart-count');
  const listEl     = document.getElementById('picker-cart-list');
  const clearBtn   = document.getElementById('picker-cart-clear');
  const continueBtn = document.getElementById('picker-cart-continue');
  const skipBtn    = document.getElementById('picker-skip');
  const formSection = document.getElementById('quote-form-section');
  const announcementEl = document.getElementById('service-picker-announcement');

  if (!grid) return;

  // ── Load initial selection: URL param wins, else localStorage ──────────────
  const params = new URLSearchParams(window.location.search);
  const rawUrlServices = (params.get('service') || params.get('services') || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const urlServices = window.CUQuoteDraft && typeof window.CUQuoteDraft.cleanServiceIds === 'function'
    ? window.CUQuoteDraft.cleanServiceIds(rawUrlServices)
    : rawUrlServices;

  let selected = new Set();
  let initialSelectionTrimmed = false;

  function addInitialSelection(value) {
    if (!value || selected.has(value)) return;
    if (selected.size >= MAX_SERVICES) {
      initialSelectionTrimmed = true;
      return;
    }
    selected.add(value);
  }

  if (urlServices.length) {
    urlServices.forEach(s => {
      // Case-insensitive match on canonical value or label
      const match = SERVICES.find(
        svc => svc.value.toLowerCase() === s.toLowerCase()
            || svc.label.toLowerCase() === s.toLowerCase()
      );
      if (match) addInitialSelection(match.value);
    });
  } else {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(stored)) {
        stored.forEach(v => {
          const match = SERVICES.find(
            svc => svc.value.toLowerCase() === String(v).toLowerCase()
                || svc.label.toLowerCase() === String(v).toLowerCase()
                || svc.legacy.toLowerCase() === String(v).toLowerCase()
          );
          if (match) addInitialSelection(match.value);
          else initialSelectionTrimmed = true;
        });
      } else {
        initialSelectionTrimmed = true;
      }
    } catch (e) {
      initialSelectionTrimmed = true;
    }
  }

  // ── Render chip grid ───────────────────────────────────────────────────────
  const chipHTML = SERVICES.map(svc => {
    const isSel = selected.has(svc.value);
    const badge = svc.badge ? `<span class="service-chip-badge">${svc.badge}</span>` : '';
    return `
      <button type="button" class="service-chip${isSel ? ' selected' : ''}"
        data-service="${svc.value.replace(/"/g, '&quot;')}"
        aria-pressed="${isSel}">
        <span class="service-chip-check" aria-hidden="true"></span>
        <span>${svc.label}</span>
        ${badge}
      </button>`;
  }).join('');
  grid.innerHTML = chipHTML;

  let announcementTimer = null;
  function announce(message) {
    if (!announcementEl) return;
    window.clearTimeout(announcementTimer);
    announcementEl.textContent = '';
    announcementTimer = window.setTimeout(() => {
      announcementEl.textContent = message;
    }, 20);
  }

  function updateChipAvailability() {
    const atLimit = selected.size >= MAX_SERVICES;
    grid.querySelectorAll('.service-chip').forEach(chip => {
      const unavailable = atLimit && !selected.has(chip.dataset.service);
      chip.setAttribute('aria-disabled', unavailable ? 'true' : 'false');
    });
  }

  // ── Sync selection to form checkboxes across all 3 audience panels ─────────
  // Slugify any string to backend-safe identifier (lower snake_case).
  //   Matches the API contract regex /^[a-z0-9][a-z0-9_-]*$/i.
  function slugify(str) {
    return String(str)
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  // Normalize checkbox values to backend slugs (one-time on load).
  //   Retail form values match SERVICES.legacy → map to canonical slug.
  //   Fleet/dealer forms have unique values — those get slugified on the fly.
  //   The visible label text is left alone.
  document.querySelectorAll('input[type="checkbox"][name="services"]').forEach(cb => {
    const original = cb.value;
    if (LEGACY_TO_SLUG[original]) {
      cb.value = LEGACY_TO_SLUG[original];
    } else if (!/^[a-z0-9][a-z0-9_-]*$/i.test(original)) {
      cb.value = slugify(original);
    }
  });

  function syncCheckboxes() {
    document.querySelectorAll('input[type="checkbox"][name="services"]').forEach(cb => {
      cb.checked = selected.has(cb.value);
    });
  }

  // ── Update cart bar UI ─────────────────────────────────────────────────────
  let lastCount = -1;
  function updateBar() {
    const count = selected.size;
    if (count !== lastCount) {
      countEl.textContent = count;
      if (lastCount !== -1) {
        countEl.classList.remove('pulse');
        void countEl.offsetWidth; // force reflow so animation restarts
        countEl.classList.add('pulse');
        setTimeout(() => countEl.classList.remove('pulse'), 220);
      }
      lastCount = count;
    }
    if (count === 0) {
      cartBar.classList.remove('active');
      listEl.textContent = '';
    } else {
      cartBar.classList.add('active');
      const labels = SERVICES.filter(s => selected.has(s.value)).map(s => s.label);
      listEl.textContent = labels.slice(0, 4).join(', ')
        + (labels.length > 4 ? ` +${labels.length - 4} more` : '');
    }
    updateChipAvailability();
  }

  // ── Persist to localStorage ────────────────────────────────────────────────
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected].slice(0, MAX_SERVICES))); }
    catch (e) { /* storage full or disabled — ignore */ }
  }

  // ── Chip click handler (delegated) ─────────────────────────────────────────
  grid.addEventListener('click', (e) => {
    const chip = e.target.closest('.service-chip');
    if (!chip) return;
    const svc = chip.dataset.service;
    if (selected.has(svc)) {
      selected.delete(svc);
      chip.classList.remove('selected');
      chip.setAttribute('aria-pressed', 'false');
    } else {
      if (selected.size >= MAX_SERVICES) {
        announce('You can select up to 12 services. Remove one before choosing another.');
        return;
      }
      selected.add(svc);
      chip.classList.add('selected');
      chip.setAttribute('aria-pressed', 'true');
    }
    persist();
    syncCheckboxes();
    updateBar();
  });

  // ── Clear button ───────────────────────────────────────────────────────────
  clearBtn.addEventListener('click', () => {
    selected.clear();
    document.querySelectorAll('.service-chip').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-pressed', 'false');
    });
    persist();
    syncCheckboxes();
    updateBar();
  });

  // ── Continue button: scroll to form ────────────────────────────────────────
  continueBtn.addEventListener('click', () => {
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Move focus to the first field of the active panel for accessibility
      setTimeout(() => {
        const activePanel = document.querySelector('.form-panel:not([hidden])');
        const firstInput = activePanel && activePanel.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus({ preventScroll: true });
      }, 500);
    }
  });

  // ── Skip button: same as continue, no requirement ──────────────────────────
  skipBtn.addEventListener('click', () => {
    if (formSection) formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ── Also sync FROM checkboxes back TO picker (bi-directional) ──────────────
  // If a user unchecks a service on the form, remove it from the picker too.
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[type="checkbox"][name="services"]')) {
      const val = e.target.value;
      const wasChecked = e.target.checked;
      if (wasChecked && !selected.has(val) && selected.size >= MAX_SERVICES) {
        e.target.checked = false;
        announce('You can select up to 12 services. Remove one before choosing another.');
        updateChipAvailability();
        return;
      }
      if (wasChecked) selected.add(val); else selected.delete(val);
      // Update all matching checkboxes across panels
      document.querySelectorAll(`input[type="checkbox"][name="services"][value="${val.replace(/"/g,'\\"')}"]`)
        .forEach(cb => { cb.checked = wasChecked; });
      // Update matching chip
      const chip = grid.querySelector(`.service-chip[data-service="${val.replace(/"/g,'&quot;')}"]`);
      if (chip) {
        chip.classList.toggle('selected', wasChecked);
        chip.setAttribute('aria-pressed', wasChecked ? 'true' : 'false');
      }
      persist();
      updateBar();
    }
  });

  // ── Initial sync ───────────────────────────────────────────────────────────
  if (initialSelectionTrimmed) {
    persist();
    announce('Service selections were limited to the first 12 choices.');
  }
  syncCheckboxes();
  updateBar();

  // Keep the picker and persisted state in sync after the single shared lead
  // controller confirms successful delivery.
  document.addEventListener('cu:lead-success', (event) => {
    const formId = event.detail && event.detail.formId;
    if (!/^quote-(retail|fleet|dealer)$/.test(formId || '')) return;
    selected.clear();
    document.querySelectorAll('.service-chip').forEach(chip => {
      chip.classList.remove('selected');
      chip.setAttribute('aria-pressed', 'false');
    });
    persist();
    syncCheckboxes();
    updateBar();
  });
})();

})();
