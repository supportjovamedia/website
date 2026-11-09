/* Filters stay in a private draft until Apply. They never write business data. */
(() => {
 'use strict';
 const svg=body=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
 const icons={back:svg('<path d="m14 5-7 7 7 7"/>'),next:svg('<path d="m9 5 7 7-7 7"/>'),person:svg('<circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>'),layers:svg('<path d="m12 3 10 6-10 6L2 9l10-6Zm-9 11 9 5 9-5M3 18l9 5 9-5"/>'),search:svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>')};
 const initials=name=>String(name||'').trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
 const categoryIcon=name=>{
  const value=String(name||'').toLocaleLowerCase();
  if(/hair|barber|cut|colou?r/.test(value))return svg('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.2 8.2 11.3 11.3M8.2 15.8 19.5 4.5M13 11l-2 2"/>');
  if(/lash|brow|eye/.test(value))return svg('<path d="M3 9c5 5 13 5 18 0M5 11l-2 3m6-1-1 4m6-4 1 4m4-6 2 3"/>');
  if(/skin|facial/.test(value))return svg('<path d="M20 4c-8-2-16 3-16 10a6 6 0 0 0 6 6c7 0 11-8 10-16ZM5 19 17 7"/>');
  if(/nail|manicur|pedicur/.test(value))return svg('<rect x="8" y="3" width="8" height="18" rx="4"/><path d="M8 11h8M11 6h2"/>');
  if(/beauty|wax|massage|wellness/.test(value))return svg('<path d="M12 21C5 18 4 11 6 7c3 0 5 2 6 5 1-3 3-5 6-5 2 4 1 11-6 14ZM12 12c-3-3-3-7 0-10 3 3 3 7 0 10ZM5 12l-3-1c0 6 3 10 10 10m7-9 3-1c0 6-3 10-10 10"/>');
  return icons.layers;
 };
 window.JovaBookingFilters={create(api){
  const {salon,filter,esc,modal,closeModal,render}=api;let draft=null;
  const key=()=>String(api.ownerIdentity?.()||'demo')+'|'+salon().id;
  const current=()=>draft&&draft.owner===key();
  const groups=()=>{
   const s=salon(),known=new Set((s.categories||[]).map(category=>category.id));
   return [...(s.categories||[]).map(category=>({id:category.id,name:category.name,services:(s.services||[]).filter(service=>service.categoryId===category.id)})),{id:'',name:'Other services',services:(s.services||[]).filter(service=>!known.has(service.categoryId))}].filter(group=>group.services.length);
  };
  const label=(set,kind)=>set.size?set.size+' '+kind+(set.size===1||kind==='staff'?'':'s')+' selected':'All '+(kind==='staff'?'staff':'services');
  function open(){const applied=filter();draft={owner:key(),view:'home',staff:new Set(applied.staffIds||[]),services:new Set(applied.serviceIds||[]),query:'',expanded:new Set()};draw();}
  function searchField(what){return `<label class="bkf-search">${icons.search}<input type="search" data-bkf-search aria-label="Search ${what}" placeholder="Search ${what}" value="${esc(draft.query)}"></label>`;}
  function footer(kind){const count=kind==='staff'?draft.staff.size:draft.services.size;return `<div class="bkf-selection"><span>${count} ${kind}${count===1||kind==='staff'?'':'s'} selected</span><button type="button" data-action="bkf-clear" data-kind="${kind}">Clear</button></div><div class="bkf-footer"><button type="button" class="btn primary" data-action="bkf-done">Done</button></div>`;}
  function root(){return typeof document==='undefined'?null:document.querySelector('[data-bkf-root]');}
  function syncSelection(){
   const panel=root();if(!panel||!current())return;
   const byCategory=new Map(groups().map(group=>[group.id,group]));
   panel.querySelectorAll('[data-bkf-kind]').forEach(input=>{
    const kind=input.dataset.bkfKind,group=kind==='category'?byCategory.get(input.value):null;
    const count=group?group.services.filter(service=>draft.services.has(service.id)).length:0;
    input.checked=group?count===group.services.length:(kind==='staff'?draft.staff:draft.services).has(input.value);
    input.indeterminate=!!group&&count>0&&count<group.services.length;
   });
   panel.querySelectorAll('.bkf-category').forEach(category=>{
    const button=category.querySelector('[data-action=bkf-expand]'),group=byCategory.get(button.dataset.category);if(!group)return;
    const count=group.services.filter(service=>draft.services.has(service.id)).length;
    category.classList.toggle('is-selected',count>0);
    button.querySelector('small').textContent=count?count+' selected':group.services.length+' service'+(group.services.length===1?'':'s');
   });
   const selection=panel.querySelector('.bkf-selection>span');if(selection){const kind=draft.view==='staff'?'staff':'service',count=(kind==='staff'?draft.staff:draft.services).size;selection.textContent=count+' '+kind+(count===1||kind==='staff'?'':'s')+' selected';}
   const staff=panel.querySelector('[data-action=bkf-staff]>span'),services=panel.querySelector('[data-action=bkf-services]>span');
   if(staff)staff.textContent=label(draft.staff,'staff');if(services)services.textContent=label(draft.services,'service');
  }
  function updateVisibleChoices(){
   const panel=root();if(!panel||!current())return;const q=draft.query.trim().toLocaleLowerCase();let visible=0;
   if(draft.view==='staff')panel.querySelectorAll('.bkf-staff-choice').forEach(row=>{row.hidden=!row.querySelector('strong').textContent.toLocaleLowerCase().includes(q);if(!row.hidden)visible++;});
   else panel.querySelectorAll('.bkf-category').forEach(category=>{
    const button=category.querySelector('[data-action=bkf-expand]'),categoryMatch=button.querySelector('strong').textContent.toLocaleLowerCase().includes(q);let matches=0;
    category.querySelectorAll('.bkf-category-services>label').forEach(row=>{row.hidden=!!q&&!categoryMatch&&!row.querySelector('span').textContent.toLocaleLowerCase().includes(q);if(!row.hidden)matches++;});
    category.hidden=!matches;if(matches)visible++;const expanded=!!q||draft.expanded.has(button.dataset.category);
    button.setAttribute('aria-expanded',String(expanded));category.querySelector('.bkf-category-services').hidden=!expanded;
   });
   const empty=panel.querySelector('.bkf-empty');if(empty)empty.hidden=visible>0;
  }
  function draw(){
   if(!current())return;
   const q=draft.query.trim().toLocaleLowerCase();let body='',title='Filter bookings';
   if(draft.view==='home'){
    body=`<div class="bkf-options"><button type="button" data-action="bkf-staff">${icons.person}<strong>Staff</strong><span>${esc(label(draft.staff,'staff'))}</span>${icons.next}</button><button type="button" data-action="bkf-services">${icons.layers}<strong>Services</strong><span>${esc(label(draft.services,'service'))}</span>${icons.next}</button></div><div class="bkf-footer bkf-home-actions"><button type="button" data-action="bkf-clear-all">Clear all</button><button type="button" class="btn primary" data-action="bkf-apply">Apply filters</button></div>`;
   }else if(draft.view==='staff'){
    title='Select staff';const members=(salon().staff||[]).filter(member=>String(member.name||'').toLocaleLowerCase().includes(q));
    body=`<button type="button" class="bkf-back" data-action="bkf-back" aria-label="Back to filters">${icons.back}</button>${searchField('staff')}<div class="bkf-choice-list">${members.map(member=>`<label class="bkf-staff-choice"><input type="checkbox" data-bkf-kind="staff" value="${esc(member.id)}" ${draft.staff.has(member.id)?'checked':''}><span class="bkf-avatar" aria-hidden="true">${esc(initials(member.name))}</span><strong>${esc(member.name)}</strong></label>`).join('')}<p class="bkf-empty" ${members.length?'hidden':''}>No staff match your search.</p></div>${footer('staff')}`;
   }else{
    title='Select services';const matched=groups().map(group=>({...group,visible:group.name.toLocaleLowerCase().includes(q)?group.services:group.services.filter(service=>String(service.name||'').toLocaleLowerCase().includes(q))})).filter(group=>group.visible.length);
    body=`<button type="button" class="bkf-back" data-action="bkf-back" aria-label="Back to filters">${icons.back}</button>${searchField('services')}<div class="bkf-choice-list bkf-categories">${matched.map(group=>{
     const count=group.services.filter(service=>draft.services.has(service.id)).length,all=count===group.services.length,expanded=draft.expanded.has(group.id)||!!q;
     return `<section class="bkf-category ${count?'is-selected':''}"><div class="bkf-category-heading"><span class="bkf-category-icon">${categoryIcon(group.name)}</span><button type="button" data-action="bkf-expand" data-category="${esc(group.id)}" aria-expanded="${expanded}"><strong>${esc(group.name)}</strong><small>${count?count+' selected':group.services.length+' service'+(group.services.length===1?'':'s')}</small>${icons.next}</button><label class="bkf-category-toggle"><input type="checkbox" data-bkf-kind="category" value="${esc(group.id)}" aria-label="Select all ${esc(group.name)} services" ${all?'checked':''} ${count&&!all?'data-partial="true"':''}></label></div><div class="bkf-category-services" ${expanded?'':'hidden'}>${group.services.map(service=>`<label><input type="checkbox" data-bkf-kind="service" value="${esc(service.id)}" ${draft.services.has(service.id)?'checked':''}><span>${esc(service.name)}</span></label>`).join('')}</div></section>`;
    }).join('')}<p class="bkf-empty" ${matched.length?'hidden':''}>No services match your search.</p></div>${footer('service')}`;
   }
   modal(title,`<section class="bkf-root" data-bkf-root data-owner="${esc(draft.owner)}">${body}</section>`,draft.view==='home'?'jg-booking-filter-modal':'jg-booking-filter-picker');
   syncSelection();updateVisibleChoices();
  }
  function click(action,el){
   if(action==='bookings-filters'){open();return true;}
   if(!action.startsWith('bkf-'))return false;if(!current())return true;
   if(action==='bkf-staff'||action==='bkf-services'){draft.view=action==='bkf-staff'?'staff':'services';draft.query='';draw();return true;}
   if(action==='bkf-back'||action==='bkf-done'){draft.view='home';draft.query='';draw();return true;}
   if(action==='bkf-expand'){const id=el.dataset.category;draft.expanded.has(id)?draft.expanded.delete(id):draft.expanded.add(id);updateVisibleChoices();return true;}
   if(action==='bkf-clear'){(el.dataset.kind==='staff'?draft.staff:draft.services).clear();syncSelection();return true;}
   if(action==='bkf-clear-all'){draft.staff.clear();draft.services.clear();syncSelection();return true;}
   if(action==='bkf-apply'){
    const s=salon(),applied=filter();applied.staffIds=[...draft.staff].filter(id=>(s.staff||[]).some(member=>member.id===id));applied.serviceIds=[...draft.services].filter(id=>(s.services||[]).some(service=>service.id===id));draft=null;closeModal();render();return true;
   }
   return true;
  }
  function change(el){const kind=el.dataset?.bkfKind;if(!kind)return false;if(!current()||el.closest('[data-bkf-root]')?.dataset.owner!==draft.owner)return true;
   if(kind==='category'){const group=groups().find(group=>group.id===el.value);if(group)group.services.forEach(service=>el.checked?draft.services.add(service.id):draft.services.delete(service.id));}
   else {const set=kind==='staff'?draft.staff:draft.services;el.checked?set.add(el.value):set.delete(el.value);}
   syncSelection();return true;
  }
  function input(el){if(!el.matches?.('[data-bkf-search]'))return false;if(!current())return true;draft.query=el.value;updateVisibleChoices();return true;}
  return {routes:[],pages:{},click,change,input,submit:()=>false};
 }};
})();
