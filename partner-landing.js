/* Keep real incoming campaign/vehicle context through the same-site quote handoff.
 * A product page is not proof of a manufacturer referral: never invent utm_source. */
(function () {
  'use strict';
  var params = new URLSearchParams(window.location.search);
  var keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','msclkid'];
  document.querySelectorAll('.partner-fitment-form').forEach(function (form) {
    ['year','make','model'].forEach(function (key) {
      var field = form.elements.namedItem(key), value = params.get(key);
      if (field && value) field.value = value.slice(0, field.maxLength > 0 ? field.maxLength : 100);
    });
    keys.forEach(function (key) {
      var value = params.get(key);
      if (!value) return;
      var input = document.createElement('input');
      input.type = 'hidden'; input.name = key; input.value = value.slice(0, 300); form.appendChild(input);
    });
  });
})();
