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


/* Present the actual receipt state for all audiences; never alter submission. */
(() => {
  'use strict';
  document.addEventListener('cu:lead-success', event => {
    const detail = event.detail || {};
    const form = document.getElementById(detail.formId);
    const panelId = detail.formId === 'quote-retail' || detail.formId === 'retail'
      ? 'done' : form?.getAttribute('data-success-panel');
    const panel = panelId && document.getElementById(panelId);
    if (!panel) return;
    const copy = panel.querySelector('[data-cu-confirmation-copy]');
    if (copy) copy.textContent = detail.customerConfirmation === true
      ? 'Have photos? Reply to your confirmation email and include your reference.'
      : 'Have photos? Email CapitalUpfitters@gmail.com and include your reference. A confirmation email was not sent.';
    const reference = panel.querySelector('[data-cu-ref-slot]');
    if (reference) reference.textContent = detail.reference
      ? 'Reference: ' + detail.reference
      : 'Reference unavailable. Call (301) 304-1419 if you need to follow up.';
    const warning = panel.querySelector('[data-cu-warning-slot]');
    if (warning) {
      warning.textContent = detail.warning || (detail.deliveryMode === 'persisted_only'
        ? 'Your request was saved, but the shop notification was delayed. Call (301) 304-1419 if your request is urgent.' : '');
      warning.hidden = !warning.textContent;
      warning.classList.toggle('show', Boolean(warning.textContent));
    }
  });
})();
