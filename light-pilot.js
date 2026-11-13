/* Presentation-only mobile actions. No access to form data or lead handlers. */
(function(){
 'use strict';
 var hero=document.querySelector('main>.bl-hero,main>.sp-hero');
 var form=document.querySelector('main form[data-service-quote]');
 var bar=document.querySelector('.mobile-action-bar');
 if(!hero||!form||!bar||!('IntersectionObserver' in window))return;
 var heroVisible=true,formVisible=false;
 function update(){bar.hidden=heroVisible||formVisible;}
 var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.target===hero)heroVisible=entry.isIntersecting;if(entry.target===form)formVisible=entry.isIntersecting;});update();},{threshold:0});
 observer.observe(hero);observer.observe(form);update();
})();
