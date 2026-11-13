import type { CollectionConfig } from 'payload';
import { isEditor } from '../lib/access';
import { governance, slugField } from '../lib/fields';
import { publicationGuard } from '../lib/hooks';
import { audiences, serviceOptions } from '../lib/services';
export const Jobs: CollectionConfig = {
  slug: 'jobs', admin: { useAsTitle: 'title', group: 'Content', description: 'Create a draft job first. Upload and publish its real photos, then complete and publish the job.' },
  access: { read: isEditor, create: isEditor, update: isEditor, delete: () => false },
  versions: { drafts: true, maxPerDoc: 30 }, hooks: { beforeChange: [publicationGuard('jobs')] },
  fields: [
    slugField, { name: 'title', type: 'text', required: true }, { name: 'summary', type: 'textarea', required: true },
    { name: 'vehicle', type: 'group', fields: [ {name:'year',type:'number',min:1900,max:2100,required:true}, {name:'make',type:'text',required:true}, {name:'model',type:'text',required:true} ] },
    { name: 'services', type: 'select', options: [...serviceOptions], hasMany: true, required: true },
    { name: 'date', type: 'date', required: true, label: 'Actual installation date' },
    { name: 'processNotes', type: 'array', minRows: 3, maxRows: 5, fields: [{ name: 'note', type: 'textarea', required: true }] },
    { name: 'notesAreJobSpecific', type: 'checkbox', defaultValue: false, label: 'These notes describe this particular install, not a generic five-step process' },
    { name: 'before', type: 'upload', relationTo: 'media' }, { name: 'after', type: 'upload', relationTo: 'media' },
    { name: 'photos', type: 'relationship', relationTo: 'media', hasMany: true, maxRows: 8 },
    { name: 'quoteAudience', type: 'select', options: [...audiences], defaultValue: 'retail', required: true }, ...governance,
  ],
};
