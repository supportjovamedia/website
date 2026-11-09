/* Shared staged date selection for Dashboard totals and Calendar periods. */
(() => {
 'use strict';
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 11h16"/></svg>';
 const chevron='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
 const arrow=direction=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="'+(direction<0?'m14 5-7 7 7 7':'m10 5 7 7-7 7')+'"/></svg>';
 const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const parse=value=>new Date(value+'T12:00:00Z');
 const key=date=>date.toISOString().split('T')[0];
 const plus=(value,days)=>{const date=parse(value);date.setUTCDate(date.getUTCDate()+days);return key(date);};
 const format=(value,options)=>parse(value).toLocaleDateString('en-GB',{...options,timeZone:'UTC'});
 const period=(anchor,view)=>window.JovaDashboard.range(anchor,view);
 function rangeLabel(anchor,view,year=true){
  const selected=period(anchor,view),start=selected.start,end=selected.end;
  if(start===end)return format(start,{day:'numeric',month:'short',...(year?{year:'numeric'}:{})});
  return format(start,{day:'numeric',month:'short',...(year&&start.slice(0,4)!==end.slice(0,4)?{year:'numeric'}:{})})+' to '+format(end,{day:'numeric',month:'short',...(year?{year:'numeric'}:{})});
 }
 function presets(today,view){
  const base=period(today,view).start,shift=direction=>window.JovaDashboard.shift(base,view,direction);
  const labels=view==='day'?['Today','Tomorrow','Yesterday']:view==='week'?['This week','Next week','Last week']:['This month','Next month','Last month'];
  return [[labels[0],base],[labels[1],shift(1)],[labels[2],shift(-1)]];
 }
 function createState({anchor,view,today}){
  const start=period(anchor,view).start;
  return {anchor:start,selection:start,view,today,month:anchor.slice(0,7),custom:!presets(today,view).some(([,date])=>date===start),choosingMonth:false,focusDate:anchor};
 }
 function choose(state,date){state.selection=period(date,state.view).start;state.focusDate=date;return state;}
 function shiftMonth(state,direction){
  const date=parse(state.month+'-01');date.setUTCMonth(date.getUTCMonth()+direction);const value=key(date);if(/^\d{4}-/.test(value)&&value.slice(0,4)!=='0000'){state.month=value.slice(0,7);state.focusDate=state.month+'-01';}return state;
 }
 function calendar(state){
  const first=state.month+'-01',start=plus(first,-((parse(first).getUTCDay()+6)%7)),selected=state.selection?period(state.selection,state.view):null;
  const monthLabel=format(first,{month:'long',year:'numeric'}),year=Number(state.month.slice(0,4));
  return `<div class="jg-date-custom-panel"><div class="jg-date-month-nav"><button type="button" data-date-picker="month-prev" aria-label="Previous month">${arrow(-1)}</button><button type="button" class="jg-date-month-title" data-date-picker="month-chooser" aria-expanded="${state.choosingMonth}">${escape(monthLabel)}${chevron}</button><button type="button" data-date-picker="month-next" aria-label="Next month">${arrow(1)}</button></div>${state.choosingMonth?`<div class="jg-date-month-fields"><label>Month<select data-date-picker="month-select" aria-label="Calendar month">${Array.from({length:12},(_,index)=>{const value=String(index+1).padStart(2,'0');return `<option value="${value}" ${value===state.month.slice(5)?'selected':''}>${escape(format('2026-'+value+'-01',{month:'long'}))}</option>`;}).join('')}</select></label><label>Year<input type="number" data-date-picker="year-select" aria-label="Calendar year" min="1" max="9999" value="${year}"></label></div>`:''}<div class="jg-date-weekdays" aria-hidden="true">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=>'<span>'+day+'</span>').join('')}</div><div class="jg-date-grid" role="group" aria-label="Choose ${state.view==='day'?'a date':state.view==='week'?'a week':'a month'}">${Array.from({length:42},(_,index)=>{const date=plus(start,index);if(!/^\d{4}-/.test(date)||date.slice(0,4)==='0000')return '<span aria-hidden="true"></span>';const inside=selected&&date>=selected.start&&date<=selected.end,edge=selected&&(date===selected.start||date===selected.end),classes=[date.slice(0,7)!==state.month?'is-outside':'',inside?'is-in-range':'',edge?'is-range-edge':'',selected&&date===selected.start?'is-range-start':'',selected&&date===selected.end?'is-range-end':''];return `<button type="button" data-date-picker="day" data-date="${date}" class="${classes.filter(Boolean).join(' ')}" aria-label="${escape(format(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}" aria-pressed="${!!inside}" tabindex="${date===state.focusDate?0:-1}" ${date===state.today?'aria-current="date"':''}>${Number(date.slice(-2))}</button>`;}).join('')}</div><p class="jg-date-selection-hint">${state.view==='week'?'Choose any date to select its full week.':state.view==='month'?'Choose any date to select its full month.':'Choose the date you want to view.'}</p></div>`;
 }
 function menu(state){
  return `<div class="jg-date-presets">${presets(state.today,state.view).map(([label,date])=>`<button type="button" data-date-picker="preset" data-date="${date}" aria-pressed="${!state.custom&&date===state.selection}">${icon}<span>${label}</span><time>${escape(rangeLabel(date,state.view,false))}</time></button>`).join('')}<button type="button" data-date-picker="custom" aria-expanded="${state.custom}" aria-pressed="${state.custom}">${icon}<span>Custom dates</span>${state.custom?'<span class="jg-date-check" aria-hidden="true">✓</span>':chevron}</button></div>${state.custom?calendar(state):''}<div class="jg-date-footer"><span class="jg-date-staged" role="status" aria-live="polite">${icon}<span>${state.selection?escape(rangeLabel(state.selection,state.view)):'Select '+(state.view==='week'?'a week':state.view==='month'?'a month':'a date')}</span></span><button type="button" data-date-picker="clear">Clear</button><button type="button" class="jg-date-apply" data-date-picker="apply" ${!state.selection?'disabled':''}>Apply</button></div>`;
 }
 function markup({anchor,view,today,context='dashboard'}){
  const state=createState({anchor,view,today}),label=presets(today,view).find(([,date])=>date===state.anchor)?.[0]||'Custom dates';
  return `<details class="jg-dashboard-date jg-period-picker" data-picker-anchor="${state.anchor}" data-picker-view="${view}" data-picker-today="${today}" data-picker-context="${context}"><summary aria-label="Choose ${context} date">${icon}<span class="jg-date-summary-copy"><strong>${escape(label)}</strong><small>${escape(rangeLabel(state.anchor,view))}</small></span>${chevron}</summary><div class="jg-dashboard-date-menu jg-date-menu" aria-label="Date selection">${menu(state)}</div></details>`;
 }
 window.JovaDatePicker={rangeLabel,presets,createState,choose,shiftMonth,menu,markup};
 if(typeof document==='undefined')return;
 const drafts=new WeakMap();
 function stateFor(picker){let state=drafts.get(picker);if(!state){state=createState({anchor:picker.dataset.pickerAnchor,view:picker.dataset.pickerView,today:picker.dataset.pickerToday});drafts.set(picker,state);}return state;}
 function size(picker){const bottom=picker.querySelector('summary').getBoundingClientRect().bottom;picker.style.setProperty('--jg-picker-available',Math.max(220,window.innerHeight-bottom-86)+'px');}
 function draw(picker,focusSelector){picker.querySelector('.jg-date-menu').innerHTML=menu(stateFor(picker));size(picker);if(focusSelector)picker.querySelector(focusSelector)?.focus({preventScroll:true});}
 function close(picker,focus=false){picker.open=false;drafts.delete(picker);if(focus)picker.querySelector('summary')?.focus({preventScroll:true});}
 document.addEventListener('toggle',event=>{const picker=event.target;if(!picker.matches?.('.jg-period-picker'))return;if(picker.open){drafts.delete(picker);draw(picker);}else drafts.delete(picker);},true);
 document.addEventListener('pointerdown',event=>{document.querySelectorAll('.jg-period-picker[open]').forEach(picker=>{const popup=event.target.closest?.('.jws-popover'),ownedPopup=popup&&picker.querySelector('[aria-controls="'+popup.id+'"]');if(!picker.contains(event.target)&&!ownedPopup)close(picker);});});
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-date-picker]'),picker=button?.closest('.jg-period-picker');if(!picker||button.tagName!=='BUTTON')return;
  event.preventDefault();const action=button.dataset.datePicker,state=stateFor(picker);
  if(action==='apply'){if(!state.selection)return;const detail={anchor:state.selection,view:state.view,context:picker.dataset.pickerContext};close(picker);document.dispatchEvent(new CustomEvent('jovabook-date-apply',{detail}));return;}
  if(action==='clear'){state.selection=null;state.custom=true;draw(picker,'[data-date-picker="clear"]');return;}
  if(action==='preset'){choose(state,button.dataset.date);state.custom=false;state.month=state.selection.slice(0,7);draw(picker,'[data-date-picker="preset"][data-date="'+button.dataset.date+'"]');return;}
  if(action==='custom'){state.custom=true;draw(picker,'.jg-date-month-title');return;}
  if(action==='month-chooser'){state.choosingMonth=!state.choosingMonth;draw(picker,state.choosingMonth?'[data-date-picker="month-select"]':'.jg-date-month-title');return;}
  if(action==='month-prev'||action==='month-next'){shiftMonth(state,action==='month-prev'?-1:1);draw(picker,'[data-date-picker="'+action+'"]');return;}
  if(action==='day'){choose(state,button.dataset.date);draw(picker,'[data-date-picker="day"][data-date="'+button.dataset.date+'"]');}
 });
 document.addEventListener('change',event=>{
  const field=event.target,picker=field.closest?.('.jg-period-picker');if(!picker)return;const state=stateFor(picker);
  if(field.dataset.datePicker==='month-select'){state.month=state.month.slice(0,5)+field.value;state.focusDate=state.month+'-01';draw(picker,'[data-date-picker="month-select"]');}
  if(field.dataset.datePicker==='year-select'){const year=Number(field.value);if(Number.isInteger(year)&&year>=1&&year<=9999){state.month=String(year).padStart(4,'0')+state.month.slice(4);state.focusDate=state.month+'-01';draw(picker,'[data-date-picker="year-select"]');}}
 });
 document.addEventListener('keydown',event=>{
  const picker=event.target.closest?.('.jg-period-picker[open]');if(!picker)return;
  if(event.key==='Escape'){if(document.querySelector?.('.jws-popover:popover-open'))return;event.preventDefault();event.stopImmediatePropagation();close(picker,true);return;}
  const button=event.target.closest('[data-date-picker="day"]');if(!button)return;
  const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};if(!(event.key in offsets))return;event.preventDefault();const state=stateFor(picker),date=plus(button.dataset.date,offsets[event.key]);state.month=date.slice(0,7);state.focusDate=date;draw(picker,'[data-date-picker="day"][data-date="'+date+'"]');
 },true);
 window.addEventListener('resize',()=>document.querySelectorAll('.jg-period-picker[open]').forEach(size),{passive:true});
})();
