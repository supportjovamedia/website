/* Owner-only insights and multiple-appointment tools. The host owns persistence. */
(() => {
 'use strict';
 window.JovaOwnerTools={create(api) {
  const {salon,render,esc,money,today,addDays,modal,closeModal,toast,error,available}=api;
  const amount=value=>Number.isFinite(Number(value))?Number(value):0;
  const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  const human=date=>new Date(date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const dateDifference=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
  const statusOf=b=>String(b.status||'').toLowerCase().replace(/[_ ]/g,'-');
  const kept=b=>['confirmed','completed'].includes(statusOf(b));
  const options=(rows,value)=>rows.map(([id,label])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(label)}</option>`).join('');
  const input=(label,name,value,type='text',attrs='')=>`<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  const currentMonth=()=>{const d=today(),end=new Date(Number(d.slice(0,4)),Number(d.slice(5,7)),0).getDate();return {start:d.slice(0,8)+'01',end:d.slice(0,8)+String(end)};};
  function periodRange(preset) {
   if(preset==='week'){const d=today(),weekday=new Date(d+'T12:00:00').getDay(),start=addDays(d,-((weekday+6)%7));return {start,end:addDays(start,6)};}
   if(preset==='last30')return {start:addDays(today(),-29),end:today()};
   return currentMonth();
  }
  let filter={preset:'month',...currentMonth(),staff:'all'},preview=null,seriesSalonId='',pending=false;
  const activeStaff=()=>salon().staff.filter(member=>member.active!==false);
  const eligible=service=>activeStaff().filter(member=>(service?.staffIds||[]).includes(member.id));
  const services=()=>salon().services.filter(service=>eligible(service).length);
  const supported=()=>typeof api.createSeries==='function'&&(!api.isLive?.(salon())||(typeof api.seriesSupported==='function'&&api.seriesSupported()===true));
  function insightData() {
   const s=salon(),rows=s.bookings.filter(b=>b.date>=filter.start&&b.date<=filter.end&&(filter.staff==='all'||b.staffId===filter.staff));
   const counts={confirmed:0,completed:0,cancelled:0,'no-show':0},top=new Map(),daily=new Map(),clients=new Set();
   rows.forEach(b=>{
    const status=statusOf(b);if(Object.hasOwn(counts,status))counts[status]++;
    clients.add(b.customerId||String(b.email||'').trim().toLowerCase()||b.phone||b.name||b.id);
    daily.set(b.date,(daily.get(b.date)||0)+1);
    if(kept(b)){const id=b.serviceId||b.serviceName,entry=top.get(id)||{name:b.serviceName||'Removed service',count:0,value:0};entry.count++;entry.value+=amount(b.price);top.set(id,entry);}
   });
   const included=rows.filter(kept),days=Array.from({length:dateDifference(filter.start,filter.end)+1},(_,i)=>{const date=addDays(filter.start,i);return {date,count:daily.get(date)||0};});
   return {rows,counts,clients:clients.size,value:included.reduce((sum,b)=>sum+amount(b.price),0),hours:included.reduce((sum,b)=>sum+amount(b.duration),0)/60,services:[...top.values()].sort((a,b)=>b.count-a.count||b.value-a.value||a.name.localeCompare(b.name)).slice(0,5),days};
  }
  function bookingChart(data) {
   const count=data.days.length,width=count>10?820:440,height=248,left=34,right=14,top=18,bottom=42,plotWidth=width-left-right,plotHeight=height-top-bottom;
   const maxCount=Math.max(1,...data.days.map(day=>day.count)),step=Math.max(1,Math.ceil(maxCount/3)),ceiling=step*3;
   const points=data.days.map((day,index)=>({...day,x:count===1?left+plotWidth/2:left+index/(count-1)*plotWidth,y:top+plotHeight-day.count/ceiling*plotHeight}));
   const xy=point=>point.x.toFixed(2)+','+point.y.toFixed(2),line=points.map((point,index)=>(index?'L':'M')+xy(point)).join(' ');
   const area=line+' L'+points.at(-1).x.toFixed(2)+','+(top+plotHeight)+' L'+points[0].x.toFixed(2)+','+(top+plotHeight)+' Z';
   const tickEvery=Math.max(1,Math.ceil((count-1)/5)),shortDate=date=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
   const peak=data.days.reduce((best,day)=>day.count>best.count?day:best,data.days[0]),average=new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(data.rows.length/count);
   return `<figure class="ot-volume-figure"><div class="ot-chart-scroll" tabindex="0" role="region" aria-label="Daily booking chart, scroll for all dates"><svg class="ot-line-chart" viewBox="0 0 ${width} ${height}" style="--ot-chart-min:${count>10?'560px':'340px'}" role="img" aria-labelledby="ot-volume-title ot-volume-desc"><title id="ot-volume-title">Bookings by day, ${esc(human(filter.start))} to ${esc(human(filter.end))}</title><desc id="ot-volume-desc">${data.rows.length} bookings across ${count} days. All booking statuses are included. Highest daily count: ${maxCount}.</desc>${[0,1,2,3].map(index=>{const value=index*step,y=top+plotHeight-value/ceiling*plotHeight;return `<g class="ot-chart-grid"><line x1="${left}" x2="${width-right}" y1="${y}" y2="${y}"></line><text x="${left-12}" y="${y+4}" text-anchor="end">${value}</text></g>`;}).join('')}<path class="ot-chart-area" d="${area}"></path><path class="ot-chart-line" d="${line}"></path>${points.map((point,index)=>`<circle class="ot-chart-point" data-date="${point.date}" data-count="${point.count}" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${count<=10?4:3}" tabindex="0"><title>${esc(human(point.date))}: ${point.count} booking${point.count===1?'':'s'}</title></circle>${index===0||index===count-1||index%tickEvery===0?`<text class="ot-chart-x-label" x="${point.x.toFixed(2)}" y="${height-12}" text-anchor="${index===0?'start':index===count-1?'end':'middle'}">${esc(shortDate(point.date))}</text>`:''}`).join('')}</svg></div><figcaption><span>Daily average <b>${average}</b></span><span>Busiest day <b>${esc(shortDate(peak.date))} · ${peak.count} booking${peak.count===1?'':'s'}</b></span></figcaption></figure>`;
  }
  function serviceRanking(data) {
   const highest=Math.max(1,...data.services.map(service=>service.count));
   return `<ol class="ot-service-list ot-service-ranking">${data.services.map((service,index)=>`<li data-service-count="${service.count}"><div class="ot-service-heading"><span class="ot-service-number">${index+1}</span><div><b>${esc(service.name)}</b><small>${service.count} booking${service.count===1?'':'s'}</small></div><strong>${money(service.value)}</strong></div><span class="ot-service-track" aria-hidden="true"><i style="width:${(service.count/highest*100).toFixed(2)}%"></i></span></li>`).join('')}</ol>`;
  }
  function insights() {
   if(filter.staff!=='all'&&!salon().staff.some(m=>m.id===filter.staff))filter.staff='all';
   const data=insightData(),formatHours=value=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(value);
   return `<div class="ot-insights"><div class="ot-heading"><div><h1>Insights</h1><p>See when clients book and which services they choose.</p></div></div>
   <form data-form="owner-insights" class="ot-filters"><label class="field">Period<select name="period" data-owner-period>${options([['month','This month'],['week','This week'],['last30','Last 30 days'],['custom','Custom dates']],filter.preset)}</select></label><div class="ot-custom-dates" data-owner-custom ${filter.preset==='custom'?'':'hidden'}>${input('From','start',filter.start,'date','required')}${input('To','end',filter.end,'date','required')}</div><label class="field">Team member<select name="staff">${options([['all','All team members'],...salon().staff.map(m=>[m.id,m.name])],filter.staff)}</select></label><button class="btn primary">Apply</button><div class="error" role="alert"></div></form>
   <p class="ot-range">${esc(human(filter.start))} to ${esc(human(filter.end))}, inclusive</p>
   <div class="ot-metrics">${[['Bookings',data.rows.length,'All booking statuses'],['Scheduled value',money(data.value),'Confirmed and completed bookings'],['Booked hours',formatHours(data.hours),'Confirmed and completed bookings'],['Clients booked',data.clients,'Clients with bookings in this period']].map(([title,value,note])=>`<section class="ot-metric"><span>${title}</span><strong>${esc(value)}</strong><small>${note}</small></section>`).join('')}</div>
   <p class="ot-accounting">Scheduled value is the saved booking price, not collected cash. Cancelled bookings, no-shows, deposits, refunds and fees are excluded.</p>
   <div class="ot-statuses" aria-label="Booking status counts">${[['confirmed','Confirmed'],['completed','Completed'],['cancelled','Cancelled'],['no-show','No-shows']].map(([key,label])=>`<div><span class="ot-status-dot ot-status-${key}"></span><span>${label}</span><strong>${data.counts[key]}</strong></div>`).join('')}</div>
   <div class="ot-columns"><section class="ot-panel ot-volume-panel"><div class="ot-panel-heading"><div><h2>Bookings by day</h2><p>All statuses, including cancellations and no-shows.</p></div><span class="ot-chart-key"><i></i>Bookings</span></div>${data.rows.length?bookingChart(data):'<div class="ot-empty"><h3>No bookings in this period</h3><p>Try another date range or team member. Your diary records will appear here.</p></div>'}</section>
   <section class="ot-panel ot-ranking-panel"><div class="ot-panel-heading"><div><h2>Top services</h2><p>Ranked by confirmed and completed bookings.</p></div></div>${data.services.length?serviceRanking(data):'<div class="ot-empty"><p>No confirmed or completed services in this period.</p></div>'}</section></div></div>`;
  }
  function initialDate(service,staffId) {
   for(let i=1;i<=28;i++){const date=addDays(today(),i);if(available(date,service.id,null,staffId).length)return date;}
   return addDays(today(),1);
  }
  function seriesModal() {
   if(pending){toast('Your bookings are still saving. Please wait.');return;}
   if(!supported()){modal('Multiple bookings',`<p>This salon needs the multiple-appointment booking update before a series can be saved. Individual bookings are still available.</p><p class="ot-help">Ask your account administrator to finish the booking setup.</p>`);return;}
   const list=services();if(!list.length){modal('Multiple bookings','<p>Add a service and assign an active team member before creating multiple bookings.</p><a class="btn" href="#services" data-action="close-modal">Open services</a>');return;}
   preview=null;seriesSalonId=salon().id;
   const service=list[0],staff=eligible(service)[0],date=initialDate(service,staff.id),times=available(date,service.id,null,staff.id);
   modal('Book multiple bookings',`<p>Choose one service and a regular time. Check every date before adding the bookings together.</p><form data-form="owner-series" class="ot-series"><label class="field">Client<select name="customerId"><option value="">New client</option>${options(salon().customers.map(c=>[c.id,c.name+' · '+(c.email||'')]),'')}</select></label><div class="ot-form-grid">${input('Client name','name','','text','required maxlength="100"')}${input('Client email','email','','email','required maxlength="254"')}</div>${input('Phone (optional)','phone','','tel','maxlength="40"')}<label class="field">Service<select name="serviceId">${options(list.map(s=>[s.id,s.name+' · '+money(s.price)+' · '+s.duration+' min']),service.id)}</select></label><div class="ot-form-grid"><label class="field">Team member<select name="staffId">${options(eligible(service).map(m=>[m.id,m.name]),staff.id)}</select></label>${input('First booking','startDate',date,'date',`required min="${today()}"`)}</div><div class="ot-form-grid"><label class="field">Time<select name="time" required>${times.length?options(times.map(time=>[time,time]),times[0]):'<option value="">No times available</option>'}</select></label>${input('Repeat every (weeks)','intervalWeeks',1,'number','required min="1" max="52" step="1"')}${input('Number of bookings','count',2,'number','required min="2" max="12" step="1"')}</div><label class="field">Notes (optional)<textarea name="notes" rows="2" maxlength="500"></textarea></label><div class="error" role="alert"></div><button class="btn" type="submit">Check dates</button><div data-owner-series-preview aria-live="polite" class="ot-series-preview"><p class="ot-help">Nothing is booked until you confirm the checked dates.</p></div></form>`,'large');
  }
  function readSeries(form) {
   const data=new FormData(form),s=salon(),service=services().find(v=>v.id===data.get('serviceId')),staffId=String(data.get('staffId')||''),start=String(data.get('startDate')||''),count=Number(data.get('count')),interval=Number(data.get('intervalWeeks'));
   if(s.id!==seriesSalonId)throw Error('Your salon changed. Open multiple bookings again.');
   if(!service||!eligible(service).some(m=>m.id===staffId))throw Error('Choose a service and a team member who offers it.');
   if(!validDate(start)||start<today())throw Error('Choose a first booking today or later.');
   if(!Number.isInteger(count)||count<2||count>12)throw Error('Choose between 2 and 12 bookings.');
   if(!Number.isInteger(interval)||interval<1||interval>52)throw Error('Choose a repeat interval from 1 to 52 weeks.');
   const request={serviceId:service.id,staffId,dates:Array.from({length:count},(_,i)=>addDays(start,i*interval*7)),time:String(data.get('time')||''),name:String(data.get('name')||'').trim(),email:String(data.get('email')||'').trim(),phone:String(data.get('phone')||'').trim(),notes:String(data.get('notes')||'').trim(),customerId:String(data.get('customerId')||'')};
   if(!request.name||request.name.length>100||request.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email))throw Error('Enter a client name and valid email address.');
   if(request.phone.length>40||request.notes.length>500)throw Error('Keep the phone number to 40 characters and notes to 500.');
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(request.time))throw Error('Choose a time for your bookings.');
   if(request.customerId&&!s.customers.some(c=>c.id===request.customerId))throw Error('Choose an existing client or select New client.');
   return request;
  }
  const checkDates=request=>request.dates.map(date=>({date,free:available(date,request.serviceId,null,request.staffId).includes(request.time)}));
  function showPreview(form,request,checks) {
   const allFree=checks.every(check=>check.free),target=form.querySelector('[data-owner-series-preview]');
   target.innerHTML=`<h3>${allFree?'Your dates are available':'Some dates need a different time'}</h3><ol class="ot-date-list">${checks.map(check=>`<li class="${check.free?'is-free':'is-conflict'}"><span>${esc(human(check.date))} at ${esc(request.time)}</span><b>${check.free?'Available':'Unavailable'}</b></li>`).join('')}</ol>${allFree?`<p class="ot-help">${checks.length} bookings with the same service and team member. Availability is checked again when you save.</p><button type="button" class="btn primary" data-action="owner-series-confirm">Book ${checks.length} bookings</button>`:'<p class="ot-conflict-note">No bookings will be added until every date is available. Change the first date, time or repeat interval, then check again.</p>'}`;
   preview=allFree?{salonId:salon().id,signature:JSON.stringify(request)}:null;
   return allFree;
  }
  async function confirmSeries(form) {
   if(pending)return;
   try {
    if(!supported())throw Error('Multiple bookings are not enabled for this salon yet.');
    const request=readSeries(form);
    if(!preview||preview.salonId!==salon().id||preview.signature!==JSON.stringify(request))throw Error('Your details changed. Check the dates again before booking.');
    if(!showPreview(form,request,checkDates(request)))throw Error('A date is no longer available. Review the dates and try again.');
    pending=true;error(form,'');form.setAttribute('aria-busy','true');
    const controls=[...form.querySelectorAll('input,select,textarea,button')],disabled=controls.map(control=>control.disabled);controls.forEach(control=>{control.disabled=true;});
    try {
     const result=await api.createSeries(request);
     if(!result?.ok)throw Error(result?.message||'The bookings could not be saved. No series was confirmed.');
     preview=null;if(form.isConnected){closeModal();render();}toast(result.message||'Your bookings were created.');
    } finally {controls.forEach((control,index)=>{control.disabled=disabled[index];});form.removeAttribute('aria-busy');pending=false;}
   } catch(caught) {if(form.isConnected)error(form,caught.message||'Please check the details and try again.');else toast(caught.message||'Your bookings could not be saved.');}
  }
  function click(action,el) {
   if(action==='owner-series'){seriesModal();return true;}
   if(action==='owner-series-confirm'){const form=el.closest('[data-form="owner-series"]');if(form)void confirmSeries(form);return true;}
   return false;
  }
  function submit(type,form) {
   if(type==='owner-insights'){
    try {const data=new FormData(form),preset=String(data.get('period')||'month'),range=preset==='custom'?{start:String(data.get('start')||''),end:String(data.get('end')||'')}:periodRange(preset);if(!validDate(range.start)||!validDate(range.end)||range.start>range.end||dateDifference(range.start,range.end)>365)throw Error('Choose a valid date range of up to one year.');const staff=String(data.get('staff')||'all');if(staff!=='all'&&!salon().staff.some(m=>m.id===staff))throw Error('Choose a team member from this salon.');filter={preset:['month','week','last30','custom'].includes(preset)?preset:'month',...range,staff};render();}catch(caught){error(form,caught.message);}return true;
   }
   if(type==='owner-series') {try {if(pending)return true;if(!supported())throw Error('Multiple bookings are not enabled for this salon yet.');const request=readSeries(form);error(form,'');showPreview(form,request,checkDates(request));}catch(caught){preview=null;error(form,caught.message);}return true;}
   return false;
  }
  function change(el) {
   if(el.matches('[data-owner-period]')){const form=el.closest('form'),custom=el.value==='custom';form.querySelector('[data-owner-custom]').hidden=!custom;if(!custom){const range=periodRange(el.value);form.elements.start.value=range.start;form.elements.end.value=range.end;}return true;}
   const form=el.closest('[data-form="owner-series"]');if(!form)return false;
   preview=null;form.querySelector('[data-owner-series-preview]').innerHTML='<p class="ot-help">Check the dates again after making changes.</p>';error(form,'');
   if(el.name==='customerId'){const client=salon().customers.find(c=>c.id===el.value);['name','email','phone'].forEach(key=>{form.elements[key].value=client?.[key]||'';});}
   if(['serviceId','staffId','startDate'].includes(el.name)){
    const service=services().find(s=>s.id===form.elements.serviceId.value);if(!service)return true;
    const members=eligible(service),selected=form.elements.staffId.value;if(el.name==='serviceId')form.elements.staffId.innerHTML=options(members.map(m=>[m.id,m.name]),members.some(m=>m.id===selected)?selected:members[0]?.id);
    const date=form.elements.startDate.value,times=validDate(date)?available(date,service.id,null,form.elements.staffId.value):[],time=form.elements.time.value;
    form.elements.time.innerHTML=times.length?options(times.map(t=>[t,t]),times.includes(time)?time:times[0]):'<option value="">No times available</option>';
   }
   return true;
  }
  return {routes:['insights'],pages:{insights},click,submit,change};
 }};
})();
