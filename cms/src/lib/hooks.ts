import { APIError, type CollectionBeforeChangeHook, type GlobalBeforeChangeHook } from 'payload';
import { publicationErrors } from './validation';
export const publicationGuard = (kind: string): CollectionBeforeChangeHook => async ({ data, originalDoc, req }) => {
  const record = { ...originalDoc, ...data };
  if (record._status !== 'published') return data;
  const errors = publicationErrors(kind, record);
  if (kind === 'jobs' && !errors.length) {
    for (const reference of record.photos || []) {
      const id = typeof reference === 'object' ? reference.id : reference;
      const media = await req.payload.findByID({ collection: 'media', id, draft: false, depth: 0, overrideAccess: true, req });
      if (media._status !== 'published' || !media.rightsCleared || media.provenance !== 'real' || String(typeof media.job === 'object' ? media.job?.id : media.job) !== String(record.id || originalDoc?.id)) errors.push('Every photo must be a published, rights-cleared real photo linked to this job.');
    }
  }
  if (errors.length) throw new APIError(errors.join(' '), 400);
  return data;
};
export const businessGuard: GlobalBeforeChangeHook = ({ data, originalDoc }) => {
  const record = { ...originalDoc, ...data };
  if (record._status === 'published') {
    const errors = publicationErrors('business', record);
    if (errors.length) throw new APIError(errors.join(' '), 400);
  }
  return data;
};
