/* Owner-only insights and multiple-appointment tools. The host owns persistence. */
(() => {
 'use strict';
 // Pure, business-scoped reporting. Never infer identity from a name, email or phone.
 function clientVisits(salon,filter,asOf) {
  const validDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  const validId=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9_-]{0,127}$/i.test(value);
  const own=row=>row&&(row.salonId??row.salon_id??salon.id)===salon.id;
  const status=row=>String(row.status||'').toLowerCase().replace(/[_ ]/g,'-');
  const clock=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)?value.slice(0,5):'';
  const clients=new Map((salon.customers||[]).filter(c=>own(c)&&validId(c.id)).map(c=>[c.id,c]));
  const rows=(salon.bookings||[]).filter(b=>own(b)&&validDay(b.date));
  const prior=new Set(),upcoming=new Set(),selected=new Map();let unlinkedVisits=0;
  if(!validDay(filter.start)||!validDay(filter.end)||!validDay(asOf.date)||filter.start>filter.end)return {total:0,firstRecorded:0,returning:0,withoutNext:[],unlinkedVisits:0};
  for(const b of rows){
   const linked=validId(b.customerId)&&clients.has(b.customerId),time=clock(b.time),now=clock(asOf.time);
   if(linked&&status(b)==='confirmed'&&(b.date>asOf.date||b.date===asOf.date&&(!time||!now||time>=now)))upcoming.add(b.customerId);
   if(status(b)!=='completed'||b.date>asOf.date||b.date===asOf.date&&time&&now&&time>now)continue;
   if(linked&&b.date<filter.start)prior.add(b.customerId);
   if(b.date<filter.start||b.date>filter.end||filter.staff!=='all'&&b.staffId!==filter.staff)continue;
   if(!linked){unlinkedVisits++;continue;}
   const previous=selected.get(b.customerId),lastVisit=b.date+'T'+(time||'00:00');
   if(!previous||lastVisit>previous.lastVisit)selected.set(b.customerId,{id:b.customerId,name:String(clients.get(b.customerId).name||'Unnamed customer'),date:b.date,lastVisit});
  }
  const returning=[...selected.keys()].filter(id=>prior.has(id)).length;
  return {total:selected.size,firstRecorded:selected.size-returning,returning,unlinkedVisits,withoutNext:[...selected.values()].filter(c=>!upcoming.has(c.id)).sort((a,b)=>b.lastVisit.localeCompare(a.lastVisit)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id))};
 }
 // Saved, completed service values only. UTC date keys avoid DST-length days.
 function comparePerformance(salon,filter,asOf) {
  const valid=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  const plus=(key,n)=>{const d=new Date(key+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
  const length=(start,end)=>Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000)+1;
  const now=typeof asOf==='string'?{date:asOf}:asOf||{};
  if(!valid(filter?.start)||!valid(filter?.end)||!valid(now.date)||filter.start>filter.end||length(filter.start,filter.end)>366)throw new RangeError('Choose a valid comparison period of up to one year.');
  const selection={start:filter.start,end:filter.end,staff:filter.staff||'all'};
  const base={selection,asOf:now.date,clipped:filter.end>now.date};
  if(filter.start>now.date)return {...base,observed:false,current:null,previous:null,series:[],changes:null,topService:null};
  const currentEnd=filter.end<now.date?filter.end:now.date,days=length(filter.start,currentEnd),previousEnd=plus(filter.start,-1),previousStart=plus(previousEnd,1-days);
  const period=(start,end)=>({start,end,days,completed:0,pricedCompleted:0,valuePence:0,missingPrices:0});
  const current=period(filter.start,currentEnd),previous=period(previousStart,previousEnd),series=Array.from({length:days},(_,index)=>({index,current:{date:plus(current.start,index),completed:0,valuePence:0},previous:{date:plus(previous.start,index),completed:0,valuePence:0}}));
  const indexByDate=new Map();series.forEach(pair=>{indexByDate.set(pair.current.date,{name:'current',index:pair.index});indexByDate.set(pair.previous.date,{name:'previous',index:pair.index});});
  const services=new Map(),clock=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)?value.slice(0,5):'';
  const staff=selection.staff,knownStaff=new Set((salon.staff||[]).map(member=>member.id));
  for(const booking of salon.bookings||[]){
   if(!booking||(booking.salonId??booking.salon_id??salon.id)!==salon.id||!valid(booking.date)||String(booking.status||'').trim().toLowerCase()!=='completed')continue;
   if(staff!=='all'&&(!knownStaff.has(staff)||booking.staffId!==staff))continue;
   if(booking.date>now.date||booking.date===now.date&&clock(booking.time)&&clock(now.time)&&clock(booking.time)>clock(now.time))continue;
   const location=indexByDate.get(booking.date);if(!location)continue;
   const total=location.name==='current'?current:previous,day=series[location.index][location.name];
   total.completed++;day.completed++;
   const number=Number(booking.price),priced=booking.price!==null&&booking.price!==undefined&&booking.price!==''&&Number.isFinite(number)&&number>=0&&Number.isSafeInteger(Math.round(number*100));
   const pence=priced?Math.round(number*100):0;
   if(priced){total.pricedCompleted++;total.valuePence+=pence;day.valuePence+=pence;}else total.missingPrices++;
   const key=booking.serviceId||booking.serviceName||'unknown-service',service=services.get(key)||{id:key,name:String(booking.serviceName||'Removed service'),currentPence:0,previousPence:0,currentCompleted:0,previousCompleted:0};
   service[location.name+'Pence']+=pence;service[location.name+'Completed']++;
   if(location.name==='current')service.name=String(booking.serviceName||service.name);
   services.set(key,service);
  }
  const finish=total=>({start:total.start,end:total.end,days:total.days,completed:total.completed,pricedCompleted:total.pricedCompleted,missingPrices:total.missingPrices,value:total.valuePence/100,averageValue:total.pricedCompleted?Math.round(total.valuePence/total.pricedCompleted)/100:null});
  const c=finish(current),p=finish(previous),change=(a,b)=>({absolute:a===null||b===null?null:Math.round((a-b)*100)/100,percent:a===null||b===null||b===0?null:Math.round((a-b)/b*1000)/10});
  const top=[...services.values()].map(service=>({id:service.id,name:service.name,currentValue:service.currentPence/100,previousValue:service.previousPence/100,currentCompleted:service.currentCompleted,previousCompleted:service.previousCompleted,change:change(service.currentPence/100,service.previousPence/100)})).sort((a,b)=>Math.abs(b.change.absolute)-Math.abs(a.change.absolute)||Math.abs(b.currentCompleted-b.previousCompleted)-Math.abs(a.currentCompleted-a.previousCompleted)||a.name.localeCompare(b.name))[0]||null;
  return {...base,observed:true,current:c,previous:p,series:series.map(pair=>({index:pair.index,current:{date:pair.current.date,completed:pair.current.completed,value:pair.current.valuePence/100},previous:{date:pair.previous.date,completed:pair.previous.completed,value:pair.previous.valuePence/100}})),changes:{value:change(c.value,p.value),completed:change(c.completed,p.completed),averageValue:change(c.averageValue,p.averageValue)},topService:top};
 }
 window.JovaOwnerTools={clientVisits,comparePerformance,create(api) {
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
  let filter={preset:'month',...currentMonth(),staff:'all'},preview=null,seriesSalonId='',seriesOwner='',pending=false,compareMetric='value';
  const seriesIdentity=()=>String(api.ownerIdentity?.()||'demo')+'|'+salon().id;
  const activeStaff=()=>salon().staff.filter(member=>member.active!==false);
  const eligible=service=>activeStaff().filter(member=>(service?.staffIds||[]).includes(member.id));
  const services=()=>salon().services.filter(service=>eligible(service).length);
  const supported=()=>typeof api.createSeries==='function'&&(!api.isLive?.(salon())||(typeof api.seriesSupported==='function'&&api.seriesSupported()===true));
  const insightsAllowed=()=>window.JovaSchedule?.insightsAllowed?.(salon())===true;
  const premiumAllowed=()=>salon().entitlements?.offer_version==='2026-11-free-v1'?insightsAllowed():['Premium'].includes(window.JovaSchedule?.plan?.(salon()).name);
  let insightsSalonId='';
  function resetInsights(){filter={preset:'month',...currentMonth(),staff:'all'};insightsSalonId=salon().id;compareMetric='value';}
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
  function clientVisitsPanel(data) {
   const firstWidth=data.total?data.firstRecorded/data.total*100:0;
   return `<section class="ot-panel ot-client-visits" data-client-visits><div class="ot-panel-heading"><div><h2>Clients and repeat visits</h2></div></div><div class="ot-client-columns ${data.total?'':'is-empty'}"><div class="ot-client-mix"><h3>Client mix</h3>${data.total?`<div class="ot-client-bar" role="img" aria-label="${data.firstRecorded} first recorded clients and ${data.returning} returning clients"><span style="width:${firstWidth.toFixed(2)}%"></span></div><dl class="ot-client-counts"><div><dt><i class="ot-client-dot ot-client-dot-first" aria-hidden="true"></i>First recorded</dt><dd data-client-first>${data.firstRecorded}</dd></div><div><dt><i class="ot-client-dot" aria-hidden="true"></i>Returning</dt><dd data-client-returning>${data.returning}</dd></div></dl>`:'<p class="ot-client-empty">No linked clients with completed visits in this period.</p>'}</div>${data.total?`<div class="ot-client-next"><div class="ot-client-next-heading"><h3>No next booking</h3><strong data-client-without-next>${data.withoutNext.length}</strong></div>${data.withoutNext.length?`<ul class="ot-client-followup">${data.withoutNext.slice(0,5).map(c=>`<li><div><button type="button" class="ot-client-link" data-action="customer" data-id="${esc(c.id)}">${esc(c.name)}</button><span>Last visit: ${esc(human(c.date))}</span></div><span class="ot-client-record-hint" aria-hidden="true">View client</span></li>`).join('')}</ul>${data.withoutNext.length>5?`<p class="ot-client-note">Showing 5 of ${data.withoutNext.length}, most recent visits first.</p>`:''}`:'<p class="ot-client-empty">All these clients have an upcoming confirmed booking.</p>'}</div>`:''}</div></section>`;
  }
  const compareDate=date=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
  function comparisonChart(data) {
   const count=data.series.length,width=920,height=286,left=62,right=26,top=24,bottom=46,plotWidth=width-left-right,plotHeight=height-top-bottom;
   const label=compareMetric==='value'?'Completed value':'Completed bookings',format=value=>compareMetric==='value'?money(value):String(value);
   const max=Math.max(1,...data.series.flatMap(pair=>[pair.current[compareMetric==='value'?'value':'completed'],pair.previous[compareMetric==='value'?'value':'completed']]));
   const raw=max/3,power=10**Math.floor(Math.log10(raw)),fraction=raw/power;
   const step=compareMetric==='completed'?Math.max(1,Math.ceil(raw)):Math.max(.01,(fraction<=1?1:fraction<=2?2:fraction<=5?5:10)*power),ceiling=step*3;
   const x=index=>count===1?left+plotWidth/2:left+index/(count-1)*plotWidth,y=value=>top+plotHeight-value/ceiling*plotHeight;
   const field=compareMetric==='value'?'value':'completed';
   const points=data.series.map(pair=>({...pair,x:x(pair.index),cy:y(pair.current[field]),py:y(pair.previous[field])}));
   const line=which=>points.map((point,index)=>(index?'L':'M')+point.x.toFixed(2)+','+(which==='current'?point.cy:point.py).toFixed(2)).join(' ');
   const area=line('current')+' L'+points.at(-1).x.toFixed(2)+','+(top+plotHeight)+' L'+points[0].x.toFixed(2)+','+(top+plotHeight)+' Z';
   const tickEvery=Math.max(1,Math.ceil((count-1)/5));
   return `<figure class="ot-compare-figure"><div class="ot-compare-chart-scroll" role="region" tabindex="0" aria-label="Period comparison chart. Scroll horizontally for all dates."><svg class="ot-compare-chart" viewBox="0 0 ${width} ${height}" style="--ot-compare-min:${count>10?'620px':'480px'}" role="group" aria-labelledby="ot-compare-title ot-compare-description"><title id="ot-compare-title">${label}: current and previous periods</title><desc id="ot-compare-description">${esc(compareDate(data.current.start))} to ${esc(compareDate(data.current.end))}, compared with ${esc(compareDate(data.previous.start))} to ${esc(compareDate(data.previous.end))}. ${count} matching days in each period. Points can be focused to read both dates and values.</desc>${[0,1,2,3].map(index=>{const value=index*step;return `<g class="ot-compare-grid"><line x1="${left}" x2="${width-right}" y1="${y(value)}" y2="${y(value)}"></line><text x="${left-12}" y="${y(value)+4}" text-anchor="end">${esc(format(Math.round(value*100)/100))}</text></g>`;}).join('')}<path class="ot-compare-area" d="${area}"></path><path class="ot-compare-previous-line" data-premium-series="previous" d="${line('previous')}"></path><path class="ot-compare-current-line" data-premium-series="current" d="${line('current')}"></path>${points.map((point,index)=>{
    const cx=point.x.toFixed(2),tipX=Math.max(4,Math.min(width-255,point.x-122)),tipY=Math.max(3,Math.min(top+plotHeight-66,Math.min(point.cy,point.py)-70));
    const currentText='Current '+compareDate(point.current.date)+': '+format(point.current[field]),previousText='Previous '+compareDate(point.previous.date)+': '+format(point.previous[field]);
    return `<g class="ot-compare-hit"><circle class="ot-compare-previous-point" cx="${cx}" cy="${point.py.toFixed(2)}" r="3" aria-hidden="true"></circle><circle class="ot-compare-current-point" cx="${cx}" cy="${point.cy.toFixed(2)}" r="4" tabindex="0" role="img" aria-label="${esc(currentText+'. '+previousText)}" data-current-date="${point.current.date}" data-previous-date="${point.previous.date}" data-current-value="${point.current[field]}" data-previous-value="${point.previous[field]}"><title>${esc(currentText+'. '+previousText)}</title></circle><g class="ot-compare-tooltip" transform="translate(${tipX.toFixed(2)},${tipY.toFixed(2)})" aria-hidden="true"><rect width="250" height="60" rx="10"></rect><text x="13" y="23">${esc(currentText)}</text><text x="13" y="44">${esc(previousText)}</text></g></g>${index===0||index===count-1||index%tickEvery===0?`<text class="ot-compare-date" x="${cx}" y="${height-16}" text-anchor="${index===0?'start':index===count-1?'end':'middle'}">${esc(new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(point.current.date+'T12:00:00Z')))}</text>`:''}`;
   }).join('')}</svg></div><figcaption>Dates on the chart show the current period. Both lines align by day within their period.</figcaption></figure>`;
  }
  function comparisonPanel() {
   if(!premiumAllowed())return `<section class="ot-panel ot-compare ot-compare-locked" data-premium-locked aria-labelledby="ot-premium-locked-title"><div><span class="ot-premium-badge">Premium</span><h2 id="ot-premium-locked-title">Compare performance</h2><p>See how completed bookings and their saved value change from one matched period to the next.</p><a class="ot-compare-upgrade" href="#billing">Explore Premium</a></div><div class="ot-compare-lock-art" aria-hidden="true"><svg viewBox="0 0 150 70" fill="none"><path d="M3 55 C25 45 26 65 48 38 S80 52 98 25 S127 37 147 8"></path><path d="M3 65 C25 60 26 33 48 49 S80 15 98 39 S127 42 147 20"></path></svg><span>Period comparisons</span></div></section>`;
   const now=new Intl.DateTimeFormat('en-GB',{timeZone:window.JovaBusinessLocale?.resolve(salon()).timezone||'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
   const data=comparePerformance(salon(),filter,{date:today(),time:now});
   const rangeText=period=>compareDate(period.start)+(period.start===period.end?'':' to '+compareDate(period.end));
   const signed=(value,currency)=>value===null?'Not available':(value>0?'+':value<0?'-':'')+(currency?money(Math.abs(value)):String(Math.abs(value)));
   const deltaText=(change,currency)=>change.absolute===null?'No completed-booking baseline':signed(change.absolute,currency)+(change.percent===null?' · No previous baseline':' · '+signed(change.percent,false)+'%');
   const changeCell=(title,key,currency)=>{const value=data.current[key],prior=data.previous[key],change=data.changes[key];return `<div><dt>${title}</dt><dd data-premium-total="${key}">${value===null?'Not available':currency?money(value):value}</dd><p class="${change.absolute>0?'ot-compare-increase':change.absolute<0?'ot-compare-decrease':''}" data-premium-change="${key}">${esc(deltaText(change,currency))}</p><small>Previous ${prior===null?'not available':currency?money(prior):prior}</small></div>`;};
   return `<section class="ot-panel ot-compare" data-premium-compare data-compare-metric="${compareMetric}" aria-labelledby="ot-premium-compare-heading"><header class="ot-compare-heading"><div><h2 id="ot-premium-compare-heading">Compare performance</h2><p>Completed bookings, compared over matching dates.</p></div><div class="ot-compare-toggle" role="group" aria-label="Comparison metric">${[['value','Completed value'],['completed','Completed bookings']].map(([value,title])=>`<button type="button" data-action="premium-compare-metric" data-metric="${value}" aria-pressed="${compareMetric===value}" ${data.observed?'':'disabled'}>${title}</button>`).join('')}</div></header>${data.observed?`<div class="ot-compare-legend"><span><i aria-hidden="true"></i><b>Current</b> ${esc(rangeText(data.current))}</span><span><i aria-hidden="true"></i><b>Previous</b> ${esc(rangeText(data.previous))}</span></div><p class="ot-compare-window">${data.clipped?`Showing the first ${data.current.days} observed day${data.current.days===1?'':'s'} of your selected period, through ${esc(compareDate(data.asOf))}. Both periods use the same ${data.current.days}-day window.`:`Two equal ${data.current.days}-day periods. Only completed bookings are included.`}</p>${comparisonChart(data)}<dl class="ot-compare-changes">${changeCell('Completed value','value',true)}${changeCell('Completed bookings','completed',false)}${changeCell('Average saved value','averageValue',true)}</dl>${data.topService?`<p class="ot-compare-service"><span>Largest service value change</span><b>${esc(data.topService.name)}</b><strong>${esc(signed(data.topService.change.absolute,true))}</strong><small>${money(data.topService.currentValue)} current compared with ${money(data.topService.previousValue)} previous</small></p>`:'<p class="ot-compare-no-records">No completed bookings in either comparison period. The lines show recorded zero totals.</p>'}<p class="ot-compare-note">Completed value uses saved service prices. It is not collected cash and does not add deposits or simulated payments.${data.current.missingPrices+data.previous.missingPrices?` ${data.current.missingPrices+data.previous.missingPrices} completed booking${data.current.missingPrices+data.previous.missingPrices===1?' has':'s have'} no valid saved price and ${data.current.missingPrices+data.previous.missingPrices===1?'is':'are'} excluded from value totals and averages.`:''}</p>`:'<div class="ot-compare-future"><h3>This period has not started</h3><p>Choose dates up to today to compare observed completed bookings. Future entries are not counted as completed performance.</p></div>'}</section>`;
  }
  function insights() {
   if(!insightsAllowed()){resetInsights();return window.JovaReference.locked('insights',window.JovaSchedule.plan(salon()).name);}
   if(insightsSalonId!==salon().id)resetInsights();
   if(filter.staff!=='all'&&!salon().staff.some(m=>m.id===filter.staff))filter.staff='all';
   const data=insightData(),formatHours=value=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(value);
   const now=new Intl.DateTimeFormat('en-GB',{timeZone:window.JovaBusinessLocale?.resolve(salon()).timezone||'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
   const clients=clientVisits(salon(),filter,{date:today(),time:now});
   const metricIcons=[
    '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16"/>',
    '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v5c0 4 14 4 14 0V6M5 11v5c0 4 14 4 14 0v-5M5 16v3c0 4 14 4 14 0v-3"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    '<circle cx="12" cy="7" r="3"/><path d="M6 20v-2c0-6 12-6 12 0v2H6ZM5 5a3 3 0 0 0 0 6m14-6a3 3 0 0 1 0 6M3 19v-2c0-2 1-3 3-4m15 6v-2c0-2-1-3-3-4"/>'
   ];
   return `<div class="ot-insights"><div class="ot-heading"><div><h1>Insights</h1></div></div>
   <form data-form="owner-insights" class="ot-filters"><label class="field">Period<select name="period" data-owner-period>${options([['month','This month'],['week','This week'],['last30','Last 30 days'],['custom','Custom dates']],filter.preset)}</select></label><div class="ot-custom-dates" data-owner-custom ${filter.preset==='custom'?'':'hidden'}>${input('From','start',filter.start,'date','required')}${input('To','end',filter.end,'date','required')}</div><label class="field">Team member<select name="staff">${options([['all','All team members'],...salon().staff.map(m=>[m.id,m.name])],filter.staff)}</select></label><button class="btn primary">Update view</button><div class="error" role="alert"></div></form>
   <p class="ot-range">${esc(human(filter.start))} to ${esc(human(filter.end))}, inclusive</p>
   <div class="ot-metrics">${[['Bookings',data.rows.length],['Scheduled value',money(data.value)],['Booked hours',formatHours(data.hours)],['Clients booked',data.clients]].map(([title,value],index)=>`<section class="ot-metric" style="--jg-value-length:${Math.max(3,String(value).length)}"><span class="jg-insight-metric-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${metricIcons[index]}</svg></span><span>${title}</span><strong>${esc(value)}</strong></section>`).join('')}</div>
   <section class="jg-insight-totals"><details class="jg-totals-help"><summary>How totals work</summary><div class="jg-totals-explanation"><p>Bookings includes all statuses. Scheduled value and hours count confirmed and completed bookings. Scheduled value is the saved service price, not collected cash, and excludes deposits, refunds and fees.</p><p>Top services are ranked by confirmed and completed bookings. Clients and repeat visits use completed visits in the selected period${filter.staff==='all'?'':' and team member'}, counting each linked client once.</p><p class="ot-client-note">Returning means a completed visit before this period, with any team member. First recorded means no earlier completed visit in your saved history. No next booking means no upcoming confirmed booking across any team member, checked as of today.</p><p class="ot-client-footnote">Based on saved booking history. Cancelled and no-show visits are excluded.${clients.unlinkedVisits?` ${clients.unlinkedVisits} completed visit${clients.unlinkedVisits===1?' was':'s were'} excluded because the client record is missing or unlinked.`:''}</p></div></details>
   <div class="ot-statuses" aria-label="Booking status counts">${[['confirmed','Confirmed'],['completed','Completed'],['cancelled','Cancelled'],['no-show','No-shows']].map(([key,label])=>`<div><span class="ot-status-dot ot-status-${key}"></span><span>${label}</span><strong>${data.counts[key]}</strong></div>`).join('')}</div></section>
   <div class="ot-columns"><section class="ot-panel ot-volume-panel"><div class="ot-panel-heading"><div><h2>Bookings by day</h2></div>${data.rows.length?'<span class="ot-chart-key"><i></i>Bookings</span>':''}</div>${data.rows.length?bookingChart(data):'<div class="ot-empty"><p>No bookings in this period.</p></div>'}</section>
   <section class="ot-panel ot-ranking-panel"><div class="ot-panel-heading"><div><h2>Top services</h2></div></div>${data.services.length?serviceRanking(data):'<div class="ot-empty"><p>No confirmed or completed services in this period.</p></div>'}</section></div>${clientVisitsPanel(clients)}${comparisonPanel()}</div>`;
  }

  function initialDate(service,staffId) {
   for(let i=1;i<=28;i++){const date=addDays(today(),i);if(available(date,service.id,null,staffId).length)return date;}
   return addDays(today(),1);
  }
  const sessionIcon=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const sessionIcons={customer:sessionIcon('<circle cx="12" cy="7" r="4"/><path d="M5 21v-2c0-8 14-8 14 0v2H5Z"/>'),service:sessionIcon('<path d="m12 3 10 6-10 6L2 9l10-6ZM2 13l10 6 10-6M2 17l10 6 10-6"/>'),calendar:sessionIcon('<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 11h16"/>'),notes:sessionIcon('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>')};
  function seriesModal() {
   if(pending){toast('Your bookings are still saving. Please wait.');return;}
   if(!supported()){modal('Multiple sessions',`<p>This salon needs the multiple-session booking update before a series can be saved. Individual bookings are still available.</p><p class="ot-help">Ask your account administrator to finish the booking setup.</p>`);return;}
   const list=services();if(!list.length){modal('Multiple sessions','<p>Add a service and assign an active team member before creating multiple sessions.</p><a class="btn" href="#services" data-action="close-modal">Open services</a>');return;}
   preview=null;seriesSalonId=salon().id;seriesOwner=seriesIdentity();
   const service=list[0],staff=eligible(service)[0],date=initialDate(service,staff.id),times=available(date,service.id,null,staff.id),existing=salon().customers.length>0;
   modal('Book multiple sessions',`<form data-form="owner-series" class="ot-series ot-series-wizard" data-owner="${esc(seriesOwner)}" data-series-step="details" data-customer-mode="${existing?'existing':'new'}" novalidate>
    <p class="ot-series-intro">Create recurring bookings for the same service.</p>
    <ol class="ot-series-steps" aria-label="Booking progress">${[['details','Details'],['dates','Dates'],['review','Review']].map(([id,label],index)=>`<li data-series-step-marker="${id}" ${index===0?'aria-current="step"':''}><span>${index+1}</span><b>${label}</b></li>`).join('')}</ol>
    <div data-series-section="details">
     <section class="ot-session-card"><h3>${sessionIcons.customer}Customer</h3><div class="ot-customer-modes" role="group" aria-label="Customer type"><button type="button" data-action="owner-series-customer-mode" data-mode="existing" aria-pressed="${existing}" ${existing?'':'disabled'}>Existing customer</button><button type="button" data-action="owner-series-customer-mode" data-mode="new" aria-pressed="${!existing}">New customer</button></div>
      <input type="hidden" name="customerId" value=""><div class="ot-existing-customer" ${existing?'':'hidden'}><label class="field"><span class="ot-sr-only">Search customer name</span><input type="search" name="customerSearch" data-owner-customer-search placeholder="Search customer name" autocomplete="off" aria-label="Search customer name" aria-controls="ot-series-customer-results"></label><div id="ot-series-customer-results" class="ot-series-customer-results" aria-label="Matching customers">${salon().customers.map(c=>`<button type="button" data-action="owner-series-customer" data-id="${esc(c.id)}" data-customer-name="${esc(c.name.toLowerCase())}"><strong>${esc(c.name)}</strong><span>${esc(c.email||'No email saved')}</span></button>`).join('')}</div><p class="ot-series-customer-empty" hidden>No customers match that name.</p></div>
      <div class="ot-new-customer" ${existing?'hidden':''}><div class="ot-form-grid">${input('Customer name','name','','text','required maxlength="80"')}${input('Customer email','email','','email','required maxlength="254"')}</div>${input('Phone (optional)','phone','','tel','maxlength="40"')}</div>
     </section>
     <section class="ot-session-card"><h3>${sessionIcons.service}Service</h3><label class="field"><span class="ot-sr-only">Service</span><select name="serviceId">${options(list.map(s=>[s.id,s.name+' · '+money(s.price)+' · '+window.JovaDuration.format(s.duration)]),service.id)}</select></label></section>
     <section class="ot-session-card"><h3>${sessionIcons.customer}Team member</h3><label class="field"><span class="ot-sr-only">Team member</span><select name="staffId">${options(eligible(service).map(m=>[m.id,m.name]),staff.id)}</select></label></section>
     <section class="ot-session-card"><h3>${sessionIcons.calendar}Schedule</h3><div class="ot-form-grid">${input('First booking','startDate',date,'date',`required min="${today()}"`)}<label class="field">Time<select name="time" required>${times.length?options(times.map(time=>[time,time]),times[0]):'<option value="">No times available</option>'}</select></label><label class="field">Repeat every<select name="intervalWeeks">${options(Array.from({length:52},(_,i)=>[String(i+1),(i+1)+' week'+(i?'s':'')]),'1')}</select></label><label class="field">Number of sessions<select name="count">${options(Array.from({length:11},(_,i)=>[String(i+2),String(i+2)]),'2')}</select></label></div></section>
     <section class="ot-session-card"><h3>${sessionIcons.notes}Notes <span>(optional)</span></h3><label class="field"><span class="ot-sr-only">Notes (optional)</span><textarea name="notes" rows="3" maxlength="500" placeholder="Add any notes..."></textarea></label></section>
    </div>
    <section data-owner-series-preview data-series-section="dates" class="ot-series-preview" aria-live="polite" hidden></section><div class="error" role="alert"></div>
    <footer class="ot-series-footer"><button type="button" class="btn" data-action="owner-series-back" hidden>Back</button><button class="btn primary" type="submit" data-stage-action="details">Continue</button><button type="button" class="btn primary" data-action="owner-series-review" data-stage-action="dates" hidden>Continue to review</button><button type="button" class="btn primary" data-action="owner-series-confirm" data-stage-action="review" hidden>Confirm bookings</button></footer>
   </form>`,'large');
  }
  function setSeriesStep(form,step){
   form.dataset.seriesStep=step;
   form.querySelectorAll('[data-series-section]').forEach(section=>section.hidden=section.dataset.seriesSection!==step);
   form.querySelectorAll('[data-stage-action]').forEach(button=>button.hidden=button.dataset.stageAction!==step);
   const back=form.querySelector('[data-action="owner-series-back"]');if(back)back.hidden=step==='details';
   const order=['details','dates','review'],current=order.indexOf(step);
   form.querySelectorAll('[data-series-step-marker]').forEach((marker,index)=>{if(index===current)marker.setAttribute('aria-current','step');else marker.removeAttribute('aria-current');marker.classList.toggle('is-complete',index<current);marker.querySelector('span').textContent=index<current?'✓':String(index+1);});
   const scroller=form.closest?.('.modal');if(scroller)scroller.scrollTop=0;
  }
  function seriesSummary(request,selected){
   const service=services().find(s=>s.id===request.serviceId),member=salon().staff.find(m=>m.id===request.staffId);
   return `<section class="ot-series-summary"><h3>Summary</h3><dl>${[['Customer',request.name],['Service',service?.name||'Service'],['Team member',member?.name||'Team member'],['Total sessions',selected.length],['Duration (each)',window.JovaDuration.format(service?.duration)],['Total service value',money((service?.price||0)*selected.length)]].map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section>`;
  }
  function selectedSeriesRequest(form){
   const request=readSeries(form);
   if(!preview||preview.salonId!==salon().id||preview.signature!==JSON.stringify(request))throw Error('Your details changed. Check the dates again before booking.');
   const dates=request.dates.filter(date=>preview.selected.has(date));
   if(dates.length<2)throw Error('Select at least 2 available session dates.');
   return {...request,dates};
  }
  function renderSeriesDates(form){
   if(!preview)return;
   const request=preview.request,target=form.querySelector('[data-owner-series-preview]'),service=services().find(s=>s.id===request.serviceId),end=Number(request.time.slice(0,2))*60+Number(request.time.slice(3))+(service?.duration||0),endTime=String(Math.floor(end/60)).padStart(2,'0')+':'+String(end%60).padStart(2,'0'),selected=request.dates.filter(date=>preview.selected.has(date));
   target.dataset.seriesSection='dates';target.innerHTML=`<h3 class="ot-series-dates-title">${sessionIcons.calendar}Check and confirm dates</h3><p class="ot-series-description">Here are the sessions based on your schedule. Select at least 2 available dates.</p><ol class="ot-session-dates">${preview.checks.map((check,index)=>`<li class="${check.free?'is-free':'is-conflict'}"><label><input type="checkbox" name="sessionDate" value="${check.date}" ${preview.selected.has(check.date)?'checked':''} ${check.free?'':'disabled'}><span><strong>${esc(new Date(check.date+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}))}</strong><small>${esc(request.time)} to ${endTime}${check.free?'':' · Unavailable'}</small></span><b>Session ${index+1}</b></label></li>`).join('')}</ol><p class="ot-conflict-note" ${preview.checks.every(check=>check.free)?'hidden':''}>Unavailable dates cannot be selected. Go Back to change the schedule, or leave them out.</p>${seriesSummary(request,selected)}<p class="ot-help">Nothing is booked yet. Availability is checked again before confirmation.</p>`;
   const next=form.querySelector('[data-action="owner-series-review"]');if(next)next.disabled=selected.length<2;
   setSeriesStep(form,'dates');
  }
  function showPreview(form,request,checks){
   const signature=JSON.stringify(request),previous=preview?.salonId===salon().id&&preview.signature===signature?preview.selected:null;
   preview={salonId:salon().id,signature,request,checks,selected:new Set(checks.filter(check=>check.free&&(!previous||previous.has(check.date))).map(check=>check.date))};renderSeriesDates(form);return checks.every(check=>check.free);
  }
  function reviewSeries(form){
   try{
    const request=selectedSeriesRequest(form),checks=checkDates(request);
    if(checks.some(check=>!check.free)){preview.checks=checkDates(preview.request);preview.selected=new Set([...preview.selected].filter(date=>preview.checks.some(check=>check.date===date&&check.free)));renderSeriesDates(form);throw Error('A date is no longer available. Review your selected dates.');}
    const target=form.querySelector('[data-owner-series-preview]');target.dataset.seriesSection='review';target.innerHTML=`<h3 class="ot-series-dates-title">Review your bookings</h3><p class="ot-series-description">Check these details before confirming ${request.dates.length} sessions.</p>${seriesSummary(request,request.dates)}<ol class="ot-series-review-dates">${request.dates.map(date=>`<li>${esc(human(date))}<strong>${esc(request.time)}</strong></li>`).join('')}</ol>${request.notes?`<div class="ot-series-review-notes"><h3>Notes</h3><p>${esc(request.notes)}</p></div>`:''}<p class="ot-help">All sessions are saved together. If a slot is taken, no series is confirmed.</p>`;error(form,'');setSeriesStep(form,'review');
   }catch(caught){error(form,caught.message);}
  }

  function readSeries(form) {
   const data=new FormData(form),s=salon(),service=services().find(v=>v.id===data.get('serviceId')),staffId=String(data.get('staffId')||''),start=String(data.get('startDate')||''),count=Number(data.get('count')),interval=Number(data.get('intervalWeeks'));
   if(s.id!==seriesSalonId||seriesIdentity()!==seriesOwner)throw Error('Your salon changed. Open multiple sessions again.');
   if(!service||!eligible(service).some(m=>m.id===staffId))throw Error('Choose a service and a team member who offers it.');
   if(!validDate(start)||start<today())throw Error('Choose a first booking today or later.');
   if(!Number.isInteger(count)||count<2||count>12)throw Error('Choose between 2 and 12 bookings.');
   if(!Number.isInteger(interval)||interval<1||interval>52)throw Error('Choose a repeat interval from 1 to 52 weeks.');
   const request={serviceId:service.id,staffId,dates:Array.from({length:count},(_,i)=>addDays(start,i*interval*7)),time:String(data.get('time')||''),name:String(data.get('name')||'').trim(),email:String(data.get('email')||'').trim(),phone:String(data.get('phone')||'').trim(),notes:String(data.get('notes')||'').trim(),customerId:String(data.get('customerId')||'')};
   if(!request.name||request.name.length>80||request.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(request.email))throw Error('Enter a client name of up to 80 characters and a valid email address.');
   if(request.phone.length>40||request.notes.length>500)throw Error('Keep the phone number to 40 characters and notes to 500.');
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(request.time))throw Error('Choose a time for your bookings.');
   if(request.customerId&&!s.customers.some(c=>c.id===request.customerId))throw Error('Choose an existing client or select New customer.');
   return request;
  }
  const checkDates=request=>request.dates.map(date=>({date,free:available(date,request.serviceId,null,request.staffId).includes(request.time)}));
  async function confirmSeries(form) {
   if(pending)return;
   const requestOwner=seriesOwner,sameOwner=()=>requestOwner===seriesOwner&&requestOwner===seriesIdentity();
   try {
    if(!supported())throw Error('Multiple sessions are not enabled for this salon yet.');
    if(form.dataset.seriesStep!=='review')throw Error('Review your selected dates before confirming bookings.');
    const request=selectedSeriesRequest(form);
    if(checkDates(request).some(check=>!check.free)){preview.checks=checkDates(preview.request);preview.selected=new Set([...preview.selected].filter(date=>preview.checks.some(check=>check.date===date&&check.free)));renderSeriesDates(form);throw Error('A date is no longer available. Review the dates and try again.');}
    pending=true;error(form,'');form.setAttribute('aria-busy','true');
    const controls=[...form.querySelectorAll('input,select,textarea,button')],disabled=controls.map(control=>control.disabled);controls.forEach(control=>{control.disabled=true;});
    try {
     const result=await api.createSeries(request);
     if(!sameOwner())return;
     if(!result?.ok)throw Error(result?.message||'The bookings could not be saved. No series was confirmed.');
     preview=null;if(form.isConnected){closeModal();render();}toast(result.message||'Your bookings were created.');
    } finally {if(sameOwner()){controls.forEach((control,index)=>{control.disabled=disabled[index];});form.removeAttribute('aria-busy');}pending=false;}
   } catch(caught) {if(!sameOwner())return;if(form.isConnected)error(form,caught.message||'Please check the details and try again.');else toast(caught.message||'Your bookings could not be saved.');}
  }
  function click(action,el) {
   if(action==='premium-compare-metric'){
    if(!premiumAllowed()||!insightsAllowed()){compareMetric='value';render();return true;}
    if(insightsSalonId!==salon().id){resetInsights();render();return true;}
    const value=el?.dataset?.metric;if(!['value','completed'].includes(value))return true;
    compareMetric=value;render();
    if(typeof document!=='undefined')document.querySelector(`[data-action="premium-compare-metric"][data-metric="${value}"]`)?.focus({preventScroll:true});
    return true;
   }
   if(action==='owner-series-back'){const form=el.closest('[data-form="owner-series"]');if(form&&!pending){error(form,'');form.dataset.seriesStep==='review'?renderSeriesDates(form):setSeriesStep(form,'details');}return true;}
   if(action==='owner-series-review'){const form=el.closest('[data-form="owner-series"]');if(form&&!pending&&form.dataset.seriesStep==='dates')reviewSeries(form);return true;}
   if(action==='owner-series-customer-mode'){const form=el.closest('[data-form="owner-series"]');if(!form||pending||!['existing','new'].includes(el.dataset.mode))return true;const existing=el.dataset.mode==='existing';if(existing&&!salon().customers.length)return true;form.dataset.customerMode=el.dataset.mode;form.querySelector('.ot-existing-customer').hidden=!existing;form.querySelector('.ot-new-customer').hidden=existing;form.querySelectorAll('[data-action="owner-series-customer-mode"]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===el.dataset.mode)));['customerId','name','email','phone','customerSearch'].forEach(name=>form.elements[name].value='');form.querySelectorAll('[data-action="owner-series-customer"]').forEach(button=>button.hidden=false);preview=null;error(form,'');return true;}
   if(action==='owner-series-customer'){const form=el.closest('[data-form="owner-series"]'),client=salon().customers.find(c=>c.id===el.dataset.id);if(!form||!client||pending)return true;form.elements.customerId.value=client.id;['name','email','phone'].forEach(name=>form.elements[name].value=client[name]||'');form.elements.customerSearch.value=client.name;form.querySelectorAll('[data-action="owner-series-customer"]').forEach(button=>button.hidden=button.dataset.id!==client.id);form.querySelector('.ot-new-customer').hidden=!!client.email;preview=null;error(form,'');return true;}
   if(action==='owner-series'){seriesModal();return true;}
   if(action==='owner-series-confirm'){const form=el.closest('[data-form="owner-series"]');if(form)void confirmSeries(form);return true;}
   return false;
  }
  function submit(type,form) {
   if(type==='owner-insights'){
    if(!insightsAllowed()){resetInsights();error(form,'Insights is included in Solo and Team.');render();return true;}
    if(insightsSalonId!==salon().id)resetInsights();
    try {const data=new FormData(form),preset=String(data.get('period')||'month'),range=preset==='custom'?{start:String(data.get('start')||''),end:String(data.get('end')||'')}:periodRange(preset);if(!validDate(range.start)||!validDate(range.end)||range.start>range.end||dateDifference(range.start,range.end)>365)throw Error('Choose a valid date range of up to one year.');const staff=String(data.get('staff')||'all');if(staff!=='all'&&!salon().staff.some(m=>m.id===staff))throw Error('Choose a team member from this salon.');filter={preset:['month','week','last30','custom'].includes(preset)?preset:'month',...range,staff};render();}catch(caught){error(form,caught.message);}return true;
   }
   if(type==='owner-series') {try {if(pending||form.dataset.seriesStep&&form.dataset.seriesStep!=='details')return true;if(!supported())throw Error('Multiple sessions are not enabled for this salon yet.');const request=readSeries(form);error(form,'');showPreview(form,request,checkDates(request));}catch(caught){preview=null;error(form,caught.message);}return true;}
   return false;
  }
  function change(el) {
   if(el.matches('[data-owner-period]')&&!insightsAllowed()){resetInsights();render();return true;}
   if(el.matches('[data-owner-period]')){const form=el.closest('form'),custom=el.value==='custom';form.querySelector('[data-owner-custom]').hidden=!custom;if(!custom){const range=periodRange(el.value);form.elements.start.value=range.start;form.elements.end.value=range.end;}return true;}
   const form=el.closest('[data-form="owner-series"]');if(!form)return false;
   if(el.name==='sessionDate'){if(preview&&form.dataset.seriesStep==='dates'&&preview.checks.some(check=>check.date===el.value&&check.free)){el.checked?preview.selected.add(el.value):preview.selected.delete(el.value);const selected=preview.request.dates.filter(date=>preview.selected.has(date)),summary=form.querySelector('.ot-series-summary');if(summary)summary.outerHTML=seriesSummary(preview.request,selected);const next=form.querySelector('[data-action="owner-series-review"]');if(next)next.disabled=selected.length<2;}return true;}
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
  if(typeof document!=='undefined')document.addEventListener('input',event=>{const el=event.target;if(!el.matches?.('[data-owner-customer-search]'))return;const form=el.closest('[data-form="owner-series"]');if(!form||pending||salon().id!==seriesSalonId)return;const query=el.value.trim().toLowerCase();['customerId','name','email','phone'].forEach(name=>form.elements[name].value='');let count=0;form.querySelectorAll('[data-action="owner-series-customer"]').forEach(button=>{button.hidden=!button.dataset.customerName.includes(query);if(!button.hidden)count++;});const empty=form.querySelector('.ot-series-customer-empty');if(empty)empty.hidden=count>0;preview=null;});
  return {routes:['insights'],pages:{insights},click,submit,change};
 }};
})();
