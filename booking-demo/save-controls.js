/* Reuse the real submit controls, so validation, dirty tracking and pending states stay native. */
(() => {
 'use strict';
 let scheduled=false;
 const saveButton=form=>Array.from(form.querySelectorAll('button')).find(button=>
  button.type==='submit'&&/^(?:save\b|saving(?:\b|…))/i.test(button.textContent.trim())&&!button.closest('[hidden],details:not([open])')
 );
 function enhance(){
  scheduled=false;
  document.querySelectorAll('.workspace-main form[data-form]').forEach(form=>{
   if(form.closest('#modal-root,.jg-panel,[role=dialog],dialog'))return;
   if(form.closest('.jg-personalise')){
    form.querySelectorAll('.bw-save-bar,.ws-form-footer').forEach(footer=>{if(!footer.classList.contains('jg-save-proxy-footer'))footer.classList.add('jg-save-proxy-footer');});
    return;
   }
   const button=saveButton(form);if(!button)return;
   if(button.dataset.savePlacement==='top'){
    const wrapper=button.closest('.df-save-bar,.se-save-bar');
    if(wrapper&&wrapper.closest('.bd-heading,.jg-page-save-heading,.jg-page-save-actions'))wrapper.classList.add('jg-top-save-wrap');
    return;
   }
   const previous=button.parentElement;
   const title=form.querySelector(':scope > h2,:scope > h3,:scope > .card > h2,:scope > .card > h3,:scope > fieldset > .card > h2,:scope > fieldset > .card > h3');
   const header=document.createElement('div');header.className=title?'jg-page-save-heading':'jg-page-save-actions';
   if(title){title.before(header);header.append(title);}else form.prepend(header);
   button.dataset.savePlacement='top';header.append(button);
   if(previous?.matches('.form-footer,.ws-form-footer,.bs-save-bar,.bw-save-bar,.df-save-bar,.se-save-bar')){
    previous.classList.add('jg-save-relocated-footer');
    if(!previous.textContent.trim()&&!previous.querySelector('input,button,a,[role=status]'))previous.remove();
   }
  });
  window.JovaDirtyForms?.refreshSaveIndicators();
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(enhance);}}
 function start(){enhance();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.JovaSaveControls={refresh:schedule};
})();
