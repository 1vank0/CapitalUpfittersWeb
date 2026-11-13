import type { GlobalConfig } from 'payload';
import { isEditor } from '../lib/access';
import { governance, reviewDates } from '../lib/fields';
import { businessGuard } from '../lib/hooks';
export const Business: GlobalConfig = {
  slug: 'business', admin: { group: 'Content' }, access: { read: isEditor, update: isEditor }, versions: { drafts: true, max: 30 }, hooks: { beforeChange: [businessGuard] },
  fields: [
    {name:'name',type:'text',required:true},{name:'phone',type:'text',required:true},
    {name:'address',type:'group',fields:[{name:'street',type:'text',required:true},{name:'city',type:'text',required:true},{name:'state',type:'text',required:true},{name:'zip',type:'text',required:true}]},
    {name:'hours',type:'array',fields:[{name:'days',type:'select',hasMany:true,options:['Mo','Tu','We','Th','Fr','Sa','Su'],required:true},{name:'opens',type:'text',required:true},{name:'closes',type:'text',required:true}]},
    {name:'holidays',type:'array',fields:[{name:'date',type:'date',required:true},{name:'closed',type:'checkbox',defaultValue:true},{name:'opens',type:'text'},{name:'closes',type:'text'},{name:'note',type:'text'}]},
    ...reviewDates, ...governance,
  ],
};
