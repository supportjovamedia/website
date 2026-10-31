/* Consistent, local-only unsaved indicators for owner settings and editor forms. */
(() => {
 'use strict';
 const types=new Set(['settings','service','category','customer','workspace-appearance','ws-business-hours','ws-staff-hours','ws-booking-page','deposit']);
 const records=new WeakMap();let queued=false;
 function serialize(elements){return JSON.stringify(Array.from(elements).filter(e=>e.name&&!['button','submit','reset','file','image'].includes(e.type)).map(e=>[e.name,e.type||e.tagName,e.type==='checkbox'||e.type==='radio'?!!e.checked:e.multiple?Array.from(e.selectedOptions||[],option=>option.value):String(e.value??'')]));}
 function signature(form){return serialize(form.elements);}
 function update(form){const record=records.get(form);if(!record)return;const dirty=signature(form)!==record.baseline;form.dataset.dirty=String(dirty);record.status.classList.toggle('is-dirty',dirty);record.status.setAttribute('aria-hidden',String(!dirty));const message=dirty?'Unsaved changes':'';if(record.text.textContent!==message)record.text.textContent=message;}
 function register(form){
  if(records.has(form)||!types.has(form.dataset.form))return;
  const submit=Array.from(form.querySelectorAll('button.primary,input[type=submit]')).find(button=>button.type==='submit');if(!submit)return;
  let footer=submit.closest('.form-footer,.ws-form-footer,.se-save-bar');
  if(!footer||!form.contains(footer)){footer=document.createElement('div');submit.parentNode.insertBefore(footer,submit);footer.appendChild(submit);}
  footer.classList.add('se-save-bar','df-save-bar');
  const status=document.createElement('span');status.className='se-save-status df-save-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-hidden','true');
  const dot=document.createElement('span');dot.className='se-save-dot';dot.setAttribute('aria-hidden','true');const text=document.createElement('span');status.append(dot,text);
  records.set(form,{baseline:signature(form),status,text});form.dataset.dirtyTracked='true';footer.prepend(status);
  form.addEventListener('input',()=>update(form));form.addEventListener('change',()=>update(form));form.addEventListener('reset',()=>setTimeout(()=>update(form),0));update(form);
 }
 function scan(){document.querySelectorAll('form[data-form]').forEach(register);}
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan();});}
 function saved(form){const record=records.get(form);if(!record)return;record.baseline=signature(form);update(form);}
 function dirty(form){const record=records.get(form);return !!record&&signature(form)!==record.baseline;}
 function start(){scan();const observer=new MutationObserver(schedule);for(const id of ['app','modal-root']){const root=document.getElementById(id);if(root)observer.observe(root,{childList:true,subtree:true});}}
 window.JovaDirtyForms={saved,isDirty:dirty,scan,serialize};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
