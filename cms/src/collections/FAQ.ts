import type { CollectionConfig } from 'payload';
import { isEditor } from '../lib/access';
import { governance } from '../lib/fields';
import { publicationGuard } from '../lib/hooks';
import { serviceOptions } from '../lib/services';
export const FAQ: CollectionConfig = {
  slug: 'faq', admin: { useAsTitle: 'question', group: 'Content' },
  access: { read: isEditor, create: isEditor, update: isEditor, delete: () => false },
  versions: { drafts: true, maxPerDoc: 30 }, hooks: { beforeChange: [publicationGuard('faq')] },
  fields: [{name:'question',type:'text',required:true},{name:'answer',type:'textarea',required:true},{name:'service',type:'select',options:[...serviceOptions]},...governance],
};
