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
  const passwordProblem=value=>{const p=String(value||'');return p.length<8?'Use at least 8 characters.':!/[A-Z]/.test(p)?'Include a capital letter.':!/[0-9]/.test(p)?'Include a number.':'';};
  function loginPanel(name){return `<section class="se-panel" id="staff-panel-login" role="tabpanel" aria-labelledby="staff-tab-login" data-staff-panel="login" hidden><h3>Login</h3><div data-login-body><p class="se-help">Loading…</p></div><p class="se-login-message" data-login-message role="status" aria-live="polite"></p></section>`;}
  function loginSetup(form,id,salonId,name,adding){
   const body=form.querySelector('[data-login-body]'),message=form.querySelector('[data-login-message]');
   const say=(text,bad=false)=>{message.textContent=text;message.classList.toggle('is-error',!!bad);};
   const field=(label,fieldName,type,auto)=>`<label class="field">${label}<input name="${fieldName}" type="${type}" autocomplete="${auto}" ${type==='email'?'inputmode="email" maxlength="254"':'maxlength="72"'}></label>`;
   const show=html=>{body.innerHTML=html;say('');};
   const valid=()=>attached()&&current.form===form&&!!form.isConnected;
   // Pressing Enter in these boxes must not save the staff details.
   body.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('input')){event.preventDefault();body.querySelector('[data-login-primary]')?.click();}});
   async function load(){
    if(adding||!id){show('<p class="se-help">Save this team member first, then come back here to give them a login.</p>');return;}
    const r=await api.teamLogins();if(!valid())return;
    if(!r.ok){show('<p class="se-help">Logins could not be loaded. Close this and try again.</p>');return;}
    const login=r.logins.find(x=>x.staff_id===id);
    if(!login){
     show(`<p class="se-help">Give ${esc(name||'this person')} their own email and password. They will see only their own calendar, dashboard, bookings and customers.</p>${field('Email','login_email','email','off')}${field('Password','login_password','password','new-password')}<p class="se-help">At least 8 characters, with a capital letter and a number. Tell them the password yourself.</p><button type="button" class="btn primary" data-login-primary data-login-create>Create login</button>`);
     return;
    }
    show(`<div class="se-login-row"><span>Email</span><b data-login-email>${esc(login.email)}</b></div><p class="se-help">${esc(name||'This person')} signs in at the JovaBook login with this email and password. They see only their own calendar, dashboard, bookings and customers.</p><div class="se-login-actions"><button type="button" data-login-open="password">Change password</button><button type="button" data-login-open="email">Change email</button><button type="button" class="danger" data-login-open="remove">Remove login</button></div><div data-login-action></div>`);
   }
   async function run(action,fields,done){
    const button=body.querySelector('[data-login-primary]');if(button)button.disabled=true;say('Saving…');
    const r=await api.teamLogin(action,salonId,id,fields);if(!valid())return;
    if(button)button.disabled=false;
    if(!r.ok){say(r.message||'This could not be saved. Try again.',true);return;}
    await load();if(valid())say(done);api.toast?.(done);
   }
   body.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-login-create')){
     const email=body.querySelector('[name=login_email]').value.trim(),password=body.querySelector('[name=login_password]').value;
     if(!/^[^\s@]+@[^\s@.][^\s@]*\.[^\s@]{2,}$/.test(email))return say('Enter a valid email address.',true);
     const problem=passwordProblem(password);if(problem)return say(problem,true);
     return run('create',{email,password},'Login created. Share the email and password with '+(name||'them')+'.');
    }
    const open=b.dataset.loginOpen;if(open){
     const holder=body.querySelector('[data-login-action]');
     holder.innerHTML=open==='password'?`${field('New password','login_password','password','new-password')}<button type="button" class="btn primary" data-login-primary data-login-save-password>Save password</button>`:open==='email'?`${field('New email','login_email','email','off')}<button type="button" class="btn primary" data-login-primary data-login-save-email>Save email</button>`:`<p class="se-help">This removes ${esc(name||'their')} login. They will no longer be able to sign in. Their bookings stay in your calendar.</p><button type="button" class="btn primary danger" data-login-primary data-login-confirm-remove>Remove login</button>`;
     say('');holder.querySelector('input')?.focus();return;
    }
    if(b.hasAttribute('data-login-save-password')){const password=body.querySelector('[name=login_password]').value,problem=passwordProblem(password);if(problem)return say(problem,true);return run('password',{password},'Password changed. Tell '+(name||'them')+' the new password.');}
    if(b.hasAttribute('data-login-save-email')){const email=body.querySelector('[name=login_email]').value.trim();if(!/^[^\s@]+@[^\s@.][^\s@]*\.[^\s@]{2,}$/.test(email))return say('Enter a valid email address.',true);return run('email',{email},'Email changed.');}
    if(b.hasAttribute('data-login-confirm-remove'))return run('remove',{},'Login removed.');
   });
   void load();
  }
  function open(id,initialTab='details'){
   if(attached()&&requestClose())return;
   const s=api.salon(),m=s.staff.find(x=>x.id===id),adding=!id;
   if(id&&!m){api.toast('This staff member is no longer available.');return;}
   if(adding&&!api.canAddStaff(s)){api.toast('Your '+api.planFor(s).name+' plan includes '+api.planFor(s).staffLimit+' staff members.');return;}
   const loginTab=typeof api.teamLoginsAvailable==='function'&&api.teamLoginsAvailable(s)===true;
   const value=initial(s,id),supported=typeof api.schedulingSupported==='function'?api.schedulingSupported(s)===true:!api.isLive(s);
   const input=(label,name,text,max)=>`<label class="field">${label}<input name="${name}" value="${esc(text)}" maxlength="${max}" autocomplete="off"></label>`;
   api.modal(adding?'Add staff member':'Edit staff member',`<form class="se-editor" data-form="staff" data-id="${esc(id||'')}" novalidate><div class="se-tabs" role="tablist" aria-label="Staff settings">${[['details','Details'],['services','Services'],['hours','Working hours'],...(loginTab?[['login','Login']]:[])].map(([name,label],i)=>`<button type="button" role="tab" id="staff-tab-${name}" aria-controls="staff-panel-${name}" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-staff-tab="${name}">${label}</button>`).join('')}</div><section class="se-panel" id="staff-panel-details" role="tabpanel" aria-labelledby="staff-tab-details" data-staff-panel="details">${input('Name','name',value.name,80)}${input('Role (optional)','role',value.role,60)}<label class="se-check"><input type="checkbox" name="active" ${value.active?'checked':''}>Bookable online</label><p class="se-help">Customers can choose this person when booking their services.</p></section><section class="se-panel" id="staff-panel-services" role="tabpanel" aria-labelledby="staff-tab-services" data-staff-panel="services" hidden><h3>Services this person offers</h3><p class="se-help">Choose the services customers can book with this person.</p><div class="se-services">${s.services.map(service=>`<label class="se-check"><input type="checkbox" name="svc" value="${esc(service.id)}" ${value.serviceIds.includes(service.id)?'checked':''}>${esc(service.name)}</label>`).join('')||'<p class="se-help">Add a service before assigning it to staff.</p>'}</div></section><section class="se-panel" id="staff-panel-hours" role="tabpanel" aria-labelledby="staff-tab-hours" data-staff-panel="hours" hidden><label class="se-check"><input type="checkbox" name="follow" ${value.follow?'checked':''} ${supported?'':'disabled'}>Use business opening hours</label><p class="se-help">${supported?'Turn this off to set different hours for each day. Staff hours must fit within business opening hours.':'Working hours need a booking system update before they can be changed. The saved hours remain in use.'}</p><fieldset class="se-hours" data-staff-hours-fields ${value.follow||!supported?'disabled':''}><legend class="se-sr-only">Weekly working hours</legend>${days.map(day=>{const h=value.weekly[String(day)];return `<div class="se-hours-row"><span>${names[day]}</span><label class="se-closed"><input type="checkbox" name="day_${day}_closed" ${h.closed?'checked':''}>Closed</label><label><span class="se-sr-only">${names[day]} start</span><input type="time" name="day_${day}_start" value="${esc(h.start)}" ${h.closed?'disabled':''}></label><span aria-hidden="true">to</span><label><span class="se-sr-only">${names[day]} end</span><input type="time" name="day_${day}_end" value="${esc(h.end)}" ${h.closed?'disabled':''}></label></div>`;}).join('')}</fieldset></section>${loginTab?loginPanel(adding?'':(m?.name||'')):''}<div class="error" role="alert"></div><div class="se-discard" data-staff-discard hidden><p>You have unsaved changes.</p><div><button type="button" data-staff-keep>Keep editing</button><button type="button" data-staff-discard-confirm>Discard changes</button></div></div><footer class="se-save-bar"><span class="se-save-status" data-staff-save-status role="status"><span class="se-save-dot" aria-hidden="true"></span><span>All changes saved</span></span><button type="submit" class="btn primary" disabled>${adding?'Add staff member':'Save changes'}</button></footer></form>`);
   const form=document.querySelector('#modal-root .se-editor');if(!form)return;
   current={id:id||'',salonId:s.id,form,baseline:signature(value),hoursBaseline:hoursSignature(value),originalHours:m?.hours==null?null:clone(m.hours),supported};
   form.addEventListener('input',()=>{syncHours();sync();});form.addEventListener('change',()=>{syncHours();sync();});
   form.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.staffTab){event.preventDefault();tab(b.dataset.staffTab);}if(b.hasAttribute('data-staff-keep'))form.querySelector('[data-staff-discard]').hidden=true;if(b.hasAttribute('data-staff-discard-confirm')){current=null;api.closeModal();}});
   form.querySelector('.se-tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const list=[...form.querySelectorAll('[data-staff-tab]')],i=list.indexOf(document.activeElement);if(i<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?list.length-1:(i+(event.key==='ArrowRight'?1:-1)+list.length)%list.length;tab(list[next].dataset.staffTab,true);});
   if(loginTab)loginSetup(form,id,s.id,m?.name||'',adding);
   syncHours();sync();tab(['details','services','hours',...(loginTab?['login']:[])].includes(initialTab)?initialTab:'details');
  }
  document.addEventListener('click',event=>{if(document.querySelector('[data-unsaved-warning]'))return;if(!attached()||!dirty())return;const target=event.target;if(target.closest('[data-action="close-modal"]')||target.classList.contains('modal-backdrop')){event.preventDefault();event.stopImmediatePropagation();requestClose();}},true);
  document.addEventListener('keydown',event=>{if(document.querySelector('[data-unsaved-warning]'))return;if(event.key==='Escape'&&attached()&&dirty()){event.preventDefault();event.stopImmediatePropagation();requestClose();}},true);
  window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
  return {open,read,saved,requestClose,isDirty:dirty};
 }};
})();
