(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let accessKey = '';
  let current = null;
  let candidate = null;
  let busy = false;
  let selectionRequest = 0;
  function status(message, error = false) { $('media-status').textContent = message; $('media-status').classList.toggle('is-error', error); }
  function working(value) {
    busy = value;
    ['media-slot', 'media-file', 'media-alt', 'media-kind', 'media-focus', 'media-preview-button', 'media-publish', 'media-discard'].forEach(id => { $(id).disabled = value; });
    document.querySelectorAll('#media-history-list button').forEach(button => { button.disabled = value || button.dataset.current === 'true'; });
    $('media-workspace').setAttribute('aria-busy', String(value));
  }
  function lock() {
    selectionRequest++;
    accessKey = ''; current = null; candidate = null;
    $('media-workspace').hidden = true; $('media-sign-out').hidden = true; $('media-unlock').hidden = false;
    $('media-access-key').value = ''; $('media-history-list').replaceChildren();
    $('media-preview').removeAttribute('src'); $('media-preview').hidden = true;
    $('media-access-key').focus(); status('Image manager locked.');
  }
  async function request(path = '', body) {
    const response = await fetch('/api/media-admin' + path, {
      method: body ? 'POST' : 'GET', credentials: 'omit', cache: 'no-store',
      headers: { Authorization: 'Bearer ' + accessKey, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json();
    if (!response.ok) { if (response.status === 401) lock(); throw new Error(data.error || 'The image request failed.'); }
    return data;
  }
  function preview(record, draft = false) {
    candidate = draft ? record : null;
    $('media-preview-title').textContent = draft ? 'Preview before publishing' : 'Current image';
    $('media-preview').hidden = !record;
    if (record) { $('media-preview').src = record.sources['1200']; $('media-preview').alt = record.alt; }
    else $('media-preview').removeAttribute('src');
    $('media-preview-caption').textContent = record ? (record.kind === 'illustration' ? 'Illustrative image' : 'Actual photo') : 'No image published yet.';
    $('media-draft-note').textContent = draft ? 'This preview is saved, but the website still uses its current image.' : '';
    $('media-publish').hidden = !draft; $('media-discard').hidden = !draft;
  }
  async function loadSlot() {
    const slot = $('media-slot').value;
    const run = ++selectionRequest;
    status('Loading image versions…');
    const data = await request('?slot=' + encodeURIComponent(slot));
    if (run !== selectionRequest || !accessKey) return;
    current = data.current; preview(current);
    $('media-alt').value = current?.alt || '';
    $('media-kind').value = current?.kind || 'photo'; $('media-focus').value = current?.focus || 'centre'; $('media-file').value = '';
    $('media-history-list').replaceChildren();
    data.history.forEach(record => {
      const item = document.createElement('article');
      const image = document.createElement('img'); image.src = record.sources['768']; image.alt = record.alt; image.loading = 'lazy'; image.width = 240; image.height = 160;
      const info = document.createElement('p'); info.textContent = `${new Date(record.createdAt).toLocaleString()} · ${record.kind === 'photo' ? 'Actual photo' : 'Illustration'}${record.version === current?.version ? ' · Current' : ''}`;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-secondary btn-sm'; button.textContent = 'Preview version'; button.disabled = record.version === current?.version; button.dataset.current = String(button.disabled);
      button.addEventListener('click', () => { if (!busy) { preview(record, true); status('Previous version loaded for review.'); $('media-preview-title').scrollIntoView({ block: 'center', behavior: 'smooth' }); } });
      item.append(image, info, button); $('media-history-list').append(item);
    });
    status('Image slot loaded.');
  }
  async function optimizedBase64(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20000000) throw new Error('Choose a JPG, PNG or WebP under 20 MB.');
    const bitmap = await createImageBitmap(file);
    if (bitmap.width < 600 || bitmap.height < 400 || bitmap.width * bitmap.height > 40000000) { bitmap.close(); throw new Error('Choose an image at least 600 × 400 pixels and under 40 megapixels.'); }
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .88));
    if (!blob || blob.size > 2500000) throw new Error('This photo is still too large. Try a smaller image.');
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Could not read this file.')); reader.readAsDataURL(blob); });
  }
  $('media-unlock').addEventListener('submit', async event => {
    event.preventDefault(); accessKey = $('media-access-key').value.trim(); status('Checking access…');
    const button = event.currentTarget.querySelector('button'); button.disabled = true;
    try {
      await request('?session=1'); $('media-access-key').value = '';
      const data = await request();
      $('media-slot').replaceChildren(...data.slots.map(item => { const option = document.createElement('option'); option.value = item.slot; option.textContent = item.label; return option; }));
      $('media-unlock').hidden = true; $('media-workspace').hidden = false; $('media-sign-out').hidden = false; await loadSlot();
    } catch (error) { accessKey = ''; $('media-access-key').value = ''; status(error.message, true); }
    finally { button.disabled = false; }
  });
  $('media-sign-out').addEventListener('click', lock);
  $('media-slot').addEventListener('change', () => loadSlot().catch(error => status(error.message, true)));
  $('media-editor').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const file = $('media-file').files[0]; if (!file) return status('Choose a replacement image first.', true);
    working(true); status('Optimizing and uploading a preview…');
    try {
      const base64 = await optimizedBase64(file);
      const data = await request('', { action: 'upload', slot: $('media-slot').value, base64, alt: $('media-alt').value.trim(), kind: $('media-kind').value, focus: $('media-focus').value });
      preview(data.record, true); status('Preview ready. Check the crop before publishing.');
    } catch (error) { status(error.message, true); }
    finally { working(false); }
  });
  $('media-publish').addEventListener('click', async () => {
    if (busy || !candidate) return;
    working(true); status('Publishing image…');
    try {
      await request('', { action: 'publish', slot: $('media-slot').value, version: candidate.version, expectedVersion: current?.version || null });
      await loadSlot(); status('Published. This image is now used across the website.');
    } catch (error) { status(error.message, true); }
    finally { working(false); }
  });
  $('media-discard').addEventListener('click', () => { preview(current); status('Kept the current website image.'); });
  ['media-alt','media-kind','media-focus'].forEach(id => $(id).addEventListener('input', () => {
    if (candidate) { candidate = null; $('media-publish').hidden = true; $('media-draft-note').textContent = 'Upload and preview again to apply your changes before publishing.'; }
  }));
  window.addEventListener('pagehide', () => { accessKey = ''; });
  window.addEventListener('pageshow', event => { if (event.persisted) lock(); });
})();
