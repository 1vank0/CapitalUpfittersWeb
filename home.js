/* Behaviour for index.html, moved from inline <script> blocks (same order). Each block is isolated so one error cannot stop the next. */
try {
(function(){
  document.querySelectorAll('.home-faq-question').forEach(function(btn){
    btn.addEventListener('click', function(){
      var item = btn.closest('.home-faq-item');
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.home-faq-item').forEach(function(i){
        i.classList.remove('open');
        i.querySelector('.home-faq-question').setAttribute('aria-expanded','false');
      });
      if(!isOpen){
        item.classList.add('open');
        btn.setAttribute('aria-expanded','true');
      }
    });
  });
})();
} catch (e) { setTimeout(function () { throw e; }); }

try {
    (function(){
      var mount=document.getElementById('ti-home-mount');
      if(!mount) return;
      var loaded=false, fallbackShown=false;
      /* Trustindex renders inline elements (not an iframe) inside the mount.
         If only the loader script remains after a timeout, the section would
         otherwise stay blank, because loadTI() clears the Loading text first. */
      function hasWidget(){
        var kids=mount.children;
        for(var i=0;i<kids.length;i++){
          if(kids[i].tagName!=='SCRIPT' && kids[i].textContent.trim().length>0) return true;
        }
        return !!mount.querySelector('img');
      }
      function showFallback(){
        if(fallbackShown || hasWidget()) return;
        fallbackShown=true;
        mount.innerHTML='<div style="text-align:center;padding:1rem 0;"><p style="font-weight:600;margin:0 0 .5rem;">4.9 ★ Google Rating · 119 verified Google reviews</p><p style="opacity:.8;margin:0 0 1rem;">The live review feed did not load here, but the reviews are available on Google.</p><a href="https://share.google/k9ejYM294VHEEm6xq" target="_blank" rel="noopener noreferrer">Read reviews on Google</a></div>';
      }
      function loadTI(){
        if(loaded) return; loaded=true;
        mount.innerHTML='';
        var s=document.createElement('script');
        s.src='https://cdn.trustindex.io/loader.js?4b0fb84780ce380f4576092cef2';
        s.async=true; s.defer=true;
        s.onerror=showFallback;
        mount.appendChild(s);
        setTimeout(showFallback, 8000);
        try{ if(window.gtag) gtag('event','reviews_view',{placement:'home-lazy'}); }catch(e){}
      }
      if('IntersectionObserver' in window){
        var io=new IntersectionObserver(function(entries){
          entries.forEach(function(en){ if(en.isIntersecting){ loadTI(); io.disconnect(); } });
        },{rootMargin:'200px 0px'});
        io.observe(mount);
      } else { setTimeout(loadTI, 3000); }
    })();
    
} catch (e) { setTimeout(function () { throw e; }); }

try {
// Nav hamburger
(function(){
  const btn = document.getElementById('hamburger');
  const mob = document.getElementById('nav-mobile');
  const cls = document.getElementById('nav-close');
  if(btn && mob) {
    btn.addEventListener('click', () => { mob.classList.add('open'); btn.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden'; });
    if(cls) cls.addEventListener('click', () => { mob.classList.remove('open'); btn.setAttribute('aria-expanded','false'); document.body.style.overflow=''; });
  }
})();
// Reveal on scroll
(function(){
  const els = document.querySelectorAll('.reveal');
  if(!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
})();
// Active nav link
(function(){
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    if(a.getAttribute('href') && path.includes(a.getAttribute('href').replace('./','').replace('.html',''))) a.classList.add('active');
  });
})();
} catch (e) { setTimeout(function () { throw e; }); }

try {
(function() {
  var CMS_BASE = 'https://capital-upfitters-6iq57bc73-ivan-s-projects-fc67197c.vercel.app';
  // CMS_DISABLED: stale preview URL — CORS errors. Remove this return to re-enable.
  return;
  // PHASE-1 DISABLED: stale CMS preview URL threw CORS errors. Re-enable by removing this line + updating URL.
  return;

  // ─── Settings: phone, hours, urgency banner ──────────────────────────────
  fetch(CMS_BASE + '/api/public/settings')
    .then(function(res) { return res.json(); })
    .then(function(settings) {
      if (!settings) return;
      // Phone numbers
      if (settings.contact && settings.contact.phone) {
        var phone = settings.contact.phone;
        var phoneRaw = phone.replace(/\D/g, '');
        document.querySelectorAll('a[href^="tel:"]').forEach(function(a) {
          a.href = 'tel:' + phoneRaw;
          // Only update visible text if it looks like a phone number
          if (/[\d\(\)\-\s\.\+]{7,}/.test(a.textContent)) a.textContent = phone;
        });
      }
      // Hours
      if (settings.hours && settings.hours.weekdays) {
        document.querySelectorAll('.hours-text, [data-cms="hours"]').forEach(function(el) {
          el.textContent = settings.hours.weekdays;
        });
      }
      // Urgency banner
      if (settings.urgency && settings.urgency.enabled && settings.urgency.message1) {
        var banner = document.querySelector('.announce-bar p, .cro-bar-msg');
        if (!banner) {
          // Try first child text of announce-bar
          var bar = document.querySelector('.announce-bar');
          if (bar) {
            var firstText = bar.querySelector('p');
            if (firstText) firstText.textContent = settings.urgency.message1;
          }
        } else {
          banner.textContent = settings.urgency.message1;
        }
      }
    })
    .catch(function() { /* Graceful fallback */ });

  // ─── Tag main quote form ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    var form = document.querySelector('form');
    if (form && !form.dataset.cmsForm) form.setAttribute('data-cms-form', 'retail');
  });
})();
} catch (e) { setTimeout(function () { throw e; }); }

try {
(function() {
  var IDLE_MS   = 1800;   // trigger after 1.8s idle
  var FADE_DUR  = '1.2s'; // text/overlay fade out
  var RECOV_DUR = '1.2s'; // snap back

  // Label, headline, subtitle only — buttons + stats stay full
  var TEXT_SELS = ['.hero-label', '.hero-content h1', '.hero-sub'];
  // Both overlays (global dim + left gradient)
  var OVL_SELS  = ['.hero-video-overlay', '.hero-overlay'];

  var hero = document.querySelector('.hero');
  if (!hero) return;

  var idleTimer = null;
  var watching  = false;

  function getEls(sels) {
    return sels.map(function(s) { return hero.querySelector(s); }).filter(Boolean);
  }

  // Ensure text is visually restored (call this on reveal + restore)
  function ensureVisible() {
    getEls(TEXT_SELS).forEach(function(el) {
      el.style.animation  = 'none';          // keep animation off
      el.style.transition = 'opacity ' + RECOV_DUR + ' ease';
      el.style.opacity    = '1';
    });
    getEls(OVL_SELS).forEach(function(el) {
      el.style.transition = 'opacity ' + RECOV_DUR + ' ease';
      el.style.opacity    = '';              // back to stylesheet value
    });
  }

  function applyFade() {
    if (watching) return;
    watching = true;
    // Text → 98% invisible
    getEls(TEXT_SELS).forEach(function(el) {
      el.style.animation  = 'none';
      el.style.transition = 'opacity ' + FADE_DUR + ' ease';
      el.style.opacity    = '0.02';
    });
    // Overlays → 2% (video at 98% brightness)
    getEls(OVL_SELS).forEach(function(el) {
      el.style.transition = 'opacity ' + FADE_DUR + ' ease';
      el.style.opacity    = '0.02';
    });
  }

  function applyRestore() {
    clearTimeout(idleTimer);
    if (watching) {
      watching = false;
      ensureVisible();
    }
    idleTimer = setTimeout(applyFade, IDLE_MS);
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        // Hero back in view: ensure text visible, start idle timer
        watching = false;
        ensureVisible();
        clearTimeout(idleTimer);
        idleTimer = setTimeout(applyFade, IDLE_MS);
        document.addEventListener('mousemove',  applyRestore);
        document.addEventListener('touchstart', applyRestore);
        document.addEventListener('keydown',    applyRestore);
      } else {
        // Hero out of view: cancel everything, clean up
        clearTimeout(idleTimer);
        watching = false;
        ensureVisible();
        document.removeEventListener('mousemove',  applyRestore);
        document.removeEventListener('touchstart', applyRestore);
        document.removeEventListener('keydown',    applyRestore);
      }
    });
  }, { threshold: 0.3 });   // lower threshold so scroll-back triggers earlier

  observer.observe(hero);
})();
} catch (e) { setTimeout(function () { throw e; }); }

try {
(function () {
  'use strict';

  // ── SERVICE_SLIDES — the ONLY service list in this slider. ────────────
  // Add / remove / reorder a service by editing this array; nothing else
  // in the code below names a service.
  //   video       : URL string, or null to show the poster with a Ken-Burns
  //                 drift for duration_ms (still a full slide in rotation).
  //   duration_ms : video-less slides only. Defaults to 6500.
  //   eyebrow     : 3-6 words, shown above the H1 while this slide is active.
  //   h1          : 3-6 words, replaces the hero H1 while active.
  //   sub         : one sentence, replaces .hero-sub while active.
  //   poster      : image shown as fallback and as initial paint.
  //   cta_primary / cta_secondary : {label, href}
  //
  // Posters point at the repo's existing per-service art in ./media/next/.
  // The brief's ./assets/hero-poster-*.jpg paths do not exist in this repo
  // and four of the six slides are poster-only, so those 404s would have
  // blanked two thirds of the hero. Same field, real files.
  var SERVICE_SLIDES = [
    {
      key: 'bedliner',
      eyebrow: 'Spray-On Protection',
      h1: 'BUILT FOR REAL WORK.',
      h1_accent: 'WORK',
      sub: 'Patriot Liner spray-on protection with a lifetime warranty — installed same-week in Rockville, MD.',
      video: 'https://www.patriotliner.site/commonfiles/patriotliner/videos/hero-home.mp4',
      poster: './media/next/bedliner-v1.webp',
      cta_primary:   { label: 'Request Installed Pricing', href: './quote.html?service=bedliner' },
      cta_secondary: { label: 'See Bedliner Bundles', href: './services/bedliner.html#bundles' }
    },
    {
      key: 'running-boards',
      eyebrow: 'Step In With Confidence',
      h1: 'RUNNING BOARDS THAT DEPLOY ON DEMAND.',
      sub: 'AMP Research PowerStep and premium fixed boards — pro installation for trucks and SUVs across the DMV.',
      video: './assets/amp-powerstep.mp4',
      poster: './media/next/running-boards-v1.webp',
      cta_primary:   { label: 'Get a Quote',          href: './quote.html?service=running-boards' },
      cta_secondary: { label: 'Compare Boards',       href: './services/running-boards.html' }
    },
    {
      key: 'hitches',
      eyebrow: 'Tow Anything, Anywhere',
      h1: 'HITCHES WIRED, TESTED, ROAD-READY.',
      sub: 'Class II–V receiver hitches, gooseneck, and stealth hitches — wired, tested, and road-ready.',
      video: null,
      duration_ms: 6500,
      poster: './media/next/hitches-v1.webp',
      cta_primary:   { label: 'Get a Quote',     href: './quote.html?service=hitches' },
      cta_secondary: { label: 'Explore Hitches', href: './services/hitches.html' }
    },
    {
      key: 'ceramic-coating',
      eyebrow: 'Show-Room Gloss, Daily Driver',
      h1: 'CERAMIC COATING THAT HOLDS ITS SHINE.',
      sub: 'Multi-year hydrophobic protection with UV and swirl resistance — for trucks, fleets, and enthusiast rides.',
      video: null,
      duration_ms: 6500,
      poster: './media/next/ceramic-coating-v1.webp',
      cta_primary:   { label: 'Get a Quote',           href: './quote.html?service=ceramic-coating' },
      cta_secondary: { label: 'See Coating Packages',  href: './services/ceramic-coating.html' }
    },
    {
      key: 'commercial-coatings',
      eyebrow: 'DOT + Municipal Grade',
      h1: 'INDUSTRIAL COATINGS, APPLIED ON SITE.',
      sub: 'Chemical, chip, and corrosion-resistant coatings for DOT, utility, and municipal fleet specifications.',
      video: null,
      duration_ms: 6500,
      poster: './media/next/industrial-coatings-v1.webp',
      cta_primary:   { label: 'Get a Quote',         href: './quote.html?service=commercial-coatings' },
      cta_secondary: { label: 'Explore Industrial Coatings', href: './services/industrial-coatings.html' }
    },
    {
      key: 'window-tinting',
      eyebrow: 'Heat, Glare, UV — Blocked',
      h1: 'WINDOW TINT THAT WON\'T PURPLE.',
      sub: 'Premium ceramic tint — legal DMV shades installed in a single visit.',
      video: null,
      duration_ms: 6500,
      poster: './media/next/window-tinting-v1.webp',
      cta_primary:   { label: 'Get a Quote',       href: './quote.html?service=window-tinting' },
      cta_secondary: { label: 'See Tint Shade Guide', href: './services/window-tinting.html' }
    }
  ];

  var vid       = document.getElementById('hero-vid');
  // T28/speed: poster first; applyMedia() sets src once per slide (no idle <source> attach).
  var fb        = document.getElementById('hero-bg-fallback');
  var copy      = document.getElementById('hero-slide-copy');
  var eyebrowEl = document.getElementById('hero-eyebrow');
  var h1El      = document.getElementById('hero-h1');
  var subEl     = document.getElementById('hero-sub');
  var ctaP      = document.getElementById('hero-cta-primary');
  var ctaS      = document.getElementById('hero-cta-secondary');
  var posterEl  = document.getElementById('hero-poster');
  var videoWrap = document.querySelector('.hero-video-wrap');
  var dotsWrap  = document.getElementById('hero-dots');
  var muteBtn   = document.getElementById('hero-mute');
  var pauseBtn  = document.getElementById('hero-pause');
  var heroSec   = document.querySelector('.hero');
  var progress  = document.getElementById('hero-progress');
  var barFill   = document.getElementById('hero-progress-fill');

  // Bail cleanly: the static hero authored in the HTML stays exactly as-is.
  if (!vid || !copy || !h1El || !SERVICE_SLIDES.length) return;
  if (typeof vid.canPlayType !== 'function') return;

  var LS_INDEX   = 'cu_last_slide_index';
  var LS_MUTED   = 'cu_hero_muted';
  var FADE_MS    = 500;
  var WRAP_MS    = 200;    // beat when the rotation laps back to slide 0
  var STALL_MS   = 8000;   // give up on a video that never reports metadata
  var REDUCED_MS = 10000;

  var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = !!(mq && mq.matches);

  // Safari private mode throws on both read and write.
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* no-op */ } }

  var idx = 0;
  var saved = parseInt(lsGet(LS_INDEX), 10);
  if (!isNaN(saved) && saved >= 0 && saved < SERVICE_SLIDES.length) {
    idx = (saved + 1) % SERVICE_SLIDES.length;   // resume from the NEXT service
  }

  var paused = reduce;      // reduced motion starts paused: poster only, no rotation
  var pausedElapsed = 0;
  var advTimer = null, fadeTimer = null, stallTimer = null, rafId = null;
  var startTs = 0, curDur = 0, preloader = null;
  // A <video> whose src is swapped mid-flight still delivers the aborted
  // request's 'error' to whatever listener is attached when it lands — which
  // is the NEXT slide's listener. Without these two guards one dead video
  // skips two services. MEDIA_GUARD_MS is shorter than any real clip and
  // longer than the swap, so a genuinely broken source is still skipped.
  var MEDIA_GUARD_MS = 600;
  var mediaAt = 0;        // when the current slide's media was attached
  var advancing = false;  // collapses duplicate advance requests per slide

  function slide() { return SERVICE_SLIDES[idx]; }

  // Readable service name derived from the key — keeps the config schema
  // untouched while still giving dots a meaningful accessible label.
  function slideName(s) {
    return s.key.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function durationFor(s) {
    return (typeof s.duration_ms === 'number' && s.duration_ms > 0) ? s.duration_ms : 6500;
  }

  function clearTimers() {
    if (advTimer)   { clearTimeout(advTimer);   advTimer = null; }
    if (fadeTimer)  { clearTimeout(fadeTimer);  fadeTimer = null; }
    if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
    if (rafId)      { cancelAnimationFrame(rafId); rafId = null; }
  }

  function setProgress(p) {
    if (barFill) barFill.style.width = (Math.max(0, Math.min(1, p)) * 100) + '%';
  }

  function tick() {
    var s = slide(), p = 0;
    if (usesVideo(s) && isFinite(vid.duration) && vid.duration > 0) {
      p = vid.currentTime / vid.duration;
    } else if (curDur > 0) {
      p = (Date.now() - startTs) / curDur;
    }
    setProgress(p);
    rafId = requestAnimationFrame(tick);
  }

  // Reduced motion downgrades every slide to a still poster on a long timer.
  function usesVideo(s) { return !!s.video && !reduce; }

  function next() {
    if (advancing) return;
    advancing = true;
    var n = (idx + 1) % SERVICE_SLIDES.length;
    clearTimers();
    if (n === 0) { advTimer = setTimeout(function () { show(n); }, WRAP_MS); }
    else { show(n); }
  }

  // Entry point for media-driven advancement ('ended' / 'error').
  function requestAdvance() {
    if (Date.now() - mediaAt < MEDIA_GUARD_MS) return;   // stale, previous slide
    next();
  }

  function render(s) {
    if (eyebrowEl) eyebrowEl.textContent = s.eyebrow;
    var ai = s.h1_accent ? s.h1.indexOf(s.h1_accent) : -1;
    if (ai > -1) {
      h1El.textContent = s.h1.slice(0, ai);
      var acc = document.createElement('span');
      acc.className = 'accent-word';
      acc.textContent = s.h1_accent;
      h1El.appendChild(acc);
      h1El.appendChild(document.createTextNode(s.h1.slice(ai + s.h1_accent.length)));
    } else {
      h1El.textContent = s.h1;
    }
    if (subEl) subEl.textContent = s.sub;
    if (ctaP && s.cta_primary) {
      ctaP.textContent = s.cta_primary.label;
      ctaP.setAttribute('href', s.cta_primary.href);
    }
    if (ctaS && s.cta_secondary) {
      ctaS.textContent = s.cta_secondary.label;
      ctaS.setAttribute('href', s.cta_secondary.href);
    }
    // The HERO IDLE DIM script parks inline opacity on these nodes after
    // 1.8s of stillness. Clear it so a freshly swapped headline is visible.
    [eyebrowEl, h1El, subEl].forEach(function (el) { if (el) el.style.opacity = '1'; });
  }

  function applyMedia(s) {
    var withVideo = usesVideo(s);
    mediaAt = Date.now();

    if (posterEl && s.poster && posterEl.getAttribute('src') !== s.poster) {
      posterEl.setAttribute('src', s.poster);
    }
    if (posterEl) {
      posterEl.classList.remove('is-drifting');
      if (!withVideo && !reduce) {
        void posterEl.offsetWidth;            // restart the Ken-Burns run
        posterEl.classList.add('is-drifting');
      }
    }
    if (videoWrap) videoWrap.classList.toggle('is-hidden', !withVideo);
    if (muteBtn) muteBtn.hidden = !withVideo;

    if (withVideo) {
      // Drop any leftover <source> nodes so we never double-request the same URL.
      while (vid.firstChild) vid.removeChild(vid.firstChild);
      var want = s.video;
      var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      var saveData = !!(conn && (conn.saveData || /2g/.test(conn.effectiveType || '')));
      if (saveData) {
        if (videoWrap) videoWrap.classList.add('is-hidden');
        try { vid.pause(); } catch (e) { /* no-op */ }
        vid.removeAttribute('src');
        return;
      }
      var startVideo = function () {
        if (vid.getAttribute('src') !== want) {
          vid.setAttribute('src', want);
          vid.load();
        }
        if (paused) return;
        var played = vid.play();
        if (played && played.catch) played.catch(function () { /* autoplay refused */ });
      };
      // First video: defer so the poster can be LCP; later slides start immediately.
      if (!vid.getAttribute('data-cu-video-warm')) {
        vid.setAttribute('data-cu-video-warm', '1');
        if ('requestIdleCallback' in window) requestIdleCallback(startVideo, { timeout: 2500 });
        else setTimeout(startVideo, 1200);
      } else {
        startVideo();
      }
      // A hotlinked video that never loads must not freeze the rotation.
      if (!paused) stallTimer = setTimeout(function () {
        if (!isFinite(vid.duration) || vid.duration <= 0) requestAdvance();
      }, STALL_MS);
    } else {
      try { vid.pause(); } catch (e) { /* no-op */ }
    }
  }

  function syncDots() {
    if (!dotsWrap) return;
    var kids = dotsWrap.childNodes;
    for (var i = 0; i < kids.length; i++) {
      if (!kids[i].classList) continue;
      kids[i].classList.toggle('is-active', i === idx);
      kids[i].setAttribute('aria-current', i === idx ? 'true' : 'false');
    }
  }

  // Current slide is already loading; warm only the one after it.
  function preloadNext() {
    var n = SERVICE_SLIDES[(idx + 1) % SERVICE_SLIDES.length];
    if (!n || !n.poster) return;
    // Speed: never preload MP4s (amp-powerstep alone is ~2MB). Poster images only.
    preloader = new Image();
    preloader.src = n.poster;
  }

  function show(target, instant) {
    idx = ((target % SERVICE_SLIDES.length) + SERVICE_SLIDES.length) % SERVICE_SLIDES.length;
    // Written when a slide STARTS, so a mid-play refresh still moves forward.
    lsSet(LS_INDEX, String(idx));

    var s = slide();
    var commit = function () {
      fadeTimer = null;
      render(s);
      applyMedia(s);
      syncDots();
      copy.classList.remove('is-transitioning');
      setProgress(0);
      advancing = false;
      startTs = Date.now();
      curDur = usesVideo(s) ? 0 : (reduce ? REDUCED_MS : durationFor(s));
      pausedElapsed = 0;
      if (paused) {
        if (posterEl) posterEl.classList.remove('is-drifting');
      } else {
        if (curDur > 0) advTimer = setTimeout(next, curDur);
        rafId = requestAnimationFrame(tick);
      }
      preloadNext();
    };

    clearTimers();
    if (reduce || instant) { commit(); return; }
    copy.classList.add('is-transitioning');
    fadeTimer = setTimeout(commit, FADE_MS);
  }

  // ── Wiring ───────────────────────────────────────────────────────────
  vid.loop = false;

  vid.addEventListener('ended', function () {
    if (usesVideo(slide())) requestAdvance();
  });
  vid.addEventListener('error', function () {
    if (usesVideo(slide())) requestAdvance();
  });
  vid.addEventListener('loadedmetadata', function () {
    if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
  });
  vid.addEventListener('playing', function () {
    if (fb) setTimeout(function () { fb.classList.add('hidden'); }, 600);
  }, { once: true });

  if (dotsWrap) {
    SERVICE_SLIDES.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hero-dot';
      b.setAttribute('aria-label',
        'Go to slide ' + (i + 1) + ' of ' + SERVICE_SLIDES.length + ': ' + slideName(s));
      b.addEventListener('click', function () {
        if (i !== idx) show(i);
        // Hand focus back to the copy so screen readers land on the new headline.
        copy.focus();
      });
      dotsWrap.appendChild(b);
    });
    dotsWrap.hidden = false;
  }

  if (muteBtn) {
    var syncMute = function () {
      var m = !!vid.muted;
      muteBtn.classList.toggle('is-muted', m);
      muteBtn.setAttribute('aria-pressed', m ? 'true' : 'false');
      muteBtn.setAttribute('aria-label', m ? 'Unmute video' : 'Mute video');
      var lbl = muteBtn.querySelector('.hero-mute-label');
      if (lbl) lbl.textContent = m ? 'Unmute' : 'Mute';
    };
    muteBtn.addEventListener('click', function () {
      vid.muted = !vid.muted;
      lsSet(LS_MUTED, vid.muted ? '1' : '0');
      if (!vid.muted) {
        var p = vid.play();
        if (p && p.catch) p.catch(function () {});
      }
      syncMute();
    });
    syncMute();

    // Autoplay requires muted=true at load, so a stored "unmuted" preference
    // is honoured on the first real interaction rather than on page load —
    // unmuting before a gesture makes the browser refuse to play at all.
    if (lsGet(LS_MUTED) === '0') {
      var restore = function () {
        vid.muted = false;
        syncMute();
        document.removeEventListener('pointerdown', restore);
        document.removeEventListener('keydown', restore);
      };
      document.addEventListener('pointerdown', restore, { once: true });
      document.addEventListener('keydown', restore, { once: true });
    }
  }

  function syncPause() {
    if (!pauseBtn) return;
    pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    pauseBtn.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
    var lbl = pauseBtn.querySelector('.hero-pause-label');
    if (lbl) lbl.textContent = paused ? 'Play' : 'Pause';
    pauseBtn.classList.toggle('is-paused', paused);
    if (heroSec) heroSec.classList.toggle('is-motion-paused', paused);
  }

  function pauseHero() {
    paused = true;
    // A pending fade commit is left alone so the copy never sticks mid-transition.
    if (advTimer)   { clearTimeout(advTimer);   advTimer = null; }
    if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
    if (rafId)      { cancelAnimationFrame(rafId); rafId = null; }
    pausedElapsed = Date.now() - startTs;
    try { vid.pause(); } catch (e) { /* no-op */ }
    syncPause();
  }

  function resumeHero() {
    paused = false;
    syncPause();
    if (fadeTimer) return;   // commit() will schedule timers itself, now unpaused
    var s = slide();
    startTs = Date.now() - pausedElapsed;
    if (usesVideo(s)) {
      if (vid.getAttribute('src') !== s.video) { vid.setAttribute('src', s.video); vid.load(); }
      var p = vid.play();
      if (p && p.catch) p.catch(function () {});
      stallTimer = setTimeout(function () {
        if (!isFinite(vid.duration) || vid.duration <= 0) requestAdvance();
      }, STALL_MS);
    } else if (curDur > 0) {
      advTimer = setTimeout(next, Math.max(0, curDur - pausedElapsed));
    }
    rafId = requestAnimationFrame(tick);
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', function () {
      if (paused) resumeHero(); else pauseHero();
    });
    pauseBtn.hidden = false;
    syncPause();
  }

  if (progress) progress.hidden = false;

  // Hydrate: paints slide `idx` immediately, no opening fade.
  show(idx, true);
})();
} catch (e) { setTimeout(function () { throw e; }); }

try {
(function() {
  // ── Service map by vehicle type ──────────────────────────
  // Keys: truck, suv, van, car, ev, other
  const SERVICE_MAP = {
    truck: [
      { name: 'Spray-On Bedliner', url: './services/bedliner.html', icon: '🛡️' },
      { name: 'Tonneau Cover', url: './services/tonneau.html', icon: '🔒' },
      { name: 'Hitches & Towing', url: './services/hitches.html', icon: '🔗' },
      { name: 'Running Boards', url: './services/running-boards.html', icon: '⤵️' },
      { name: 'Toolboxes & Storage', url: './services/toolboxes.html', icon: '🧰' },
      { name: 'Camper Shell', url: './services/camper-shells.html', icon: '⛺' },
      { name: 'Undercoating', url: './services/undercoating.html', icon: '🛡️' },
      { name: 'Suspension & Lifts', url: './services/suspension.html', icon: '⬆️' },
      { name: 'Window Tinting', url: './services/window-tinting.html', icon: '🕳️' },
      { name: 'Exterior Accessories', url: './services/exterior.html', icon: '🔧' },
    ],
    suv: [
      { name: 'Running Boards', url: './services/running-boards.html', icon: '⤵️' },
      { name: 'Hitches & Towing', url: './services/hitches.html', icon: '🔗' },
      { name: 'Ceramic Coating', url: './services/ceramic-coating.html', icon: '✨' },
      { name: 'Undercoating', url: './services/undercoating.html', icon: '🛡️' },
      { name: 'Window Tinting', url: './services/window-tinting.html', icon: '🕳️' },
      { name: 'Exterior Accessories', url: './services/exterior.html', icon: '🔧' },
      { name: 'Suspension & Lifts', url: './services/suspension.html', icon: '⬆️' },
    ],
    van: [
      { name: 'Van Shelving (Weatherguard)', url: './fleet.html', icon: '📦' },
      { name: 'Ladder Racks', url: './fleet.html', icon: '🚜' },
      { name: 'Spray-On Bedliner (Cargo Floor)', url: './services/bedliner.html', icon: '🛡️' },
      { name: 'Commercial Wraps', url: './services/commercial-wraps.html', icon: '🎨' },
      { name: 'Window Tinting', url: './services/window-tinting.html', icon: '🕳️' },
      { name: 'LED Work Lights', url: './services/lighting.html', icon: '💡' },
      { name: 'Hitches & Towing', url: './services/hitches.html', icon: '🔗' },
    ],
    car: [
      { name: 'Ceramic Coating & PPF', url: './services/ceramic-coating.html', icon: '✨' },
      { name: 'Window Tinting', url: './services/window-tinting.html', icon: '🕳️' },
      { name: 'Undercoating', url: './services/undercoating.html', icon: '🛡️' },
      { name: 'Hitches & Towing', url: './services/hitches.html', icon: '🔗' },
    ],
    ev: [
      { name: 'Ceramic Coating & PPF', url: './services/ceramic-coating.html', icon: '✨' },
      { name: 'Window Tinting (Ceramic)', url: './services/window-tinting.html', icon: '🕳️' },
      { name: 'Running Boards', url: './services/running-boards.html', icon: '⤵️' },
      { name: 'Exterior Accessories', url: './services/exterior.html', icon: '🔧' },
    ],
    other: [
      { name: 'Spray-On Bedliner', url: './services/bedliner.html', icon: '🛡️' },
      { name: 'Undercoating', url: './services/undercoating.html', icon: '🛡️' },
      { name: 'Window Tinting', url: './services/window-tinting.html', icon: '🕳️' },
      { name: 'Commercial Wraps', url: './services/commercial-wraps.html', icon: '🎨' },
    ],
  };

  // Vehicle type mapping by make+model keywords
  const TRUCK_MAKES = ['ford', 'gmc', 'ram', 'chevrolet', 'chevy', 'toyota', 'nissan', 'honda', 'jeep', 'dodge'];
  const TRUCK_MODELS = ['f-150','f150','f-250','f250','f-350','f350','silverado','sierra','ranger','tacoma','tundra','frontier','ridgeline','maverick','canyon','colorado','gladiator','ram 1500','ram 2500','ram 3500'];
  const SUV_MODELS = ['expedition','tahoe','suburban','yukon','navigator','explorer','pilot','odyssey','4runner','sequoia','highlander','armada','pathfinder','qx80','qx60','gx','lx','rx','cx-9','cx-5','traverse','equinox','blazer','wrangler','grand cherokee','commander','telluride','palisade','sorento','santa fe'];
  const VAN_MODELS = ['transit','sprinter','promaster','express','nv','savana','sienna','odyssey','metris','econoline','e-series','e-250','e-350'];
  const EV_MODELS = ['model 3','model s','model x','model y','cybertruck','lightning','f-150 lightning','silverado ev','gmc hummer','rivian','r1t','r1s','ioniq','id.4','mach-e','mustang mach-e','lyriq','eq','i4','i7','ix'];

  function detectType(make, model) {
    const m = model.toLowerCase(), mk = make.toLowerCase();
    if (VAN_MODELS.some(v => m.includes(v))) return 'van';
    if (EV_MODELS.some(e => m.includes(e))) return 'ev';
    if (TRUCK_MODELS.some(t => m.includes(t))) return 'truck';
    if (SUV_MODELS.some(s => m.includes(s))) return 'suv';
    // Guess by body class if model not recognized
    if (['pickup', 'truck'].some(t => m.includes(t))) return 'truck';
    if (['suv', 'crossover', 'wagon'].some(s => m.includes(s))) return 'suv';
    if (['van', 'minivan'].some(v => m.includes(v))) return 'van';
    return 'car';
  }

  // ── DOM refs ──────────────────────────────────────────────
  const yearSel  = document.getElementById('vs-year');
  const makeSel  = document.getElementById('vs-make');
  const modelSel = document.getElementById('vs-model');
  const btn      = document.getElementById('vs-btn');
  const results  = document.getElementById('vs-results');
  const label    = document.getElementById('vs-results-label');
  const chips    = document.getElementById('vs-chips');

  if (!yearSel) return;

  // ── US-market makes: popular group + rest group (both A→Z) ─────
  // Popular: brands every DMV-area truck/SUV/car owner recognizes
  const POPULAR_MAKES = [
    'Acura','Audi','BMW','Buick','Cadillac','Chevrolet','Chrysler',
    'Dodge','Ford','Genesis','GMC','Honda','Hyundai','Infiniti',
    'Jeep','Kia','Lexus','Lincoln','Mazda','Mercedes-Benz',
    'Nissan','RAM','Rivian','Subaru','Tesla','Toyota','Volkswagen'
  ].sort();

  // All other US-market brands sold since 1980
  const OTHER_MAKES = [
    'Alfa Romeo','AM General','American Motors','Aston Martin',
    'Bentley','Bugatti','FIAT','Fisker','Freightliner',
    'Geo','Hummer','Isuzu','Jaguar','Land Rover',
    'Lamborghini','Lucid','McLaren','Mercury','Maserati',
    'MINI','Mitsubishi','Oldsmobile','Polestar','Pontiac',
    'Porsche','Rolls-Royce','Saab','Saturn','Scion',
    'Smart','Sterling','Suzuki','Volvo','Yugo'
  ].sort();

  function populateMakes(makes) {
    makeSel.innerHTML = '<option value="">Make</option>';

    // Match against NHTSA results (case-insensitive) or use static list
    function matchList(list) {
      if (!makes) return list; // use static when no API data
      return list.filter(name =>
        makes.some(m => m.toLowerCase() === name.toLowerCase())
      );
    }

    const popularGroup = document.createElement('optgroup');
    popularGroup.label = '★ Popular';
    matchList(makes ? POPULAR_MAKES : null).forEach(name => {
      popularGroup.appendChild(new Option(name, name));
    });

    const divider = document.createElement('optgroup');
    divider.label = '─────────────────';
    divider.disabled = true;

    const otherGroup = document.createElement('optgroup');
    otherGroup.label = 'All Manufacturers';

    // Merge: POPULAR + OTHER, filtered to what NHTSA returned
    // Then exclude anything already in popular group
    const allUS = [...POPULAR_MAKES, ...OTHER_MAKES].sort();
    const popularLower = new Set(POPULAR_MAKES.map(n => n.toLowerCase()));
    matchList(makes ? allUS : null).forEach(name => {
      if (!popularLower.has(name.toLowerCase())) {
        otherGroup.appendChild(new Option(name, name));
      }
    });

    if (popularGroup.children.length) makeSel.appendChild(popularGroup);
    if (divider) makeSel.appendChild(divider);
    if (otherGroup.children.length) makeSel.appendChild(otherGroup);
  }

  // ── Populate years (1980 → current+1) ────────────────────
  const now = new Date().getFullYear() + 1;
  for (let y = now; y >= 1980; y--) {
    yearSel.add(new Option(y, y));
  }

  // ── Load makes when year selected ───────────────────────
  yearSel.addEventListener('change', async () => {
    const yr = yearSel.value;
    makeSel.innerHTML = '<option value="">Make</option>';
    modelSel.innerHTML = '<option value="">Model</option>';
    makeSel.disabled = !yr;
    modelSel.disabled = true;
    btn.disabled = true;
    results.classList.remove('visible');
    if (!yr) return;

    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?year=${yr}&format=json`);
      const data = await res.json();
      const makes = (data.Results || []).map(r => r.MakeName);
      populateMakes(makes);
      makeSel.disabled = false;
    } catch (e) {
      // Fallback: show full static list without filtering
      populateMakes(null);
      makeSel.disabled = false;
    }
  });

  // ── Fetch models when make selected ──────────────────────
  makeSel.addEventListener('change', async () => {
    const yr = yearSel.value, mk = makeSel.value;
    modelSel.innerHTML = '<option value="">Model</option>';
    modelSel.disabled = !mk;
    btn.disabled = true;
    results.classList.remove('visible');
    if (!mk) return;

    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(mk)}/modelyear/${yr}?format=json`);
      const data = await res.json();
      const models = [...new Set((data.Results || []).map(r => r.Model_Name))].sort();
      models.forEach(name => modelSel.add(new Option(name, name)));
      modelSel.disabled = false;
    } catch (e) {
      modelSel.add(new Option('(Enter manually)', 'unknown'));
      modelSel.disabled = false;
    }
  });

  modelSel.addEventListener('change', () => {
    btn.disabled = !modelSel.value;
  });

  // ── Show results ──────────────────────────────────────────
  btn.addEventListener('click', () => {
    const yr = yearSel.value, mk = makeSel.value, mdl = modelSel.value;
    if (!yr || !mk || !mdl) return;

    const type = detectType(mk, mdl);
    const services = SERVICE_MAP[type] || SERVICE_MAP.other;

    label.textContent = `Popular services for your ${yr} ${mk} ${mdl}`;
    chips.innerHTML = '';

    services.forEach(svc => {
      const url = new URL(svc.url, window.location.href);
      url.searchParams.set('year', yr);
      url.searchParams.set('make', mk);
      url.searchParams.set('model', mdl);
      const a = document.createElement('a');
      a.className = 'vs-chip';
      a.href = url.toString();
      a.innerHTML = `<span class="vs-chip-icon" aria-hidden="true">${svc.icon}</span>${svc.name}`;
      chips.appendChild(a);
    });

    // Add universal quote chip
    const qUrl = `./quote.html?year=${encodeURIComponent(yr)}&make=${encodeURIComponent(mk)}&model=${encodeURIComponent(mdl)}`;
    const qa = document.createElement('a');
    qa.className = 'vs-chip';
    qa.href = qUrl;
    qa.style.cssText = 'background:var(--color-action); border-color:var(--color-action); color:var(--color-on-action); font-weight:700;';
    qa.innerHTML = '<span aria-hidden="true">✉️</span> Get a Quote for This Vehicle';
    chips.appendChild(qa);

    results.classList.add('visible');
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // ── Auto-populate from URL params (from vehicle-specific links) ──
  const params = new URLSearchParams(window.location.search);
  // Also auto-fill quote form if returning from selector
  if (params.get('year') && params.get('make') && params.get('model')) {
    // handled by quote.html
  }
})();
} catch (e) { setTimeout(function () { throw e; }); }

try {
  (function(){
    document.querySelectorAll('.nav-mobile-section-trigger').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-target'),body=document.getElementById(id),open=body&&body.classList.contains('open');
        document.querySelectorAll('.nav-mobile-section-body').forEach(function(b){b.classList.remove('open');});
        document.querySelectorAll('.nav-mobile-section-trigger').forEach(function(b){b.classList.remove('open');b.setAttribute('aria-expanded','false');});
        if(!open&&body){body.classList.add('open');btn.classList.add('open');btn.setAttribute('aria-expanded','true');}
      });
    });
    var h=document.getElementById('hamburger'),m=document.getElementById('nav-mobile'),c=document.getElementById('nav-close');
    if(h&&m){h.addEventListener('click',function(){m.classList.add('open');document.body.style.overflow='hidden';});}
    if(c&&m){c.addEventListener('click',function(){m.classList.remove('open');document.body.style.overflow='';});}
  })();
  
} catch (e) { setTimeout(function () { throw e; }); }

