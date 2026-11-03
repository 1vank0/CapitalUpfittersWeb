/* Explain existing quote state; service choices and submission stay in quote.js. */
(() => {
  'use strict';
  const grid = document.getElementById('grid');
  const context = document.getElementById('quote-service-context');
  const label = document.getElementById('quote-service-context-label');
  if (!grid || !context || !label) return;
  function update() {
    const selected = [...grid.querySelectorAll('.tile[data-svc][aria-checked="true"]')];
    context.hidden = selected.length === 0;
    if (!selected.length) return;
    const first = selected[0].querySelector('.t-name')?.textContent.trim() || 'Your service';
    label.textContent = selected.length === 1
      ? `${first} is already selected.`
      : `${selected.length} services are already selected.`;
  }
  new MutationObserver(update).observe(grid, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-checked'] });
  update();
})();
