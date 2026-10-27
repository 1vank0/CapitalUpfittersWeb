/**
 * Cinematic chrome: frosted nav after scroll, homepage nav parked
 * over the hero. Respects prefers-reduced-motion (no motion of its own).
 */
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  var bar = document.getElementById('announce-bar');
  var cine = document.body && document.body.classList.contains('cine');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) document.documentElement.classList.add('reduce-motion');
  if (!nav) return;

  function place() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    nav.classList.toggle('is-scrolled', y > 8);
    if (!cine) return;
    var barH = 0;
    if (bar && bar.isConnected && y <= 8) barH = bar.offsetHeight || 0;
    nav.style.top = (y > 8 ? 0 : barH) + 'px';
  }

  place();
  window.addEventListener('scroll', place, { passive: true });
  window.addEventListener('resize', place);

  var closeBtn = document.querySelector('.announce-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      requestAnimationFrame(place);
    });
  }
})();
