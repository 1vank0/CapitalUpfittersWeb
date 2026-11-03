/* Presentation-only filters. All service links remain available without JS. */
(() => {
  'use strict';
  const grid = document.getElementById('services-hub-grid');
  const filters = document.querySelector('.services-directory .svc-filter-tabs');
  const status = document.getElementById('service-results');
  if (!grid || !filters || !status) return;
  const cards = [...grid.querySelectorAll('.service-hub-card')];
  const buttons = [...filters.querySelectorAll('[data-filter]')];
  function select(button) {
    const category = button.dataset.filter;
    let count = 0;
    cards.forEach(card => {
      card.hidden = !card.dataset.category.split(/\s+/).includes(category);
      if (!card.hidden) count++;
    });
    buttons.forEach(item => {
      const selected = item === button;
      item.setAttribute('aria-pressed', String(selected));
      item.classList.toggle('active', selected);
    });
    status.textContent = `${count} ${count === 1 ? 'service' : 'services'}${category === 'all' ? '' : ` · ${button.textContent.trim()}`}`;
  }
  buttons.forEach(button => button.addEventListener('click', () => select(button)));
  filters.hidden = false;
  select(buttons.find(button => button.getAttribute('aria-pressed') === 'true') || buttons[0]);
})();
