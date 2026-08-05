/* Capital Upfitters homepage conversion routing and analytics scaffolding. */
(function () {
  'use strict';

  function emit(eventName, detail) {
    var payload = Object.assign({ event: eventName, page: 'home' }, detail || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    document.dispatchEvent(new CustomEvent('cu:conversion', { detail: payload }));
  }

  var tabs = Array.from(document.querySelectorAll('[data-intake-tab]'));
  var panes = {
    retail: document.getElementById('home-intake-retail'),
    fleet: document.getElementById('home-intake-fleet')
  };

  function activateIntake(path, moveFocus) {
    if (!panes[path]) return;
    tabs.forEach(function (tab) {
      var active = tab.dataset.intakeTab === path;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });
    Object.keys(panes).forEach(function (key) {
      panes[key].hidden = key !== path;
    });
    if (moveFocus) {
      var firstField = panes[path].querySelector('input, select, textarea');
      window.setTimeout(function () {
        if (firstField) firstField.focus({ preventScroll: true });
      }, 450);
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activateIntake(tab.dataset.intakeTab, false);
      emit('intake_path_selected', { path: tab.dataset.intakeTab, source: 'intake_tabs' });
    });
    tab.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      var next = tab.dataset.intakeTab === 'retail' ? 'fleet' : 'retail';
      activateIntake(next, false);
      var nextTab = tabs.find(function (item) { return item.dataset.intakeTab === next; });
      if (nextTab) nextTab.focus();
    });
  });

  document.querySelectorAll('[data-intake-target]').forEach(function (link) {
    link.addEventListener('click', function () {
      var path = link.dataset.intakeTarget;
      activateIntake(path, true);
      var mobileNav = document.getElementById('nav-mobile');
      var hamburger = document.getElementById('hamburger');
      if (mobileNav) mobileNav.classList.remove('open');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  document.querySelectorAll('[data-conversion]').forEach(function (element) {
    element.addEventListener('click', function () {
      emit('conversion_click', {
        action: element.dataset.conversion,
        href: element.getAttribute('href') || ''
      });
    });
  });

  document.querySelectorAll('form[data-lead-path]').forEach(function (form) {
    var started = false;
    form.addEventListener('input', function () {
      if (started) return;
      started = true;
      emit('lead_form_start', { path: form.dataset.leadPath, form_id: form.id });
    });
    form.querySelectorAll('input[name="services"]').forEach(function (input) {
      input.addEventListener('change', function () {
        emit('service_interest_selected', {
          path: form.dataset.leadPath,
          service: input.value,
          selected: input.checked
        });
      });
    });
  });

  document.addEventListener('cu:lead-success', function (event) {
    emit('lead_form_success', {
      form_id: event.detail && event.detail.formId || '',
      reference: event.detail && event.detail.reference || ''
    });
  });

  var params = new URLSearchParams(window.location.search);
  var requestedPath = params.get('audience') || params.get('intent');
  if (requestedPath === 'fleet') activateIntake('fleet', false);
})();
