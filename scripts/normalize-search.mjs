/** Normalize public-page search signals without changing routes or form contracts. */
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const pages=JSON.parse(fs.readFileSync(path.join(root,'config/sitewide-pages.json'),'utf8'));
const origin='https://www.capitalupfitters.com';
const id=origin+'/#business';
const business={'@type':'AutoRepair','@id':id,name:'Capital Upfitters',url:origin+'/',telephone:'+13013041419',address:{'@type':'PostalAddress',streetAddress:'12019 Nebel Street',addressLocality:'Rockville',addressRegion:'MD',postalCode:'20852',addressCountry:'US'}};
const clean=u=>u.replace(/\/index\.html(?=[?#]|$)/g,'/').replace(/\.html(?=[?#]|$)/g,'').replace(/\/(services|blog)\/(?=[?#]|$)/g,'/$1');
const canonical=p=>clean(origin+'/'+p);
const transform=v=>{
 if(typeof v==='string')return v.startsWith(origin)?clean(v):v;
 if(Array.isArray(v))return v.map(transform);
 if(v&&typeof v==='object'){
  const t=Array.isArray(v['@type'])?v['@type']:[v['@type']];
  if(t.includes('AutoRepair')||t.includes('LocalBusiness')) return {...(v['@context']?{'@context':v['@context']}:{}),...structuredClone(business)};
  const o=Object.fromEntries(Object.entries(v).map(([k,x])=>[k,transform(x)]));
  if(t.includes('Service'))o.provider={'@id':id};
  return o;
 }
 return v;
};
const noindex=new Set(['quote.html','hitch-quote.html','404.html']);
for(const file of [...pages,'partials/header.html','partials/footer.html']){
 const p=path.join(root,file);let h=fs.readFileSync(p,'utf8');
 // Only page links, never actions, script URLs, remote hosts or download assets.
 h=h.replace(/href="([^"\s]+)"/g,(all,u)=>{
  if(/^(?:https?:|\/\/)/.test(u)&&!u.startsWith(origin+'/'))return all;
  if(!/\.html(?:[?#]|$)/.test(u))return all;
  return `href="${clean(u)}"`;
 });
 if(!file.startsWith('partials/')){
  const url=canonical(file);
  h=h.replace(/(<link rel="canonical" href=")[^"]+("\s*\/?>)/,`$1${url}$2`);
  h=h.replace(/(<meta property="og:url" content=")[^"]+("\s*\/?>)/,`$1${url}$2`);
  if(noindex.has(file)){
   if(/<meta name="robots"/.test(h))h=h.replace(/<meta name="robots"[^>]*>/,'<meta name="robots" content="noindex, follow">');
   else h=h.replace('</head>','<meta name="robots" content="noindex, follow">\n</head>');
  }
  let seenBusiness=false,seenBreadcrumb=false,needsBusiness=false;
  h=h.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(all,json)=>{
   let d={'@context':'https://schema.org',...transform(JSON.parse(json))}; let nodes=d['@graph']||[d];
   nodes=nodes.filter(n=>{
    if(n['@type']==='AutoRepair'){if(seenBusiness)return false;seenBusiness=true;}
    if(n['@type']==='BreadcrumbList'){if(seenBreadcrumb)return false;seenBreadcrumb=true;}
    if(n['@type']==='Service')needsBusiness=true;
    return true;
   });
   if(!nodes.length)return '';
   d=d['@graph']?{...d,'@graph':nodes}:nodes[0];
   return '<script type="application/ld+json">'+JSON.stringify(d,null,2)+'</script>';
  });
  if(needsBusiness&&!seenBreadcrumb)h=h.replace('</head>','<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:origin+'/'},{'@type':'ListItem',position:2,name:'Services',item:origin+'/services'},{'@type':'ListItem',position:3,name:(h.match(/<title>(.*?)<\/title>/)?.[1]||'Service').split('|')[0].trim(),item:url}]},null,2)+'</script>\n</head>');
  if(needsBusiness&&!seenBusiness)h=h.replace('</head>','<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org',...business},null,2)+'</script>\n</head>');
 }
 fs.writeFileSync(p,h);
}
const sitemap=path.join(root,'sitemap.xml');
let xml=fs.readFileSync(sitemap,'utf8').replace(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g,(all,url)=>{
 const filename=url.slice(origin.length+1);if(noindex.has(filename)||['quote','hitch-quote','404'].includes(filename))return '';
 return all.replace(url,clean(url));
});
fs.writeFileSync(sitemap,xml);
