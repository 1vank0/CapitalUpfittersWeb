/* Capital Upfitters — lead form bridge
 *
 * For every form with [data-cms-form]:
 *   1. Inject the 19 hidden attribution fields (populated from CUAttribution).
 *   2. Intercept submit, serialize to JSON, POST to /api/lead.
 *   3. Show inline success/error UI without leaving the page.
 *
 * Keeps the form populated and shows direct call/email recovery instructions
 * if /api/lead cannot confirm internal delivery.
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

  function ensureHoneypot(form) {
    if (form.querySelector('input[name="website"]')) return;

    var wrapper = document.createElement('div');
    var input = document.createElement('input');
    var label = document.createElement('label');
    var inputId = (form.id || 'lead') + '-website';

    wrapper.setAttribute('data-cu-honeypot', '1');
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.style.cssText =
      'position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;';

    label.setAttribute('for', inputId);
    label.textContent = 'Website';
    input.type = 'text';
    input.id = inputId;
    input.name = 'website';
    input.tabIndex = -1;
    input.autocomplete = 'off';

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    form.appendChild(wrapper);
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

  function createBanner(form, kind) {
    var existing = form.querySelector('.cu-lead-banner');
    if (existing) existing.remove();
    var div = document.createElement('div');
    div.className = 'cu-lead-banner cu-lead-banner--' + kind;
    div.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    div.style.cssText =
      'margin-top:1rem;padding:.75rem 1rem;border-radius:.5rem;font-weight:600;' +
      (kind === 'success'
        ? 'background:#10381f;color:#a7f3d0;border:1px solid #34d399;'
        : 'background:#3a1313;color:#fecaca;border:1px solid #f87171;');
    return div;
  }

  function showBanner(form, kind, message) {
    var div = createBanner(form, kind);
    div.textContent = message;
    form.appendChild(div);
  }

  function showRecoveryBanner(form, message) {
    var div = createBanner(form, 'error');
    var messageNode = document.createElement('span');
    var callLink = document.createElement('a');
    var emailLink = document.createElement('a');
    var linkStyle = 'color:inherit;text-decoration:underline;text-underline-offset:2px;';

    messageNode.textContent = message + ' ';
    callLink.href = 'tel:3013041419';
    callLink.textContent = 'Call (301) 304-1419';
    callLink.style.cssText = linkStyle;
    emailLink.href = 'mailto:CapitalUpfitters@gmail.com';
    emailLink.textContent = 'email CapitalUpfitters@gmail.com';
    emailLink.style.cssText = linkStyle;

    div.appendChild(messageNode);
    div.appendChild(callLink);
    div.appendChild(document.createTextNode(' or '));
    div.appendChild(emailLink);
    div.appendChild(document.createTextNode('.'));
    form.appendChild(div);
  }

  function showSuccess(form) {
    var bodyId = form.getAttribute('data-success-body');
    var panelId = form.getAttribute('data-success-panel');
    var body = bodyId ? document.getElementById(bodyId) : null;
    var panel = panelId ? document.getElementById(panelId) : null;

    if (body && panel) {
      body.style.display = 'none';
      panel.style.display = 'block';
      panel.setAttribute('tabindex', '-1');
      panel.focus({ preventScroll: true });
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    showBanner(form, 'success',
      'Thanks — your request was received. We respond same business day at (301) 304-1419.');
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

  function newIdempotencyKey() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (char) {
      var random = Math.floor(Math.random() * 16);
      var value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function fingerprintPayload(payload) {
    // Fingerprint the full pre-idempotency payload, including attribution and
    // honeypot state. Only the generated retry identity fields are excluded.
    var canonical = Object.keys(payload)
      .filter(function (key) {
        return key !== 'idempotency_key' && key !== 'submission_started_at';
      })
      .sort()
      .map(function (key) {
        var value = payload[key];
        if (Array.isArray(value)) {
          value = value.map(String);
        } else {
          value = String(value == null ? '' : value);
        }
        return [key, value];
      });
    var serialized = JSON.stringify(canonical);
    var hash = 2166136261;
    for (var index = 0; index < serialized.length; index += 1) {
      hash ^= serialized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16) + '-' + serialized.length;
  }

  function rotateSubmissionIdentity(form, fingerprint) {
    var nextStartedAt = new Date().toISOString();
    if (nextStartedAt === form.dataset.cuSubmissionStartedAt) {
      nextStartedAt = new Date(Date.parse(nextStartedAt) + 1).toISOString();
    }
    form.dataset.cuPayloadFingerprint = fingerprint;
    form.dataset.cuIdempotencyKey = newIdempotencyKey();
    form.dataset.cuSubmissionStartedAt = nextStartedAt;
  }

  function clearSubmissionIdentity(form) {
    delete form.dataset.cuPayloadFingerprint;
    delete form.dataset.cuIdempotencyKey;
    delete form.dataset.cuSubmissionStartedAt;
  }

  function safeApiErrorMessage(result, status) {
    if (status === 409) {
      return 'Your request needs a fresh submission. Please review it and try again.';
    }

    var candidate = '';
    if (result && typeof result.error === 'string') {
      candidate = result.error;
    } else if (result && result.error && typeof result.error.message === 'string') {
      candidate = result.error.message;
    }
    candidate = candidate.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();

    if (candidate && status >= 400 && status < 600) {
      return candidate.length > 240 ? candidate.slice(0, 237) + '...' : candidate;
    }
    return 'We could not submit online right now.';
  }

  function validate(form) {
    var existing = form.querySelector('.cu-lead-banner');
    if (existing) existing.remove();

    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }

    if (/^quote-(retail|fleet|dealer)$/.test(form.id || '')) {
      var serviceCount = form.querySelectorAll('input[name="services"]:checked').length;
      if (serviceCount === 0) {
        showBanner(form, 'error', 'Please select at least one service before submitting.');
        return false;
      }
      if (serviceCount > 12) {
        showBanner(form, 'error', 'Please select no more than 12 services per request.');
        return false;
      }
    }

    return true;
  }

  function attach(form) {
    if (form.dataset.cuLeadAttached) return;
    form.dataset.cuLeadAttached = '1';

    ensureHiddenFields(form);
    ensureHoneypot(form);
    fillAttribution(form);

    // Refresh attribution right before submit (in case the visitor opened
    // the form, then arrived at a new UTM-tagged URL via SPA-like nav).
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!validate(form)) return;
      if (form.dataset.cuSubmitting === '1') return;
      form.dataset.cuSubmitting = '1';
      fillAttribution(form);

      var payload = serialize(form);
      payload.form_type = form.getAttribute('data-cms-form') || 'lead';
      payload.form_id = form.id || '';
      var fingerprint = fingerprintPayload(payload);
      if (form.dataset.cuPayloadFingerprint !== fingerprint ||
          !form.dataset.cuIdempotencyKey || !form.dataset.cuSubmissionStartedAt) {
        rotateSubmissionIdentity(form, fingerprint);
      }
      payload.idempotency_key = form.dataset.cuIdempotencyKey;
      payload.submission_started_at = form.dataset.cuSubmissionStartedAt;

      setSubmitting(form, true);

      try {
        var resp = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        var result = null;
        try { result = await resp.json(); } catch (_) {}
        // Treat ok:true as success even when delivered:false — the API now
        // returns 200 + delivery_mode:'persisted_only' when Resend fails but
        // the lead was durably stored. UI will show a soft warning instead of
        // a hard error, so the customer isn't turned away.
        if (!resp.ok || !result || result.ok !== true) {
          if (resp.status === 409) rotateSubmissionIdentity(form, fingerprint);
          var submissionError = new Error(safeApiErrorMessage(result, resp.status));
          submissionError.cuSafeForCustomer = true;
          submissionError.status = resp.status;
          throw submissionError;
        }

        form.reset();
        // Re-fill hidden attribution after reset so a second submit still works.
        fillAttribution(form);
        showSuccess(form);
        document.dispatchEvent(new CustomEvent('cu:lead-success', {
          detail: {
            formId: form.id || '',
            reference: result.reference || '',
            customerConfirmation: result.customer_confirmation === true,
            deliveryMode: result.delivery_mode || '',
            warning: result.warning || '',
            diagnostic: result.delivery_diagnostic || null
          }
        }));
        clearSubmissionIdentity(form);
      } catch (err) {
        console.warn('Lead submit failed:', err);
        showRecoveryBanner(form,
          err && err.cuSafeForCustomer === true
            ? err.message
            : 'We could not submit online right now.');
      } finally {
        delete form.dataset.cuSubmitting;
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
