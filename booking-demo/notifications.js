/* In-app appointment activity. Read state belongs to this owner and browser. */
(() => {
 'use strict';
 window.JovaNotifications={create(api) {
  const {salon,esc,humanDate,modal,closeModal,render,toast}=api;
  const labels={confirmed:'New appointment',cancelled:'Appointment cancelled',rescheduled:'Appointment rescheduled'};
  const maxEvents=200;
  const identity=()=>String(typeof api.ownerIdentity==='function'?api.ownerIdentity()||'demo':'demo');
  const storageKey=()=>`jovabook-notification-reads-v1:${encodeURIComponent(identity())}:${encodeURIComponent(salon().id)}`;
  const stamp=event=>Number.isFinite(Date.parse(event.at))?Date.parse(event.at):0;
  function events() {
   const unique=new Map();
   (salon().emails||[]).forEach(event=>{
    if(!event||!labels[event.kind]||typeof event.id!=='string'||!event.id)return;
    const existing=unique.get(event.id);if(!existing||stamp(event)>stamp(existing))unique.set(event.id,event);
   });
   return [...unique.values()].sort((a,b)=>stamp(b)-stamp(a)||b.id.localeCompare(a.id)).slice(0,maxEvents);
  }
  function reads() {
   try {const value=JSON.parse(localStorage.getItem(storageKey())||'[]');return new Set(Array.isArray(value)?value.filter(id=>typeof id==='string').slice(0,maxEvents):[]);}
   catch {return new Set();}
  }
  function markRead(ids) {
   const read=reads();ids.forEach(id=>read.add(id));
   const latest=events().filter(event=>read.has(event.id)).map(event=>event.id);
   try {localStorage.setItem(storageKey(),JSON.stringify(latest.slice(0,maxEvents)));}catch {}
  }
  const unreadCount=()=>{const read=reads();return events().filter(event=>!read.has(event.id)).length;};
  function eventTime(event) {
   if(!stamp(event))return 'Time not recorded';
   return new Date(event.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'});
  }
  function appointmentTime(booking) {
   if(!/^\d{4}-\d{2}-\d{2}$/.test(booking.date||''))return 'Appointment details unavailable';
   let date;try {date=humanDate(booking.date);}catch {return 'Appointment details unavailable';}
   return date+(booking.time?' at '+booking.time:'');
  }
  function rows(list) {
   const read=reads();
   return `<ol class="nf-list">${list.map(event=>{const booking=event.booking||{},unread=!read.has(event.id);return `<li><button type="button" class="nf-item ${unread?'is-unread':''}" data-action="notif-item" data-event="${esc(event.id)}"><span class="nf-kind nf-kind-${event.kind}" aria-hidden="true">${event.kind==='confirmed'?'+':event.kind==='cancelled'?'×':'↻'}</span><span class="nf-item-content"><span class="nf-item-top"><b>${labels[event.kind]}</b>${unread?'<span class="nf-unread-dot" aria-label="Unread"></span>':''}</span><span class="nf-client">${esc(booking.name||'Client')}<span aria-hidden="true"> · </span>${esc(booking.serviceName||'Appointment')}</span><span class="nf-appointment-time">${esc(appointmentTime(booking))}</span><time ${stamp(event)?`datetime="${esc(event.at)}"`:''}>${esc(eventTime(event))}</time></span><span class="nf-chevron" aria-hidden="true"></span></button></li>`;}).join('')}</ol>`;
  }
  const empty=()=>'<div class="nf-empty"><span aria-hidden="true">✓</span><h2>No appointment updates yet</h2><p>New bookings, cancellations and rescheduled appointments will appear here.</p></div>';
  const markButton=()=>`<button type="button" class="nf-mark" data-action="notif-read-all" ${unreadCount()?'':'disabled'}>Mark all read</button>`;
  function showBell() {
   const list=events();
   modal('Notifications',`<div class="nf-dialog" data-notifications-dialog>${list.length?`<div class="nf-toolbar"><p>${unreadCount()} unread</p>${markButton()}</div>${rows(list.slice(0,20))}${list.length>20?'<p class="nf-history-note">Showing your latest 20 updates.</p>':''}<a class="nf-view-all" href="#activity" data-action="close-modal">View all updates <span aria-hidden="true"></span></a>`:empty()}</div>`);
  }
  function header() {
   const count=unreadCount(),label=count?`Notifications, ${count} unread`:'Notifications, no unread updates';
   return `<button type="button" class="nf-trigger" data-action="notif-open" data-notif-open aria-label="${label}" aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6"/></svg>${count?`<span class="nf-badge" aria-hidden="true">${count>99?'99+':count}</span>`:''}</button>`;
  }
  function activity() {
   const list=events();
   return `<div class="nf-page"><div class="nf-heading"><div><p class="nf-eyebrow">YOUR DIARY</p><h1>Appointment updates</h1><p>New bookings, cancellations and changes in one place.</p></div>${list.length?markButton():''}</div><section class="nf-panel">${list.length?`${rows(list)}${list.length===maxEvents?`<p class="nf-history-note">Showing your latest ${maxEvents} appointment updates.</p>`:''}`:empty()}</section></div>`;
  }
  function click(action,element) {
   if(action==='notif-open'){showBell();return true;}
   if(action==='notif-read-all'){
    const reopen=!!document.querySelector('[data-notifications-dialog]');markRead(events().map(event=>event.id));render();if(reopen)showBell();return true;
   }
   if(action==='notif-item'){
    const event=events().find(item=>item.id===element.dataset.event);if(!event){toast('This update is no longer available.');return true;}
    markRead([event.id]);closeModal();render();
    const id=event.booking?.id;
    if(id&&(salon().bookings||[]).some(booking=>booking.id===id)&&typeof api.openBooking==='function')api.openBooking(id);
    else toast('This appointment is no longer in your diary.');
    return true;
   }
   return false;
  }
  return {routes:['activity'],pages:{activity},header,click,change:()=>false,submit:()=>false};
 }};
})();
