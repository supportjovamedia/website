/* Calendar presentation. Existing booking and availability rules stay in app.js. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const plus = (date,n) => { const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return key(d); };
  const minutes = t => Number(t.split(':')[0])*60+Number(t.split(':')[1]);
  const time = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  const names = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const safeColor = c => /^#[0-9a-f]{6}$/i.test(c||'') ? c : '#235789';
  const dayText = date => new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});

  function mini({date,today,offset=0,action='calendar-date',disabledBefore='',disabledAfter=''}) {
    const anchor=new Date(date+'T12:00:00');
    let first=new Date(anchor.getFullYear(),anchor.getMonth()+offset,1,12);
    const minimum=disabledBefore?new Date(disabledBefore.slice(0,7)+'-01T12:00:00'):null,maximum=disabledAfter?new Date(disabledAfter.slice(0,7)+'-01T12:00:00'):null;
    if(minimum&&first<minimum)first=minimum;if(maximum&&first>maximum)first=maximum;
    const previousBlocked=minimum&&first<=minimum,nextBlocked=maximum&&first>=maximum;
    const start=plus(key(first),-((first.getDay()+6)%7));
    const count=Math.ceil((((first.getDay()+6)%7)+new Date(first.getFullYear(),first.getMonth()+1,0).getDate())/7)*7;
    return `<div class="jb-mini"><div class="jb-mini-title"><b>${first.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</b><div><button type="button" data-action="${action==='public-date'?'public-month-prev':'mini-month-prev'}" aria-label="Previous month" ${previousBlocked?'disabled':''}>Prev</button><button type="button" data-action="${action==='public-date'?'public-month-next':'mini-month-next'}" aria-label="Next month" ${nextBlocked?'disabled':''}>Next</button></div></div><div class="jb-mini-grid">${names.map(n=>`<span class="jb-mini-label">${n[0]}</span>`).join('')}${Array.from({length:count},(_,i)=>{const d=plus(start,i),dt=new Date(d+'T12:00:00'),outside=dt.getMonth()!==first.getMonth();return `<button type="button" class="${outside?'is-out ':''}${d===today?'is-today ':''}${d===date?'is-selected':''}" data-action="${action}" data-date="${d}" aria-label="${esc(dayText(d))}" aria-pressed="${d===date}" ${(disabledBefore&&d<disabledBefore)||(disabledAfter&&d>disabledAfter)?'disabled':''}>${dt.getDate()}</button>`;}).join('')}</div></div>`;
  }

  // Divide overlapping bookings into lanes, including overlaps across staff.
  function layout(events) {
    const sorted=events.map(b=>({...b,_start:minutes(b.time),_end:minutes(b.time)+Number(b.duration)})).sort((a,b)=>a._start-b._start||b._end-a._end);
    let cluster=[],end=-1;
    const result=[];
    function finish() {
      if(!cluster.length)return;
      const lanes=[];
      cluster.forEach(b=>{let lane=lanes.findIndex(t=>t<=b._start);if(lane<0)lane=lanes.length;lanes[lane]=b._end;b._lane=lane;});
      cluster.forEach(b=>result.push({...b,_lanes:lanes.length}));cluster=[];
    }
    sorted.forEach(b=>{if(cluster.length&&b._start>=end){finish();end=-1;}cluster.push(b);end=Math.max(end,b._end);});finish();return result;
  }

  function week({salon:s,date,staff='all',today}) {
    const d=new Date(date+'T12:00:00'),monday=plus(date,-((d.getDay()+6)%7));
    const selected=staff==null||staff==='all'?null:Array.isArray(staff)?staff:[staff];
    const includes=id=>selected===null||selected.includes(id);
    const dates=Array.from({length:7},(_,i)=>plus(monday,i));
    const members=s.staff.filter(m=>includes(m.id)&&m.active!==false);
    const events=s.bookings.filter(b=>dates.includes(b.date)&&includes(b.staffId)&&b.status!=='cancelled');
    const allHours=members.flatMap(m=>dates.map(dt=>JovaSchedule.hoursFor(s,m,dt))).filter(h=>!h.closed);
    const start=Math.max(0,Math.min(8*60,...allHours.map(h=>minutes(h.start)),...events.map(b=>minutes(b.time))));
    const finish=Math.min(24*60,Math.max(18*60,...allHours.map(h=>minutes(h.end)),...events.map(b=>minutes(b.time)+Number(b.duration))));
    const from=Math.floor(start/60)*60,to=Math.ceil(finish/60)*60,unit=34,height=(to-from)/30*unit;
    const y=n=>(n-from)/30*unit;
    return `<div class="jb-week-scroll"><div class="jb-week" style="--jb-hours:${height}px"><div class="jb-week-heading"><span class="jb-timezone" title="${esc(window.JovaBusinessLocale?.resolve(s).timezone||'Europe/London')}">${esc(window.JovaBusinessLocale?.zoneLabel(s,date)||'GMT/BST')}</span>${dates.map(dt=>`<button type="button" class="${dt===today?'is-today':''}" data-action="cal-goto" data-date="${dt}" aria-label="Open ${esc(dayText(dt))}"><span>${names[(new Date(dt+'T12:00:00').getDay()+6)%7]}</span><b>${Number(dt.slice(-2))}</b></button>`).join('')}</div><div class="jb-week-body"><div class="jb-time-ruler">${Array.from({length:(to-from)/60},(_,i)=>`<span style="top:${i*68}px">${time(from+i*60)}</span>`).join('')}</div>${dates.map(dt=>{const dow=new Date(dt+'T12:00:00').getDay();return `<div class="jb-week-day ${dt===today?'is-today':''}">${Array.from({length:(to-from)/30},(_,i)=>{const t=from+i*30;const working=members.some(m=>{const h=JovaSchedule.hoursFor(s,m,dt);return !h.closed&&t>=minutes(h.start)&&t<minutes(h.end)&&(!window.JovaBusinessLocale||window.JovaBusinessLocale.uniqueSlot(s,dt,time(t),30));});return `<button type="button" class="jb-calendar-slot ${working?'':'is-closed'}" style="top:${i*unit}px" data-action="calendar-slot" data-date="${dt}" data-time="${time(t)}" aria-label="New booking ${esc(dayText(dt))} at ${time(t)}" ${!working||dt<today?'disabled':''}><span>+ ${time(t)}</span></button>`;}).join('')}${layout(events.filter(b=>b.date===dt)).map(b=>{const m=s.staff.find(x=>x.id===b.staffId);return `<button type="button" class="jb-grid-event ${b.status} ${b.duration<=30?'is-short':''}" style="--ev:${safeColor(m?.color)};${window.JovaBookingPalette?.style(b,s)||''};top:${y(b._start)}px;height:${Math.max(y(b._end)-y(b._start)-3,28)}px;left:calc(${b._lane/b._lanes*100}% + 3px);width:calc(${100/b._lanes}% - 6px)" data-action="booking-details" data-id="${esc(b.id)}" aria-label="${esc(b.name)}, ${esc(b.serviceName)}, ${b.time}, ${esc(m?.name||'Former staff')}"><strong>${esc(b.name)}</strong><small>${b.time}${b.duration<=30?'':' · '+esc(b.serviceName)}</small>${b.duration>=45?`<small>${esc(m?.name||'Former staff')}</small>`:''}</button>`;}).join('')}</div>`;}).join('')}</div></div></div>`;
  }
  function daySlots({salon:s,date,staff,from,to,hours,today}) {
    return Array.from({length:(to-from)/30},(_,i)=>{
      const start=from+i*30,working=staff.active!==false&&!hours.closed&&start>=minutes(hours.start)&&start<minutes(hours.end)&&(!window.JovaBusinessLocale||window.JovaBusinessLocale.uniqueSlot(s,date,time(start),30));
      return `<button type="button" class="jb-calendar-slot ${working?'':'is-closed'}" style="top:${i*34}px" data-action="calendar-slot" data-date="${date}" data-time="${time(start)}" data-staff="${esc(staff.id)}" aria-label="New booking ${esc(dayText(date))} at ${time(start)} with ${esc(staff.name)}" ${!working||date<today?'disabled':''}><span>+ ${time(start)}</span></button>`;
    }).join('');
  }
  const arrow='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg>';
  function selectedEvents(s,date,staff){const ids=staff==null||staff==='all'?null:Array.isArray(staff)?staff:[staff];return s.bookings.filter(b=>b.date===date&&b.status!=='cancelled'&&(ids===null||ids.includes(b.staffId))).slice().sort((a,b)=>a.time.localeCompare(b.time));}
  function dayStart({salon:s,date,staff=null}){
    const events=selectedEvents(s,date,staff),times=events.map(b=>minutes(b.time)).filter(Number.isFinite);
    if(times.length)return Math.max(0,Math.min(...times)-60);
    const ids=staff==null||staff==='all'?null:Array.isArray(staff)?staff:[staff],opening=s.staff.filter(m=>ids===null||ids.includes(m.id)).map(m=>JovaSchedule.hoursFor(s,m,date)).filter(h=>!h.closed).map(h=>minutes(h.start)).filter(Number.isFinite);
    return opening.length?Math.min(...opening):480;
  }
  function dayViewport({salon:s,date,staff=null,unit=68}){const ids=staff==null||staff==='all'?'all':(Array.isArray(staff)?[...staff]:[staff]).sort().join(',');return `data-jg-day-key="${esc((s.id||'business')+'|'+date+'|'+ids)}" data-jg-day-minute="${dayStart({salon:s,date,staff})}" data-jg-day-unit="${unit}"`;}
  function weekList({salon:s,date,staff=null,today}){
    const monday=plus(date,-((new Date(date+'T12:00:00').getDay()+6)%7));
    return `<div class="jg-calendar-mobile-week">${Array.from({length:7},(_,i)=>{const dt=plus(monday,i),items=selectedEvents(s,dt,staff);return `<button type="button" class="jg-calendar-week-row ${dt===today?'is-today':''}" data-action="cal-goto" data-date="${dt}"><span class="jg-calendar-week-date"><strong>${names[i]}</strong><span>${new Date(dt+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span></span><span class="jg-calendar-week-summary"><strong>${items.length?`${items.length} booking${items.length===1?'':'s'}`:'No bookings'}</strong>${items.length?`<small>${items.map(b=>`${esc(b.time)} to ${esc(time(minutes(b.time)+Number(b.duration)))}`).join(', ')}</small>`:''}</span>${arrow}</button>`;}).join('')}</div>`;
  }
  function agendaCards(s,items){return items.map(b=>{const m=s.staff.find(x=>x.id===b.staffId);return `<button type="button" class="jg-calendar-agenda-event" data-action="booking-details" data-id="${esc(b.id)}" style="--ev:${safeColor(m?.color)};${window.JovaBookingPalette?.style(b,s)||''}"><span><strong>${esc(b.serviceName)}</strong><small>${esc(b.time)} to ${esc(time(minutes(b.time)+Number(b.duration)))} · ${esc(b.name)}</small></span>${arrow}</button>`;}).join('');}
  function dayAgenda({salon:s,date,staff=null}){const items=selectedEvents(s,date,staff);return `<section class="jg-calendar-month-agenda"><h2><span>${esc(dayText(date))}</span><span>${items.length} booking${items.length===1?'':'s'}</span></h2>${items.length?agendaCards(s,items):'<p>No bookings on this day.</p>'}</section>`;}
  function dayMobile({salon:s,date,staff=null,today}){
    const ids=staff==null||staff==='all'?null:Array.isArray(staff)?staff:[staff],members=s.staff.filter(m=>(ids===null||ids.includes(m.id))&&m.active!==false),events=selectedEvents(s,date,staff);
    const from=0,to=24*60,unit=78,y=n=>n/60*unit;
    return `<div class="jg-calendar-mobile-day" ${dayViewport({salon:s,date,staff,unit})} style="--jg-hour:78px"><div class="jg-calendar-day-times">${Array.from({length:25},(_,i)=>`<span class="${i===24?'jg-day-end':''}" style="top:${i*unit}px">${time(i*60)}</span>`).join('')}</div><div class="jg-calendar-day-track" style="height:${y(to)}px">${Array.from({length:(to-from)/30},(_,i)=>{const t=from+i*30,working=members.some(m=>{const h=JovaSchedule.hoursFor(s,m,date);return !h.closed&&t>=minutes(h.start)&&t<minutes(h.end)&&(!window.JovaBusinessLocale||window.JovaBusinessLocale.uniqueSlot(s,date,time(t),30));});return `<button type="button" class="jg-calendar-mobile-slot ${working?'':'is-closed'}" style="top:${i*unit/2}px" data-action="calendar-slot" data-date="${date}" data-time="${time(t)}" aria-label="New booking at ${time(t)}" ${!working||date<today?'disabled':''}></button>`;}).join('')}${layout(events).map(b=>{const m=s.staff.find(x=>x.id===b.staffId);return `<button type="button" class="jg-calendar-mobile-event" data-action="booking-details" data-id="${esc(b.id)}" style="--ev:${safeColor(m?.color)};${window.JovaBookingPalette?.style(b,s)||''};top:${y(b._start)+3}px;height:${Math.max(y(b._end)-y(b._start)-6,32)}px;left:calc(${b._lane/b._lanes*100}% + 5px);width:calc(${100/b._lanes}% - 10px)" aria-label="${esc(b.serviceName)}, ${esc(b.name)}, ${esc(b.time)}"><span><strong>${esc(b.serviceName)}</strong><small>${esc(b.name)} · ${esc(b.time)} to ${esc(time(b._end))}</small></span>${arrow}</button>`;}).join('')}</div></div>`;
  }
  // Keep a manual scroll during the same Day, then anchor fresh dates at their first booking.
  if(typeof document!=='undefined'&&typeof MutationObserver!=='undefined'){
    const positions=new Map();let frame=0,activeKey='';
    const remember=event=>{const el=event.target;if(el?.dataset?.jgDayKey&&el.clientHeight&&el.scrollHeight>el.clientHeight)positions.set(el.dataset.jgDayKey,{minute:el.scrollTop/Number(el.dataset.jgDayUnit)*60,left:el.scrollLeft});};
    const restore=()=>{frame=0;const el=[...document.querySelectorAll('.db-calendar-page [data-jg-day-key]')].find(node=>node.getClientRects().length&&node.clientHeight);if(!el){activeKey='';return;}const nextKey=el.dataset.jgDayKey,previous=activeKey===nextKey?positions.get(nextKey):null,minute=previous?.minute??Number(el.dataset.jgDayMinute);activeKey=nextKey;el.scrollTop=Math.max(0,minute/60*Number(el.dataset.jgDayUnit));el.scrollLeft=previous?.left||0;};
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(restore);};
    document.addEventListener('scroll',remember,{capture:true,passive:true});
    const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true});
    window.addEventListener('resize',schedule,{passive:true});schedule();
  }
  window.JovaCalendar={mini,week,daySlots,weekList,dayAgenda,dayMobile,dayStart,dayViewport};
})();
