import { getPayload, type CollectionSlug } from 'payload';
import config from '@payload-config';
import { projectContent } from './projection';
import type { RecordData } from './validation';
export async function getPublishedContent(options: {absoluteAssetURLs?:boolean} = {}) {
  const payload = await getPayload({ config });
  const all = async (collection: CollectionSlug):Promise<RecordData[]> => {
    const docs:RecordData[]=[]; let page=1;
    while (true) {
      const result=await payload.find({collection,where:{_status:{equals:'published'}},draft:false,depth:0,limit:100,page,sort:'-updatedAt',overrideAccess:true});
      docs.push(...result.docs);
      if(!result.hasNextPage) return docs;
      page++;
    }
  };
  const [business,offers,jobs,media,reviews,faq] = await Promise.all([
    payload.findGlobal({slug:'business',draft:false,depth:0,overrideAccess:true}),all('offers'),all('jobs'),all('media'),all('reviews'),all('faq'),
  ]);
  return projectContent({business,offers,jobs,media,reviews,faq},{serverURL:process.env.CMS_SERVER_URL || 'http://localhost:3100',assetOrigin:process.env.CMS_ASSET_ORIGIN,...options});
}
