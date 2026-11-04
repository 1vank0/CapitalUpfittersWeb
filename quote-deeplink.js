
/* ============================================================
   Phase 6B: URL-param deep-linking for the retail form
   Populates Year / Make / Model from ?year=…&make=…&model=… and
   pre-selects a service tile from ?service=<slug>.
   ============================================================ */
(function () {
  'use strict';
  const params = new URLSearchParams(window.location.search);
  const pYear  = params.get('year');
  const pMake  = params.get('make');
  const pModel = params.get('model');
  const pSvc   = params.get('service');

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  }
  if (pYear) {
    const ys = document.getElementById('f-year');
    if (ys && ![...ys.options].some(o => o.value === pYear) && /^(19|20)\d\d$/.test(pYear)) {
      const o = document.createElement('option'); o.value = o.textContent = pYear; ys.appendChild(o);
    }
    setValue('f-year', pYear);
  }
  if (pMake) {
    const ms = document.getElementById('f-make-sel');
    const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
    const hit = [...ms.options].find(o => o.value && o.value !== 'Other' &&
      (norm(o.value) === norm(pMake) || (norm(pMake) === 'chevy' && o.value === 'Chevrolet') ||
       (norm(pMake).startsWith('mercedes') && o.value === 'Mercedes-Benz')));
    if (hit) ms.value = hit.value;
    else { ms.value = 'Other'; setValue('f-make-other', pMake); }
  }
  setValue('f-model', pModel);
  if (window.CU_QUOTE) {
    window.CU_QUOTE.syncMake();
    // Vehicle already known (e.g. from the homepage fit finder): start at services
    if (pYear && pMake && pModel) window.CU_QUOTE.goStep(1, true);
    else window.CU_QUOTE.goStep(0, true);
  }

  // Carry product intent in the existing notes contract, not a new API field.
  // Values remain plain text, are bounded, and never replace restored customer input.
  const notes = document.getElementById('f-notes');
  const contextFields = [
    ['product', 'Product requested', 80],
    ['purchase_status', 'Parts status', 100],
    ['intended_use', 'Intended use', 140],
    ['part_details', 'Part / fitment details', 180]
  ];
  const context = contextFields.map(([key, label, max]) => {
    const value = (params.get(key) || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
    return value ? label + ': ' + value : '';
  }).filter(Boolean).join('\n');
  if (notes && context && !notes.value.trim()) notes.value = context;

  // Pre-select a service tile if ?service=<slug> matches a Patriot service id
  if (pSvc) {
    const raw = pSvc.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Site pages use descriptive slugs; map them to the quote tile ids.
    const ALIASES = { runningboards: 'boards', powersteps: 'boards', amppowerstep: 'boards', ampresearch: 'boards', hitches: 'hitch', stealthhitch: 'hitch', stealthhitches: 'hitch', stealthhitchrack: 'hitch', stealthhitchcombo: 'hitch', ecohitch: 'hitch', tonneaucovers: 'tonneau', bakflip: 'tonneau', retrax: 'tonneau' };
    const slug = ALIASES[raw] || raw;
    // Wait for the grid to render, then click the tile whose data-id matches
    const clickTile = () => {
      const tiles = document.querySelectorAll('.tile[data-svc]');
      let clicked = false;
      tiles.forEach(t => {
        const tid = (t.dataset.svc || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!clicked && (tid === slug || tid.startsWith(slug) || slug.startsWith(tid))) {
          t.click();
          // A known bed-cover model supplies the existing option choice, still editable.
          // Do not infer fitment, pricing, or a cover type from arbitrary URL text.
          const coverTypes = {
            'TruXedo TruXport': 'soft', 'TruXedo Pro X15': 'soft',
            'Westin Hard Tri-Fold': 'trifold', 'BAKFlip MX4': 'trifold',
            'RetraxPRO MX': 'retrax'
          };
          const product = params.get('product');
          const coverType = Object.prototype.hasOwnProperty.call(coverTypes, product) ? coverTypes[product] : null;
          if (tid === 'tonneau' && coverType) {
            const option = document.querySelector('.opt[data-svc="tonneau"][data-kind="base"][data-opt="' + coverType + '"]');
            if (option && option.getAttribute('aria-checked') !== 'true') option.click();
          }
          clicked = true;
        }
      });
      return clicked;
    };
    if (!clickTile()) {
      // Retry once after DOM settles (Patriot script builds tiles at end of body)
      setTimeout(clickTile, 100);
    }
  }
})();
