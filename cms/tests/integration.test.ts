import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp,rm,readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import type { Media } from '../src/payload-types';

test('isolated Payload database: roles, draft isolation, publish gates and media relationships',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'cu-payload-test-'));
  process.env.CMS_DEPLOYMENT_SCOPE='local';
  process.env.PAYLOAD_SECRET='synthetic-integration-test-secret-not-for-use';
  process.env.CMS_LOCAL_DATABASE=`file:${directory}/content.db`;
  process.env.CMS_LOCAL_MEDIA_DIR=path.join(directory,'media');
  const {getPayload}=await import('payload');
  const {default:config}=await import('../src/payload.config');
  const payload=await getPayload({config});
  try {
    await assert.rejects(()=>payload.create({collection:'users',data:{email:'intruder@example.invalid',password:'not-a-real-password',role:'admin'}}),/Public registration is disabled/);
    const admin=await payload.create({collection:'users',data:{email:'admin@example.invalid',password:'synthetic-test-only-password',role:'admin'},context:{trustedBootstrap:true}});
    const user={...admin,collection:'users' as const};
    const editor=await payload.create({collection:'users',data:{email:'editor@example.invalid',password:'synthetic-test-only-password',role:'editor'},overrideAccess:false,user});
    const editorUser={...editor,collection:'users' as const};
    await assert.rejects(()=>payload.find({collection:'offers',overrideAccess:false}));
    const changed=await payload.update({collection:'users',id:editor.id,data:{role:'admin'},overrideAccess:false,user:editorUser});
    assert.equal(changed.role,'editor');
    await assert.rejects(()=>payload.create({collection:'users',data:{email:'bad@example.invalid',password:'synthetic-test-only-password',role:'admin'},overrideAccess:false,user:editorUser}));
    const today=new Date().toISOString();const next=new Date(Date.now()+90*86400000).toISOString();
    const offerData={slug:'synthetic-test-offer',title:'SYNTHETIC TEST ONLY',service:'bedliner' as const,pricingType:'fixed' as const,amount:123,currency:'USD' as const,conditions:'Synthetic test conditions',asOf:today,nextOwnerReview:next};
    await assert.rejects(()=>payload.create({collection:'offers',data:{...offerData,_status:'published'},overrideAccess:false,user:editorUser}),/Owner approval/);
    const offer=await payload.create({collection:'offers',data:{...offerData,_status:'published',ownerApproved:true,sourceNote:'PRIVATE SOURCE'},overrideAccess:false,user:editorUser});
    await payload.update({collection:'offers',id:offer.id,data:{amount:999,_status:'draft'},draft:true,overrideAccess:false,user:editorUser});
    const published=await payload.findByID({collection:'offers',id:offer.id,draft:false});
    assert.equal(published.amount,123);
    const draft=await payload.findByID({collection:'offers',id:offer.id,draft:true});
    assert.equal(draft.amount,999);
    await assert.rejects(()=>payload.delete({collection:'offers',id:offer.id,overrideAccess:false,user}));
    const job=await payload.create({collection:'jobs',draft:true,data:{slug:'synthetic-test-job',title:'SYNTHETIC TEST ONLY',_status:'draft'},overrideAccess:false,user:editorUser});
    const bytes=await sharp({create:{width:800,height:600,channels:3,background:'#112233'}}).jpeg().toBuffer();
    const mediaData={job:job.id,alt:'Synthetic integration fixture only',role:'before' as const,provenance:'real' as const,rightsCleared:true,privacyChecked:true,_status:'published' as const};
    await assert.rejects(()=>payload.create({collection:'media',data:{...mediaData,rightsCleared:false},file:{name:'test-fixture.jpg',mimetype:'image/jpeg',size:bytes.length,data:bytes},overrideAccess:false,user:editorUser}),/Before uploading/);
    const photos:Media[]=[];
    for(let n=0;n<4;n++)photos.push(await payload.create({collection:'media',data:mediaData,file:{name:`synthetic-test-photo-${n}.jpg`,mimetype:'image/jpeg',size:bytes.length,data:bytes},overrideAccess:false,user:editorUser}));
    assert.equal(photos[0].mimeType,'image/webp');
    assert.ok(photos[0].sizes?.card?.width);
    const originalBytes=await readFile(path.join(directory,'media',photos[0].filename!));
    await assert.rejects(()=>payload.update({collection:'media',id:photos[0].id,data:{alt:'Attempted replacement'},file:{name:'replacement.jpg',mimetype:'image/jpeg',size:bytes.length,data:bytes},overrideAccess:false,user:editorUser}),/immutable/);
    assert.deepEqual(await readFile(path.join(directory,'media',photos[0].filename!)),originalBytes);
    await payload.update({collection:'media',id:photos[0].id,data:{alt:'Updated synthetic fixture description'},overrideAccess:false,user:editorUser});
    await assert.rejects(()=>payload.update({collection:'jobs',id:job.id,data:{_status:'published'},overrideAccess:false,user:editorUser}),/Owner approval/);
    const approved=await payload.update({collection:'jobs',id:job.id,data:{_status:'published',title:'SYNTHETIC TEST ONLY',summary:'Synthetic fixture, never live content.',ownerApproved:true,notesAreJobSpecific:true,vehicle:{year:2026,make:'Test',model:'Fixture'},services:['bedliner'],date:today,quoteAudience:'retail',before:photos[0].id,after:photos[1].id,photos:photos.map(p=>p.id),processNotes:[{note:'Synthetic fixture first specific note.'},{note:'Synthetic fixture second specific note.'},{note:'Synthetic fixture third specific note.'}]},overrideAccess:false,user:editorUser});
    assert.equal(approved._status,'published');
    const {getPublishedContent}=await import('../src/lib/content');
    const snapshot=await getPublishedContent();
    assert.equal(snapshot.offers[0].amount,123);assert.equal(snapshot.jobs.length,1);assert.match(snapshot.jobs[0].before.url,/^\/api\/media\/file\//);assert.ok(!JSON.stringify(snapshot).includes('PRIVATE SOURCE'));
    await payload.update({collection:'media',id:photos[0].id,data:{_status:'draft'},overrideAccess:false,user:editorUser});
    // Explicit unpublish removes the job from the public projection immediately.
    assert.equal((await payload.findByID({collection:'media',id:photos[0].id,draft:false}))._status,'draft');
    assert.equal((await getPublishedContent()).jobs.length,0);
  } finally {
    await payload.destroy();
    await rm(directory,{recursive:true,force:true});
  }
});
