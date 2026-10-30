/* Owner workspace extension. Uses the existing hours, staff and booking records.
   Integration: JovaWorkspace.create(api), then pages, click, submit and change.
   The host persists salon.workspace in settings.workspace and applies bookingPage publicly. */
(() => {
 'use strict';
 window.JovaWorkspace = {create(api) {
  const {salon, save, render, esc, field, money, today, addDays, humanDate, toast, error, modal} = api;
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayOrder = [1,2,3,4,5,6,0];
  let selectedStaff = '', saved = '', teamExpanded = false;
  const heading = (title, text, actions='') => `<div class="ws-heading"><div><p class="ws-kicker">YOUR WORKSPACE</p><h1>${title}</h1><p>${text}</p></div>${actions}</div>`;
  const note = () => saved ? `<div class="ws-saved" role="status">${esc(saved)}</div>` : '';
  const number = v => Number(v)||0;
  const safeColor = color => /^#[0-9a-f]{6}$/i.test(color||'') ? color : '#235789';
  const clockMinutes = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t||'') ? Number(t.slice(0,2))*60+Number(t.slice(3)) : NaN;
  const activeStaff = () => salon().staff.filter(m => m.active !== false);
  function member() {
   const list=activeStaff();
   const m=list.find(x=>x.id===selectedStaff)||list[0];
   if(m) selectedStaff=m.id;
   return m;
  }
  const opts = (list,value) => list.map(([v,t])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(t)}</option>`).join('');
  function scheduleRows(hours) {
   return `<div class="ws-week" aria-label="Working days">${dayOrder.map(day=>`<label class="ws-day"><span><input type="checkbox" name="days" value="${day}" ${hours.days.includes(day)?'checked':''}>${dayNames[day]}</span><span class="ws-day-time">${hours.days.includes(day)?`${esc(hours.start)} to ${esc(hours.end)}`:'Closed'}</span></label>`).join('')}</div>`;
  }
  const timeFields = h => `<div class="ws-two">${field('Start time','start',h.start,'time','required')}${field('End time','end',h.end,'time','required')}</div>`;
  const formEnd = label => `<div class="error" role="alert"></div><div class="ws-form-footer"><button class="btn primary">${label}</button></div>`;
  function bookingSetup() {
   const s=salon();
   const steps=[['Services','Check your treatments, prices and appointment lengths.','#services',`${s.services.length} service${s.services.length===1?'':'s'} added`],['Working hours','Choose the days and times customers can book.','#availability',`${s.hours.days.length} days a week, ${s.hours.start} to ${s.hours.end}`],['Booking page and link','Add your colour and welcome message, then share your link.','#scheduling','Your page is ready to personalise']];
   return `<div class="ws ws-setup">${heading('Set up your bookings','Three simple checks, then you can share your booking link.')}<p class="ws-setup-intro">Start with your services and prices. Your opening hours and booking link are here when you need them.</p><div class="ws-setup-steps">${steps.map(([title,text,href,status],i)=>`<a class="ws-setup-card" href="${href}"><span class="ws-setup-number">${i+1}</span><div><h2>${title}</h2><p>${text}</p><small>${esc(status)}</small></div><span class="ws-setup-arrow" aria-hidden="true">&#8250;</span></a>`).join('')}</div><a class="btn primary ws-gap-top" href="#services">Start with your services &#8594;</a></div>`;
  }
  function availability() {
   const s=salon(),m=member(),h=m?(m.hours||s.hours):s.hours;
   const dates=Array.from({length:14},(_,i)=>addDays(today(),i)).filter(d=>h.days.includes(new Date(d+'T12:00:00').getDay())).slice(0,5);
   return `<div class="ws ws-simple-hours"><a class="ws-back" href="#booking-setup">&#8592; Back to booking setup</a>${heading('Working hours','Choose when customers can book appointments.')}${note()}<section class="ws-panel"><h2>Business opening hours</h2><form data-form="ws-business-hours">${timeFields(s.hours)}${scheduleRows(s.hours)}<details class="ws-details"><summary>Booking rules</summary><div class="ws-two ws-gap-top">${field('Time between appointments (minutes)','buffer',s.buffer,'number','min="0" max="120" step="5" required')}${field('Notice for bookings today (minutes)','notice',s.notice,'number','min="0" max="480" step="15" required')}</div><p class="ws-help">Leave these at zero if customers can book back to back and at short notice. Existing appointments keep their saved times.</p></details>${formEnd('Save hours')}</form></section><details class="ws-details ws-panel ws-team-details" ${teamExpanded?'open':''}><summary>Different hours for team members</summary><div class="ws-gap-top">${m?`<label class="field">Team member<select data-change="ws-staff">${opts(activeStaff().map(x=>[x.id,x.name]),m.id)}</select></label><form data-form="ws-staff-hours" data-id="${esc(m.id)}"><label class="ws-check"><input type="checkbox" name="follow" data-change="ws-follow" ${m.hours?'':'checked'}>Use business opening hours</label><p class="ws-help">Only change this if this person works different hours.</p><fieldset class="ws-hours-fields" ${m.hours?'':'disabled'}>${timeFields(h)}${scheduleRows(h)}</fieldset>${formEnd('Save team member hours')}</form>`:'<p>No active team members.</p><a class="btn" href="#staff">Manage staff</a>'}<h3 class="ws-gap-top">Upcoming working days</h3><p class="ws-help">${esc(m?.name||s.name)}. Appointments already booked can reduce available times.</p><div class="ws-upcoming">${dates.map(d=>`<div><span>${esc(humanDate(d))}</span><b>${esc(h.start)} to ${esc(h.end)}</b></div>`).join('')||'<p>No working days in the next two weeks.</p>'}</div></div></details></div>`;
  }
  function config() {
   const s=salon(),b=s.workspace?.bookingPage||{};
   return {title:b.title||`Book with ${s.name}`,intro:b.intro??'Choose a service and a time that works for you.',buttonLabel:b.buttonLabel||'Choose a time',showPrices:b.showPrices!==false,showDuration:b.showDuration!==false,font:b.font==='system'?'system':'jakarta',layout:b.layout==='compact'?'compact':'comfortable'};
  }
  function link(serviceId) {
   const s=salon();
   const base=typeof api.bookingLink==='function'?api.bookingLink(s):api.bookingLink;
   const url=new URL(base||`${location.pathname}?salon=${encodeURIComponent(s.slug)}#book/service`,location.origin);
   if(serviceId) url.searchParams.set('service',serviceId);
   url.hash='book/service';
   return url.href;
  }
  const embed = () => `<iframe src="${link()}" title="Book an appointment" width="100%" height="760" style="border:0" loading="lazy"></iframe>`;
  function preview(b,color) {
   const s=salon();
   const services=s.services.filter(v=>activeStaff().some(m=>(v.staffIds||[]).includes(m.id)));
   return `<article class="ws-booking-preview ws-preview-${b.layout}" style="--ws-brand:${safeColor(color)};font-family:${b.font==='system'?'system-ui, sans-serif':'\'Plus Jakarta Sans\', sans-serif'}"><div class="ws-preview-brand">${esc(s.name)}</div><h2>${esc(b.title)}</h2><p>${esc(b.intro)}</p><div class="ws-preview-step">1. Choose your service</div>${services.slice(0,4).map(v=>`<div class="ws-preview-service"><div><b>${esc(v.name)}</b><small>${[b.showDuration?`${number(v.duration)} minutes`:'',b.showPrices?money(v.price):''].filter(Boolean).join(' · ')}</small></div><span aria-hidden="true">&#8250;</span></div>`).join('')||'<p>Add a service with active staff to take bookings.</p>'}<span class="ws-preview-button">${esc(b.buttonLabel)}</span><small class="ws-preview-credit">Powered by JovaBook</small></article>`;
  }
  function scheduling() {
   const s=salon(),b=config();
   return `<div class="ws"><a class="ws-back" href="#booking-setup">&#8592; Back to booking setup</a>${heading('Booking page','Add your own details, then share your booking link.',`<a class="btn" href="${esc(link())}" target="_blank" rel="noopener">View booking page &#8599;</a>`)}${note()}<div class="ws-editor"><section class="ws-panel ws-editor-controls"><form data-form="ws-booking-page"><div class="ws-link-box"><h2>Your booking link</h2><label class="field"><span class="ws-sr-only">Public booking link</span><input readonly value="${esc(link())}" data-ws-copy="link"></label><button type="button" data-action="ws-copy" data-target="link">Copy link</button><p class="ws-help">Share this with customers or add it to your social profile.</p></div><h2>Make it yours</h2>${field('Your colour','color',safeColor(s.color),'color','data-change="ws-preview"')}${field('Page title','title',b.title,'text','required maxlength="100" data-change="ws-preview"')}<label class="field">Welcome message<textarea name="intro" rows="3" maxlength="500" data-change="ws-preview">${esc(b.intro)}</textarea></label><details class="ws-details"><summary>More page options</summary><div class="ws-gap-top"><label class="field">Font<select name="font" data-change="ws-preview">${opts([['jakarta','Plus Jakarta Sans'],['system','System font']],b.font)}</select></label><label class="field">Spacing<select name="layout" data-change="ws-preview">${opts([['comfortable','Comfortable'],['compact','Compact']],b.layout)}</select></label><label class="ws-check"><input type="checkbox" name="showPrices" data-change="ws-preview" ${b.showPrices?'checked':''}>Show service prices</label><label class="ws-check"><input type="checkbox" name="showDuration" data-change="ws-preview" ${b.showDuration?'checked':''}>Show service duration</label>${field('Booking button text','buttonLabel',b.buttonLabel,'text','required maxlength="40" data-change="ws-preview"')}<h3 class="ws-gap-top">Links to individual services</h3><div class="ws-share-services">${s.services.map(v=>`<div><span>${esc(v.name)}</span><button type="button" class="small" data-action="ws-copy-service" data-id="${esc(v.id)}">Copy link</button></div>`).join('')||'<p>Add services to create direct links.</p>'}</div><h3 class="ws-gap-top">Add bookings to your website</h3><p class="ws-help">Give this code to the person who looks after your website.</p><label class="field">Website code<textarea readonly rows="5" class="ws-code" data-ws-copy="embed">${esc(embed())}</textarea></label><button type="button" class="small" data-action="ws-copy" data-target="embed">Copy website code</button></div></details>${formEnd('Save booking page')}</form></section><section class="ws-preview-area"><div class="ws-preview-label"><span class="ws-dot"></span>YOUR PAGE PREVIEW</div><div id="ws-live-preview">${preview(b,s.color)}</div><p class="ws-preview-caption">Save when you are happy with your changes.</p></section></div></div>`;
  }
  function getPageForm(form) {
   const d=new FormData(form);
   return {title:String(d.get('title')||'').trim(),intro:String(d.get('intro')||'').trim(),buttonLabel:String(d.get('buttonLabel')||'').trim(),showPrices:d.has('showPrices'),showDuration:d.has('showDuration'),font:d.get('font')==='system'?'system':'jakarta',layout:d.get('layout')==='compact'?'compact':'comfortable'};
  }
  function getHours(form) {
   const d=new FormData(form),start=String(d.get('start')||''),end=String(d.get('end')||'');
   const days=[...new Set(d.getAll('days').map(Number))].filter(n=>Number.isInteger(n)&&n>=0&&n<=6);
   if(!Number.isFinite(clockMinutes(start))||!Number.isFinite(clockMinutes(end))||clockMinutes(start)>=clockMinutes(end)) throw Error('Choose an end time later than the start time.');
   if(!days.length) throw Error('Select at least one working day.');
   return {start,end,days};
  }
  function persist(message) {save();saved=message;render();toast(message);}
  async function copy(text) {
   try {await navigator.clipboard.writeText(text);toast('Copied to clipboard.');}
   catch {modal('Copy this text',`<p>Select the text below and copy it.</p><textarea class="ws-copy-fallback" readonly rows="7">${esc(text)}</textarea>`);}
  }
  function click(action,el) {
   if(action==='ws-copy') {const element=el.closest('form').querySelector(`[data-ws-copy="${el.dataset.target==='embed'?'embed':'link'}"]`);copy(element.value);return true;}
   if(action==='ws-copy-service') {copy(link(el.dataset.id));return true;}
   return false;
  }
  function submit(type,form,data) {
   if(!['ws-staff-hours','ws-business-hours','ws-booking-page'].includes(type)) return false;
   try {
    const s=salon();
    if(type==='ws-staff-hours') {const m=s.staff.find(x=>x.id===form.dataset.id&&x.active!==false);if(!m)throw Error('Choose an active staff member.');m.hours=new FormData(form).has('follow')?null:getHours(form);teamExpanded=true;persist('Team member hours saved.');}
    if(type==='ws-business-hours') {const h=getHours(form),buffer=Number(data.buffer),notice=Number(data.notice);if(!Number.isInteger(buffer)||buffer<0||buffer>120||buffer%5||!Number.isInteger(notice)||notice<0||notice>480||notice%15)throw Error('Use a buffer from 0 to 120 in steps of 5, and notice from 0 to 480 in steps of 15.');s.hours=h;s.buffer=buffer;s.notice=notice;persist('Working hours saved.');}
    if(type==='ws-booking-page') {const b=getPageForm(form);if(!b.title||b.title.length>100||!b.buttonLabel||b.buttonLabel.length>40||b.intro.length>500)throw Error('Enter a title up to 100 characters, a button label up to 40, and a message up to 500.');if(!/^#[0-9a-f]{6}$/i.test(data.color||''))throw Error('Choose a valid brand colour.');s.workspace={...s.workspace,bookingPage:b};s.color=data.color;persist('Booking page saved.');}
   } catch(e) {error(form,e.message||'Check your entries and try again.');}
   return true;
  }
  function change(el) {
   if(el.dataset.change==='ws-staff') {selectedStaff=el.value;teamExpanded=true;saved='';render();return true;}
   if(el.dataset.change==='ws-follow') {const f=el.closest('form');f.querySelector('fieldset').disabled=el.checked;return true;}
   if(el.dataset.change==='ws-preview') {const f=el.closest('form'),target=document.getElementById('ws-live-preview');if(target)target.innerHTML=preview(getPageForm(f),new FormData(f).get('color'));return true;}
   if(el.closest('[data-form="ws-staff-hours"], [data-form="ws-business-hours"]')&&['days','start','end'].includes(el.name)) {const f=el.closest('form'),start=f.querySelector('[name=start]').value,end=f.querySelector('[name=end]').value;f.querySelectorAll('.ws-day').forEach(row=>{row.querySelector('.ws-day-time').textContent=row.querySelector('input').checked?`${start} to ${end}`:'Closed';});return true;}
   return false;
  }
  return {routes:['availability','scheduling','booking-setup'],pages:{availability,scheduling,'booking-setup':bookingSetup},click,submit,change};
 }};
})();
