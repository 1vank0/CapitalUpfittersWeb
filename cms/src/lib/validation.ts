export type RecordData = Record<string, any>;
export const dateOnly = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) && Number.isFinite(Date.parse(value)) ? value.slice(0, 10) : '';
export function isCurrent(record: RecordData, now = new Date()) {
  const today = now.toISOString().slice(0, 10), asOf = dateOnly(record.asOf), next = dateOnly(record.nextOwnerReview);
  return Boolean(asOf && next && asOf <= today && next >= today && next >= asOf);
}
export function publicationErrors(kind: string, data: RecordData, now = new Date()): string[] {
  const errors: string[] = [];
  if (!data.ownerApproved) errors.push('Owner approval is required before publication.');
  if (['business', 'offers'].includes(kind) && !isCurrent(data, now)) errors.push('Use a verified as-of date and a current next owner review date.');
  if (kind === 'offers') {
    if (!['fixed', 'from', 'quote_required'].includes(data.pricingType)) errors.push('Choose a pricing type.');
    if (data.pricingType !== 'quote_required' && (!Number.isFinite(data.amount) || data.amount < 0)) errors.push('Enter a valid price.');
    if (!data.conditions?.trim()) errors.push('State the price conditions.');
    if (data.currency !== 'USD') errors.push('Currency must be USD.');
  }
  if (kind === 'jobs') {
    const notes = (data.processNotes || []).map((n: RecordData) => n.note?.trim() || '');
    if (notes.length < 3 || notes.length > 5 || notes.some((n: string) => n.length < 20) || new Set(notes).size !== notes.length) errors.push('Provide 3–5 distinct, specific installation notes of at least 20 characters.');
    if (!data.notesAreJobSpecific) errors.push('Confirm that these process notes describe this actual installation, not a generic template.');
    if (!data.vehicle?.year || !data.vehicle?.make?.trim() || !data.vehicle?.model?.trim()) errors.push('Enter the actual vehicle.');
    if (!dateOnly(data.date) || dateOnly(data.date) > now.toISOString().slice(0, 10)) errors.push('Enter the actual completed-job date.');
    const ids = (data.photos || []).map((p: any) => typeof p === 'object' ? p.id : p);
    if (ids.length < 4 || ids.length > 8 || new Set(ids).size !== ids.length) errors.push('Choose 4–8 different genuine job photos.');
    if (!data.before || !data.after || String(typeof data.before === 'object' ? data.before.id : data.before) === String(typeof data.after === 'object' ? data.after.id : data.after)) errors.push('Choose different before and after photos.');
    for (const photo of [data.before, data.after]) if (photo && !ids.map(String).includes(String(typeof photo === 'object' ? photo.id : photo))) errors.push('Include both comparison photos in the job photo selection.');
  }
  if (kind === 'business') {
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const entry of [...(data.hours || []), ...(data.holidays || []).filter((h: RecordData) => !h.closed)]) {
      if (!time.test(entry.opens) || !time.test(entry.closes) || entry.opens >= entry.closes) errors.push('Hours require HH:MM opening and closing times in chronological order.');
    }
    const days = (data.hours || []).flatMap((h: RecordData) => h.days || []);
    if (!days.length || new Set(days).size !== days.length) errors.push('Each regular opening day must appear once.');
    const dates = (data.holidays || []).map((h: RecordData) => dateOnly(h.date));
    if (dates.includes('') || new Set(dates).size !== dates.length) errors.push('Holiday dates must be valid and unique.');
  }
  if (kind === 'reviews' && !data.permissionConfirmed) errors.push('Confirm permission to republish the review.');
  return errors;
}
