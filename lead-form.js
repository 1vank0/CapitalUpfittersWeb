/* Capital Upfitters — unified lead form bridge
 *
 * Every form with [data-cms-form] is validated, attributed, and submitted to
 * one API. Success is shown only after the API confirms internal delivery.
 */
(function () {
  'use strict';

  var HIDDEN_FIELDS = [
    'ip_address', 'geo_city', 'geo_region', 'geo_country', 'isp',
    'landing_page', 'form_page', 'referrer', 'referrer_domain',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'fbclid', 'msclkid', 'lead_source', 'user_agent'
  ];

  function attrContext() {
    if (window.CUAttribution && typeof window.CUAttribution.get === 'function') {
      return window.CUAttribution.get();
    }
    return {
      landing_page: window.location.href,
      form_page: window.location.href,
      user_agent: navigator.userAgent || '',
      lead_source: 'Direct'
    };
  }

  function ensureHiddenFields(form) {
    HIDDEN_FIELDS.forEach(function (name) {
      if (form.querySelector('input[name="' + name + '"]')) return;
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.setAttribute('data-cu-attr', '1');
      form.appendChild(input);
    });
  }

  function fillAttribution(form) {
    var context = attrContext();
    HIDDEN_FIELDS.forEach(function (name) {
      var input = form.querySelector('input[name="' + name + '"]');
      if (input) input.value = context[name] || '';
    });
  }

  function serialize(form) {
    var data = {};
    var files = [];
    var formData = new FormData(form);

    formData.forEach(function (value, key) {
      if (value instanceof File) {
        if (value.size > 0) files.push({ key: key, file: value });
        return;
      }
      if (data[key] === undefined) data[key] = value;
      else if (Array.isArray(data[key])) data[key].push(value);
      else data[key] = [data[key], value];
    });

    return { data: data, files: files };
  }

  function removeBanner(form) {
    var existing = form.querySelector('.cu-lead-banner');
    if (existing) existing.remove();
  }

  function showBanner(form, kind, message) {
    removeBanner(form);
    var banner = document.createElement('div');
    banner.className = 'cu-lead-banner cu-lead-banner--' + kind;
    banner.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    banner.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
    banner.setAttribute('tabindex', '-1');
    banner.textContent = message;
    banner.style.cssText =
      'margin-top:1rem;padding:.75rem 1rem;border-radius:.5rem;font-weight:600;' +
      (kind === 'success'
        ? 'background:#10381f;color:#a7f3d0;border:1px solid #34d399;'
        : 'background:#3a1313;color:#fecaca;border:1px solid #f87171;');
    form.appendChild(banner);
    if (kind === 'error') banner.focus({ preventScroll: true });
  }

  function setSubmitting(form, isSubmitting) {
    form.setAttribute('aria-busy', isSubmitting ? 'true' : 'false');
    var button = form.querySelector('button[type="submit"], input[type="submit"]');
    if (!button) return;

    if (isSubmitting) {
      button.dataset.cuOriginalText = button.dataset.cuOriginalText || button.textContent;
      button.disabled = true;
      button.textContent = 'Sending…';
    } else {
      button.disabled = false;
      if (button.dataset.cuOriginalText) button.textContent = button.dataset.cuOriginalText;
    }
  }

  function showSuccess(form, responseBody) {
    var bodyTarget = form.getAttribute('data-body-target');
    var successTarget = form.getAttribute('data-success-target');
    var bodyPanel = bodyTarget ? document.getElementById(bodyTarget) : null;
    var successPanel = successTarget ? document.getElementById(successTarget) : null;

    if (bodyPanel) bodyPanel.style.display = 'none';
    else if (successPanel) form.style.display = 'none';

    if (successPanel) {
      successPanel.style.display = 'block';
      successPanel.removeAttribute('hidden');
      successPanel.setAttribute('role', 'status');
      successPanel.setAttribute('aria-live', 'polite');
      successPanel.setAttribute('tabindex', '-1');
      successPanel.focus({ preventScroll: true });
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      showBanner(form, 'success',
        'Thanks — your request was received. We respond the same business day at (301) 304-1419.');
    }

    form.dispatchEvent(new CustomEvent('cu:lead-success', {
      bubbles: true,
      detail: responseBody || {}
    }));
  }

  function submissionId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'web-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function attach(form) {
    if (form.dataset.cuLeadAttached) return;
    form.dataset.cuLeadAttached = '1';

    ensureHiddenFields(form);
    fillAttribution(form);

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      removeBanner(form);

      if (!form.checkValidity()) {
        form.reportValidity();
        showBanner(form, 'error', 'Please complete the highlighted required fields.');
        return;
      }

      fillAttribution(form);
      var serialized = serialize(form);

      // Direct private uploads are implemented in the next backend tranche.
      // Never silently discard a selected file in the interim.
      if (serialized.files.length) {
        showBanner(form, 'error',
          'Photos are not attached yet. Remove the selected files and submit, then reply to the confirmation email with your photos.');
        var fileInput = form.querySelector('input[type="file"]');
        if (fileInput) fileInput.focus();
        return;
      }

      var payload = serialized.data;
      payload.form_type = form.getAttribute('data-cms-form') || 'lead';
      payload.form_id = form.id || '';
      payload.submission_id = submissionId();

      setSubmitting(form, true);
      var controller = new AbortController();
      var timeout = window.setTimeout(function () { controller.abort(); }, 15000);

      try {
        var response = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        var responseBody = {};
        try { responseBody = await response.json(); } catch (_) {}

        if (!response.ok || !responseBody.ok || responseBody.delivered !== true) {
          throw new Error(responseBody.error || ('HTTP ' + response.status));
        }

        form.reset();
        fillAttribution(form);
        showSuccess(form, responseBody);
      } catch (error) {
        console.warn('Lead submission failed:', error);
        showBanner(form, 'error',
          'We could not confirm your online request. Please call (301) 304-1419 or email CapitalUpfitters@gmail.com.');
      } finally {
        window.clearTimeout(timeout);
        setSubmitting(form, false);
      }
    });
  }

  function init() {
    document.querySelectorAll('form[data-cms-form]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
