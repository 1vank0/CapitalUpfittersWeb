'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const sharp = require('sharp');
const { createHandler: adminHandler } = require('../api/media-admin');
const { createHandler: publicHandler } = require('../api/media');
const { createMediaStore, MediaError, slots } = require('../server/media-store');
const token = 'test-only-64-character-access-key-never-used-outside-tests-12345678';
function response() {
  return { headers: {}, code: 200, setHeader(k,v) { this.headers[k] = v; }, status(v) { this.code = v; return this; }, json(v) { this.body = v; }, end() {} };
}
async function call(handler, { method = 'POST', body, headers = {}, url = '/api/media-admin' } = {}) {
  const req = Readable.from(body === undefined ? [] : [typeof body === 'string' ? body : JSON.stringify(body)]);
  req.method = method; req.url = url; req.headers = { host: 'example.com', origin: 'https://example.com', authorization: 'Bearer '+token, 'content-type':'application/json', ...headers };
  const res = response(); await handler(req, res); return res;
}
function stubStore() {
  const calls = [];
  return { calls, assertSlot(slot) { if (!Object.hasOwn(slots, slot)) throw new MediaError(400, 'Invalid slot'); }, async manifest() { calls.push('manifest'); return { slots: [] }; }, async current() { calls.push('current'); return null; }, async history() { calls.push('history'); return []; }, async upload(body) { calls.push('upload'); return { slot: body.slot }; }, async publish() { calls.push('publish'); return {}; } };
}
test('media management fails closed without an admin key or with a wrong key', async () => {
  const store = stubStore();
  assert.equal((await call(adminHandler({mediaStore:store,token:()=>''}),{method:'GET'})).code,503);
  assert.equal((await call(adminHandler({mediaStore:store,token:()=>token}),{method:'GET',headers:{authorization:'Bearer wrong'}})).code,401);
  assert.deepEqual(store.calls,[]);
});
test('media writes reject other origins, non-JSON and oversized bodies before side effects', async () => {
  const store=stubStore(),handler=adminHandler({mediaStore:store,token:()=>token});
  assert.equal((await call(handler,{headers:{origin:'https://attacker.example'},body:{action:'publish',slot:'bedliner'}})).code,403);
  assert.equal((await call(handler,{headers:{'content-type':'text/plain'},body:'{}'})).code,415);
  assert.equal((await call(handler,{headers:{'content-length':'3500001'},body:'{}'})).code,413);
  assert.equal((await call(handler,{body:'{bad json'})).code,400);
  assert.deepEqual(store.calls,[]);
});
test('media management rejects unknown slots, malformed upload data and unsupported actions', async () => {
  const store=stubStore(),handler=adminHandler({mediaStore:store,token:()=>token});
  for(const body of [{action:'upload',slot:'../secret'}, {action:'upload',slot:'bedliner',base64:'<script>'}, {action:'delete',slot:'bedliner'}]) assert.equal((await call(handler,{body})).code,400);
  assert.deepEqual(store.calls,[]);
});
test('public media resolves only known image sizes and does not allow mutations', async () => {
  const store=stubStore();store.current=async()=>({sources:{'768':'https://images.example/768.webp','1200':'https://images.example/1200.webp'}});
  const handler=publicHandler(store);
  const image=await call(handler,{method:'GET',url:'/api/media?slot=bedliner&width=768'});
  assert.equal(image.code,302);assert.equal(image.headers.Location,'https://images.example/768.webp');assert.equal(image.headers['Cache-Control'],'no-store');
  assert.equal((await call(handler,{method:'GET',url:'/api/media?slot=bedliner&width=999'})).code,400);
  assert.equal((await call(handler,{method:'POST'})).code,405);
});
function memoryStorage() {
  const objects = new Map();let revision=0;
  const missing=()=>Object.assign(new Error('Not found'),{name:'NoSuchKey',$metadata:{httpStatusCode:404}});
  const client={async send(command){
    const input=command.input,key=input.Key,name=command.constructor.name;
    if(name==='PutObjectCommand'){
      const before=objects.get(key);
      if((input.IfNoneMatch==='*'&&before)||(input.IfMatch&&input.IfMatch!==before?.etag))throw Object.assign(new Error('Precondition failed'),{$metadata:{httpStatusCode:412}});
      objects.set(key,{bytes:Buffer.isBuffer(input.Body)?input.Body:Buffer.from(input.Body),etag:'"revision-'+(++revision)+'"'});return{};
    }
    if(name==='GetObjectCommand'){const item=objects.get(key);if(!item)throw missing();return{Body:{transformToString:async()=>item.bytes.toString()}};}
    if(name==='ListObjectsV2Command')return{Contents:[...objects.keys()].filter(k=>k.startsWith(input.Prefix)).map(Key=>({Key}))};
    throw new Error('Unexpected command '+name);
  }};
  const readPublic=async key=>{const item=objects.get(key);return item?{value:JSON.parse(item.bytes.toString()),etag:item.etag}:null;};
  return {objects,store:createMediaStore({client,readPublic,endpoint:'https://media.example',bucket:'images'})};
}
test('image upload optimizes real bytes, publish is explicit, and old versions can be restored',async()=>{
  const {store,objects}=memoryStorage();
  const bytes=await sharp({create:{width:900,height:600,channels:3,background:'#444444'}}).png().toBuffer();
  const first=await store.upload({slot:'bedliner',bytes,alt:'A protected pickup truck bed',kind:'illustration'});
  assert.equal(await store.current('bedliner',true),null,'Uploading a draft must not publish it');
  const output=objects.get(`images/bedliner/${first.version}/1200.webp`).bytes;
  const metadata=await sharp(output).metadata();assert.equal(metadata.format,'webp');assert.equal(metadata.width,1200);assert.equal(metadata.height,800);assert.equal(metadata.exif,undefined);
  await store.publish('bedliner',first.version,null);
  const second=await store.upload({slot:'bedliner',bytes,alt:'An actual bedliner installation',kind:'photo'});
  await store.publish('bedliner',second.version,first.version);
  assert.equal((await store.current('bedliner',true)).kind,'photo');
  await assert.rejects(store.publish('bedliner',first.version,first.version),error=>error.status===409);
  await store.publish('bedliner',first.version,second.version);
  assert.equal((await store.current('bedliner',true)).version,first.version);
  assert.equal((await store.history('bedliner')).length,2,'Restore must keep version history');
});
test('invalid image formats and invalid descriptions never write storage objects',async()=>{
  const {store,objects}=memoryStorage();
  const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600"/></svg>');
  await assert.rejects(store.upload({slot:'bedliner',bytes:svg,alt:'A test illustration',kind:'illustration'}),error=>error.status===400);
  const bytes=await sharp({create:{width:900,height:600,channels:3,background:'#444444'}}).png().toBuffer();
  await assert.rejects(store.upload({slot:'bedliner',bytes,alt:'x',kind:'photo'}),error=>error.status===400);
  await assert.rejects(store.upload({slot:'bedliner',bytes,alt:'A test photograph',kind:'photo',focus:'javascript:alert(1)'}),error=>error.status===400);
  assert.equal(objects.size,0);
});
