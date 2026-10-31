/* Grouped service presentation. All service and category writes remain in the host. */
(() => {
 'use strict';
 window.JovaServices={create(api){
  const {salon,esc,money,render}=api;
  let owner='',selected='all';
  const other='__uncategorised__';
  const duration=value=>{const minutes=Math.max(0,Number(value)||0),hours=Math.floor(minutes/60),rest=minutes%60;return hours?`${hours} hr${hours>1?'s':''}${rest?' '+rest+' min':''}`:`${minutes} min`;};
  const safeId=value=>String(value??'');
  function groupsFor(s){
   const categories=Array.isArray(s.categories)?s.categories:[],services=Array.isArray(s.services)?s.services:[];
   const known=new Set(categories.map(c=>c.id));
   return [...categories.map(c=>({id:c.id,name:c.name,category:true,items:services.filter(service=>service.categoryId===c.id)})),{id:other,name:'No category',category:false,items:services.filter(service=>!known.has(service.categoryId))}];
  }
  function page(){
   const s=salon();if(owner!==s.id){owner=s.id;selected='all';}
   const services=Array.isArray(s.services)?s.services:[],staff=Array.isArray(s.staff)?s.staff:[],groups=groupsFor(s);
   if(selected!=='all'&&!groups.some(group=>safeId(group.id)===selected))selected='all';
   const filtered=selected==='all'?groups.filter(group=>group.items.length||group.category):groups.filter(group=>safeId(group.id)===selected);
   const nav=[{id:'all',name:'All services',count:services.length},...groups.filter(group=>group.category||group.items.length).map(group=>({id:safeId(group.id),name:group.name,count:group.items.length}))];
   const buffer=Math.max(0,Number(s.buffer)||0);
   return `<section class="sm-page"><header class="sm-heading"><div><h1>Services <span class="sm-total">${services.length}</span></h1><p>Your services, prices and booking durations.</p></div><button class="btn primary" type="button" data-action="add-service">Add service</button></header><div class="sm-layout"><aside class="sm-sidebar" aria-label="Service categories"><div class="sm-sidebar-title"><h2>Categories</h2><button type="button" data-action="add-category" aria-label="Add category">Add</button></div><nav class="sm-categories" aria-label="Filter services by category">${nav.map(item=>`<button type="button" data-action="sm-category" data-category="${esc(item.id)}" aria-pressed="${selected===item.id}" class="${selected===item.id?'is-selected':''}"><span>${esc(item.name)}</span><span class="sm-category-count">${item.count}</span></button>`).join('')}</nav><p class="sm-sidebar-note">Categories also group services on your booking page.</p></aside><div class="sm-groups">${filtered.length?filtered.map(group=>`<section class="sm-group" data-service-category="${esc(group.id)}"><header class="sm-group-heading"><div><h2>${esc(group.name)}</h2><span>${group.items.length} service${group.items.length===1?'':'s'}</span></div>${group.category?`<div class="sm-category-actions"><button type="button" data-action="edit-category" data-id="${esc(group.id)}">Edit category</button><button type="button" class="sm-delete-category" data-action="delete-category" data-id="${esc(group.id)}" aria-label="Delete category ${esc(group.name)}">Delete</button></div>`:''}</header>${group.items.length?`<div class="sm-table-scroll" role="region" tabindex="0" aria-label="${esc(group.name)} services, scroll for more columns"><table class="sm-table"><thead><tr><th scope="col">Service</th><th scope="col">Duration</th><th scope="col"><span title="Your business buffer applies after every booking">Buffer</span></th><th scope="col">Price</th><th scope="col">Status</th><th scope="col"><span class="sm-sr-only">Actions</span></th></tr></thead><tbody>${group.items.map(service=>{
    const assigned=staff.filter(member=>(service.staffIds||[]).includes(member.id)),bookable=assigned.some(member=>member.active!==false);
    return `<tr data-service-id="${esc(service.id)}"><td><strong>${esc(service.name)}</strong><span class="sm-offered-by">${assigned.length?esc(assigned.map(member=>member.name).join(', ')):'No staff assigned'}</span></td><td>${duration(service.duration)}</td><td><span class="sm-buffer" title="Business-wide buffer">${buffer?duration(buffer):'No buffer'}</span></td><td class="sm-price">${money(service.price)}</td><td><span class="sm-status ${bookable?'is-bookable':'needs-staff'}"><i aria-hidden="true"></i>${bookable?'Bookable':'Needs staff'}</span></td><td><div class="sm-row-actions"><button type="button" data-action="edit-service" data-id="${esc(service.id)}" aria-label="Edit ${esc(service.name)}">Edit</button><button type="button" class="sm-delete-service" data-action="remove-service" data-id="${esc(service.id)}" aria-label="Remove ${esc(service.name)}">Remove</button></div></td></tr>`;
   }).join('')}</tbody></table></div>`:`<div class="sm-empty"><h3>No services in this category</h3><p>Add a service, then choose this category in its details.</p><button type="button" data-action="add-service">Add service</button></div>`}</section>`).join(''):`<section class="sm-empty sm-empty-all"><h2>Add your first service</h2><p>Set a name, price and duration so customers know what they can book.</p><button type="button" class="btn primary" data-action="add-service">Add service</button></section>`}<p class="sm-note">Buffer applies to all services. <a href="#availability">Change your business buffer</a></p><p class="sm-note">Existing bookings keep their saved prices and durations.</p></div></div></section>`;
  }
  return {routes:['services'],pages:{services:page},click(action,element){if(action!=='sm-category')return false;const value=String(element?.dataset?.category||'all'),groups=groupsFor(salon());selected=value==='all'||groups.some(group=>safeId(group.id)===value)?value:'all';render();return true;},change:()=>false,submit:()=>false};
 }};
})();
