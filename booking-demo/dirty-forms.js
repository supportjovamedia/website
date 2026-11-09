/* Consistent, local-only unsaved indicators for owner settings and editor forms. */
(() => {
 'use strict';
 const types=new Set(['settings','jd-settings','service','category','customer','workspace-appearance','ws-business-hours','ws-staff-hours','ws-booking-page','deposit','manual-booking','edit-booking','reschedule','portal','onboard-business','onboard-owner','owner-series','sb-provider-change','sb-plan-change']);
 const records=new WeakMap(),saveIndicators=new WeakMap();let queued=false,leaveDialog=null,lastEditorFocus=null;
 function serialize(elements){return JSON.stringify(Array.from(elements).filter(e=>e.name&&!['button','submit','reset','file','image'].includes(e.type)).map(e=>[e.name,e.type||e.tagName,e.type==='checkbox'||e.type==='radio'?!!e.checked:e.multiple?Array.from(e.selectedOptions||[],option=>option.value):String(e.value??'')]));}
 function signature(form){return serialize(form.elements);}
 const saveLabel=control=>/^(?:save\b|saving(?:\b|…)|apply theme\b|applying(?:\b|…))/i.test(String(control.tagName==='INPUT'?control.value:control.textContent||'').trim());
 const indicatorDirty=form=>!!form&&(dirty(form)||form.dataset.dirty==='true');
 function syncSaveIndicator(control,form){
  control.classList.remove('df-save-is-dirty');
  let status=saveIndicators.get(control);
  if(!saveLabel(control)){if(status)status.hidden=true;return;}
  if(!status){
   status=document.createElement('span');status.className='df-save-indicator';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   const dot=document.createElement('span');dot.className='df-save-indicator-dot';dot.setAttribute('aria-hidden','true');
   const message=document.createElement('span');status.append(dot,message);saveIndicators.set(control,status);
  }
  if(status.nextElementSibling!==control)control.before(status);
  control.parentElement?.classList.add('df-save-actions');form?.classList.add('df-external-save-status');
  const changed=indicatorDirty(form),message=changed?'Unsaved changes':'No unsaved changes';
  status.hidden=false;status.classList.toggle('is-dirty',changed);
  if(status.lastElementChild.textContent!==message)status.lastElementChild.textContent=message;
 }
 function refreshSaveIndicators(root=document){
  root.querySelectorAll('form[data-form]').forEach(form=>{
   if(!form.closest('#app,#modal-root'))return;
   const controls=new Set([...form.querySelectorAll('button,input[type=submit]'),...Array.from(form.elements||[])]);
   for(const control of controls)if(control.matches?.('button,input[type=submit]'))syncSaveIndicator(control,form);
  });
  root.querySelectorAll('[data-action="ws-save-personalise"]').forEach(button=>{
   const section=button.closest('.jg-personalise'),form=section?.querySelector('.jg-personalise-section:not([hidden]) form[data-form]');
   syncSaveIndicator(button,form);
  });
 }
 function update(form){const record=records.get(form);if(!record)return;const dirty=signature(form)!==record.baseline;form.dataset.dirty=String(dirty);record.status.classList.toggle('is-dirty',dirty);record.status.setAttribute('aria-hidden',String(!dirty));const message=dirty?'Unsaved changes':'';if(record.text.textContent!==message)record.text.textContent=message;}
 function register(form){
  if(records.has(form)||['staff','bw-website'].includes(form.dataset.form))return;
  const submit=Array.from(form.querySelectorAll('button.primary,input[type=submit]')).find(button=>button.type==='submit');if(!submit)return;
  if(!types.has(form.dataset.form)&&!saveLabel(submit))return;
  const navigation=/^(?:continue|next|back)\b/i.test(String(submit.textContent||submit.value||'').trim());
  let footer=navigation?null:submit.closest('.form-footer,.ws-form-footer,.se-save-bar');
  if(!navigation&&(!footer||!form.contains(footer))){footer=document.createElement('div');submit.parentNode.insertBefore(footer,submit);footer.appendChild(submit);}
  footer?.classList.add('se-save-bar','df-save-bar');
  const status=document.createElement('span');status.className='se-save-status df-save-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-hidden','true');
  const dot=document.createElement('span');dot.className='se-save-dot';dot.setAttribute('aria-hidden','true');const text=document.createElement('span');status.append(dot,text);
  records.set(form,{baseline:signature(form),status,text});form.dataset.dirtyTracked='true';footer?.prepend(status);
  form.addEventListener('input',()=>update(form));form.addEventListener('change',()=>update(form));form.addEventListener('reset',()=>setTimeout(()=>update(form),0));update(form);
 }
 function dismissLeaveDialog(){
  const state=leaveDialog;if(!state)return;leaveDialog=null;
  state.dialog.close();state.dialog.remove();state.anchor.remove();
  state.origin?.classList.remove('df-promoted-origin');
  document.body.classList.remove('df-unsaved-open');
  for(const saved of state.scrollLocks){if(saved.value)saved.node.style.setProperty('overflow',saved.value,saved.priority);else saved.node.style.removeProperty('overflow');saved.node.scrollTop=saved.top;saved.node.scrollLeft=saved.left;}
  if(state.returnFocus?.isConnected&&!state.returnFocus.closest('[inert]'))state.returnFocus.focus({preventScroll:true});
 }
 function keepEditing(){const button=leaveDialog?.warning.querySelector('[data-action=unsaved-keep]');button?.click();}
 function promoteLeaveWarning(){
  if(leaveDialog&&(!leaveDialog.warning.isConnected||!leaveDialog.anchor.isConnected)){dismissLeaveDialog();}
  const warning=document.querySelector('[data-unsaved-warning]');
  if(!warning||leaveDialog||typeof HTMLDialogElement==='undefined')return;
  const origin=warning.closest('.modal-backdrop');
  const standalone=origin?.querySelector('.modal-head h2')?.textContent==='Unsaved changes';
  if(standalone)origin.classList.add('df-promoted-origin');
  const anchor=document.createComment('unsaved confirmation origin');warning.before(anchor);
  const dialog=document.createElement('dialog');dialog.className='df-unsaved-dialog';dialog.setAttribute('aria-labelledby','df-unsaved-title');dialog.setAttribute('aria-describedby','df-unsaved-description');
  const heading=document.createElement('h2');heading.id='df-unsaved-title';heading.textContent='Unsaved changes';dialog.append(heading,warning);
  const description=warning.querySelector('p');if(description)description.id='df-unsaved-description';
  const keep=warning.querySelector('[data-action=unsaved-keep]');if(keep)keep.autofocus=true;
  const returnFocus=lastEditorFocus?.isConnected?lastEditorFocus:document.activeElement;
  const nodes=new Set([document.documentElement,document.body,...document.querySelectorAll('.workspace-main,.jg-panel-body,#modal-root .modal,#modal-root .se-editor')]);
  const scrollLocks=Array.from(nodes,node=>({node,value:node.style.getPropertyValue('overflow'),priority:node.style.getPropertyPriority('overflow'),top:node.scrollTop,left:node.scrollLeft}));
  leaveDialog={dialog,warning,anchor,returnFocus,scrollLocks,origin:standalone?origin:null};document.body.append(dialog);document.body.classList.add('df-unsaved-open');
  for(const saved of scrollLocks)saved.node.style.setProperty('overflow','hidden','important');
  dialog.addEventListener('cancel',event=>{event.preventDefault();keepEditing();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)keepEditing();}});
  dialog.showModal();keep?.focus({preventScroll:true});
 }
 function scan(){document.querySelectorAll('form[data-form]').forEach(register);promoteLeaveWarning();refreshSaveIndicators();}
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan();});}
 function saved(form){const record=records.get(form);if(!record)return;record.baseline=signature(form);update(form);refreshSaveIndicators();}
 function dirty(form){const record=records.get(form);return !!record&&signature(form)!==record.baseline;}
 function start(){
  document.addEventListener('input',schedule,true);document.addEventListener('change',schedule,true);
  document.addEventListener('focusin',event=>{const field=event.target;if(field.matches?.('input,textarea,select,button')&&field.closest('form[data-form]')&&!field.closest('[data-unsaved-warning]'))lastEditorFocus=field;});
  document.addEventListener('keydown',event=>{
   if(!leaveDialog)return;
   if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();keepEditing();return;}
   if(event.key!=='Tab')return;
   event.stopImmediatePropagation();
   const buttons=Array.from(leaveDialog.dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')).filter(el=>el.getClientRects().length);
   if(!buttons.length){event.preventDefault();leaveDialog.dialog.focus();return;}
   const first=buttons[0],last=buttons.at(-1),active=document.activeElement;
   if(event.shiftKey&&(active===first||!leaveDialog.dialog.contains(active))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(active===last||!leaveDialog.dialog.contains(active))){event.preventDefault();first.focus();}
  },true);
  scan();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-dirty','hidden','data-save-placement']});
 }
 const hasChanges=(root=document)=>Array.from(root.querySelectorAll('form[data-form]')).some(form=>dirty(form)||form.dataset.dirty==='true');
 function discard(root=document){root.querySelectorAll('form[data-form]').forEach(form=>{saved(form);form.dataset.dirty='false';});refreshSaveIndicators();}
 window.JovaDirtyForms={saved,isDirty:dirty,scan,serialize,hasChanges,discard,refreshSaveIndicators};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
