/*!
 * direction-c.js — Capital Upfitters, Direction C (Conversion-First) prototype
 *
 * PROTOTYPE NOTICE: this file is UI-only. It manages audience/service
 * selection state, step progression, and a simulated "success" panel.
 * It never calls fetch() and never POSTs to /api/lead — real submission
 * wiring happens in the implementation phase against the tested
 * api/lead.js contract (see reports/existing-site-audit.md §3, §9).
 * The interaction pattern (audience tabs -> service chips -> single
 * submit) mirrors the real quote-form.js / lead-form.js split so the
 * eventual wire-up is a drop-in, not a rebuild.
 */
(function () {
  'use strict';

  /* ── FAQ accordion ─────────────────────────────────────────────────── */
  document.querySelectorAll('.faq-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      var answer = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', String(!expanded));
      if (answer) answer.classList.toggle('open', !expanded);
    });
  });

  /* ── Reveal-on-scroll (opacity only, respects reduced-motion) ───────── */
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && !prefersReducedMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ── Find My Fit — progressive picker (homepage) ─────────────────────── */
  var picker = document.getElementById('find-my-fit');
  if (picker) {
    var SERVICES = [
      { value: 'bedliner', label: 'Bedliner', audiences: ['personal', 'fleet', 'dealer'], recommended: ['personal', 'fleet'] },
      { value: 'ceramic_coating', label: 'Ceramic Coating', audiences: ['personal', 'dealer'], recommended: ['personal'] },
      { value: 'undercoating', label: 'Undercoating', audiences: ['personal', 'fleet'], recommended: ['fleet'] },
      { value: 'window_tinting', label: 'Window Tinting', audiences: ['personal', 'fleet', 'dealer'] },
      { value: 'tonneau_cover', label: 'Tonneau Cover', audiences: ['personal'], recommended: ['personal'] },
      { value: 'running_boards', label: 'Running Boards', audiences: ['personal'] },
      { value: 'hitches_towing', label: 'Hitches & Towing', audiences: ['personal', 'fleet'] },
      { value: 'led_lighting', label: 'LED Lighting', audiences: ['fleet', 'dealer'], recommended: ['fleet'] },
      { value: 'wraps_branding', label: 'Wraps & Branding', audiences: ['fleet', 'dealer'], recommended: ['fleet'] },
      { value: 'industrial_coatings', label: 'Industrial Coatings', audiences: ['fleet', 'dealer'] },
      { value: 'suspension_lift', label: 'Suspension / Lift', audiences: ['personal'] },
      { value: 'mobile_detailing', label: 'Mobile Detailing', audiences: ['personal', 'dealer'] }
    ];

    var state = { audience: null, services: new Set(), step: 1 };

    var dots = picker.querySelectorAll('.picker-step-dot');
    var panels = {
      1: document.getElementById('picker-step-1'),
      2: document.getElementById('picker-step-2'),
      3: document.getElementById('picker-step-3')
    };
    var successPanel = document.getElementById('picker-success');
    var audienceCards = picker.querySelectorAll('.audience-card');
    var chipGrid = document.getElementById('picker-chip-grid');
    var summaryEl = document.getElementById('picker-selected-summary');
    var errorEl = document.getElementById('picker-error');

    function setStep(n) {
      state.step = n;
      Object.keys(panels).forEach(function (key) {
        panels[key].classList.toggle('active', Number(key) === n);
      });
      dots.forEach(function (dot, i) {
        var stepNum = i + 1;
        dot.classList.toggle('active', stepNum === n);
        dot.classList.toggle('done', stepNum < n);
      });
      var activePanel = panels[n];
      if (activePanel) {
        var heading = activePanel.querySelector('h3');
        if (heading) heading.setAttribute('tabindex', '-1'), heading.focus({ preventScroll: true });
      }
    }

    function renderChips() {
      if (!chipGrid) return;
      var relevant = SERVICES.filter(function (s) {
        return !state.audience || s.audiences.indexOf(state.audience) !== -1;
      });
      chipGrid.innerHTML = relevant.map(function (svc) {
        var isSel = state.services.has(svc.value);
        var isRec = svc.recommended && state.audience && svc.recommended.indexOf(state.audience) !== -1;
        return '<button type="button" class="chip' + (isSel ? ' selected' : '') + (isRec ? ' recommended' : '') +
          '" data-service="' + svc.value + '" aria-pressed="' + isSel + '">' +
          '<span class="chip-check" aria-hidden="true"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg></span>' +
          '<span>' + svc.label + '</span></button>';
      }).join('');
    }

    function updateSummary() {
      if (!summaryEl) return;
      var count = state.services.size;
      if (count === 0) {
        summaryEl.innerHTML = 'Pick at least one service to continue &mdash; you can add more later.';
        return;
      }
      var labels = SERVICES.filter(function (s) { return state.services.has(s.value); }).map(function (s) { return s.label; });
      summaryEl.innerHTML = '<strong>' + count + ' selected:</strong> ' + labels.join(', ');
    }

    audienceCards.forEach(function (card) {
      card.addEventListener('click', function () {
        audienceCards.forEach(function (c) { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
        state.audience = card.dataset.audience;
        var label = document.getElementById('picker-audience-label');
        if (label) label.textContent = card.querySelector('.audience-card-title').textContent;
        renderChips();
        updateSummary();
        window.setTimeout(function () { setStep(2); }, 180);
      });
    });

    if (chipGrid) {
      chipGrid.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip) return;
        var val = chip.dataset.service;
        if (state.services.has(val)) {
          state.services.delete(val);
          chip.classList.remove('selected');
          chip.setAttribute('aria-pressed', 'false');
        } else {
          state.services.add(val);
          chip.classList.add('selected');
          chip.setAttribute('aria-pressed', 'true');
        }
        updateSummary();
      });
    }

    var toStep3Btn = document.getElementById('picker-to-step-3');
    if (toStep3Btn) {
      toStep3Btn.addEventListener('click', function () {
        if (state.services.size === 0) {
          if (errorEl) { errorEl.textContent = 'Select at least one service before continuing.'; errorEl.classList.add('active'); }
          return;
        }
        if (errorEl) errorEl.classList.remove('active');
        setStep(3);
      });
    }

    var backTo1 = document.getElementById('picker-back-1');
    if (backTo1) backTo1.addEventListener('click', function () { setStep(1); });
    var backTo2 = document.getElementById('picker-back-2');
    if (backTo2) backTo2.addEventListener('click', function () { setStep(2); });

    var quickForm = document.getElementById('picker-quick-form');
    if (quickForm) {
      quickForm.addEventListener('submit', function (e) {
        // PROTOTYPE: always prevented. No network call is made — see file
        // header. Real implementation swaps this handler for lead-form.js's
        // shared submit controller against the existing /api/lead contract.
        e.preventDefault();

        // Honeypot check purely for UX parity demonstration (mirrors the
        // real site's spam-trap field name) — not a security control here.
        var honeypot = quickForm.querySelector('input[name="website"]');
        if (honeypot && honeypot.value) return;

        if (!quickForm.checkValidity()) {
          quickForm.reportValidity();
          return;
        }

        Object.keys(panels).forEach(function (key) { panels[key].classList.remove('active'); });
        if (successPanel) {
          successPanel.classList.add('active');
          successPanel.setAttribute('tabindex', '-1');
          successPanel.focus({ preventScroll: true });
          successPanel.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
        }
      });
    }

    // Public helper so category / gallery cards elsewhere on the page can
    // preselect an audience + service and jump straight to the picker.
    window.CUFindMyFit = {
      preselect: function (audience, serviceValue) {
        picker.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        if (audience) {
          var card = picker.querySelector('.audience-card[data-audience="' + audience + '"]');
          if (card) card.click();
        }
        if (serviceValue) {
          window.setTimeout(function () {
            var chip = chipGrid && chipGrid.querySelector('.chip[data-service="' + serviceValue + '"]');
            if (chip && !chip.classList.contains('selected')) chip.click();
          }, 220);
        }
      }
    };

    document.querySelectorAll('[data-preselect-audience], [data-preselect-service]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        var audience = el.dataset.preselectAudience || null;
        var service = el.dataset.preselectService || null;
        if (audience || service) {
          e.preventDefault();
          window.CUFindMyFit.preselect(audience, service);
        }
      });
    });

    renderChips();
    updateSummary();

    // Cross-page deep link: a service page's "Add to Quote" button links
    // here as index.html?audience=X&service=Y#find-my-fit. Mirrors the real
    // quote-form.js's ?audience=/?service= URL param pattern.
    var urlParams = new URLSearchParams(window.location.search);
    var linkedAudience = urlParams.get('audience');
    var linkedService = urlParams.get('service');
    if (linkedAudience || linkedService) {
      window.setTimeout(function () {
        window.CUFindMyFit.preselect(linkedAudience, linkedService);
      }, 250);
    }
  }

  /* ── Service page: in-context Add to Quote micro-interaction ────────── */
  var addBtn = document.getElementById('add-to-quote-btn');
  if (addBtn) {
    var badge = document.getElementById('add-to-quote-badge');
    var stickyBar = document.getElementById('sticky-add-bar');
    var heroCard = document.getElementById('add-to-quote-card');

    addBtn.addEventListener('click', function () {
      addBtn.textContent = 'Added ✓';
      addBtn.disabled = true;
      if (badge) badge.classList.add('active');
      var stickyBtn = document.getElementById('sticky-add-btn');
      if (stickyBtn) { stickyBtn.textContent = 'Added ✓'; stickyBtn.disabled = true; }
    });

    if (stickyBar && heroCard && 'IntersectionObserver' in window) {
      var barIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          stickyBar.classList.toggle('visible', !entry.isIntersecting);
        });
      }, { threshold: 0 });
      barIO.observe(heroCard);
    }

    var stickyBtn2 = document.getElementById('sticky-add-btn');
    if (stickyBtn2) {
      stickyBtn2.addEventListener('click', function () {
        addBtn.click();
        heroCard.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      });
    }
  }
})();
