/* Grouped service presentation. All service and category writes remain in the host. */
(() => {
 'use strict';
 window.JovaServices={create(api){
  const {salon,esc,money,render}=api;
  let owner='',selected='all',query='',pendingReveal=false,pendingServiceId='',pendingFocusId='';
  const collapsed=new Set();
  const other='__uncategorised__';
  const duration=value=>{const minutes=Math.max(0,Number(value)||0),hours=Math.floor(minutes/60),rest=minutes%60;return hours?`${hours} hr${hours>1?'s':''}${rest?' '+rest+' min':''}`:`${minutes} min`;};
  const safeId=value=>String(value??'');
  function groupsFor(s){
   const categories=Array.isArray(s.categories)?s.categories:[],services=Array.isArray(s.services)?s.services:[];
   const known=new Set(categories.map(c=>c.id));
   return [...categories.map(c=>({id:c.id,name:c.name,category:true,items:services.filter(service=>service.categoryId===c.id)})),{id:other,name:'No category',category:false,items:services.filter(service=>!known.has(service.categoryId))}];
  }
  function scope(s){if(owner!==s.id){owner=s.id;selected='all';query='';pendingReveal=false;pendingServiceId='';pendingFocusId='';collapsed.clear();}}
  function creationCategory(){const s=salon();scope(s);return (s.categories||[]).some(category=>safeId(category.id)===selected)?selected:'';}
  // Called only after a successful host save. The module never guesses whether a write succeeded.
  function revealCategory(id,expectedOwner=salon().id){
   const s=salon();if(s.id!==expectedOwner)return false;scope(s);
   const category=(s.categories||[]).find(item=>safeId(item.id)===safeId(id));if(!category)return false;
   selected=safeId(category.id);query='';collapsed.delete(selected);pendingReveal=true;pendingFocusId='';return true;
  }
  function revealService(id,expectedOwner=salon().id){
   const s=salon();if(s.id!==expectedOwner)return false;scope(s);
   const service=(s.services||[]).find(item=>safeId(item.id)===safeId(id));if(!service)return false;
   selected=(s.categories||[]).some(category=>category.id===service.categoryId)?safeId(service.categoryId):other;
   query='';collapsed.delete(selected);pendingReveal=true;pendingServiceId=safeId(service.id);pendingFocusId=pendingServiceId;return true;
  }
  function revealAfterRender(s){
   const reveal=pendingReveal,focusId=pendingFocusId;pendingReveal=false;pendingFocusId='';
   if(!reveal||typeof document==='undefined'||typeof queueMicrotask!=='function')return;
   const expectedOwner=safeId(s.id);
   queueMicrotask(()=>{
    const page=document.querySelector('.sm-page');if(page?.dataset.serviceOwner!==expectedOwner)return;
    const record=focusId?[...page.querySelectorAll('[data-service-id]')].find(node=>node.dataset.serviceId===focusId):null;
    const target=record?.querySelector('.jg-service-open')||page.querySelector('[data-change="sm-category"]');
    target?.focus({preventScroll:true});
    if(record)record.scrollIntoView({block:'nearest',inline:'nearest'});
   });
  }
  function page(){
   const s=salon();scope(s);
   const services=Array.isArray(s.services)?s.services:[],staff=Array.isArray(s.staff)?s.staff:[],groups=groupsFor(s);
   if(selected!=='all'&&!groups.some(group=>safeId(group.id)===selected&&(group.category||group.items.length)))selected='all';
   const term=query.trim().toLocaleLowerCase('en-GB');
   let filtered=(selected==='all'?groups.filter(group=>group.items.length):groups.filter(group=>safeId(group.id)===selected)).map(group=>({...group,items:term?group.items.filter(service=>(String(service.name||'')+' '+String(group.name||'')).toLocaleLowerCase('en-GB').includes(term)):group.items}));
   if(term)filtered=filtered.filter(group=>group.items.length);
   filtered=filtered.map(group=>({...group,total:group.items.length}));
   const nav=[{id:'all',name:'All services',count:services.length},...groups.filter(group=>group.category||group.items.length).map(group=>({id:safeId(group.id),name:group.name,count:group.items.length}))];
   const allItems=filtered.flatMap(group=>group.items),signature=selected+'|'+term;
   let paging=window.JovaListPages?.take('Services',allItems,s.id,signature)||{items:allItems,footer:'',pages:1};
   if(pendingServiceId&&window.JovaListPages){window.JovaListPages.reveal('Services',pendingServiceId);paging=window.JovaListPages.take('Services',allItems,s.id,signature);}
   pendingServiceId='';
   if(paging.pages>1){const visible=new Set(paging.items.map(item=>item.id));filtered=filtered.map(group=>({...group,items:group.items.filter(item=>visible.has(item.id))})).filter(group=>group.items.length);}
   const moreIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>';
   const serviceIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-11 5 2 2 4-4"/></svg>';
   const clockIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>';
   const priceIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3m-6-3v4c0 1.7 2.7 3 6 3"/><ellipse cx="15" cy="13" rx="6" ry="3"/><path d="M9 13v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4"/></svg>';
   revealAfterRender(s);
   return `<section class="sm-page" data-service-owner="${esc(s.id)}"><header class="sm-heading"><div><h1>Services <span class="sm-total">${services.length}</span></h1></div><button class="btn primary" type="button" data-action="add-service">Add service</button></header><div class="sm-layout"><div class="jg-service-controls"><label class="jg-service-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input type="search" id="sm-service-search" data-change="sm-search" aria-label="Search services" placeholder="Search services" maxlength="120" autocomplete="off" value="${esc(query)}"></label><div class="jg-service-filter" aria-label="Service categories"><label class="jg-category-select"><span class="sm-sr-only">Category</span><select aria-label="Service category" data-change="sm-category">${nav.map(item=>`<option value="${esc(item.id)}" ${selected===item.id?'selected':''}>${esc(item.name)} (${item.count})</option>`).join('')}</select></label><button type="button" data-action="add-category" aria-label="Add category"><span aria-hidden="true">+</span> Category</button></div></div><div class="sm-groups">${services.length&&filtered.length?filtered.map(group=>`<section class="sm-group" data-service-category="${esc(group.id)}"><header class="sm-group-heading"><button type="button" class="jg-service-group-toggle" data-action="sm-toggle-category" data-category="${esc(group.id)}" aria-expanded="${!collapsed.has(safeId(group.id))}" aria-controls="sm-services-${esc(encodeURIComponent(group.id))}" aria-label="${collapsed.has(safeId(group.id))?'Expand':'Collapse'} ${esc(group.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg><span>${esc(group.name)}</span><small>${group.total}</small></button>${group.category?`<details class="mg-actions jg-category-actions"><summary aria-label="Actions for category ${esc(group.name)}">${moreIcon}</summary><div class="mg-action-list" popover="auto"><button type="button" data-action="edit-category" data-id="${esc(group.id)}">Edit category</button><button type="button" class="danger" data-action="delete-category" data-id="${esc(group.id)}">Delete category</button></div></details>`:''}</header>${group.items.length?`<ul class="jg-service-list" id="sm-services-${esc(encodeURIComponent(group.id))}" ${collapsed.has(safeId(group.id))?'hidden':''}>${group.items.map(service=>{
 const assigned=staff.filter(member=>(service.staffIds||[]).includes(member.id)),bookable=assigned.some(member=>member.active!==false);
 return `<li class="jg-service-record" data-service-id="${esc(service.id)}"><button type="button" class="jg-service-open" data-action="edit-service" data-id="${esc(service.id)}" aria-label="Edit ${esc(service.name)}"><span class="jg-service-symbol">${serviceIcon}</span><span class="jg-service-copy"><strong>${esc(service.name)}</strong><span class="jg-service-meta"><span class="jg-service-duration">${clockIcon}${duration(service.duration)}</span><span class="jg-service-price">${priceIcon}${money(service.price)}</span></span></span></button><span class="sm-status ${bookable?'is-bookable':'needs-staff'}"><i aria-hidden="true"></i>${bookable?'Bookable':'Needs staff'}</span><details class="mg-actions jg-record-actions"><summary aria-label="Actions for ${esc(service.name)}">${moreIcon}</summary><div class="mg-action-list" popover="auto"><button type="button" data-action="edit-service" data-id="${esc(service.id)}">Edit service</button><button type="button" class="danger" data-action="remove-service" data-id="${esc(service.id)}">Remove service</button></div></details></li>`;
 }).join('')}</ul>`:`<div class="sm-empty" id="sm-services-${esc(encodeURIComponent(group.id))}" ${collapsed.has(safeId(group.id))?'hidden':''}><h3>No services in this category</h3></div>`}</section>`).join(''):`<section class="sm-empty sm-empty-all"><h2>${term?'No matching services':'Add your first service'}</h2>${term?'':'<p>Set a name, price and duration so customers know what they can book.</p>'}</section>`}${paging.footer}</div></div></section>`;
  }
  function chooseCategory(raw){const s=salon();scope(s);const value=String(raw||'all'),groups=groupsFor(s);selected=value==='all'||groups.some(group=>safeId(group.id)===value&&(group.category||group.items.length))?value:'all';collapsed.delete(selected);pendingReveal=false;render();return true;}
  function input(el){if(el?.id!=='sm-service-search')return false;scope(salon());query=String(el.value||'').slice(0,120);collapsed.clear();const position=el.selectionStart;render();if(typeof document!=='undefined'){const next=document.querySelector('#sm-service-search');next?.focus({preventScroll:true});if(Number.isInteger(position))next?.setSelectionRange(position,position);}return true;}
  return {routes:['services'],pages:{services:page},creationCategory,revealCategory,revealService,input,click(action,element){if(action==='sm-category')return chooseCategory(element?.dataset?.category);if(action!=='sm-toggle-category')return false;const s=salon();scope(s);const id=String(element?.dataset?.category||'');if(!groupsFor(s).some(group=>safeId(group.id)===id))return false;if(collapsed.has(id))collapsed.delete(id);else collapsed.add(id);render();if(typeof document!=='undefined'){const toggle=[...document.querySelectorAll('[data-action=sm-toggle-category]')].find(node=>node.dataset.category===id);toggle?.focus({preventScroll:true});}return true;},change:el=>el?.dataset?.change==='sm-category'?chooseCategory(el.value):el?.dataset?.change==='sm-search'?input(el):false,submit:()=>false};
 }};
})();
