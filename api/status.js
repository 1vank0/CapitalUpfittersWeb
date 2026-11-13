'use strict';
const {compute,unknown}=require('./_lib/shop-status');
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex');
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end(JSON.stringify({error:'Method not allowed'}));}
 let result=unknown();
 try{
  // Server-owned URL only. Set after a reviewed, published Payload business feed exists.
  const raw=process.env.CMS_STATUS_CONTENT_URL;if(!raw)return res.end(JSON.stringify(result));
  const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Invalid feed');
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(3000),headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Feed unavailable');
  const body=await response.text();if(body.length>1000000)throw Error('Feed too large');
  result=compute(JSON.parse(body).business);
 }catch(_){ /* Fail closed, without exposing backend configuration. */ }
 res.end(JSON.stringify(result));
};
