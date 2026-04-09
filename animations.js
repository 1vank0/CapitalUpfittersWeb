/**
 * Capital Upfitters — Premium Animation Layer
 * CSS-native scroll animations + JS-powered counters + micro-interactions
 * Respects prefers-reduced-motion throughout
 */

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── 1. CSS SCROLL-DRIVEN ANIMATION INJECTION ─────────────────────────────
     Injects a <style> block that uses @supports(animation-timeline: scroll())
     for modern browsers with CSS-native scroll reveals.
     Falls back to IntersectionObserver for older browsers.
  ──────────────────────────────────────────────────────────────────────────── */
  if (!reduced) {
    const css = `
/* ── Scroll-driven fade reveals (no CLS — opacity only) ── */
@supports (animation-timeline: scroll()) {

  .reveal, .hero h1, .hero-sub, .hero-ctas,
  .section-label, .svc-section-label,
  h2, h3 {
    opacity: 0;
    animation: cu-fade-in linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 60%;
  }

  /* Stagger children of grid containers */
  .funnel-grid > *,
  .benefits-grid > *,
  .vehicle-types-grid > *,
  .related-grid > *,
  .services-hub-grid > *,
  .why-compact-grid > *,
  .grid-3 > *,
  .grid-4 > * {
    opacity: 0;
    animation: cu-fade-in linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 70%;
  }

  /* Stagger delays via nth-child */
  .funnel-grid > *:nth-child(2),
  .benefits-grid > *:nth-child(2),
  .services-hub-grid > *:nth-child(2),
  .why-compact-grid > *:nth-child(2),
  .grid-3 > *:nth-child(2),
  .grid-4 > *:nth-child(2) { animation-delay: 60ms; }

  .funnel-grid > *:nth-child(3),
  .benefits-grid > *:nth-child(3),
  .services-hub-grid > *:nth-child(3),
  .why-compact-grid > *:nth-child(3),
  .grid-3 > *:nth-child(3),
  .grid-4 > *:nth-child(3) { animation-delay: 120ms; }

  .funnel-grid > *:nth-child(4),
  .benefits-grid > *:nth-child(4),
  .services-hub-grid > *:nth-child(4),
  .grid-4 > *:nth-child(4) { animation-delay: 180ms; }

  .services-hub-grid > *:nth-child(5) { animation-delay: 240ms; }
  .services-hub-grid > *:nth-child(6) { animation-delay: 300ms; }
  .services-hub-grid > *:nth-child(7) { animation-delay: 360ms; }

  /* Service cards — clip-path wipe from bottom (no layout shift) */
  .service-card,
  .wrap-type-card,
  .portal-feature-card,
  .tier-card,
  .related-card {
    clip-path: inset(8% 0 0 0 round 12px);
    opacity: 0;
    animation: cu-card-reveal linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 65%;
  }

  @keyframes cu-fade-in {
    to { opacity: 1; }
  }

  @keyframes cu-card-reveal {
    to {
      opacity: 1;
      clip-path: inset(0% 0 0 0 round 12px);
    }
  }
}

/* ── Fallback: class-based reveal for browsers without scroll timeline ── */
.reveal-io {
  opacity: 0;
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal-io.visible { opacity: 1; }

/* ── Parallax hero bg ── */
.hero-bg-parallax {
  will-change: transform;
  transition: transform 0s linear;
}

/* ── Premium button micro-interactions ── */
.btn {
  transition:
    background 180ms cubic-bezier(0.16, 1, 0.3, 1),
    color 180ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 180ms cubic-bezier(0.16, 1, 0.3, 1) !important;
}
.btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18) !important;
}
.btn:active {
  transform: translateY(0px) !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
  transition-duration: 80ms !important;
}

/* Nav link hover: animated underline */
.nav-links a {
  transition: color 180ms cubic-bezier(0.16, 1, 0.3, 1) !important;
}

/* Service card hover: image scale + lift */
.service-card {
  transition:
    transform 280ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1) !important;
}
.service-card:hover {
  transform: translateY(-6px) !important;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2) !important;
}

/* Announce bar link pulse */
.announce-bar a {
  position: relative;
}
.announce-bar a::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 0;
  height: 1px;
  background: currentColor;
  transition: width 280ms cubic-bezier(0.16, 1, 0.3, 1);
}
.announce-bar a:hover::after { width: 100%; }

/* Stat numbers — animated fill color on scroll */
.stat-number, .kpi-number,
.hero-stat-value {
  transition: color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Gallery item hover overlay */
.gallery-item {
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1) !important;
}
.gallery-item:hover {
  transform: scale(1.02) !important;
  z-index: 2;
}
`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ─── 2. PARALLAX HERO BACKGROUNDS ─────────────────────────────────────────
     Moves .hero-bg and .page-hero-bg at 0.4x scroll speed for depth effect.
     Uses requestAnimationFrame for 60fps performance.
  ──────────────────────────────────────────────────────────────────────────── */
  if (!reduced) {
    const parallaxEls = document.querySelectorAll('.hero-bg, .page-hero-bg, .hero-bg-gradient');

    if (parallaxEls.length) {
      let ticking = false;

      function updateParallax() {
        const scrollY = window.scrollY;
        parallaxEls.forEach(el => {
          const parent = el.closest('.hero, .page-hero, .dealer-hero');
          if (!parent) return;
          const rect = parent.getBoundingClientRect();
          // Only animate when hero is in viewport
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            const offset = scrollY * 0.38;
            el.style.transform = `translateY(${offset}px) scale(1.08)`;
          }
        });
        ticking = false;
      }

      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(updateParallax);
          ticking = true;
        }
      }, { passive: true });

      // Initial call
      updateParallax();
    }
  }

  /* ─── 3. NUMBER COUNTER ANIMATION ──────────────────────────────────────────
     Finds stat numbers and animates them from 0 to their final value
     when they scroll into view. Triggers once per element.
     Targets: .stat-number, .kpi-number, .hero-stat-value
  ──────────────────────────────────────────────────────────────────────────── */
  function animateCounter(el) {
    const raw = el.textContent.trim();

    // Parse numeric value, suffix (+ / ★ / h / %), prefix ($)
    const match = raw.match(/^(\$?)(\d[\d,.]*)([+★%h\-]?.*)$/);
    if (!match) return;

    const prefix   = match[1] || '';
    const numStr   = match[2].replace(/,/g, '');
    const suffix   = match[3] || '';
    const target   = parseFloat(numStr);
    const isFloat  = numStr.includes('.');
    const decimals = isFloat ? (numStr.split('.')[1] || '').length : 0;

    if (isNaN(target) || target === 0) return;

    const duration = Math.min(1200, Math.max(600, target * 4));
    const startTime = performance.now();

    // Ease-out cubic
    function easeOut(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current  = target * easeOut(progress);

      let display;
      if (isFloat) {
        display = current.toFixed(decimals);
      } else if (target >= 1000) {
        display = Math.round(current).toLocaleString();
      } else {
        display = Math.round(current).toString();
      }

      el.textContent = prefix + display + suffix;

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  if (!reduced) {
    const counterSelectors = [
      '.stat-number',
      '.kpi-number',
      '.hero-stat-value',
      '.score-val',
      '.card-val',
    ].join(', ');

    const counterEls = document.querySelectorAll(counterSelectors);

    if (counterEls.length && 'IntersectionObserver' in window) {
      const counterObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counterEls.forEach(el => counterObserver.observe(el));
    }
  }

  /* ─── 4. INTERSECTION OBSERVER FALLBACK ────────────────────────────────────
     For browsers that don't support animation-timeline: scroll(),
     adds .reveal-io class + IntersectionObserver for fade-in reveals.
  ──────────────────────────────────────────────────────────────────────────── */
  const supportsScrollTimeline = CSS.supports('animation-timeline', 'scroll()');

  if (!supportsScrollTimeline && !reduced && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll(
      '.reveal, h2, h3, .service-card, .stat-number, .kpi-number, .funnel-card'
    );

    targets.forEach(el => el.classList.add('reveal-io'));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            // Stagger based on DOM order within the same parent
            const siblings = Array.from(
              entry.target.parentElement?.children || []
            );
            const idx = siblings.indexOf(entry.target);
            const delay = Math.min(idx * 60, 300);
            setTimeout(() => {
              entry.target.classList.add('visible');
            }, delay);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach(el => io.observe(el));
  }

  /* ─── 5. NAV SCROLL BEHAVIOR ────────────────────────────────────────────────
     Adds .scrolled class to nav after 60px for shadow/border treatment.
  ──────────────────────────────────────────────────────────────────────────── */
  const nav = document.getElementById('nav');
  if (nav) {
    function updateNav() {
      if (window.scrollY > 60) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();

    // Inject nav scrolled style
    const navStyle = document.createElement('style');
    navStyle.textContent = `
      .nav.scrolled {
        box-shadow: 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.3);
        transition: box-shadow 300ms cubic-bezier(0.16, 1, 0.3, 1);
      }
    `;
    document.head.appendChild(navStyle);
  }

  /* ─── 6. HERO HEADLINE WORD STAGGER ────────────────────────────────────────
     Splits hero H1 words and staggers their opacity-only reveal on load.
     Uses clip-path for zero CLS.
  ──────────────────────────────────────────────────────────────────────────── */
  if (!reduced) {
    const heroH1 = document.querySelector('.hero h1, .page-hero h1');
    if (heroH1) {
      // Only split if no child elements (avoid breaking nested <em> tags approach)
      // Instead: animate the whole H1 as a unit with a load animation
      const h1Style = document.createElement('style');
      h1Style.textContent = `
        .hero h1, .page-hero h1 {
          opacity: 0;
          transform: translateY(0); /* no layout shift */
          animation: cu-hero-reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }
        .hero .hero-label {
          opacity: 0;
          animation: cu-hero-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.0s both;
        }
        .hero .hero-sub, .page-hero .page-hero-sub {
          opacity: 0;
          animation: cu-hero-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
        }
        .hero .hero-ctas {
          opacity: 0;
          animation: cu-hero-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
        }
        .hero .hero-stats {
          opacity: 0;
          animation: cu-hero-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both;
        }
        @keyframes cu-hero-reveal {
          from { opacity: 0; filter: blur(2px); }
          to   { opacity: 1; filter: blur(0px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero h1, .page-hero h1,
          .hero .hero-label, .hero .hero-sub,
          .page-hero .page-hero-sub, .hero .hero-ctas,
          .hero .hero-stats {
            opacity: 1 !important;
            animation: none !important;
          }
        }
      `;
      document.head.appendChild(h1Style);
    }
  }

  /* ─── 7. STATS STRIP ACCENT ─────────────────────────────────────────────────
     Adds a subtle shimmer sweep across the stats strip on scroll entry.
  ──────────────────────────────────────────────────────────────────────────── */
  if (!reduced) {
    const statsStrip = document.querySelector('.stats-strip');
    if (statsStrip && 'IntersectionObserver' in window) {
      const shimmerStyle = document.createElement('style');
      shimmerStyle.textContent = `
        .stats-strip {
          position: relative;
          overflow: hidden;
        }
        .stats-strip::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.06) 50%,
            transparent 100%
          );
          transition: left 0s;
          pointer-events: none;
        }
        .stats-strip.shimmer-active::after {
          left: 160%;
          transition: left 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `;
      document.head.appendChild(shimmerStyle);

      const io2 = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setTimeout(() => entry.target.classList.add('shimmer-active'), 200);
              io2.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      io2.observe(statsStrip);
    }
  }

  /* ─── 8. TRUST BAR ICON PULSE ───────────────────────────────────────────────
     Subtle scale pulse on trust bar icons when they enter viewport.
  ──────────────────────────────────────────────────────────────────────────── */
  if (!reduced) {
    const trustStyle = document.createElement('style');
    trustStyle.textContent = `
      @keyframes cu-icon-pop {
        0%   { transform: scale(0.7); opacity: 0; }
        70%  { transform: scale(1.12); opacity: 1; }
        100% { transform: scale(1); }
      }
      .trust-item-icon.popped {
        animation: cu-icon-pop 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
    `;
    document.head.appendChild(trustStyle);

    const trustIcons = document.querySelectorAll('.trust-item-icon');
    if (trustIcons.length && 'IntersectionObserver' in window) {
      const io3 = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
              const delay = i * 80;
              setTimeout(() => entry.target.classList.add('popped'), delay);
              io3.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      trustIcons.forEach(el => io3.observe(el));
    }
  }

  /* ─── 9. PORTAL STEP NUMBERS — DRAW-ON ──────────────────────────────────────
     Portal step numbers scale in sequentially when in view.
  ──────────────────────────────────────────────────────────────────────────── */
  if (!reduced) {
    const stepNums = document.querySelectorAll('.portal-step-num, .process-step-num');
    if (stepNums.length && 'IntersectionObserver' in window) {
      const stepStyle = document.createElement('style');
      stepStyle.textContent = `
        .portal-step-num, .process-step-num {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                      opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .portal-step-num.popped,
        .process-step-num.popped {
          animation: cu-num-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes cu-num-pop {
          from { transform: scale(0.5); opacity: 0.2; }
          to   { transform: scale(1); opacity: 0.35; }
        }
      `;
      document.head.appendChild(stepStyle);

      const io4 = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
              setTimeout(() => entry.target.classList.add('popped'), i * 120);
              io4.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      stepNums.forEach(el => io4.observe(el));
    }
  }

})();

// ── Floating Quote CTA ───────────────────────────────────────
(function() {
  const el = document.querySelector('.float-cta');
  if (!el) return;
  let visible = false;
  const toggle = () => {
    const scrolled = window.scrollY > 420;
    const nearBottom = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 120);
    const shouldShow = scrolled && !nearBottom;
    if (shouldShow !== visible) {
      visible = shouldShow;
      el.classList.toggle('visible', visible);
    }
  };
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
})();
