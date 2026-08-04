/*!
 * quote-form.js — Capital Upfitters
 *
 * Handles the /quote.html page:
 *  - Mobile nav + scroll reveal
 *  - Audience tab switching (personal / fleet / dealer)
 *  - URL param preselect (?audience=fleet, ?service=bedliner,tonneau)
 *  - Service-picker checkboxes (16 services) + step progress
 *  - Lead submission to the shared /api/leads endpoint (with mailto fallback)
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

// ── Lead API integration ─────────────────────────────────────────────────────
// Posts each form to the Next.js /api/leads endpoint, which persists to the
// shared CRM database (also read by Josh OS + Upfit Portal). Falls back to a
// mailto: submit only if the API is unreachable so the lead never disappears.
//
// Configure with a global override in a small inline snippet before this
// script if the API host changes. In HTML, set window.CU_LEAD_API in an
// inline script tag pointing to the leads endpoint, e.g.
// https://leads.capitalupfitters.com/api/leads.
// Otherwise defaults to the production Vercel URL below.
const LEAD_API_URL =
  (typeof window !== 'undefined' && window.CU_LEAD_API) ||
  'https://capital-upfitters-next.vercel.app/api/leads';
const LEAD_SCHEMA_VERSION = '2026-07-15';
const LEAD_MAILTO = 'CapitalUpfitters@gmail.com';

function cuUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // RFC4122 v4 fallback for older browsers.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function cuGetField(form, name) {
  const el = form.elements.namedItem(name);
  if (!el) return '';
  if (el instanceof RadioNodeList) return el.value || '';
  return (el.value || '').trim();
}

function cuOptional(value) {
  const v = (value || '').trim();
  return v.length > 0 ? v : undefined;
}

function cuGetServices(form) {
  return Array.from(form.querySelectorAll('input[name="services"]:checked'))
    .map(el => el.value)
    .filter(Boolean);
}

function cuBuildAttribution(form) {
  const attribution = {
    source: cuOptional(cuGetField(form, 'utm_source')),
    medium: cuOptional(cuGetField(form, 'utm_medium')),
    campaign: cuOptional(cuGetField(form, 'utm_campaign')),
    term: cuOptional(cuGetField(form, 'utm_term')),
    content: cuOptional(cuGetField(form, 'utm_content')),
    referrer: cuOptional(cuGetField(form, 'referrer')),
    landingPage: cuOptional(cuGetField(form, 'landing_page')),
  };
  // Drop undefined keys so the payload passes the strict Zod schema.
  Object.keys(attribution).forEach(k => attribution[k] === undefined && delete attribution[k]);
  return Object.keys(attribution).length > 0 ? attribution : undefined;
}

function cuBuildRetailPayload(form) {
  const yearRaw = cuGetField(form, 'Vehicle Year');
  const yearNum = parseInt(yearRaw, 10);
  const validYear =
    Number.isFinite(yearNum) && yearNum >= 1980 && yearNum <= new Date().getFullYear() + 2;

  const firstName = cuGetField(form, 'First Name');
  const lastName = cuGetField(form, 'Last Name');
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Not provided';

  const phone = cuOptional(cuGetField(form, 'Phone'));
  const email = cuOptional(cuGetField(form, 'Email'));

  return {
    schemaVersion: LEAD_SCHEMA_VERSION,
    idempotencyKey: cuUuid(),
    kind: 'retail',
    services: cuGetServices(form),
    vehicle: {
      year: validYear ? yearNum : 'unknown',
      make: cuGetField(form, 'Vehicle Make') || 'Unknown',
      model: cuGetField(form, 'Vehicle Model') || 'Unknown',
      trim: cuOptional(cuGetField(form, 'Vehicle Trim')),
    },
    preferences: {
      notes: cuOptional(cuGetField(form, 'Message')),
      timing: cuOptional(cuGetField(form, 'Preferred Date')),
    },
    contact: {
      fullName,
      phone,
      email,
      postalCode: cuOptional(cuGetField(form, 'ZIP')),
      preference: phone && email ? 'either' : phone ? 'phone' : 'email',
    },
    consent: true,
    attribution: cuBuildAttribution(form),
  };
}

function cuBuildCommercialPayload(form, requestType) {
  const isDealer = requestType === 'dealer';
  const phone = cuOptional(cuGetField(form, 'Phone'));
  const email = cuOptional(
    isDealer ? cuGetField(form, 'Work Email') : cuGetField(form, 'Business Email'),
  );
  const contactName = cuGetField(form, 'Contact Name') || 'Not provided';

  const quantityRaw = isDealer
    ? cuGetField(form, 'Monthly Volume')
    : cuGetField(form, 'Vehicle Count');
  const quantityNum = parseInt(quantityRaw, 10);
  const quantity = Number.isFinite(quantityNum) && quantityNum > 0 && quantityNum <= 10000
    ? quantityNum
    : undefined;

  const assetDescription = isDealer
    ? cuOptional(cuGetField(form, 'Organization Type')) ||
      'Dealer / reseller inquiry'
    : cuOptional(cuGetField(form, 'Business Name')) ||
      'Fleet upfit inquiry';

  const assets = { description: assetDescription };
  if (quantity !== undefined) assets.quantity = quantity;

  return {
    schemaVersion: LEAD_SCHEMA_VERSION,
    idempotencyKey: cuUuid(),
    kind: 'commercial',
    requestType,
    scope: {
      services: cuGetServices(form),
      notes: cuOptional(cuGetField(form, 'Message')),
    },
    assets,
    logistics: {
      timing: cuOptional(cuGetField(form, 'Timeline')),
    },
    organization: {
      name: cuOptional(cuGetField(form, 'Business Name')),
    },
    contact: {
      fullName: contactName,
      phone,
      email,
      preference: phone && email ? 'either' : phone ? 'phone' : 'email',
    },
    consent: true,
    attribution: cuBuildAttribution(form),
  };
}

function cuBuildMailtoLink(form, kind) {
  // Fallback path: browsers open the user's mail client with a pre-filled body
  // when the API is unreachable. Keeps the lead reachable end-to-end.
  const fields = [];
  const services = cuGetServices(form);
  fields.push('Lead type: ' + kind);
  if (services.length) fields.push('Services: ' + services.join(', '));
  for (const el of form.elements) {
    if (!el.name || el.type === 'hidden' || el.type === 'submit' || el.type === 'file') continue;
    if (el.name === 'services') continue;
    if (el.type === 'checkbox' && !el.checked) continue;
    const v = (el.value || '').trim();
    if (!v) continue;
    fields.push(el.name + ': ' + v);
  }
  const body = encodeURIComponent(fields.join('\n'));
  const subject = encodeURIComponent('Capital Upfitters — ' + kind + ' quote request');
  return 'mailto:' + LEAD_MAILTO + '?subject=' + subject + '&body=' + body;
}

function cuShowSuccess(bodyId, successId) {
  const body = document.getElementById(bodyId);
  const success = document.getElementById(successId);
  if (body) body.style.display = 'none';
  if (success) success.style.display = 'block';
}

function cuShowError(form, message) {
  let banner = form.querySelector('.form-error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'form-error-banner';
    banner.setAttribute('role', 'alert');
    banner.style.cssText =
      'margin: var(--space-3, 12px) 0; padding: var(--space-3, 12px) var(--space-4, 16px);' +
      'background: rgba(161, 44, 123, 0.08); border: 1px solid rgba(161, 44, 123, 0.35);' +
      'color: var(--color-text, #1a1a1a); border-radius: var(--radius-md, 8px);' +
      'font-size: var(--text-sm, 0.875rem); line-height: 1.5;';
    form.insertBefore(banner, form.firstChild);
  }
  banner.textContent = message;
}

function cuClearError(form) {
  const banner = form.querySelector('.form-error-banner');
  if (banner) banner.remove();
}

async function cuSubmitLead(form, payload, kind, bodyId, successId) {
  cuClearError(form);
  const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
  const originalLabel = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
  }

  // Basic client-side sanity: the API rejects empty services and requires
  // phone OR email, so give the user a friendly message before spending the
  // request.
  if (!payload.contact.phone && !payload.contact.email) {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
    cuShowError(form, 'Please provide a phone number or email address so we can reach you.');
    return;
  }

  if (!payload.services || payload.services.length === 0 ||
      (payload.kind === 'commercial' && payload.scope.services.length === 0)) {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
    cuShowError(form, 'Please pick at least one service above.');
    return;
  }

  try {
    const response = await fetch(LEAD_API_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      cuShowSuccess(bodyId, successId);
      return;
    }

    // API rejected the request. Show a friendly message and offer mailto as a
    // recovery path instead of silently discarding the lead.
    let apiMessage = 'The request could not be submitted right now.';
    try {
      const data = await response.json();
      if (data && data.error && data.error.message) apiMessage = data.error.message;
    } catch (_) { /* non-JSON error body */ }
    console.error('[cu-leads] api error', response.status, apiMessage);

    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
    cuShowError(
      form,
      apiMessage + ' You can also email us directly and we\u2019ll get back to you within one business day.',
    );
    // Attach a one-click mailto recovery link.
    const banner = form.querySelector('.form-error-banner');
    if (banner && !banner.querySelector('a')) {
      const link = document.createElement('a');
      link.href = cuBuildMailtoLink(form, kind);
      link.textContent = 'Email your request instead';
      link.style.cssText = 'display: inline-block; margin-top: 8px; color: var(--color-accent); text-decoration: underline;';
      banner.appendChild(document.createElement('br'));
      banner.appendChild(link);
    }
  } catch (networkError) {
    // Total network failure (offline, CORS block, etc.). Redirect to mailto so
    // the user still gets in touch.
    console.error('[cu-leads] network error', networkError);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
    cuShowError(
      form,
      'We could not reach our servers. Opening your email app so you can send us the details directly.',
    );
    window.location.href = cuBuildMailtoLink(form, kind);
  }
}

// Form intercepts
function handleFormSubmit(formId, bodyId, successId, payloadKind) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    let payload;
    try {
      payload = payloadKind === 'retail'
        ? cuBuildRetailPayload(form)
        : cuBuildCommercialPayload(form, payloadKind === 'fleet' ? 'fleet' : 'dealer');
    } catch (err) {
      console.error('[cu-leads] payload build failed', err);
      cuShowError(form, 'Something went wrong preparing your request. Please refresh and try again.');
      return;
    }
    cuSubmitLead(form, payload, payloadKind, bodyId, successId);
  });
}
handleFormSubmit('quote-retail', 'form-retail-body', 'form-retail-success', 'retail');
handleFormSubmit('quote-fleet', 'form-fleet-body', 'form-fleet-success', 'fleet');
handleFormSubmit('quote-dealer', 'form-dealer-body', 'form-dealer-success', 'dealer');

// ── Phase 2: Service Picker (quote-cart retrofit) ────────────────────────────
// Grid of service chips above the form. Selections persist across audience
// tabs, sync to the checkboxes in retail/fleet/dealer panels, and survive
// page reloads via localStorage. Reads ?service=X,Y,Z URL params so service
// pages can deep-link with pre-selected items.
(function() {
  const STORAGE_KEY = 'cu:quote-cart:selected';

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

  if (!grid) return;

  // ── Load initial selection: URL param wins, else localStorage ──────────────
  const params = new URLSearchParams(window.location.search);
  const urlServices = (params.get('service') || params.get('services') || '')
    .split(',').map(s => s.trim()).filter(Boolean);

  let selected = new Set();
  if (urlServices.length) {
    urlServices.forEach(s => {
      // Case-insensitive match on canonical value or label
      const match = SERVICES.find(
        svc => svc.value.toLowerCase() === s.toLowerCase()
            || svc.label.toLowerCase() === s.toLowerCase()
      );
      if (match) selected.add(match.value);
    });
  } else {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(stored)) stored.forEach(v => selected.add(v));
    } catch (e) { /* ignore parse errors */ }
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
  }

  // ── Persist to localStorage ────────────────────────────────────────────────
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected])); }
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
  syncCheckboxes();
  updateBar();
})();

})();
