/* Native cover selection, progressively enhanced summary. Submission uses lead-form.js. */
(function () {
 'use strict';
 var form=document.querySelector('.bed-cover-page .partner-fitment-form');
 if(!form)return;
 var params=new URLSearchParams(window.location.search), summary=document.getElementById('bc-selection');
 var choices=Array.from(form.querySelectorAll('input[name="product"]'));
 choices.forEach(function(choice){if(choice.value===params.get('product'))choice.checked=true;});
 function update(){
  var selected=choices.find(function(choice){return choice.checked;});
  if(summary)summary.textContent=selected?selected.value:'Choose a cover above, or ask us to help.';
 }
 form.addEventListener('change',update);window.addEventListener('pageshow',update);update();
})();
