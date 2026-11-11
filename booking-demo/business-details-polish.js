/* Business details sections share one mounted form and the existing save transaction. */
(() => {
 'use strict';
 const titles={home:'Business details',information:'Business information',hours:'Working hours',rules:'Booking rules'};
 let owner='',section='home',pending=false;
 function view(nextOwner,route){if(owner!==nextOwner){owner=nextOwner;section=route==='availability'?'hours':'home';}return section;}
 function updateHoursRow(row){
  const closed=row.querySelector('.ws-closed input'),toggle=row.querySelector('[data-bd-day-toggle]'),range=row.querySelector('[data-bd-hours-edit]'),times=row.querySelectorAll('input[type=time]');if(!closed||!toggle||times.length!==2)return;
  const unavailable=closed.matches(':disabled');toggle.disabled=unavailable;toggle.setAttribute('aria-checked',String(!closed.checked));
  range.textContent=times[0].value+' to '+times[1].value;range.hidden=closed.checked;range.disabled=unavailable;row.querySelector('.bd-day-closed').hidden=!closed.checked;
  if(closed.checked)row.querySelector('.bd-day-times').hidden=true;
 }
 function enhanceHours(root){
  root.querySelectorAll('#business-hours .ws-daily-row').forEach(row=>{
   if(!row.querySelector||row.dataset.bdHoursReady)return;
   const closed=row.querySelector('.ws-closed input'),labels=Array.from(row.querySelectorAll('.ws-daily-time')),title=row.querySelector('b');if(!closed||labels.length!==2||!title)return;
   row.dataset.bdHoursReady='true';row.dataset.dayName=title.textContent.trim();title.textContent=row.dataset.dayName.slice(0,3);closed.closest('.ws-closed').hidden=true;
   const toggle=document.createElement('button');toggle.type='button';toggle.className='bd-day-toggle';toggle.dataset.bdDayToggle='';toggle.setAttribute('role','switch');toggle.setAttribute('aria-label',row.dataset.dayName+' open for bookings');
   const range=document.createElement('button');range.type='button';range.className='bd-day-range';range.dataset.bdHoursEdit='';range.setAttribute('aria-label','Edit '+row.dataset.dayName+' opening hours');range.setAttribute('aria-expanded','false');
   const closedLabel=document.createElement('span');closedLabel.className='bd-day-closed';closedLabel.textContent='Closed';
   const times=document.createElement('div');times.className='bd-day-times';times.hidden=true;times.append(labels[0]);const separator=row.querySelector('.ws-time-to');if(separator)times.append(separator);times.append(labels[1]);
   row.append(toggle,range,closedLabel,times);updateHoursRow(row);
   if(root.closest('[data-setup-active=hours]'))row.dispatchEvent(new Event('change',{bubbles:true}));
  });
 }
 function open(next,{focus=true}={}){
  if(!Object.hasOwn(titles,next))return false;
  const root=document.querySelector('.bd-settings');if(!root)return false;
  owner=root.dataset.bdOwner;section=next;root.dataset.businessView=next;
  root.querySelectorAll('[data-bd-section]').forEach(panel=>panel.hidden=panel.dataset.bdSection!==next);
  const title=root.querySelector('[data-bd-title]');if(title.textContent!==titles[next])title.textContent=titles[next];
  root.querySelector('.bd-back').hidden=next==='home';root.querySelector('[data-bd-save]').hidden=next==='home';
  if(focus){title.tabIndex=-1;title.focus({preventScroll:true});const scroller=root.closest('.workspace-main');if(scroller)scroller.scrollTop=0;}
  return true;
 }
 function sync(){pending=false;const root=document.querySelector('.bd-settings');if(!root)return;enhanceHours(root);if(owner!==root.dataset.bdOwner){owner=root.dataset.bdOwner;section=Object.hasOwn(titles,root.dataset.businessView)?root.dataset.businessView:'home';}open(section,{focus:false});}
 function schedule(){if(!pending){pending=true;requestAnimationFrame(sync);}}
 document.addEventListener('click',event=>{
  const dayToggle=event.target.closest?.('[data-bd-day-toggle]');if(dayToggle){event.preventDefault();if(dayToggle.disabled)return;const row=dayToggle.closest('.ws-daily-row'),closed=row.querySelector('.ws-closed input');closed.checked=!closed.checked;closed.dispatchEvent(new Event('change',{bubbles:true}));updateHoursRow(row);return;}
  const hoursEdit=event.target.closest?.('[data-bd-hours-edit]');if(hoursEdit){event.preventDefault();const times=hoursEdit.closest('.ws-daily-row').querySelector('.bd-day-times');
  // Only one day's times are open at a time, so the list never grows out of control.
  if(times.hidden)document.querySelectorAll('.bd-day-times:not([hidden])').forEach(other=>{if(other!==times){other.hidden=true;other.closest('.ws-daily-row')?.querySelector('[data-bd-hours-edit]')?.setAttribute('aria-expanded','false');}});
  times.hidden=!times.hidden;hoursEdit.setAttribute('aria-expanded',String(!times.hidden));if(!times.hidden)times.querySelector('input[type=time]')?.focus();return;}
  const button=event.target.closest?.('[data-bd-open]');if(button){event.preventDefault();open(button.dataset.bdOpen);return;}
 });
 document.addEventListener('input',event=>{
  const field=event.target;
  if(!field.matches?.('[data-bd-phone]')||event.isComposing)return;
  const digits=field.value.replace(/\D/g,'');
  if(digits===field.value)return;
  const position=field.value.slice(0,field.selectionStart??field.value.length).replace(/\D/g,'').length;
  field.value=digits;
  field.setSelectionRange(position,position);
 },true);
 document.addEventListener('change',event=>{
  const row=event.target.closest?.('.bd-settings .ws-daily-row');if(row?.dataset.bdHoursReady)updateHoursRow(row);
  const mobile=event.target;if(mobile.name!=='mobileService'||mobile.form?.dataset.form!=='settings')return;
  const address=mobile.form.elements.address;
  address.required=!mobile.checked;
  const label=address.closest('label');
  label.querySelector('.bd-required').hidden=mobile.checked;
  label.querySelector('.bd-optional').hidden=!mobile.checked;
 });
 // Unfinished required details are revealed before the browser focuses the invalid input.
 document.addEventListener('invalid',event=>{const first=event.target.form?.querySelector('input:invalid,select:invalid,textarea:invalid');if(first&&first!==event.target)return;const panel=event.target.closest?.('.bd-settings [data-bd-section]');if(panel)open(panel.dataset.bdSection,{focus:false});},true);
 function start(){sync();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}
 window.JovaBusinessDetails={view,open};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
