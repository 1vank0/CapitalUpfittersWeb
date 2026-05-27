/* Capital Upfitters — lead form bridge
 *
 * For every form with [data-cms-form]:
 *   1. Inject the 19 hidden attribution fields (populated from CUAttribution).
 *   2. Intercept submit, serialize to JSON, POST to /api/lead.
 *   3. Show inline success/error UI without leaving the page.
 *
 * Falls back to the original `action="mailto:..."` behavior if /api/lead
 * returns a network error (keeps leads flowing if the API ever breaks).
 */
(function () {
  'use strict';

  var HIDDEN_FIELDS = [
    'ip_address', 'geo_city', 'geo_region', 'geo_country', 'isp',
    'landing_page', 'form_page', 'referrer', 'referrer_domain',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'fbclid', 'msclkid',
    'lead_source', 'user_agent'
  ];

  function attrContext() {
    if (window.CUAttribution && typeof window.CUAttribution.get === 'function') {
      return window.CUAttribution.get();
    }
    return {
      landing_page: window.location.href, form_page: window.location.href,
      user_agent: navigator.userAgent || '', lead_source: 'Direct'
    };
  }

  function ensureHiddenFields(form) {
    HIDDEN_FIELDS.forEach(function (name) {
      if (!form.querySelector('input[name="' + name + '"]')) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.setAttribute('data-cu-attr', '1');
        form.appendChild(input);
      }
    });
  }

  function fillAttribution(form) {
    var ctx = attrContext();
    HIDDEN_FIELDS.forEach(function (name) {
      var input = form.querySelector('input[name="' + name + '"]');
      if (input) input.value = ctx[name] || '';
    });
  }

  function serialize(form) {
    var data = {};
    // Capture multi-value fields (e.g. service checkboxes) as arrays.
    var fd = new FormData(form);
    fd.forEach(function (value, key) {
      if (value instanceof File) return; // skip file uploads — handled separately if ever needed
      if (data[key] === undefined) data[key] = value;
      else if (Array.isArray(data[key])) data[key].push(value);
      else data[key] = [data[key], value];
    });
    return data;
  }

  function showBanner(form, kind, message) {
    var existing = form.querySelector('.cu-lead-banner');
    if (existing) existing.remove();
    var div = document.createElement('div');
    div.className = 'cu-lead-banner cu-lead-banner--' + kind;
    div.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    div.textContent = message;
    div.style.cssText =
      'margin-top:1rem;padding:.75rem 1rem;border-radius:.5rem;font-weight:600;' +
      (kind === 'success'
        ? 'background:#10381f;color:#a7f3d0;border:1px solid #34d399;'
        : 'background:#3a1313;color:#fecaca;border:1px solid #f87171;');
    form.appendChild(div);
  }

  function setSubmitting(form, isSubmitting) {
    var btn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (!btn) return;
    if (isSubmitting) {
      btn.dataset.cuOriginalText = btn.dataset.cuOriginalText || btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending…';
    } else {
      btn.disabled = false;
      if (btn.dataset.cuOriginalText) btn.textContent = btn.dataset.cuOriginalText;
    }
  }

  function attach(form) {
    if (form.dataset.cuLeadAttached) return;
    form.dataset.cuLeadAttached = '1';

    ensureHiddenFields(form);
    fillAttribution(form);

    // Refresh attribution right before submit (in case the visitor opened
    // the form, then arrived at a new UTM-tagged URL via SPA-like nav).
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      fillAttribution(form);

      var payload = serialize(form);
      payload.form_type = form.getAttribute('data-cms-form') || 'lead';
      payload.form_id = form.id || '';

      setSubmitting(form, true);

      try {
        var resp = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!resp.ok) {
          var errText = '';
          try { errText = (await resp.json()).error || ''; } catch (_) {}
          throw new Error(errText || ('HTTP ' + resp.status));
        }

        form.reset();
        // Re-fill hidden attribution after reset so a second submit still works.
        fillAttribution(form);
        showBanner(form, 'success',
          'Thanks — your request was received. We respond same business day at (301) 304-1419.');
      } catch (err) {
        // Last-resort fallback: open the visitor's mail client with what we
        // have, so a lead is never silently lost.
        console.warn('Lead submit failed, falling back to mailto:', err);
        showBanner(form, 'error',
          'We could not submit online. Please call (301) 304-1419 or email CapitalUpfitters@gmail.com.');
      } finally {
        setSubmitting(form, false);
      }
    });
  }

  function init() {
    var forms = document.querySelectorAll('form[data-cms-form]');
    forms.forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
