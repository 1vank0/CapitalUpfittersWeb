/* Labels follow the backend record; image URLs remain stable named slots. */
(() => {
  'use strict';
  const figures = [...document.querySelectorAll('[data-media-slot]')];
  if (!figures.length) return;
  figures.forEach(figure => {
    const image = figure.querySelector('img');
    const unavailable = () => {
    figure.classList.add('media-unavailable');
    const caption = figure.querySelector('figcaption');
    if (caption) { caption.hidden = false; caption.textContent = 'Image temporarily unavailable'; }
    };
    image?.addEventListener('error', unavailable);
    if (image?.complete && image.currentSrc && image.naturalWidth === 0) unavailable();
  });
  fetch('/api/media', { credentials: 'omit' })
    .then(response => { if (!response.ok) throw new Error('Media unavailable'); return response.json(); })
    .then(data => {
      const records = new Map((data.slots || []).map(item => [item.slot, item.current]));
      figures.forEach(figure => {
        const record = records.get(figure.dataset.mediaSlot);
        if (!record) return;
        const image = figure.querySelector('img');
        const caption = figure.querySelector('figcaption');
        if (image) image.alt = record.alt;
        if (caption && !figure.classList.contains('media-unavailable')) {
          caption.hidden = record.kind === 'photo';
          caption.textContent = record.kind === 'illustration' ? 'Illustrative image' : '';
        }
      });
    }).catch(() => { /* Stable image endpoints still work when labels cannot refresh. */ });
})();
