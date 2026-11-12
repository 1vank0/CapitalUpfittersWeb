/* Inline pilot forms reuse the existing lead bridge, its attribution and receipt contract. */
(function () {
 'use strict';
 function init() {
  document.querySelectorAll('form[data-service-quote]').forEach(function(form) {
   var fields=form.elements, params=new URLSearchParams(window.location.search);
   [['year','Vehicle Year'],['make','Vehicle Make'],['model','Vehicle Model']].forEach(function(pair){
    if(fields[pair[1]] && !fields[pair[1]].value) fields[pair[1]].value=(params.get(pair[0])||'').slice(0,80);
   });
   var submit=form.querySelector('button[type="submit"]');
   if(submit && form.dataset.cuLeadAttached) submit.disabled=false;
   form.addEventListener('submit',function(event){
    if(!form.dataset.cuLeadAttached){event.preventDefault();return;}
    var product=fields.product && fields.product.value;
    var bed=fields['Bed Length'] && fields['Bed Length'].value;
    var notes=fields['Customer Notes'] && fields['Customer Notes'].value;
    var bundle=form.querySelector('[data-pilot-bundle]');
    var lines=[];
    if(product)lines.push('Product requested: '+product);
    if(bed)lines.push('Bed length: '+bed);
    if(bundle && bundle.checked) lines.push('Bundle requested: Patriot Liner + bed cover. $50 cover saving applies to Westin Hard Tri-Fold or BAKFlip MX4; bedliner priced separately. Final written quote required.');
    if(form.dataset.serviceQuote==='tonneau' && product==='Westin Hard Tri-Fold')lines.push('Advertised cover offer: $1,000 installed'+(bundle&&bundle.checked?' / $950 cover with Patriot Liner':'')+'. Confirm fitment, taxes and any additional work.');
    if(form.dataset.serviceQuote==='tonneau' && product==='BAKFlip MX4')lines.push('Advertised cover offer: $1,300 installed'+(bundle&&bundle.checked?' / $1,250 cover with Patriot Liner':'')+'. Confirm fitment, taxes and any additional work.');
    if(notes)lines.push('Customer notes: '+notes);
    if(fields.Message)fields.Message.value=lines.join('\n').slice(0,4000);
   },true);
  });
 }
 document.addEventListener('cu:lead-success',function(event){
  var form=document.querySelector('form[data-service-quote]');
  if(!form || event.detail.formId!==form.id)return;
  var d=event.detail;
  var confirm=form.querySelector('[data-pilot-confirmation]');
  var reference=form.querySelector('[data-pilot-reference]');
  var warning=form.querySelector('[data-pilot-warning]');
  if(confirm)confirm.textContent=d.customerConfirmation?'Check your email for confirmation. We will review your fitment and quote details.':'We will review your fitment and quote details. A confirmation email was not sent.';
  if(reference)reference.textContent=d.reference?'Your reference: '+d.reference:'Call (301) 304-1419 if you need to follow up.';
  if(warning)warning.textContent=d.warning||(d.deliveryMode==='persisted_only'?'Your request was saved, but the shop notification was delayed. Call if your request is urgent.':'');
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
