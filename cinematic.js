/**
 * Cinematic chrome for the homepage and Patriot Liner template.
 * Nav state and tagline words use IntersectionObserver. Class changes
 * are deferred to the next frame so an observer callback cannot loop.
 * CSS owns nav position. No inline top, no scroll listener.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  if (!body) return;

  var nav = document.getElementById('nav');
  var cine = body.classList.contains('cine');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) root.classList.add('reduce-motion');

  var announceClose = document.querySelector('.announce-close');
  if (announceClose) {
    announceClose.addEventListener('click', function () {
      body.classList.add('announce-dismissed');
    });
  }

  if (nav && cine && 'IntersectionObserver' in window) {
    var sentinel = document.createElement('div');
    sentinel.className = 'cine-nav-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    body.prepend(sentinel);
    var scrolled = false;
    var pending = false;
    var navObserver = new IntersectionObserver(function (entries) {
      var next = !entries[0].isIntersecting;
      if (next === scrolled || pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        if (next === scrolled) return;
        scrolled = next;
        nav.classList.toggle('is-scrolled', scrolled);
      });
    }, { threshold: 0 });
    navObserver.observe(sentinel);
  }

  var burger = document.getElementById('hamburger');
  var menu = document.getElementById('nav-mobile');
  var menuClose = document.getElementById('nav-close');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      burger.classList.add('is-open');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (menu.classList.contains('open')) menu.classList.add('is-shown');
        });
      });
    });
    if (menuClose) {
      menuClose.addEventListener('click', function () {
        burger.classList.remove('is-open');
        menu.classList.remove('is-shown');
      });
    }
  }

  if (cine && 'IntersectionObserver' in window) {
    var taglines = document.querySelectorAll('.cine-tagline');
    taglines.forEach(function (tagline) {
      tagline.querySelectorAll('.cine-word').forEach(function (word, index) {
        word.style.transitionDelay = Math.min(index * 70, 360) + 'ms';
      });
    });
    if (taglines.length) {
      var wordObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          wordObserver.unobserve(entry.target);
          entry.target.querySelectorAll('.cine-word').forEach(function (word) {
            word.classList.add('is-on');
          });
        });
      }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
      taglines.forEach(function (node) { wordObserver.observe(node); });
    }
  }
})();
