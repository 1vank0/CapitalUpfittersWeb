import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getPublishedContent } from '../src/lib/content';
import { businessSchema, offerSchema, gallerySitemap } from '../src/lib/projection';
const content=await getPublishedContent({absoluteAssetURLs:true});
if (!content.business) throw new Error('No current owner-approved business record. Export refused; existing website must remain unchanged.');
const directory=path.resolve('exports');
await mkdir(directory,{recursive:true});
await Promise.all([
  writeFile(path.join(directory,'published-content.json'),JSON.stringify(content,null,2)+'\n'),
  writeFile(path.join(directory,'business.jsonld'),JSON.stringify(businessSchema(content.business),null,2)+'\n'),
  writeFile(path.join(directory,'offers.jsonld'),JSON.stringify(content.offers.map(offerSchema).filter(Boolean),null,2)+'\n'),
  writeFile(path.join(directory,'sitemap-gallery.xml'),gallerySitemap(content)),
  writeFile(path.join(directory,'gbp-business-reference.json'),JSON.stringify(content.business,null,2)+'\n'),
]);
console.log(`Exported ${content.offers.length} current offers and ${content.jobs.length} qualified jobs to cms/exports. No website, sitemap, GBP listing or deployment was changed.`);
process.exit(0);
