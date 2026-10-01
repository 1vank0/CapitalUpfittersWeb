/* One Hour Hitch — vehicle-first quote expectation flow. */
(function () {
  'use strict';

  var form = document.getElementById('quote-retail');
  if (!form || !window.CUHitchPricing) return;

  var steps = Array.from(form.querySelectorAll('[data-step]'));
  var progress = Array.from(form.querySelectorAll('.hq-progress li'));
  var back = document.getElementById('h-back');
  var next = document.getElementById('h-next');
  var submit = document.getElementById('h-submit');
  var current = 0;
  var mobileRequested = false;

  function checked(name) {
    return form.querySelector('input[name="' + name + '"]:checked');
  }

  function value(name) {
    var field = form.elements.namedItem(name);
    return field && typeof field.value === 'string' ? field.value : '';
  }

  function money(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0
    }).format(amount);
  }

  function selections() {
    return {
      supply: checked('Parts Supply').value,
      style: value('Hitch Style'),
      use: value('Hitch Use'),
      location: checked('Installation Location').value
    };
  }

  function updateConditionalFields() {
    var tow = value('Hitch Use') === 'tow';
    document.getElementById('tow-details').hidden = !tow;

    var csp = checked('Parts Supply').value === 'csp';
    var cspWrap = document.getElementById('csp-details');
    var cspParts = document.getElementById('h-parts');
    cspWrap.hidden = !csp;
    cspParts.required = csp;
    if (!csp) cspParts.value = '';

    var mobile = checked('Installation Location').value === 'mobile';
    var mobileWrap = document.getElementById('mobile-details');
    mobileWrap.hidden = !mobile;
    ['h-address', 'h-workspace', 'h-prepay'].forEach(function (id) {
      document.getElementById(id).required = mobile;
    });
    if (!mobile) {
      document.getElementById('h-address').value = '';
      document.getElementById('h-workspace').checked = false;
      document.getElementById('h-prepay').checked = false;
    }
    updateEstimate();
  }

  function updateEstimate() {
    var choice = selections();
    var estimate = window.CUHitchPricing.estimate(
      choice.supply, choice.style, choice.use, choice.location
    );
    var price = document.getElementById('h-price');
    var note = document.getElementById('h-estimate-note');
    var rate = document.getElementById('h-rate');
    var parts = document.getElementById('h-parts-summary');
    var mobile = document.getElementById('h-mobile-summary');

    rate.textContent = money(estimate.rate) + '/hour';
    parts.textContent = choice.supply === 'csp'
      ? 'Customer supplied — fitment review required'
      : 'Quoted after fitment review';
    mobile.textContent = choice.location === 'mobile' ? '$150–$200' : 'None — shop';

    if (estimate.laborLow !== null) {
      price.textContent = estimate.laborLow === estimate.laborHigh
        ? money(estimate.laborLow)
        : money(estimate.laborLow) + '–' + money(estimate.laborHigh);
      note.textContent = 'Typical labor expectation for the selected rack/cargo setup. Parts, mobile fee and applicable tax are separate.';
    } else {
      price.textContent = 'From ' + money(estimate.minimum);
      note.textContent = 'A towing or unverified configuration needs fitment and labor review before a useful range can be shown.';
    }
  }

  function validateStep(index) {
    var fields = Array.from(steps[index].querySelectorAll('input, select, textarea'));
    for (var i = 0; i < fields.length; i += 1) {
      if (!fields[i].checkValidity()) {
        fields[i].reportValidity();
        fields[i].focus();
        return false;
      }
    }
    return true;
  }

  function labelFor(name, selectedValue) {
    var input = form.querySelector('input[name="' + name + '"][value="' + selectedValue + '"]');
    if (!input) return selectedValue;
    var strong = input.closest('label').querySelector('strong');
    return strong ? strong.textContent : selectedValue;
  }

  function renderReview() {
    var choice = selections();
    var vehicle = [value('Vehicle Year'), value('Vehicle Make'), value('Vehicle Model'), value('Vehicle Trim')]
      .filter(Boolean).join(' ');
    document.getElementById('h-review').innerHTML =
      '<strong>' + escapeHtml(vehicle) + '</strong><br>' +
      escapeHtml(labelFor('Parts Supply', choice.supply)) + ' · ' +
      escapeHtml(value('Hitch Style')) + ' · ' +
      escapeHtml(labelFor('Installation Location', choice.location)) +
      (choice.location === 'mobile'
        ? '<br><br><strong>Mobile scheduling:</strong> full invoice payment is required before an appointment can be offered.'
        : '');
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function showStep(index) {
    current = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach(function (step, stepIndex) { step.hidden = stepIndex !== current; });
    progress.forEach(function (item, stepIndex) {
      if (stepIndex === current) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    back.hidden = current === 0;
    next.hidden = current === steps.length - 1;
    submit.hidden = current !== steps.length - 1;
    if (current === steps.length - 1) renderReview();
    steps[current].querySelector('h2').focus({ preventScroll: true });
    window.scrollTo({ top: Math.max(0, form.getBoundingClientRect().top + window.scrollY - 24), behavior: 'smooth' });
  }

  form.addEventListener('change', updateConditionalFields);
  next.addEventListener('click', function () {
    if (validateStep(current)) showStep(current + 1);
  });
  back.addEventListener('click', function () { showStep(current - 1); });
  form.addEventListener('submit', function (event) {
    mobileRequested = checked('Installation Location').value === 'mobile';
    if (!validateStep(current)) event.preventDefault();
  });

  document.addEventListener('cu:lead-success', function (event) {
    if (!event.detail || event.detail.formId !== 'quote-retail') return;
    var message = document.getElementById('h-success-message');
    message.textContent = mobileRequested
      ? 'We will verify fitment and send the complete invoice. Your mobile appointment can be scheduled after full payment is confirmed.'
      : 'We will verify fitment and send your written quote with the next available shop appointment.';
    document.getElementById('h-reference').textContent = event.detail.reference
      ? 'Reference: ' + event.detail.reference : '';
    document.getElementById('h-warning').textContent = event.detail.warning || '';
  });

  updateConditionalFields();
  showStep(0);
}());
