/* Owner workspace extension. Uses the existing hours, staff and booking records.
   Integration: JovaWorkspace.create(api), then pages, click, submit and change.
   The host persists salon.workspace in settings.workspace and applies bookingPage publicly. */
(() => {
 'use strict';
 window.JovaWorkspace = {create(api) {
  const {salon, save, render, esc, field, money, today, addDays, humanDate, toast, error, modal} = api;
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayOrder = [1,2,3,4,5,6,0];
  let selectedStaff = '', saved = '', teamExpanded = false, lastStaffParam;
  const heading = (title, text, actions='') => `<div class="ws-heading"><div><p class="ws-kicker">YOUR WORKSPACE</p><h1>${title}</h1><p>${text}</p></div>${actions}</div>`;
  const note = () => saved ? `<div class="ws-saved" role="status">${esc(saved)}</div>` : '';
  const number = v => Number(v)||0;
  const safeColor = color => /^#[0-9a-f]{6}$/i.test(color||'') ? color : '#235789';
  const clockMinutes = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t||'') ? Number(t.slice(0,2))*60+Number(t.slice(3)) : NaN;
  const activeStaff = () => salon().staff.filter(m => m.active !== false);
  function member() {
   const list=activeStaff();
   const requested=new URLSearchParams(location.hash.split('?')[1]||'').get('staff')||'';
   if(requested!==lastStaffParam){lastStaffParam=requested;if(requested&&list.some(x=>x.id===requested)){selectedStaff=requested;teamExpanded=true;}}
   const m=list.find(x=>x.id===selectedStaff)||list[0];
   if(m) selectedStaff=m.id;
   return m;
  }
  const opts = (list,value) => list.map(([v,t])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(t)}</option>`).join('');
  const scheduleSupported = () => typeof api.schedulingSupported==='function' ? api.schedulingSupported(salon())===true : !(typeof api.isLive==='function'&&api.isLive(salon()));
  function dayHours(hours,day) {
   if(window.JovaSchedule?.day)return window.JovaSchedule.day(hours,day);
   return hours.weekly?.[String(day)]||{closed:!hours.days.includes(day),start:hours.start,end:hours.end};
  }
  function scheduleRows(hours) {
   return `<div class="ws-daily"><div class="ws-daily-labels" aria-hidden="true"><span>Day</span><span>Closed</span><span>Opens</span><span>Closes</span></div>${dayOrder.map(day=>{const h=dayHours(hours,day);return `<div class="ws-daily-row" data-day="${day}"><b>${dayNames[day]}</b><label class="ws-closed"><input type="checkbox" name="day_${day}_closed" data-change="ws-day-closed" aria-label="${dayNames[day]} closed" ${h.closed?'checked':''}><span>Closed</span></label><label class="ws-daily-time"><span class="ws-sr-only">${dayNames[day]} opening time</span><input type="time" name="day_${day}_start" value="${esc(h.start||'09:00')}" required ${h.closed?'disabled':''}></label><span class="ws-time-to" aria-hidden="true">to</span><label class="ws-daily-time"><span class="ws-sr-only">${dayNames[day]} closing time</span><input type="time" name="day_${day}_end" value="${esc(h.end||'17:00')}" required ${h.closed?'disabled':''}></label></div>`;}).join('')}</div>`;
  }
  const formEnd = (label,disabled=false) => `<div class="error" role="alert"></div><div class="ws-form-footer"><button class="btn primary" ${disabled?'disabled':''}>${label}</button></div>`;
  const setupNotice = () => scheduleSupported()?'':`<p class="ws-capability" role="status">Daily hours need a booking system update before they can be saved. Your existing hours are still in use.</p>`;
  function availability() {
   const s=salon(),m=member(),h=m?(m.hours||s.hours):s.hours;
   return `<div class="ws ws-simple-hours">${heading('Working hours','Set opening and closing times for each day.')}${note()}${setupNotice()}<section class="ws-panel"><div class="ws-section-title"><div><h2>Business opening hours</h2><p>These hours repeat every week.</p></div><span class="ws-tag">Weekly</span></div><form data-form="ws-business-hours">${scheduleRows(s.hours)}<details class="ws-details"><summary>Booking rules</summary><div class="ws-two ws-gap-top">${field('Time between bookings (minutes)','buffer',s.buffer,'number','min="0" max="120" step="5" required')}${field('Notice for bookings today (minutes)','notice',s.notice,'number','min="0" max="480" step="15" required')}</div><p class="ws-help">Leave these at zero to allow back-to-back bookings and bookings at short notice. Existing bookings keep their saved times.</p></details>${formEnd('Save hours',!scheduleSupported())}</form></section><details class="ws-details ws-panel ws-team-details" ${teamExpanded?'open':''}><summary>Different hours for team members</summary><div class="ws-gap-top">${m?`<label class="field">Team member<select data-change="ws-staff">${opts(activeStaff().map(x=>[x.id,x.name]),m.id)}</select></label><form data-form="ws-staff-hours" data-id="${esc(m.id)}"><label class="ws-check"><input type="checkbox" name="follow" data-change="ws-follow" ${m.hours?'':'checked'}>Use business opening hours</label><p class="ws-help">Team member hours must fall within business opening hours.</p><fieldset class="ws-hours-fields" ${m.hours?'':'disabled'}>${scheduleRows(h)}</fieldset>${formEnd('Save team member hours',!scheduleSupported())}</form>`:'<p>No active team members.</p><a class="btn" href="#staff">Manage staff</a>'}</div></details></div>`;
  }
  function config() {
   const s=salon(),b=s.workspace?.bookingPage||{};
   return {title:b.title||'Book a service',intro:b.intro??'Choose a service to see availability.',buttonLabel:b.buttonLabel||'Choose a time',showPrices:b.showPrices!==false,showDuration:b.showDuration!==false,font:b.font==='system'?'system':'jakarta',layout:b.layout==='compact'?'compact':'comfortable'};
  }
  function link(serviceId) {
   const s=salon();
   const base=typeof api.bookingLink==='function'?api.bookingLink(s):api.bookingLink;
   const url=new URL(base||`${location.pathname}?salon=${encodeURIComponent(s.slug)}#book/service`,location.origin);
   if(serviceId) url.searchParams.set('service',serviceId);
   url.hash='book/service';
   return url.href;
  }
  const embed = () => `<iframe src="${link()}" title="Book online" width="100%" height="760" style="border:0" loading="lazy"></iframe>`;
  function preview(b,color) {
   const s=salon();
   const services=s.services.filter(v=>activeStaff().some(m=>(v.staffIds||[]).includes(m.id)));
   return `<article class="ws-booking-preview ws-preview-${b.layout}" style="--ws-brand:${safeColor(color)};font-family:${b.font==='system'?'system-ui, sans-serif':'\'Plus Jakarta Sans\', sans-serif'}"><div class="ws-preview-brand">${esc(s.name)}</div><h2>${esc(b.title)}</h2><p>${esc(b.intro)}</p><div class="ws-preview-step">Choose your service</div>${services.slice(0,4).map(v=>`<div class="ws-preview-service"><div><b>${esc(v.name)}</b><small>${[b.showDuration?`${number(v.duration)} minutes`:'',b.showPrices?money(v.price):''].filter(Boolean).join(' · ')}</small></div><span aria-hidden="true">Next</span></div>`).join('')||'<p>Add a service with active staff to take bookings.</p>'}<span class="ws-preview-button">${esc(b.buttonLabel)}</span><small class="ws-preview-credit">Powered by JovaBook</small></article>`;
  }
  function scheduling() {
   const s=salon(),b=config(),accent=safeColor(s.workspace?.appearance?.accent||'#235789');
   return `<div class="ws">${heading('Personalise','Choose your workspace colour and customise the page customers use to book.')}${note()}<section class="ws-appearance ws-panel"><div class="ws-appearance-icon" style="--ws-choice:${accent}" aria-hidden="true"><span></span><span></span><span></span></div><div><h2>Your workspace</h2><p>Choose a complete colour scheme for your admin panel. Your customer booking page keeps its own branding.</p></div><button type="button" data-action="workspace-appearance">Change workspace theme</button></section><div class="ws-editor"><section class="ws-panel ws-editor-controls"><div class="ws-section-title"><div><span class="ws-overline">CUSTOMER EXPERIENCE</span><h2>Your booking page</h2><p>The details customers see when they book.</p></div></div><form data-form="ws-booking-page">${field('Booking page colour','color',safeColor(s.color),'color','data-change="ws-preview"')}${field('Page title','title',b.title,'text','required maxlength="100" data-change="ws-preview"')}<label class="field">Welcome message<textarea name="intro" rows="3" maxlength="500" data-change="ws-preview">${esc(b.intro)}</textarea></label><details class="ws-details"><summary>More page options</summary><div class="ws-gap-top"><label class="field">Font<select name="font" data-change="ws-preview">${opts([['jakarta','Plus Jakarta Sans'],['system','System font']],b.font)}</select></label><label class="field">Spacing<select name="layout" data-change="ws-preview">${opts([['comfortable','Comfortable'],['compact','Compact']],b.layout)}</select></label><label class="ws-check"><input type="checkbox" name="showPrices" data-change="ws-preview" ${b.showPrices?'checked':''}>Show service prices</label><label class="ws-check"><input type="checkbox" name="showDuration" data-change="ws-preview" ${b.showDuration?'checked':''}>Show service duration</label>${field('Booking button text','buttonLabel',b.buttonLabel,'text','required maxlength="40" data-change="ws-preview"')}<h3 class="ws-gap-top">Links to individual services</h3><div class="ws-share-services">${s.services.map(v=>`<div><span>${esc(v.name)}</span><button type="button" class="small" data-action="ws-copy-service" data-id="${esc(v.id)}">Copy link</button></div>`).join('')||'<p>Add services to create direct links.</p>'}</div><h3 class="ws-gap-top">Add bookings to your website</h3><p class="ws-help">Give this code to the person who looks after your website.</p><label class="field">Website code<textarea readonly rows="5" class="ws-code" data-ws-copy="embed">${esc(embed())}</textarea></label><button type="button" class="small" data-action="ws-copy" data-target="embed">Copy website code</button></div></details>${formEnd('Save booking page')}</form></section><section class="ws-preview-area"><div class="ws-preview-label"><span>What customers see</span><a href="${esc(link())}" target="_blank" rel="noopener">Open booking page</a></div><div id="ws-live-preview">${preview(b,s.color)}</div><div class="ws-share-box"><label class="field">Share your booking page<input readonly value="${esc(link())}" data-ws-copy="link"></label><button type="button" data-action="ws-copy" data-target="link">Copy link</button></div></section></div></div>`;
  }
  function getPageForm(form) {
   const d=new FormData(form);
   return {title:String(d.get('title')||'').trim(),intro:String(d.get('intro')||'').trim(),buttonLabel:String(d.get('buttonLabel')||'').trim(),showPrices:d.has('showPrices'),showDuration:d.has('showDuration'),font:d.get('font')==='system'?'system':'jakarta',layout:d.get('layout')==='compact'?'compact':'comfortable'};
  }
  function getHours(form) {
   if(!scheduleSupported())throw Error('Daily hours need a booking system update before they can be saved.');
   const weekly={};
   dayOrder.forEach(day=>{
    const closed=form.querySelector(`[name="day_${day}_closed"]`).checked;
    const start=form.querySelector(`[name="day_${day}_start"]`).value||'09:00';
    const end=form.querySelector(`[name="day_${day}_end"]`).value||'17:00';
    if(!closed&&(!Number.isFinite(clockMinutes(start))||!Number.isFinite(clockMinutes(end))||clockMinutes(start)>=clockMinutes(end)))throw Error(`${dayNames[day]} needs a closing time later than its opening time.`);
    weekly[String(day)]={closed,start,end};
   });
   if(!window.JovaSchedule?.normalize)throw Error('Working hours are not ready. Refresh the page and try again.');
   return window.JovaSchedule.normalize({weekly});
  }
  function persist(message) {save();saved=message;render();toast(message);}
  async function copy(text) {
   try {await navigator.clipboard.writeText(text);toast('Copied to clipboard.');}
   catch {modal('Copy this text',`<p>Select the text below and copy it.</p><textarea class="ws-copy-fallback" readonly rows="7">${esc(text)}</textarea>`);}
  }
  function click(action,el) {
   if(action==='ws-copy') {const element=el.closest('.ws').querySelector(`[data-ws-copy="${el.dataset.target==='embed'?'embed':'link'}"]`);copy(element.value);return true;}
   if(action==='ws-copy-service') {copy(link(el.dataset.id));return true;}
   return false;
  }
  function submit(type,form,data) {
   if(!['ws-staff-hours','ws-business-hours','ws-booking-page'].includes(type)) return false;
   try {
    const s=salon();
    if(type==='ws-staff-hours') {const m=s.staff.find(x=>x.id===form.dataset.id&&x.active!==false);if(!m)throw Error('Choose an active staff member.');if(!scheduleSupported())throw Error('Daily hours need a booking system update before they can be saved.');m.hours=new FormData(form).has('follow')?null:getHours(form);teamExpanded=true;persist('Team member hours saved.');}
    if(type==='ws-business-hours') {const h=getHours(form),buffer=Number(data.buffer),notice=Number(data.notice);if(!Number.isInteger(buffer)||buffer<0||buffer>120||buffer%5||!Number.isInteger(notice)||notice<0||notice>480||notice%15)throw Error('Use a buffer from 0 to 120 in steps of 5, and notice from 0 to 480 in steps of 15.');s.hours=h;s.buffer=buffer;s.notice=notice;persist('Working hours saved.');}
    if(type==='ws-booking-page') {const b=getPageForm(form);if(!b.title||b.title.length>100||!b.buttonLabel||b.buttonLabel.length>40||b.intro.length>500)throw Error('Enter a title up to 100 characters, a button label up to 40, and a message up to 500.');if(!/^#[0-9a-f]{6}$/i.test(data.color||''))throw Error('Choose a valid brand colour.');s.workspace={...s.workspace,bookingPage:b};s.color=data.color;persist('Booking page saved.');}
   } catch(e) {error(form,e.message||'Check your entries and try again.');}
   return true;
  }
  function change(el) {
   if(el.dataset.change==='ws-staff') {selectedStaff=el.value;teamExpanded=true;saved='';render();return true;}
   if(el.dataset.change==='ws-follow') {const f=el.closest('form');f.querySelector('fieldset').disabled=el.checked;return true;}
   if(el.dataset.change==='ws-day-closed') {el.closest('.ws-daily-row').querySelectorAll('input[type=time]').forEach(input=>{input.disabled=el.checked;});return true;}
   if(el.dataset.change==='ws-preview') {const f=el.closest('form'),target=document.getElementById('ws-live-preview');if(target)target.innerHTML=preview(getPageForm(f),new FormData(f).get('color'));return true;}
   return false;
  }
  return {routes:['availability','scheduling','booking-setup'],pages:{availability,scheduling,'booking-setup':scheduling},click,submit,change};
 }};
})();
