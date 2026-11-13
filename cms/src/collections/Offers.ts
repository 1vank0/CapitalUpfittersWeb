import type { CollectionConfig } from 'payload';
import { isEditor } from '../lib/access';
import { governance, reviewDates, slugField } from '../lib/fields';
import { publicationGuard } from '../lib/hooks';
import { serviceOptions } from '../lib/services';
export const Offers: CollectionConfig = {
  slug: 'offers', admin: { useAsTitle: 'title', group: 'Content' },
  access: { read: isEditor, create: isEditor, update: isEditor, delete: () => false },
  versions: { drafts: true, maxPerDoc: 30 }, hooks: { beforeChange: [publicationGuard('offers')] },
  fields: [
    slugField, { name: 'title', type: 'text', required: true }, { name: 'service', type: 'select', options: [...serviceOptions], required: true },
    { name: 'pricingType', type: 'select', options: ['fixed', 'from', 'quote_required'], required: true },
    { name: 'amount', type: 'number', min: 0 }, { name: 'currency', type: 'select', options: ['USD'], defaultValue: 'USD', required: true },
    { name: 'conditions', type: 'textarea', required: true }, ...reviewDates, ...governance,
  ],
};
