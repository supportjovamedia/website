/* Staff presentation only. The host retains every staff write and booking guard. */
(() => {
 'use strict';
 window.JovaManagement={create(api){
  const {salon,esc,today,render}=api;
  let owner='',query='',status='all';
  const weekdays=[1,2,3,4,5,6,0],names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const initials=name=>String(name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>Array.from(part)[0]).join('').toUpperCase()||'?';
  // Native popovers escape the horizontally scrolling table without changing row height.
  const menus=()=>typeof document==='undefined'?[]:[...document.querySelectorAll('.mg-action-list[popover]')];
  function closeMenus(except){menus().forEach(menu=>{if(menu===except)return;if(menu.matches(':popover-open'))menu.hidePopover();const details=menu.closest('.mg-actions');if(details)details.open=false;});}
  function placeMenu(menu,summary){
   const anchor=summary.getBoundingClientRect(),bounds=menu.getBoundingClientRect(),gap=7,pad=10;
   const width=Math.min(bounds.width,window.innerWidth-pad*2),height=bounds.height;
   menu.style.left=Math.max(pad,Math.min(anchor.right-width,window.innerWidth-width-pad))+'px';
   menu.style.top=Math.max(pad,Math.min(anchor.bottom+gap+height<=window.innerHeight-pad?anchor.bottom+gap:anchor.top-height-gap,window.innerHeight-height-pad))+'px';
  }
  if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
   document.addEventListener('toggle',event=>{
    const details=event.target;
    if(details?.matches?.('.mg-actions')){
     const menu=details.querySelector('.mg-action-list[popover]'),summary=details.querySelector('summary');
     if(!menu||!summary)return;
     summary.setAttribute('aria-expanded',String(details.open));
     if(details.open){closeMenus(menu);if(!menu.matches(':popover-open'))menu.showPopover();placeMenu(menu,summary);}
     else if(menu.matches(':popover-open'))menu.hidePopover();
    }else if(details?.matches?.('.mg-action-list[popover]')&&event.newState==='closed'){
     const owner=details.closest('.mg-actions');if(owner){owner.open=false;owner.querySelector('summary')?.setAttribute('aria-expanded','false');}
    }
   },true);
   document.addEventListener('scroll',event=>{if(event.target?.closest?.('.mg-action-list'))return;menus().filter(menu=>menu.matches(':popover-open')).forEach(menu=>{const summary=menu.closest('.mg-actions')?.querySelector('summary');if(summary)placeMenu(menu,summary);});},true);
   if(typeof window.addEventListener==='function')window.addEventListener('resize',()=>closeMenus());
  }
  function daysFor(s,member){
   return weekdays.map(day=>{
    const business=window.JovaSchedule.day(s.hours,day),staff=member.hours==null?business:window.JovaSchedule.day(member.hours,day);
    const start=business.start>staff.start?business.start:staff.start,end=business.end<staff.end?business.end:staff.end;
    return {day,closed:business.closed||staff.closed||start>=end,start,end};
   });
  }
  function rows(s){
   const text=query.trim().toLocaleLowerCase('en-GB');
   return (s.staff||[]).filter(member=>(status==='all'||(status==='active'?member.active!==false:member.active===false))&&(!text||(String(member.name||'')+' '+String(member.role||'')).toLocaleLowerCase('en-GB').includes(text)));
  }
  function page(){
   const s=salon();if(owner!==s.id){owner=s.id;query='';status='all';}
   const plan=api.planFor(s),allowed=api.canAddStaff(s)===true,list=rows(s),staff=s.staff||[],missing=api.isLive(s)&&!(s.capabilities?.version>=1);
   const capacity=staff.length>=plan.staffLimit;
   const warnings=[staff.length>plan.staffLimit?'All existing staff records have been kept. This plan does not allow additional staff members.':'',missing?'Adding staff needs a booking system update. Existing staff can still be viewed and edited.':''].filter(Boolean);
   const addTitle=capacity?`${plan.name} includes ${plan.staffLimit} staff ${plan.staffLimit===1?'member':'members'}.`:missing?'Adding staff needs a booking system update.':'';
   return `<section class="mg-page"><header class="mg-heading"><div><h1>Staff <span class="mg-count">${staff.length}</span></h1><p>The people and services customers can book.</p></div><button class="btn primary mg-add" data-action="add-staff" ${allowed?'':`disabled title="${esc(addTitle)}"`}>Add staff member</button></header><div class="mg-roster"><span><b>${esc(plan.name)}</b> plan</span><span>${staff.length} of ${plan.staffLimit} staff ${plan.staffLimit===1?'member':'members'}</span><a href="#billing">Subscription details</a></div>${warnings.map(message=>`<p class="mg-notice" role="status">${esc(message)}</p>`).join('')}<div class="mg-surface"><form class="mg-toolbar" data-form="mg-staff-filter"><label class="mg-search"><span class="mg-sr-only">Search staff by name or role</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg><input type="search" name="q" value="${esc(query)}" placeholder="Search staff" maxlength="120" autocomplete="off"></label><button type="submit" class="mg-search-button">Search</button><label class="mg-status-filter"><span>Status</span><select name="status" data-change="mg-staff-status">${[['all','All staff'],['active','Bookable'],['inactive','Not bookable']].map(([value,label])=>`<option value="${value}" ${status===value?'selected':''}>${label}</option>`).join('')}</select></label>${query||status!=='all'?'<button type="button" class="mg-clear" data-action="mg-clear-staff">Clear filters</button>':''}</form><div class="table-wrap mg-staff-scroll" tabindex="0" role="region" aria-label="Staff table, scroll horizontally for more columns"><table class="mg-staff-table"><thead><tr><th scope="col">Staff</th><th scope="col">Working days</th><th scope="col">Services</th><th scope="col">Upcoming</th><th scope="col">Status</th><th scope="col"><span class="mg-sr-only">Actions</span></th></tr></thead><tbody>${list.map(member=>{
    const assigned=(s.services||[]).filter(service=>(service.staffIds||[]).includes(member.id));
    const upcoming=(s.bookings||[]).filter(booking=>booking.staffId===member.id&&booking.status==='confirmed'&&booking.date>=today()).length;
    const fullName=String(member.name||'Unnamed staff'),bookable=member.active!==false;
    return `<tr data-mg-staff="${esc(member.id)}"><td data-label="Staff"><div class="mg-person"><span class="mg-avatar" aria-hidden="true">${esc(initials(fullName))}</span><div><strong>${esc(fullName)}</strong><span>${esc(member.role||'Staff member')}</span></div></div></td><td data-label="Working days"><div class="mg-days" aria-label="Weekly working days">${daysFor(s,member).map(day=>`<span class="mg-day ${day.closed?'':'mg-day-open'}" title="${names[day.day]}: ${day.closed?'Closed':day.start+' to '+day.end}" aria-label="${names[day.day]}: ${day.closed?'closed':day.start+' to '+day.end}">${names[day.day].slice(0,1)}</span>`).join('')}</div></td><td data-label="Services"><span class="mg-services ${assigned.length?'':'mg-muted'}">${assigned.length?assigned.map(service=>esc(service.name)).join(', '):'No services assigned'}</span></td><td data-label="Upcoming"><span class="mg-upcoming" title="Confirmed bookings today or later">${upcoming}</span></td><td data-label="Status"><span class="mg-status ${bookable?'mg-status-active':''}"><i aria-hidden="true"></i>${bookable?'Bookable':'Not bookable'}</span></td><td data-label="Actions"><details class="mg-actions"><summary aria-label="Actions for ${esc(fullName)}" aria-haspopup="true" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.7"></circle><circle cx="12" cy="12" r="1.7"></circle><circle cx="12" cy="19" r="1.7"></circle></svg></summary><div class="mg-action-list" popover="auto" aria-label="Staff actions"><button type="button" autofocus data-action="edit-staff" data-id="${esc(member.id)}">Edit staff</button><button type="button" data-action="staff-hours" data-id="${esc(member.id)}">Working hours</button><button type="button" class="mg-delete" data-action="delete-staff" data-id="${esc(member.id)}">Delete staff</button></div></details></td></tr>`;
   }).join('')||`<tr><td colspan="6"><div class="mg-empty"><h2>${staff.length?'No matching staff':'Your team starts here'}</h2><p>${staff.length?'Try another name, role or status.':'Add your first staff member to assign services and working hours.'}</p>${staff.length?'<button type="button" data-action="mg-clear-staff">Clear filters</button>':''}</div></td></tr>`}</tbody></table></div><footer class="mg-footer">Showing ${list.length} of ${staff.length} staff ${staff.length===1?'member':'members'}<span>Working days follow business opening hours.</span></footer></div></section>`;
  }
  function setFilters(q,value){query=String(q||'').slice(0,120);status=['all','active','inactive'].includes(value)?value:'all';render();}
  return {routes:['staff'],pages:{staff:page},click(action,element){
   if(action==='mg-clear-staff'){setFilters('','all');return true;}
   if(['edit-staff','staff-hours','delete-staff'].includes(action)){closeMenus();const details=element?.closest?.('.mg-actions');if(details)details.open=false;}
   return false;
  },submit(type,form,data){if(type!=='mg-staff-filter')return false;setFilters(data.q,data.status);return true;},change(element){
   if(element.dataset?.change!=='mg-staff-status')return false;
   const form=element.closest('form');setFilters(form?.elements?.q?.value||'',element.value);return true;
  }};
 }};
})();
