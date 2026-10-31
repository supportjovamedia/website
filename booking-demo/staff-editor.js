/* Tabbed staff editing. The host validates and persists the returned draft in its existing save path. */
(() => {
 'use strict';
 const days=[1,2,3,4,5,6,0],names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 const validTime=value=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value||''));
 function signature(value){return JSON.stringify({name:String(value.name||'').trim(),role:String(value.role||'').trim(),active:value.active!==false,serviceIds:[...(value.serviceIds||[])].sort(),hours:value.follow?null:Object.fromEntries(days.map(d=>[d,value.weekly[String(d)]]))});}
 function initial(salon,id){
  const member=salon.staff.find(m=>m.id===id)||{name:'',role:'',active:true,hours:null};
  const hours=window.JovaSchedule.normalize(member.hours||salon.hours);
  return {name:member.name,role:member.role||'',active:member.active!==false,follow:member.hours==null,weekly:clone(hours.weekly),serviceIds:salon.services.filter(s=>id?(s.staffIds||[]).includes(id):true).map(s=>s.id)};
 }
 function validate(value,salon,{hoursChanged=true,supported=true,originalHours=null}={}){
  const name=String(value.name||'').trim(),role=String(value.role||'').trim();
  if(!name||name.length>80)throw Object.assign(Error('Enter a name up to 80 characters.'),{tab:'details',field:'name'});
  if(role.length>60)throw Object.assign(Error('Keep the role to 60 characters.'),{tab:'details',field:'role'});
  const allowed=new Set(salon.services.map(s=>s.id));
  if(value.serviceIds.some(id=>!allowed.has(id)))throw Object.assign(Error('One of these services is no longer available. Reopen this staff member and try again.'),{tab:'services'});
  let hours=originalHours==null?null:clone(originalHours);
  if(hoursChanged){
   if(!supported)throw Object.assign(Error('Working hours need a booking system update before they can be changed.'),{tab:'hours'});
   if(value.follow)hours=null;
   else{
    const weekly={};
    for(const day of days){const h=value.weekly[String(day)],business=window.JovaSchedule.day(salon.hours,day);
     if(!h||(!h.closed&&(!validTime(h.start)||!validTime(h.end)||h.start>=h.end)))throw Object.assign(Error(names[day]+' needs a closing time later than its opening time.'),{tab:'hours',field:'day_'+day+'_end'});
     if(!h.closed&&(business.closed||h.start<business.start||h.end>business.end))throw Object.assign(Error(names[day]+' hours must fit within the business opening hours.'),{tab:'hours',field:'day_'+day+'_start'});
     weekly[String(day)]={closed:!!h.closed,start:validTime(h.start)?h.start:'09:00',end:validTime(h.end)?h.end:'17:00'};
    }
    hours=window.JovaSchedule.normalize({weekly});
   }
  }
  return {name,role,active:value.active!==false,hours,serviceIds:[...new Set(value.serviceIds)]};
 }
 window.JovaStaffEditor={core:{initial,signature,validate},create(api){
  const esc=api.esc;let current=null;
  const attached=()=>current?.form?.isConnected===true;
  function values(form){return {name:form.elements.name.value,role:form.elements.role.value,active:form.elements.active.checked,serviceIds:[...form.querySelectorAll('[name=svc]:checked')].map(e=>e.value),follow:form.elements.follow.checked,weekly:Object.fromEntries(days.map(d=>[String(d),{closed:form.elements['day_'+d+'_closed'].checked,start:form.elements['day_'+d+'_start'].value,end:form.elements['day_'+d+'_end'].value}]))};}
  const hoursSignature=v=>JSON.stringify(v.follow?null:v.weekly);
  function dirty(){return attached()&&signature(values(current.form))!==current.baseline;}
  function sync(){if(!attached())return;const form=current.form,isDirty=dirty();form.dataset.dirty=String(isDirty);const status=form.querySelector('[data-staff-save-status]');status.classList.toggle('is-dirty',isDirty);const message=isDirty?'Unsaved changes':current.id?'All changes saved':'No changes yet';const text=status.querySelector('span:last-child');if(text.textContent!==message)text.textContent=message;form.querySelector('[type=submit]').disabled=!isDirty;form.querySelector('[data-staff-discard]').hidden=true;}
  function tab(name,focus=false){if(!attached())return;const form=current.form;form.querySelectorAll('[data-staff-tab]').forEach(button=>{const on=button.dataset.staffTab===name;button.setAttribute('aria-selected',String(on));button.tabIndex=on?0:-1;if(on&&focus)button.focus();});form.querySelectorAll('[data-staff-panel]').forEach(panel=>{panel.hidden=panel.dataset.staffPanel!==name;});}
  function syncHours(){if(!attached())return;const form=current.form,follow=form.elements.follow.checked;form.querySelector('[data-staff-hours-fields]').disabled=follow||!current.supported;for(const day of days){const closed=form.elements['day_'+day+'_closed'].checked;form.elements['day_'+day+'_start'].disabled=closed||follow||!current.supported;form.elements['day_'+day+'_end'].disabled=closed||follow||!current.supported;}}
  function requestClose(){if(!dirty())return false;const confirm=current.form.querySelector('[data-staff-discard]');confirm.hidden=false;confirm.querySelector('[data-staff-keep]').focus();return true;}
  function read(form){
   if(!attached()||current.form!==form||current.salonId!==api.salon().id)throw Error('Your business changed. Reopen this staff member and try again.');
   if(current.id&&!api.salon().staff.some(m=>m.id===current.id))throw Error('This staff member is no longer available.');
   try {const value=values(form);return validate(value,api.salon(),{hoursChanged:hoursSignature(value)!==current.hoursBaseline,supported:current.supported,originalHours:current.originalHours});}
   catch(error){if(error.tab)tab(error.tab);if(error.field)form.elements[error.field]?.focus();throw error;}
  }
  function saved(form){if(current?.form!==form)return;current.baseline=signature(values(form));current=null;}
  function open(id,initialTab='details'){
   if(attached()&&requestClose())return;
   const s=api.salon(),m=s.staff.find(x=>x.id===id),adding=!id;
   if(id&&!m){api.toast('This staff member is no longer available.');return;}
   if(adding&&!api.canAddStaff(s)){api.toast('Your '+api.planFor(s).name+' plan includes '+api.planFor(s).staffLimit+' staff members.');return;}
   const value=initial(s,id),supported=typeof api.schedulingSupported==='function'?api.schedulingSupported(s)===true:!api.isLive(s);
   const input=(label,name,text,max)=>`<label class="field">${label}<input name="${name}" value="${esc(text)}" maxlength="${max}" autocomplete="off"></label>`;
   api.modal(adding?'Add staff member':'Edit staff member',`<form class="se-editor" data-form="staff" data-id="${esc(id||'')}" novalidate><div class="se-tabs" role="tablist" aria-label="Staff settings">${[['details','Details'],['services','Services'],['hours','Working hours']].map(([name,label],i)=>`<button type="button" role="tab" id="staff-tab-${name}" aria-controls="staff-panel-${name}" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-staff-tab="${name}">${label}</button>`).join('')}</div><section class="se-panel" id="staff-panel-details" role="tabpanel" aria-labelledby="staff-tab-details" data-staff-panel="details">${input('Name','name',value.name,80)}${input('Role (optional)','role',value.role,60)}<label class="se-check"><input type="checkbox" name="active" ${value.active?'checked':''}>Bookable online</label><p class="se-help">Customers can choose this person when booking their services.</p></section><section class="se-panel" id="staff-panel-services" role="tabpanel" aria-labelledby="staff-tab-services" data-staff-panel="services" hidden><h3>Services this person offers</h3><p class="se-help">Choose the services customers can book with this person.</p><div class="se-services">${s.services.map(service=>`<label class="se-check"><input type="checkbox" name="svc" value="${esc(service.id)}" ${value.serviceIds.includes(service.id)?'checked':''}>${esc(service.name)}</label>`).join('')||'<p class="se-help">Add a service before assigning it to staff.</p>'}</div></section><section class="se-panel" id="staff-panel-hours" role="tabpanel" aria-labelledby="staff-tab-hours" data-staff-panel="hours" hidden><label class="se-check"><input type="checkbox" name="follow" ${value.follow?'checked':''} ${supported?'':'disabled'}>Use business opening hours</label><p class="se-help">${supported?'Turn this off to set different hours for each day. Staff hours must fit within business opening hours.':'Working hours need a booking system update before they can be changed. The saved hours remain in use.'}</p><fieldset class="se-hours" data-staff-hours-fields ${value.follow||!supported?'disabled':''}><legend class="se-sr-only">Weekly working hours</legend>${days.map(day=>{const h=value.weekly[String(day)];return `<div class="se-hours-row"><span>${names[day]}</span><label class="se-closed"><input type="checkbox" name="day_${day}_closed" ${h.closed?'checked':''}>Closed</label><label><span class="se-sr-only">${names[day]} start</span><input type="time" name="day_${day}_start" value="${esc(h.start)}" ${h.closed?'disabled':''}></label><span aria-hidden="true">to</span><label><span class="se-sr-only">${names[day]} end</span><input type="time" name="day_${day}_end" value="${esc(h.end)}" ${h.closed?'disabled':''}></label></div>`;}).join('')}</fieldset></section><div class="error" role="alert"></div><div class="se-discard" data-staff-discard hidden><p>You have unsaved changes.</p><div><button type="button" data-staff-keep>Keep editing</button><button type="button" data-staff-discard-confirm>Discard changes</button></div></div><footer class="se-save-bar"><span class="se-save-status" data-staff-save-status role="status"><span class="se-save-dot" aria-hidden="true"></span><span>All changes saved</span></span><button type="submit" class="btn primary" disabled>${adding?'Add staff member':'Save changes'}</button></footer></form>`);
   const form=document.querySelector('#modal-root .se-editor');if(!form)return;
   current={id:id||'',salonId:s.id,form,baseline:signature(value),hoursBaseline:hoursSignature(value),originalHours:m?.hours==null?null:clone(m.hours),supported};
   form.addEventListener('input',()=>{syncHours();sync();});form.addEventListener('change',()=>{syncHours();sync();});
   form.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.staffTab){event.preventDefault();tab(b.dataset.staffTab);}if(b.hasAttribute('data-staff-keep'))form.querySelector('[data-staff-discard]').hidden=true;if(b.hasAttribute('data-staff-discard-confirm')){current=null;api.closeModal();}});
   form.querySelector('.se-tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const list=[...form.querySelectorAll('[data-staff-tab]')],i=list.indexOf(document.activeElement);if(i<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?list.length-1:(i+(event.key==='ArrowRight'?1:-1)+list.length)%list.length;tab(list[next].dataset.staffTab,true);});
   syncHours();sync();tab(['details','services','hours'].includes(initialTab)?initialTab:'details');
  }
  document.addEventListener('click',event=>{if(!attached()||!dirty())return;const target=event.target;if(target.closest('[data-action="close-modal"]')||target.classList.contains('modal-backdrop')){event.preventDefault();event.stopImmediatePropagation();requestClose();}},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&attached()&&dirty()){event.preventDefault();event.stopImmediatePropagation();requestClose();}},true);
  window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
  return {open,read,saved,requestClose,isDirty:dirty};
 }};
})();
