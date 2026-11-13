/* Measurement-only baseline. No tags until public env IDs are configured.
 * Runtime config is same-origin; no Vercel analytics or ad pixels are loaded.
 * Local event queue is ephemeral, bounded, and never reads contact fields.
 */
(function () {
  'use strict';
  var w = window, d = document, loc = w.location;
  var api = w.CU_ANALYTICS = { events: [], ga4Enabled: false, clarityEnabled: false };
  var names = ['call_click','form_start','form_submit','vehicle_select','cover_select','quote_step','hero_video','outbound_gbp','guide_download','nav_use'];
  var enums = {
    location: ['header','hero','sticky_bar','footer','content'],
    form_name: ['inline','fleet','dealer','project','quote','callback','application'],
    audience: ['retail','fleet','dealer','project','callback','application'],
    source: ['direct','google','bing','gbp','facebook','instagram','nextdoor','yard-sign','referral','chatgpt','perplexity','claude','gemini','copilot','brave_search','stealthhitches','etrailer','realtruck','other'],
    product: ['westin','bakflip-mx4','mx4-ez-lift','mx4-ts','retrax-pro','retrax-pro-xr','frc-4000','truxport','pro-x15','other'],
    section: ['services','fleet','company','resources','mobile','other'],
    guide_name: ['price-guide','winter-checklist'],
    shop_status: ['open','closed','unknown'],
    design_variant: ['baseline','light-pilot']
  };
  var publicRoutes = ["/", "/404", "/blog", "/blog/best-tonneau-covers-maryland", "/blog/leveling-vs-lift-kit", "/blog/patriot-liner-vs-drop-in", "/blog/undercoating-maryland-winter", "/blog/weatherguard-vs-kargomaster", "/contact", "/dealer-government", "/faq", "/fleet", "/gallery", "/hitch-quote", "/index", "/locations/bethesda-md", "/locations/gaithersburg-md", "/locations/rockville-md", "/locations/silver-spring-md", "/preview", "/privacy", "/products-section", "/quote", "/rebates", "/services", "/services/bedliner", "/services/camper-shells", "/services/ceramic-coating", "/services/commercial-wraps", "/services/exterior", "/services/hitches", "/services/industrial-coatings", "/services/lighting", "/services/mobile-detailing", "/services/running-boards", "/services/stealth-hitches", "/services/suspension", "/services/tonneau", "/services/toolboxes", "/services/undercoating", "/services/window-tinting", "/start-here", "/terms"];
  function path(value) {
    try { var p = new URL(value, loc.origin).pathname; return publicRoutes.indexOf(p.replace(/\.html$/, '').replace(/\/$/, '') || '/') >= 0 ? p.replace(/\.html$/, '').replace(/\/$/, '') || '/' : '/other'; } catch (_) { return '/other'; }
  }
  function source() {
    var s = '';
    try { var ctx = w.CUAttribution && w.CUAttribution.get ? w.CUAttribution.get() : null; s = ctx ? ctx.utm_source || ctx.referrer_domain || '' : new URLSearchParams(loc.search).get('utm_source') || new URL(d.referrer).hostname; } catch (_) {}
    s = s.toLowerCase().replace(/^www\./, '');
    var map = {'chatgpt.com':'chatgpt','chat.openai.com':'chatgpt','perplexity.ai':'perplexity','claude.ai':'claude','gemini.google.com':'gemini','copilot.microsoft.com':'copilot','search.brave.com':'brave_search','google.com':'google','bing.com':'bing','stealthhitches.com':'stealthhitches','etrailer.com':'etrailer','realtruck.com':'realtruck','facebook.com':'facebook','instagram.com':'instagram','nextdoor.com':'nextdoor'};
    return enums.source.indexOf(s) >= 0 ? s : map[s] || (s ? 'other' : 'direct');
  }
  function sanitize(params) {
    var out = {};
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (enums[key] && enums[key].indexOf(value) >= 0) out[key] = value;
      else if (key === 'lead_id' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')) out[key] = value;
      else if (key === 'landing_page' || key === 'page_path') out[key] = path(value);
      else if (key === 'step' && Number.isInteger(value) && value >= 0 && value <= 10) out[key] = value;
      else if (key === 'percent' && [25,50,75].indexOf(value) >= 0) out[key] = value;
      else if (key === 'year' && /^20\d{2}$/.test(value)) out[key] = value;
      // No free-text make/model, VIN, UTM, customer or query-string parameters.
    });
    out.page_path = path(loc.href); out.design_variant = 'baseline';
    return out;
  }
  function track(name, params) {
    if (names.indexOf(name) < 0) return;
    var data = sanitize(params);
    if (name === 'call_click' || name === 'form_submit') data.shop_status = w.CUShopStatus ? w.CUShopStatus.get() : 'unknown';
    api.events.push({name:name,params:data});
    if (api.events.length > 100) api.events.shift();
    if (api.ga4Enabled) w.gtag('event', name, data);
  }
  api.track = track; api.eventNames = names.slice();
  function script(src) { var el = d.createElement('script'); el.src = src; el.async = true; d.head.appendChild(el); }
  function enable(config) {
    if (/^G-[A-Z0-9]{4,20}$/.test(config.ga4Id || '') && config.ga4Id !== 'G-XXXXXXXXXX') {
      w.dataLayer = w.dataLayer || [];
      w.gtag = function () { w.dataLayer.push(arguments); };
      w.gtag('js', new Date());
      w.gtag('config', config.ga4Id, {send_page_view:false, allow_google_signals:false, allow_ad_personalization_signals:false,
        page_location:loc.origin + path(loc.href),page_referrer:'',ignore_referrer:true});
      api.ga4Enabled = true;
      api.events.forEach(function(e){w.gtag('event',e.name,e.params);});
      // Explicit sanitized denominator. Enhanced measurement must stay OFF in GA admin.
      w.gtag('event','page_view',{page_location:loc.origin + path(loc.href),page_referrer:'',design_variant:'baseline'});
      script('https://www.googletagmanager.com/gtag/js?id=' + config.ga4Id);
    }
    // Clarity can capture the browser URL; skip URLs with query/fragment data.
    // Mask all page content before loading, including form values and confirmations.
    if (/^[a-z0-9]{5,20}$/.test(config.clarityId || '') && !loc.search && !loc.hash) {
      d.documentElement.setAttribute('data-clarity-mask', 'true');
      w.clarity = w.clarity || function () { (w.clarity.q = w.clarity.q || []).push(arguments); };
      script('https://www.clarity.ms/tag/' + config.clarityId);
      api.clarityEnabled = true;
    }
  }
  // A failed/malformed config fetch fails closed. Never accept IDs from query/storage.
  if (typeof w.fetch === 'function') w.fetch('/api/measurement-config', {credentials:'same-origin',cache:'no-store'})
    .then(function(r){return r.ok ? r.json() : {};}).then(enable).catch(function(){});
  var started = {}, pending = {}, submitted = {};
  function context(form) {
    if (!form) return null;
    var a = form.getAttribute('data-cms-form');
    if (enums.audience.indexOf(a) < 0) return null;
    return {audience:a,form_name:loc.pathname.indexOf('/services/') === 0 ? 'inline' : a === 'retail' ? 'quote' : a,source:source(),landing_page:path(loc.href)};
  }
  function closest(t, selector) {return t && t.closest ? t.closest(selector) : null;}
  function place(el) {return closest(el,'header, nav') ? 'header' : closest(el,'footer') ? 'footer' : closest(el,'.mobile-action-bar') ? 'sticky_bar' : closest(el,'.hero, .page-hero') ? 'hero' : 'content';}
  d.addEventListener('focusin',function(e){var f=closest(e.target,'form[data-cms-form]'), c=context(f);if(c&&!started[f.id]){started[f.id]=true;track('form_start',c);}},true);
  d.addEventListener('submit',function(e){var c=context(e.target);if(c) pending[e.target.id]=c;},true);
  d.addEventListener('cu:lead-success',function(e){
    var x=e.detail||{}, c=pending[x.formId]; delete pending[x.formId];
    if(!c || x.deliveryMode==='discarded' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x.leadId||'') || submitted[x.leadId]) return;
    submitted[x.leadId]=true; c.lead_id=x.leadId; c.landing_page=x.landingPage||c.landing_page; track('form_submit',c); delete started[x.formId];
  });
  d.addEventListener('cu:quote-step',function(e){var x=e.detail||{};if(!x.initial)track('quote_step',{step:Number(x.step),audience:'retail'});});
  d.addEventListener('click',function(e){
    var a=closest(e.target,'a[href],button');if(!a)return;
    var href=a.getAttribute('href')||'';
    if(/^tel:/i.test(href)) track('call_click',{location:place(a)});
    try {var u=new URL(href,loc.href);if(['maps.google.com','g.page','search.google.com'].indexOf(u.hostname)>=0)track('outbound_gbp',{});}catch(_){}
    var guide=a.getAttribute('data-guide');if(enums.guide_name.indexOf(guide)>=0)track('guide_download',{guide_name:guide});
    if(a.getAttribute('aria-expanded')==='true' && closest(a,'nav,header'))track('nav_use',{section:a.getAttribute('data-nav-section')||'other'});
  },true);
  ['mouseover','focusin'].forEach(function(eventName){d.addEventListener(eventName,function(e){
    var item=closest(e.target,'.nav-item');if(!item||item.cuNavOpen)return;
    item.cuNavOpen=true;var anchor=item.querySelector('a'), href=anchor?anchor.getAttribute('href')||'':'';
    var section=/services/.test(href)?'services':/fleet/.test(href)?'fleet':/about|company/.test(href)?'company':'other';
    track('nav_use',{section:section});
  });});
  d.addEventListener('mouseout',function(e){var item=closest(e.target,'.nav-item');if(item&&(!e.relatedTarget||!item.contains(e.relatedTarget)))item.cuNavOpen=false;});
  d.addEventListener('change',function(e){
    var t=e.target;
    if(t && /^(cover|cover_product|product)$/.test(t.name||''))track('cover_select',{product:enums.product.indexOf(t.value)>=0?t.value:'other'});
    if(t && t.id==='f-model' && t.value){var y=d.getElementById('f-year');track('vehicle_select',{year:y?y.value:''});}
  },true);
  // Explicit future components use the same allowlisted event API; no fake guide/video events.
  d.addEventListener('timeupdate',function(e){var v=e.target;if(!closest(v,'.hero,.page-hero')||!Number.isFinite(v.duration)||!v.duration)return;v.cuMilestones=v.cuMilestones||{};[25,50,75].forEach(function(p){if(v.currentTime/v.duration*100>=p&&!v.cuMilestones[p]){v.cuMilestones[p]=true;track('hero_video',{percent:p});}});},true);
})();
