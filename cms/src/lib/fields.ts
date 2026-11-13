import type { Field } from 'payload';
import { editorField } from './access';
export const slugField: Field = { name: 'slug', type: 'text', required: true, unique: true, index: true, validate: (v: unknown) => typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) ? true : 'Use lowercase words separated by hyphens.' };
export const governance: Field[] = [
  { name: 'ownerApproved', type: 'checkbox', defaultValue: false, label: 'I verified this record and approve it for publication', access: { read: editorField } },
  { name: 'sourceNote', type: 'textarea', label: 'Internal source / verification note (never public)', access: { read: editorField } },
];
export const reviewDates: Field[] = [
  { name: 'asOf', type: 'date', required: true, label: 'Verified as of', admin: { date: { pickerAppearance: 'dayOnly' } } },
  { name: 'nextOwnerReview', type: 'date', required: true, label: 'Review before', admin: { date: { pickerAppearance: 'dayOnly' } } },
];
