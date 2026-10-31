/* In-app booking activity. Read state belongs to this owner and browser. */
(() => {
 'use strict';
 window.JovaNotifications={create(api) {
  const {salon,esc,humanDate,modal,closeModal,render,toast}=api;
  const labels={confirmed:'New booking',cancelled:'Booking cancelled',rescheduled:'Booking rescheduled'};
  const maxEvents=200;
  let panel=null,panelOwner='';
  const nativePanel=()=>typeof document!=='undefined'&&typeof document.createElement==='function'&&typeof HTMLElement!=='undefined'&&typeof HTMLElement.prototype.showPopover==='function';
  const panelOpen=()=>!!panel?.isConnected&&panel.matches(':popover-open');
  function closePanel(){if(panelOpen())panel.hidePopover();if(typeof document!=='undefined')document.querySelector('[data-notif-open]')?.setAttribute?.('aria-expanded','false');}
  if(typeof window.addEventListener==='function'){window.addEventListener('hashchange',closePanel);window.addEventListener('resize',()=>{if(panelOpen())positionPanel();});}
  function positionPanel(){
   const anchor=document.querySelector('[data-notif-open]');if(!anchor||!panelOpen())return;
   const box=anchor.getBoundingClientRect(),pad=12,width=Math.min(432,window.innerWidth-pad*2),top=Math.min(box.bottom+12,window.innerHeight-160);
   panel.style.width=width+'px';panel.style.left=Math.max(pad,Math.min(box.right-width,window.innerWidth-width-pad))+'px';panel.style.top=Math.max(pad,top)+'px';panel.style.maxHeight=Math.max(140,window.innerHeight-top-pad)+'px';
  }
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
   if(!/^\d{4}-\d{2}-\d{2}$/.test(booking.date||''))return 'Booking details unavailable';
   let date;try {date=humanDate(booking.date);}catch {return 'Booking details unavailable';}
   return date+(booking.time?' at '+booking.time:'');
  }
  function relativeTime(event){
   const value=stamp(event),elapsed=Date.now()-value;if(!value)return 'Time not recorded';if(elapsed<0)return eventTime(event);
   const minutes=Math.floor(elapsed/60000);if(minutes<1)return 'Just now';if(minutes<60)return minutes+'m ago';const hours=Math.floor(minutes/60);if(hours<24)return hours+'h ago';const days=Math.floor(hours/24);if(days<8)return days+'d ago';return new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'});
  }
  function rows(list) {
   const read=reads();
   return `<ol class="nf-list">${list.map(event=>{const booking=event.booking||{},unread=!read.has(event.id),staff=(salon().staff||[]).find(member=>member.id===booking.staffId)?.name||booking.staffName||'',verb={confirmed:'booked',cancelled:'cancelled',rescheduled:'rescheduled'}[event.kind];return `<li><button type="button" class="nf-item ${unread?'is-unread':''}" data-action="notif-item" data-event="${esc(event.id)}"><span class="nf-kind nf-kind-${event.kind}" aria-hidden="true">${event.kind==='confirmed'?'+':event.kind==='cancelled'?'×':'↻'}</span><span class="nf-item-content"><span class="nf-item-top"><b>${labels[event.kind]}</b>${unread?'<span class="nf-unread-dot" aria-label="Unread"></span>':''}</span><span class="nf-client"><strong>${esc(booking.name||'Client')}</strong> ${verb} <strong>${esc(booking.serviceName||'a booking')}</strong></span><span class="nf-appointment-time">${esc(appointmentTime(booking))}${staff?' · '+esc(staff):''}</span></span><time class="nf-event-age" title="${esc(eventTime(event))}" ${stamp(event)?`datetime="${esc(event.at)}"`:''}>${esc(relativeTime(event))}</time></button></li>`;}).join('')}</ol>`;

  }
  const empty=()=>'<div class="nf-empty"><span aria-hidden="true">✓</span><h2>No booking updates yet</h2><p>New bookings, cancellations and rescheduled bookings will appear here.</p></div>';
  const markButton=()=>`<button type="button" class="nf-mark" data-action="notif-read-all" ${unreadCount()?'':'disabled'}>Mark all read</button>`;
  function showBell() {
   const list=events(),body=list.length?`<div class="nf-toolbar"><p>${unreadCount()} unread</p>${markButton()}</div><div class="nf-popover-scroll">${rows(list.slice(0,20))}</div>${list.length>20?'<p class="nf-history-note">Showing your latest 20 updates.</p>':''}<a class="nf-view-all" href="#activity" data-action="notif-close">View all updates</a>`:empty();
   if(!nativePanel()||!document.querySelector('[data-notif-open]')){modal('Notifications',`<div class="nf-dialog" data-notifications-dialog>${body}</div>`);return;}
   if(!panel?.isConnected){panel=document.createElement('section');panel.id='nf-notification-popover';panel.className='nf-popover';panel.setAttribute('popover','auto');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','nf-popover-title');document.body.append(panel);panel.addEventListener('toggle',event=>{if(event.newState==='closed')document.querySelector('[data-notif-open]')?.setAttribute('aria-expanded','false');});}
   panelOwner=identity()+':'+salon().id;
   panel.innerHTML=`<header class="nf-popover-header"><div><h2 id="nf-popover-title">Notifications</h2><p>Latest customer activity</p></div><button type="button" class="nf-popover-close" data-action="notif-close" aria-label="Close notifications" autofocus>×</button></header><div class="nf-dialog" data-notifications-dialog>${body}</div>`;
   if(!panelOpen())panel.showPopover();positionPanel();document.querySelector('[data-notif-open]')?.setAttribute('aria-expanded','true');
  }

  function header() {
   if(panelOwner&&panelOwner!==identity()+':'+salon().id)closePanel();
   const count=unreadCount(),label=count?`Notifications, ${count} unread`:'Notifications, no unread updates';
   return `<button type="button" class="nf-trigger" data-action="notif-open" data-notif-open aria-label="${label}" aria-haspopup="dialog" aria-controls="nf-notification-popover" aria-expanded="${panelOpen()}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6"/></svg>${count?`<span class="nf-badge" aria-hidden="true">${count>99?'99+':count}</span>`:''}</button>`;
  }
  function activity() {
   const list=events();
   return `<div class="nf-page"><div class="nf-heading"><div><p class="nf-eyebrow">YOUR DIARY</p><h1>Booking updates</h1><p>New bookings, cancellations and changes in one place.</p></div>${list.length?markButton():''}</div><section class="nf-panel">${list.length?`${rows(list)}${list.length===maxEvents?`<p class="nf-history-note">Showing your latest ${maxEvents} booking updates.</p>`:''}`:empty()}</section></div>`;
  }
  function click(action,element) {
   if(action==='notif-open'){if(panelOpen())closePanel();else showBell();return true;}
   if(action==='notif-close'){closePanel();closeModal();return true;}
   if(action==='notif-read-all'){
    const reopen=nativePanel()?panelOpen():!!document.querySelector('[data-notifications-dialog]');markRead(events().map(event=>event.id));render();if(reopen)showBell();return true;
   }
   if(action==='notif-item'){
    const event=events().find(item=>item.id===element.dataset.event);if(!event){toast('This update is no longer available.');return true;}
    markRead([event.id]);closePanel();closeModal();render();
    const id=event.booking?.id;
    if(id&&(salon().bookings||[]).some(booking=>booking.id===id)&&typeof api.openBooking==='function')api.openBooking(id);
    else toast('This booking is no longer in your diary.');
    return true;
   }
   return false;
  }
  return {routes:['activity'],pages:{activity},header,click,change:()=>false,submit:()=>false};
 }};
})();
