
  (function(){
    document.querySelectorAll('.nav-mobile-section-trigger').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-target'),body=document.getElementById(id),open=body&&body.classList.contains('open');
        document.querySelectorAll('.nav-mobile-section-body').forEach(function(b){b.classList.remove('open');});
        document.querySelectorAll('.nav-mobile-section-trigger').forEach(function(b){b.classList.remove('open');b.setAttribute('aria-expanded','false');});
        if(!open&&body){body.classList.add('open');btn.classList.add('open');btn.setAttribute('aria-expanded','true');}
      });
    });
    var h=document.getElementById('hamburger'),m=document.getElementById('nav-mobile'),c=document.getElementById('nav-close');
    if(h&&m){h.addEventListener('click',function(){m.classList.add('open');document.body.style.overflow='hidden';});}
    if(c&&m){c.addEventListener('click',function(){m.classList.remove('open');document.body.style.overflow='';});}
  })();
  