/* Page-only enrichment. The shared lead bridge owns validation, delivery and attribution. */
(function () {
  'use strict';
  var form = document.getElementById('quote-fleet');
  if (!form || !document.body.classList.contains('vehicle-branding-page')) return;
  var coverage = document.getElementById('vb-coverage');
  document.querySelectorAll('[data-branding-coverage]').forEach(function (link) {
    link.addEventListener('click', function () {
      coverage.value = link.getAttribute('data-branding-coverage');
      // Native anchor navigation remains intact; selecting a card never submits.
    });
  });
  // Enrich the serialized request rather than mutating the visitor's notes.
  // Repeated attempts remain identical and keep the shared idempotency behavior.
  form.addEventListener('formdata', function (event) {
    var data = event.formData;
    var count = Number(data.get('Vehicle Count'));
    if (Number.isInteger(count) && count >= 1 && count <= 10000) {
      data.set('Vehicle Count', String(count));
    }
    var notes = String(data.get('Message') || '').trim();
    var details = [
      'Vehicle branding project',
      'Coverage: ' + String(data.get('Branding Coverage') || 'Not sure yet'),
      'Artwork: ' + String(data.get('Branding Artwork') || 'Not sure yet')
    ];
    if (notes) details.push(notes);
    data.set('Message', details.join('\n'));
    data.delete('Branding Coverage');
    data.delete('Branding Artwork');
  });
  document.addEventListener('cu:lead-success', function (event) {
    var detail = event.detail || {};
    if (detail.formId !== form.id) return;
    var panel = document.getElementById('branding-form-success');
    panel.querySelector('[data-branding-confirmation]').textContent = detail.customerConfirmation
      ? 'Check your email for confirmation. You can reply with your logo or vehicle photos.'
      : 'If you have artwork or photos to share, email CapitalUpfitters@gmail.com and include your reference below.';
    panel.querySelector('[data-branding-reference]').textContent = detail.reference ? 'Reference: ' + detail.reference : '';
    var warning = panel.querySelector('[data-branding-warning]');
    warning.hidden = detail.deliveryMode !== 'persisted_only';
    warning.textContent = detail.deliveryMode === 'persisted_only'
      ? 'Your request was saved, but email delivery could not be confirmed. Please call us if your project is time-sensitive.' : '';
  });
})();
