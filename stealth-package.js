/* Progressive enhancement only: the GET form and help route work without JS. */
(function () {
  'use strict';
  var form = document.querySelector('.stealth-page .partner-fitment-form');
  if (!form) return;
  var params = new URLSearchParams(window.location.search);
  ['intended_use', 'purchase_status'].forEach(function (name) {
    var value = params.get(name);
    if (!value) return;
    if (name === 'intended_use') {
      form.querySelectorAll('[name="intended_use"]').forEach(function (radio) { radio.checked = radio.value === value; });
    } else {
      var select = form.elements.namedItem(name);
      if (Array.from(select.options).some(function (option) { return option.value === value; })) select.value = value;
    }
  });
  function updateSummary() {
    var selected = form.querySelector('[name="intended_use"]:checked');
    var label = !selected ? 'Choose your setup below.' : selected.value.indexOf('Bike') === 0 ? 'Rack + installation' : selected.value.indexOf('Trailer') === 0 ? 'Towing + installation' : 'Help choosing a setup';
    var vehicle = ['year', 'make', 'model'].map(function (name) { return form.elements.namedItem(name).value.trim(); }).filter(Boolean).join(' ');
    document.getElementById('sp-package-summary').textContent = label;
    document.getElementById('sp-vehicle-summary').textContent = vehicle || 'Add your year, make & model';
    document.getElementById('sp-includes-summary').textContent = form.elements.namedItem('purchase_status').value.indexOf('Already') === 0 ? 'Installation of your supplied kit, subject to review' : 'Parts + installation';
  }
  form.addEventListener('input', updateSummary);
  form.addEventListener('change', updateSummary);
  window.addEventListener('pageshow', updateSummary);
  updateSummary();
})();
