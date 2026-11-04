/* Progressive enhancement only: native radio + GET handoff works without JS. */
(function () {
  'use strict';
  var form = document.querySelector('.bed-cover-page .partner-fitment-form');
  if (!form) return;
  var params = new URLSearchParams(window.location.search);
  var summary = document.getElementById('bc-selection');
  var choices = Array.from(form.querySelectorAll('input[name="product"]'));
  var requested = params.get('product');
  choices.forEach(function (choice) { if (choice.value === requested) choice.checked = true; });
  // Carry known vehicle/campaign context without asking the same questions here.
  ['year','make','model','utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','msclkid'].forEach(function (key) {
    var value = params.get(key);
    if (!value) return;
    var input = document.createElement('input');
    input.type = 'hidden'; input.name = key; input.value = value.slice(0, 300); form.appendChild(input);
  });
  function update() {
    var selected = choices.find(function (choice) { return choice.checked; });
    if (summary) summary.textContent = selected ? selected.value : 'Choose a cover above, or ask us to help.';
  }
  form.addEventListener('change', update);
  window.addEventListener('pageshow', update);
  update();
})();
