import { isCurrent, publicationErrors, type RecordData } from './validation';
import { audiences, quoteURL, serviceOptions, serviceURL, SITE_ORIGIN } from './services';
export type PublicMedia = { id: string; url: string; alt: string; width: number; height: number; caption?: string };
export type PublicJob = { id: string; slug: string; title: string; vehicle: { year: number; make: string; model: string }; services: string[]; date: string; summary: string; processNotes: string[]; before: PublicMedia; after: PublicMedia; photos: PublicMedia[]; quoteURL: string; serviceURLs: string[]; updatedAt: string };
export type PublicBusiness = { name: string; phone: string; address: { street: string; city: string; state: string; zip: string }; hours: {days:string[];opens:string;closes:string}[]; holidays: {date:string;closed:boolean;opens?:string;closes?:string;note?:string}[]; updatedAt: string };
export type PublicOffer = {slug:string;title:string;service:string;pricingType:string;amount?:number;currency:string;conditions:string;asOf:string;nextOwnerReview:string;updatedAt:string};
export type PublishedContent = {
  schemaVersion: 1; generatedAt: string; business?: PublicBusiness; offers: PublicOffer[]; jobs: PublicJob[];
  reviews: {displayName:string;quote:string;rating:number;date:string;sourceURL:string;jobSlug?:string}[];
  faq: {question:string;answer:string;service?:string}[];
};
const id = (value: any) => String(typeof value === 'object' && value !== null ? value.id : value);
const published = (record: RecordData) => record?._status === 'published';
const validSlug = (v: any) => typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
export function safeAssetURL(value: unknown, serverURL: string, assetOrigin?: string) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value, serverURL);
    if (url.username || url.password || ![new URL(serverURL).origin, assetOrigin].filter(Boolean).includes(url.origin)) return '';
    if (url.protocol !== 'https:' && !(['localhost','127.0.0.1'].includes(url.hostname) && url.protocol === 'http:')) return '';
    return url.href;
  } catch { return ''; }
}
export function projectContent(input: {business?:RecordData;offers:RecordData[];jobs:RecordData[];media:RecordData[];reviews:RecordData[];faq:RecordData[]}, options: {serverURL:string;assetOrigin?:string;now?:Date;absoluteAssetURLs?:boolean}): PublishedContent {
  const now = options.now || new Date();
  const output: PublishedContent = { schemaVersion:1,generatedAt:now.toISOString(),offers:[],jobs:[],reviews:[],faq:[] };
  const b = input.business;
  if (b && published(b) && !publicationErrors('business',b,now).length) output.business = {
    name:b.name,phone:b.phone,address:{street:b.address.street,city:b.address.city,state:b.address.state,zip:b.address.zip},
    hours:(b.hours || []).map((h:RecordData)=>({days:h.days,opens:h.opens,closes:h.closes})),
    holidays:(b.holidays || []).map((h:RecordData)=>({date:h.date.slice(0,10),closed:Boolean(h.closed),...(!h.closed?{opens:h.opens,closes:h.closes}:{}),...(h.note?{note:h.note}:{})})),updatedAt:b.updatedAt,
  };
  for (const o of input.offers) if (published(o) && validSlug(o.slug) && !publicationErrors('offers',o,now).length) output.offers.push({
    slug:o.slug,title:o.title,service:o.service,pricingType:o.pricingType,...(o.pricingType!=='quote_required'?{amount:o.amount}:{}),currency:o.currency,conditions:o.conditions,asOf:o.asOf,nextOwnerReview:o.nextOwnerReview,updatedAt:o.updatedAt,
  });
  const media = new Map<string,{public:PublicMedia;job:string}>();
  for (const m of input.media) {
    const url = safeAssetURL(m.url,options.serverURL,options.assetOrigin);
    if (!published(m) || !m.rightsCleared || !m.privacyChecked || m.provenance !== 'real' || !url || !m.alt || !(m.width>0 && m.height>0)) continue;
    const outputURL = !options.absoluteAssetURLs && new URL(url).origin === new URL(options.serverURL).origin ? new URL(url).pathname + new URL(url).search : url;
    media.set(id(m),{public:{id:id(m),url:outputURL,alt:m.alt,width:m.width,height:m.height,...(m.caption?{caption:m.caption}:{})},job:id(m.job)});
  }
  for (const j of input.jobs) {
    if (!published(j) || !validSlug(j.slug) || publicationErrors('jobs',j,now).length || !j.services?.length || j.services.some((s:string)=>!(serviceOptions as readonly string[]).includes(s)) || !(audiences as readonly string[]).includes(j.quoteAudience)) continue;
    const refs = (j.photos || []).map((ref:any)=>media.get(id(ref)));
    const before=media.get(id(j.before)),after=media.get(id(j.after));
    if (!before || !after || refs.some((p:any)=>!p || p.job!==id(j)) || before.job!==id(j) || after.job!==id(j)) continue;
    output.jobs.push({id:id(j),slug:j.slug,title:j.title,vehicle:{year:j.vehicle.year,make:j.vehicle.make,model:j.vehicle.model},services:j.services,date:j.date,summary:j.summary,processNotes:j.processNotes.map((n:RecordData)=>n.note),before:before.public,after:after.public,photos:refs.map((p:any)=>p.public),quoteURL:quoteURL(j.services[0],j.quoteAudience),serviceURLs:j.services.map(serviceURL),updatedAt:j.updatedAt});
  }
  for (const r of input.reviews) if (published(r) && !publicationErrors('reviews',r,now).length) {
    let sourceURL;
    try { const url=new URL(r.sourceURL); if(url.protocol!=='https:'||url.username||url.password)continue;sourceURL=url.href; } catch {continue;}
    const job=output.jobs.find(j=>j.id===id(r.job));
    output.reviews.push({displayName:r.displayName,quote:r.quote,rating:r.rating,date:r.date,sourceURL,...(job?{jobSlug:job.slug}:{})});
  }
  for (const f of input.faq) if (published(f) && f.ownerApproved) output.faq.push({question:f.question,answer:f.answer,...(f.service?{service:f.service}:{})});
  return output;
}
const dayNames:Record<string,string>={Mo:'Monday',Tu:'Tuesday',We:'Wednesday',Th:'Thursday',Fr:'Friday',Sa:'Saturday',Su:'Sunday'};
export function businessSchema(b: PublicBusiness) {
  return {'@context':'https://schema.org','@type':'AutoRepair','@id':`${SITE_ORIGIN}/#business`,name:b.name,telephone:b.phone,url:SITE_ORIGIN,
    address:{'@type':'PostalAddress',streetAddress:b.address.street,addressLocality:b.address.city,addressRegion:b.address.state,postalCode:b.address.zip,addressCountry:'US'},
    openingHoursSpecification:b.hours.map(h=>({'@type':'OpeningHoursSpecification',dayOfWeek:h.days.map(d=>`https://schema.org/${dayNames[d]}`),opens:h.opens,closes:h.closes})),
    specialOpeningHoursSpecification:b.holidays.map(h=>({'@type':'OpeningHoursSpecification',validFrom:h.date,validThrough:h.date,opens:h.closed?'00:00':h.opens,closes:h.closed?'00:00':h.closes})),
  };
}
export const offerSchema = (o:PublicOffer) => o.pricingType==='quote_required' ? null : ({'@context':'https://schema.org','@type':'Offer','@id':`${SITE_ORIGIN}/#offer-${o.slug}`,name:o.title,description:o.conditions,priceCurrency:o.currency,priceValidUntil:o.nextOwnerReview.slice(0,10),url:serviceURL(o.service),...(o.pricingType==='from'?{priceSpecification:{'@type':'PriceSpecification',minPrice:o.amount,priceCurrency:o.currency}}:{price:o.amount})});
export const xmlEscape = (s:string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export const gallerySitemap = (content:PublishedContent) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${content.jobs.map(j=>`<url><loc>${xmlEscape(`${SITE_ORIGIN}/gallery/${j.slug}`)}</loc><lastmod>${xmlEscape(j.updatedAt)}</lastmod></url>`).join('')}</urlset>\n`;
