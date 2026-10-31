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

  function mini({date,today,offset=0,action='calendar-date',disabledBefore=''}) {
    const anchor=new Date(date+'T12:00:00');
    const first=new Date(anchor.getFullYear(),anchor.getMonth()+offset,1,12);
    const start=plus(key(first),-((first.getDay()+6)%7));
    const count=Math.ceil((((first.getDay()+6)%7)+new Date(first.getFullYear(),first.getMonth()+1,0).getDate())/7)*7;
    return `<div class="jb-mini"><div class="jb-mini-title"><b>${first.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</b><div><button type="button" data-action="${action==='public-date'?'public-month-prev':'mini-month-prev'}" aria-label="Previous month">Prev</button><button type="button" data-action="${action==='public-date'?'public-month-next':'mini-month-next'}" aria-label="Next month">Next</button></div></div><div class="jb-mini-grid">${names.map(n=>`<span class="jb-mini-label">${n[0]}</span>`).join('')}${Array.from({length:count},(_,i)=>{const d=plus(start,i),dt=new Date(d+'T12:00:00'),outside=dt.getMonth()!==first.getMonth();return `<button type="button" class="${outside?'is-out ':''}${d===today?'is-today ':''}${d===date?'is-selected':''}" data-action="${action}" data-date="${d}" aria-label="${esc(dayText(d))}" aria-pressed="${d===date}" ${disabledBefore&&d<disabledBefore?'disabled':''}>${dt.getDate()}</button>`;}).join('')}</div></div>`;
  }

  // Divide overlapping appointments into lanes, including overlaps across staff.
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
    return `<div class="jb-week-scroll"><div class="jb-week" style="--jb-hours:${height}px"><div class="jb-week-heading"><span class="jb-timezone">GMT/BST</span>${dates.map(dt=>`<button type="button" class="${dt===today?'is-today':''}" data-action="cal-goto" data-date="${dt}" aria-label="Open ${esc(dayText(dt))}"><span>${names[(new Date(dt+'T12:00:00').getDay()+6)%7]}</span><b>${Number(dt.slice(-2))}</b></button>`).join('')}</div><div class="jb-week-body"><div class="jb-time-ruler">${Array.from({length:(to-from)/60},(_,i)=>`<span style="top:${i*68}px">${time(from+i*60)}</span>`).join('')}</div>${dates.map(dt=>{const dow=new Date(dt+'T12:00:00').getDay();return `<div class="jb-week-day ${dt===today?'is-today':''}">${Array.from({length:(to-from)/30},(_,i)=>{const t=from+i*30;const working=members.some(m=>{const h=JovaSchedule.hoursFor(s,m,dt);return !h.closed&&t>=minutes(h.start)&&t<minutes(h.end);});return `<button type="button" class="jb-calendar-slot ${working?'':'is-closed'}" style="top:${i*unit}px" data-action="calendar-slot" data-date="${dt}" data-time="${time(t)}" aria-label="New appointment ${esc(dayText(dt))} at ${time(t)}" ${!working||dt<today?'disabled':''}><span>+ ${time(t)}</span></button>`;}).join('')}${layout(events.filter(b=>b.date===dt)).map(b=>{const m=s.staff.find(x=>x.id===b.staffId);return `<button type="button" class="jb-grid-event ${b.status} ${b.duration<=30?'is-short':''}" style="--ev:${safeColor(m?.color)};top:${y(b._start)}px;height:${Math.max(y(b._end)-y(b._start)-3,28)}px;left:calc(${b._lane/b._lanes*100}% + 3px);width:calc(${100/b._lanes}% - 6px)" data-action="booking-details" data-id="${esc(b.id)}" aria-label="${esc(b.name)}, ${esc(b.serviceName)}, ${b.time}, ${esc(m?.name||'Former staff')}"><strong>${esc(b.name)}</strong><small>${b.time}${b.duration<=30?'':' · '+esc(b.serviceName)}</small>${b.duration>=45?`<small>${esc(m?.name||'Former staff')}</small>`:''}</button>`;}).join('')}</div>`;}).join('')}</div></div></div>`;
  }
  window.JovaCalendar={mini,week};
})();
