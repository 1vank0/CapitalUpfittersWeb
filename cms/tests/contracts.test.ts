import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync,existsSync } from 'node:fs';
import { isCurrent,publicationErrors } from '../src/lib/validation';
import { runtimeConfig } from '../src/lib/runtime';
import { projectContent,businessSchema,offerSchema,gallerySitemap,safeAssetURL } from '../src/lib/projection';
import { quoteURL,serviceOptions,serviceURL } from '../src/lib/services';
const now=new Date('2026-11-13T12:00:00Z');
const governance={_status:'published',ownerApproved:true,asOf:'2026-11-01',nextOwnerReview:'2027-02-01',sourceNote:'PRIVATE',updatedAt:now.toISOString()};
const business={...governance,name:'Test Shop',phone:'TEST',address:{street:'Test Street',city:'Test City',state:'MD',zip:'00000'},hours:[{days:['Mo','Tu'],opens:'09:30',closes:'16:30'}],holidays:[{date:'2026-12-25',closed:true},{date:'2026-12-24',closed:false,opens:'09:30',closes:'13:00'}]};
const offer={...governance,slug:'test-offer',title:'Test Offer',service:'bedliner',pricingType:'from',amount:123,currency:'USD',conditions:'TEST ONLY'};
const job={...governance,id:1,slug:'test-vehicle-job',title:'Test job',vehicle:{year:2025,make:'Test',model:'Vehicle'},services:['bedliner'],date:'2026-11-01',summary:'Test summary',processNotes:[{note:'First specific fixture process note.'},{note:'Second specific fixture process note.'},{note:'Third specific fixture process note.'}],notesAreJobSpecific:true,photos:[1,2,3,4],before:1,after:2,quoteAudience:'retail'};
const media=[1,2,3,4].map(id=>({_status:'published',id,job:1,rightsCleared:true,privacyChecked:true,provenance:'real',url:`https://assets.example.com/test-${id}.webp`,alt:`Test image ${id}`,width:1600,height:1200,sourceNote:'PRIVATE'}));
const input={business,offers:[offer],jobs:[job],media,reviews:[],faq:[]};
const options={serverURL:'http://localhost:3100',assetOrigin:'https://assets.example.com',now};
test('date governance blocks old prices, future unverified prices and unchecked records',()=>{
  assert.equal(isCurrent(governance,now),true);
  for (const changes of [{nextOwnerReview:'2026-11-12'},{asOf:'2026-11-14'},{ownerApproved:false}]) assert.ok(publicationErrors('offers',{...offer,...changes},now).length);
  assert.equal(projectContent({...input,offers:[{...offer,nextOwnerReview:'2026-11-12'}]},options).offers.length,0);
});
test('published projection is minimal and omits private sources, drafts, rights failures and wrong-job photos',()=>{
  const output=projectContent(input,options);assert.equal(output.jobs.length,1);assert.equal(output.offers.length,1);assert.ok(!JSON.stringify(output).includes('PRIVATE'));
  for (const changes of [{_status:'draft'},{rightsCleared:false},{privacyChecked:false},{provenance:'illustration'},{job:99},{url:'https://evil.example/a.webp'}]) {
    assert.equal(projectContent({...input,media:[{...media[0],...changes},...media.slice(1)]},options).jobs.length,0);
  }
  assert.equal(projectContent({...input,jobs:[{...job,_status:'draft'}]},options).jobs.length,0);
});
test('job publication requires four photos, before/after and genuine specific notes',()=>{
  for (const changes of [{photos:[1,2]},{before:2},{processNotes:[{note:'Generic'}]},{notesAreJobSpecific:false},{date:'2027-01-01'}]) assert.ok(publicationErrors('jobs',{...job,...changes},now).length);
});
test('holiday and offer schema are derived from the same public values; no review aggregate invented',()=>{
  const out=projectContent(input,options); const schema=businessSchema(out.business!);
  assert.equal(schema.name,out.business!.name);
  assert.deepEqual(schema.specialOpeningHoursSpecification[0],{'@type':'OpeningHoursSpecification',validFrom:'2026-12-25',validThrough:'2026-12-25',opens:'00:00',closes:'00:00'});
  const priceSchema=offerSchema(out.offers[0]);
  assert.ok(priceSchema && 'priceSpecification' in priceSchema);
  assert.equal(priceSchema.priceSpecification.minPrice,out.offers[0].amount);
  assert.equal(offerSchema({...out.offers[0],pricingType:'quote_required'}),null);
  assert.ok(!('aggregateRating' in schema));
  assert.match(gallerySitemap(out),/\/gallery\/test-vehicle-job/);
  assert.doesNotMatch(gallerySitemap(out),/\.html|\/gallery\/\d+\/\d+/);
});
test('asset allowlist rejects credentials, unexpected origins and unsafe schemes',()=>{
  for (const value of ['javascript:alert(1)','https://u:p@assets.example.com/a.webp','https://evil.example/a.webp']) assert.equal(safeAssetURL(value,options.serverURL,options.assetOrigin),'');
  assert.equal(safeAssetURL('/api/media/file/a.webp',options.serverURL),'http://localhost:3100/api/media/file/a.webp');
});
test('runtime refuses production, reused implicit database settings and hosted filesystem fallback',()=>{
  const env={CMS_DEPLOYMENT_SCOPE:'local',PAYLOAD_SECRET:'a'.repeat(32)};
  assert.equal(runtimeConfig(env).databaseURL,undefined);
  assert.equal(runtimeConfig({...env,DATABASE_URL:'postgres://lead-system'}).databaseURL,undefined);
  for (const changes of [{VERCEL_ENV:'production'},{VERCEL:'1'},{CMS_DEPLOYMENT_SCOPE:'preview'},{PAYLOAD_SECRET:''},{CMS_SERVER_URL:'https://example.com'}]) assert.throws(()=>runtimeConfig({...env,...changes}));
});
test('quote links preserve existing audiences and all service targets exist',()=>{
  assert.equal(new URL(quoteURL('bedliner','retail')).searchParams.get('audience'),'retail');
  assert.throws(()=>quoteURL('bedliner','residential'));
  for (const service of serviceOptions) assert.ok(existsSync(`..${new URL(serviceURL(service)).pathname}.html`),service);
  const rootPackage=JSON.parse(readFileSync('../package.json','utf8'));
  assert.equal(rootPackage.dependencies.payload,undefined);
});
test('Neon preview requires complete private storage configuration and a valid branch endpoint',()=>{
  const env={CMS_DEPLOYMENT_SCOPE:'preview',PAYLOAD_SECRET:'a'.repeat(32),CMS_SERVER_URL:'https://cms.example.com',CMS_DATABASE_URL:'postgres://fixture',CMS_STORAGE_PROVIDER:'neon',CMS_S3_BUCKET:'cms-media',CMS_S3_ENDPOINT:'https://br-test.storage.c-15.us-east-1.aws.neon.tech',CMS_S3_REGION:'us-east-1',CMS_S3_ACCESS_KEY_ID:'fixture',CMS_S3_SECRET_ACCESS_KEY:'fixture'};
  assert.equal(runtimeConfig(env).s3,true);
  assert.throws(()=>runtimeConfig({...env,CMS_S3_SECRET_ACCESS_KEY:''}));
  assert.throws(()=>runtimeConfig({...env,CMS_S3_ENDPOINT:'https://evil.example.com'}));
});
