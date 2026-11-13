/* Shared disclosure navigation. No form or lead-handling responsibilities. */
(() => {
  'use strict';
  const nav = document.querySelector('[data-site-nav]');
  if (!nav) return;
  const items = [...nav.querySelectorAll('[data-nav-item]')];
  const desktop = window.matchMedia('(min-width: 1280px)');
  const hover = window.matchMedia('(hover: hover)');
  let openItem = null;
  let hoverTimer;
  let leaveTimer;

  const trigger = item => item.querySelector('[data-nav-trigger]');
  const panel = item => document.getElementById(trigger(item).getAttribute('aria-controls'));
  const links = item => [...panel(item).querySelectorAll('a[href]')];
  function close(item = openItem, restoreFocus = false) {
    if (!item) return;
    clearTimeout(hoverTimer);
    clearTimeout(leaveTimer);
    trigger(item).setAttribute('aria-expanded', 'false');
    panel(item).hidden = true;
    item.classList.remove('is-open');
    if (openItem === item) openItem = null;
    if (restoreFocus) trigger(item).focus();
  }
  function open(item) {
    if (!desktop.matches) return;
    clearTimeout(hoverTimer);
    clearTimeout(leaveTimer);
    if (openItem !== item) close();
    panel(item).hidden = false;
    trigger(item).setAttribute('aria-expanded', 'true');
    item.classList.add('is-open');
    openItem = item;
  }
  items.forEach((item, index) => {
    const button = trigger(item);
    button.addEventListener('click', () => openItem === item ? close(item) : open(item));
    item.addEventListener('pointerenter', () => {
      clearTimeout(hoverTimer);
      clearTimeout(leaveTimer);
      if (hover.matches) hoverTimer = setTimeout(() => open(item), 100);
    });
    item.addEventListener('pointerleave', () => {
      clearTimeout(hoverTimer);
      if (!item.contains(document.activeElement)) leaveTimer = setTimeout(() => close(item), 180);
    });
    item.addEventListener('focusout', () => {
      requestAnimationFrame(() => { if (!item.contains(document.activeElement)) close(item); });
    });
    item.addEventListener('keydown', event => {
      const targets = links(item);
      const current = targets.indexOf(document.activeElement);
      if (event.key === 'Escape') {
        event.preventDefault();
        close(item, true);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        open(item);
        const next = current < 0 ? (event.key === 'ArrowDown' ? 0 : targets.length - 1)
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + targets.length) % targets.length;
        targets[next]?.focus();
      } else if ((event.key === 'Home' || event.key === 'End') && current >= 0) {
        event.preventDefault();
        targets[event.key === 'Home' ? 0 : targets.length - 1]?.focus();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
        close();
        trigger(items[next]).focus();
      }
    });
  });
  document.addEventListener('pointerdown', event => {
    if (openItem && !openItem.contains(event.target)) close();
  });

  const toggle = document.getElementById('site-menu-toggle');
  const dialog = document.getElementById('site-mobile-panel');
  const dismiss = document.getElementById('site-menu-close');
  let savedOverflow = '';
  let returnFocus;
  function closeMobile() { if (dialog?.open) dialog.close(); }
  if (toggle && dialog && dismiss) {
    toggle.addEventListener('click', () => {
      close();
      returnFocus = document.activeElement;
      savedOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      toggle.setAttribute('aria-expanded', 'true');
      dismiss.focus();
    });
    dismiss.addEventListener('click', closeMobile);
    dialog.addEventListener('close', () => {
      document.body.style.overflow = savedOverflow;
      toggle.setAttribute('aria-expanded', 'false');
      if (returnFocus?.isConnected) returnFocus.focus();
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMobile();
    });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const targets = [...dialog.querySelectorAll('a[href], button:not([disabled]), summary, [tabindex="0"]')]
        .filter(element => element.getClientRects().length > 0);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });
    dialog.querySelectorAll('a[href]').forEach(link => link.addEventListener('click', closeMobile));
    // Native <dialog> makes the page inert and handles Escape. Tab wraps
    // explicitly so focus also stays predictable inside embedded previews.
    // Native <details> keeps each mobile group keyboard- and no-JS-accessible.
    dialog.querySelectorAll('details').forEach(group => group.addEventListener('toggle', () => {
      if (group.open) dialog.querySelectorAll('details').forEach(other => { if (other !== group) other.open = false; });
    }));
  }
  desktop.addEventListener('change', () => { close(); if (desktop.matches) closeMobile(); });

  const pagePath = path => path.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
  const currentPath = pagePath(location.pathname);
  document.querySelectorAll('.site-menu-panel a[href], .site-mobile a[href]').forEach(link => {
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && !url.hash && pagePath(url.pathname) === currentPath) {
      link.setAttribute('aria-current', 'page');
    }
  });

  // Complete the existing quote tabs' ARIA behavior without touching payloads.
  const tabs = [...document.querySelectorAll('.cu-p6-pill[role="tab"]')];
  const syncTabs = () => tabs.forEach(tab => {
    const selected = tab.getAttribute('aria-selected') === 'true';
    const mode = tab.dataset.mode;
    tab.id = `quote-tab-${mode}`;
    tab.tabIndex = selected ? 0 : -1;
    tab.setAttribute('aria-controls', `quote-panel-${mode}`);
    const section = document.querySelector(`[data-mode-body="${mode}"]`);
    if (section) {
      section.id = `quote-panel-${mode}`;
      section.setAttribute('role', 'tabpanel');
      section.setAttribute('aria-labelledby', tab.id);
    }
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => requestAnimationFrame(syncTabs));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); tabs[next].click(); tabs[next].focus(); }
    });
  });
  syncTabs();

  const progress = [...document.querySelectorAll('.quote-progress li')];
  function showQuoteProgress(step) {
    progress.forEach((item, index) => {
      if (index === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    const help = document.querySelector('.quote-help');
    if (help) help.hidden = step !== 0;
  }
  document.addEventListener('cu:quote-step', event => showQuoteProgress(event.detail.step - 1));
  showQuoteProgress(window.CU_QUOTE?.step() ?? 0);
})();
