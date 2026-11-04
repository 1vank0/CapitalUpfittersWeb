/* Progressive enhancement only: the GET form and help route work without JS. */
(function () {
  'use strict';
  var form = document.querySelector('.ecohitch-page .partner-fitment-form');
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
    var labels = {
      'Rear hitch for bike rack or cargo carrier': 'Rear rack + installation',
      'Rear hitch for trailer towing: check rating and wiring': 'Rear towing + installation',
      'Front receiver: confirm vehicle fitment and intended use': 'Front receiver + installation',
      'Help me compare EcoHitch styles and choose a setup': 'Help choosing an EcoHitch setup'
    };
    var label = selected ? labels[selected.value] || 'Help choosing an EcoHitch setup' : 'Choose your setup below.';
    var vehicle = ['year', 'make', 'model'].map(function (name) { return form.elements.namedItem(name).value.trim(); }).filter(Boolean).join(' ');
    document.getElementById('sp-package-summary').textContent = label;
    document.getElementById('sp-vehicle-summary').textContent = vehicle || 'Add your year, make & model';
    document.getElementById('sp-includes-summary').textContent = form.elements.namedItem('purchase_status').value.indexOf('Already') === 0 ? 'Installation of your supplied kit, subject to review' : form.elements.namedItem('purchase_status').value === 'Comparing options before purchase' ? 'Options to be confirmed' : 'Parts + installation';
  }
  form.addEventListener('input', updateSummary);
  form.addEventListener('change', updateSummary);
  window.addEventListener('pageshow', updateSummary);
  updateSummary();
})();
