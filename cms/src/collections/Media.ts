import path from 'node:path';
import sharp from 'sharp';
import { APIError, type CollectionConfig } from 'payload';
import { isEditor, mediaRead, editorField } from '../lib/access';
export const Media: CollectionConfig = {
  slug: 'media', admin: { useAsTitle: 'alt', group: 'Content', description: 'Only upload real job photos already cleared for public use. Blob originals and draft files are public by URL. Never upload private customer details, readable plates or raw camera files.' },
  access: { read: mediaRead, create: isEditor, update: isEditor, delete: () => false },
  versions: { drafts: true, maxPerDoc: 20 },
  upload: {
    staticDir: process.env.CMS_LOCAL_MEDIA_DIR || path.resolve(process.cwd(), '.data/media'),
    constructorOptions: { limitInputPixels: 40_000_000 }, crop: false, focalPoint: false,
    mimeTypes: ['image/jpeg','image/png','image/webp'],
    formatOptions: { format: 'webp', options: { quality: 85 } },
    resizeOptions: { width: 2400, withoutEnlargement: true },
    imageSizes: [
      { name: 'card', width: 640, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 82 } } },
      { name: 'hero', width: 1600, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 85 } } },
    ], adminThumbnail: 'card',
  },
  hooks: {
    beforeOperation: [async ({ args, operation, req, overrideAccess }) => {
      if (operation !== 'create' && operation !== 'update') return args;
      if (!overrideAccess && !isEditor({req})) throw new APIError('Authentication required.',403);
      if (operation === 'update') {
        if (req.file || req.query?.uploadEdits || args.data?.focalX || args.data?.focalY) throw new APIError('Uploaded files are immutable. Upload a new media record and select it on the job; existing versions keep their original files.',400);
        // Metadata updates must never rewrite file paths, storage prefixes or size records.
        const allowed = new Set(['alt','caption','job','role','provenance','rightsCleared','privacyChecked','sourceNote','_status']);
        args.data = Object.fromEntries(Object.entries(args.data || {}).filter(([key])=>allowed.has(key)));
        return args;
      }
      if (!req.file) throw new APIError('Upload a new JPG, PNG or WebP file. Remote-file import is disabled.',400);
      const record=args.data;
      if (!record.rightsCleared || !record.privacyChecked || record.provenance !== 'real') throw new APIError('Before uploading, confirm real photography, permission for public use, and removal of plates and personal details. Draft files are not private storage.',400);
      if (req.file.size > 3_000_000) throw new APIError('Use an image under 3 MB.',400);
      let metadata;
      try { metadata=await sharp(req.file.data,{limitInputPixels:40_000_000}).metadata(); } catch { throw new APIError('Use a readable JPG, PNG or WebP image.',400); }
      if (!['jpeg','png','webp'].includes(metadata.format || '') || (metadata.pages || 1)>1 || (metadata.width || 0)<600 || (metadata.height || 0)<400) throw new APIError('Use a nonanimated real photograph at least 600 × 400 pixels.',400);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.(jpg|jpeg|png|webp)$/i.test(req.file.name) || /^(IMG|DSC|DSCF)[-_]?\d/i.test(req.file.name)) throw new APIError('Use a descriptive filename such as f150-bedliner-before.jpg.',400);
      return args;
    }],
    beforeValidate: [({ data, originalDoc }) => {
      const record={...originalDoc,...data};
      if (!record.rightsCleared || !record.privacyChecked || record.provenance!=='real') throw new APIError('Only rights-cleared real job photography belongs in this public asset library. Unpublish a record to remove it from the gallery; its asset URL remains public.',400);
      return data;
    }],
  },
  fields: [
    {name:'alt',type:'text',required:true,minLength:5,maxLength:250}, {name:'caption',type:'text',maxLength:300},
    {name:'job',type:'relationship',relationTo:'jobs',required:true},
    {name:'role',type:'select',options:['before','during','after','detail'],required:true},
    {name:'provenance',type:'select',options:['real'],required:true,label:'Real Capital Upfitters job photography'},
    {name:'rightsCleared',type:'checkbox',required:true,label:'Approved for public website use, including draft file URLs'},
    {name:'privacyChecked',type:'checkbox',required:true,label:'Plates and personal identifying details removed'},
    {name:'sourceNote',type:'textarea',label:'Internal rights/source record',access:{read:editorField}},
  ],
};
