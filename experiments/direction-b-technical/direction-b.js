/* ============================================================
   DIRECTION B — TECHNICAL AUTHORITY
   Minimal vanilla JS. No framework, no build step, no network calls.
   Scope: mobile nav toggle, FAQ accordion, and a lightweight
   "does this fit my vehicle" note widget (per best-principles.md §12 —
   deliberately NOT a full configurator, just a fitment-confirmation
   prompt that always resolves to "call/quote to confirm").
   ============================================================ */
(function () {
  'use strict';

  // ── Mobile nav toggle ─────────────────────────────────────
  var hamburger = document.getElementById('hamburger');
  var mobilePanel = document.getElementById('nav-mobile');
  var mobileClose = document.getElementById('nav-mobile-close');

  function openMobileNav() {
    if (!mobilePanel) return;
    mobilePanel.classList.add('is-open');
    mobilePanel.style.display = 'flex';
    hamburger && hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileNav() {
    if (!mobilePanel) return;
    mobilePanel.classList.remove('is-open');
    mobilePanel.style.display = 'none';
    hamburger && hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  if (hamburger) hamburger.addEventListener('click', openMobileNav);
  if (mobileClose) mobileClose.addEventListener('click', closeMobileNav);
  if (mobilePanel) {
    mobilePanel.addEventListener('click', function (e) {
      if (e.target === mobilePanel) closeMobileNav();
      if (e.target.tagName === 'A') closeMobileNav();
    });
  }

  // ── FAQ accordion ──────────────────────────────────────────
  var faqButtons = document.querySelectorAll('.faq-q');
  faqButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', String(!expanded));
      if (panel) {
        panel.style.maxHeight = expanded ? null : panel.scrollHeight + 'px';
      }
    });
  });

  // ── Fitment note widget ────────────────────────────────────
  // Deliberately not a real lookup — no vehicle database is wired up in
  // this static prototype. Selecting values just demonstrates the pattern
  // and always routes the visitor to a human confirmation (call/quote),
  // consistent with "lightweight fitment note, not a configurator."
  var fitmentForm = document.getElementById('fitment-check');
  if (fitmentForm) {
    fitmentForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var result = document.getElementById('fitment-result');
      var make = fitmentForm.querySelector('[name="fit-make"]');
      var model = fitmentForm.querySelector('[name="fit-model"]');
      var makeVal = make && make.value ? make.value : 'your vehicle';
      var modelVal = model && model.value ? model.value.trim() : '';
      if (result) {
        result.textContent = 'Got it — ' + makeVal + (modelVal ? ' ' + modelVal : '') +
          '. We confirm exact hitch class and part fitment by VIN or year/make/model before ordering anything. Call (301) 304-1419 or continue to a quote and we\'ll verify fitment before your appointment.';
        result.classList.add('is-visible');
      }
    });
  }

  // ── Reveal-on-scroll (progressive enhancement only) ────────
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }
})();
