import type { CollectionConfig } from 'payload';
import { isEditor } from '../lib/access';
import { governance } from '../lib/fields';
import { publicationGuard } from '../lib/hooks';
export const Reviews: CollectionConfig = {
  slug: 'reviews', admin: { useAsTitle: 'displayName', group: 'Content' },
  access: { read: isEditor, create: isEditor, update: isEditor, delete: () => false },
  versions: { drafts: true, maxPerDoc: 30 }, hooks: { beforeChange: [publicationGuard('reviews')] },
  fields: [
    { name: 'displayName', type: 'text', required: true }, {name:'quote',type:'textarea',required:true},
    {name:'rating',type:'number',min:1,max:5,required:true}, {name:'date',type:'date',required:true},
    {name:'sourceURL',type:'text',required:true,validate:(v:unknown)=>typeof v==='string' && /^https:\/\//.test(v) ? true : 'Use the source HTTPS URL.'},
    {name:'job',type:'relationship',relationTo:'jobs'},
    {name:'permissionConfirmed',type:'checkbox',defaultValue:false,label:'Permission and source verified for republication'}, ...governance,
  ],
};
