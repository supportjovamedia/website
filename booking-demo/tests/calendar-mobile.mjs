import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const context={window:{},Date,Intl};
vm.runInNewContext(await readFile(new URL('../scheduling-core.js',import.meta.url),'utf8'),context);
context.JovaSchedule=context.window.JovaSchedule;
vm.runInNewContext(await readFile(new URL('../calendar-workspace.js',import.meta.url),'utf8'),context);
const calendar=context.window.JovaCalendar;
const salon={hours:{start:'09:00',end:'18:00',days:[1,2,3,4,5]},staff:[{id:'a',name:'Alice',active:true,color:'#663399'},{id:'b',name:'Ben',active:true,color:'#006633'}],bookings:[
 {id:'one',staffId:'a',date:'2026-11-09',time:'09:00',duration:60,name:'A <Client>',serviceName:'Cut & style',status:'confirmed'},
 {id:'two',staffId:'b',date:'2026-11-09',time:'09:30',duration:30,name:'B',serviceName:'Trim',status:'completed'},
 {id:'cancel',staffId:'a',date:'2026-11-09',time:'12:00',duration:30,name:'Cancelled',serviceName:'Hidden',status:'cancelled'},
 {id:'next',staffId:'a',date:'2026-11-16',time:'10:00',duration:30,name:'Next week',serviceName:'Trim',status:'confirmed'}
]};

test('phone week shows exactly seven dates, actual counts and filtered appointment times',()=>{
 const html=calendar.weekList({salon,date:'2026-11-11',staff:['a'],today:'2026-11-09'});
 assert.equal((html.match(/class="jg-calendar-week-row /g)||[]).length,7);
 assert.match(html,/data-date="2026-11-09"/);assert.match(html,/data-date="2026-11-15"/);
 assert.match(html,/1 booking/);assert.match(html,/09:00 to 10:00/);
 assert.doesNotMatch(html,/09:30|12:00|2026-11-16/);
});
test('phone day keeps real detail actions, escapes text and shares overlapping appointments into lanes',()=>{
 const before=JSON.stringify(salon),html=calendar.dayMobile({salon,date:'2026-11-09',staff:null,today:'2026-11-09'});
 assert.match(html,/data-action="booking-details" data-id="one"/);
 assert.match(html,/Cut &amp; style/);assert.match(html,/A &lt;Client&gt;/);
 assert.match(html,/width:calc\(50% - 10px\)/);
 assert.doesNotMatch(html,/data-id="cancel"|data-id="next"/);
 assert.match(html,/data-action="calendar-slot" data-date="2026-11-09" data-time="09:00"/);
 assert.equal(JSON.stringify(salon),before);
});
test('month selected-day agenda respects staff and excludes cancelled appointments',()=>{
 const html=calendar.dayAgenda({salon,date:'2026-11-09',staff:['b']});
 assert.match(html,/1 booking/);assert.match(html,/data-id="two"/);
 assert.doesNotMatch(html,/data-id="one"|data-id="cancel"/);
 assert.match(calendar.dayAgenda({salon,date:'2026-11-10',staff:null}),/No bookings on this day/);
});
const mobileSlot=(html,time)=>html.match(new RegExp('<button[^>]*class="jg-calendar-mobile-slot[^>]*data-time="'+time+'"[^>]*>'))?.[0];
test('Day spans midnight through 24:00 and closed hours stay disabled around actual bookings',()=>{
 const s=structuredClone(salon);s.staff[0].hours={start:'10:00',end:'16:00',days:[1]};
 const html=calendar.dayMobile({salon:s,date:'2026-11-09',staff:['a'],today:'2026-11-09'});
 assert.match(html,/>00:00<\/span>/);assert.match(html,/>24:00<\/span>/);
 assert.equal((html.match(/class="jg-calendar-mobile-slot/g)||[]).length,48);
 for(const t of ['00:00','09:00','16:00','23:30']){assert.match(mobileSlot(html,t),/is-closed/);assert.match(mobileSlot(html,t),/ disabled/);}
 assert.doesNotMatch(mobileSlot(html,'10:00'),/is-closed| disabled/);
 assert.match(html,/data-action="booking-details" data-id="one"/);
 const member=s.staff[0],hours=context.JovaSchedule.hoursFor(s,member,'2026-11-09');
 const desktop=calendar.daySlots({salon:s,date:'2026-11-09',staff:member,from:0,to:1440,hours,today:'2026-11-09'});
 assert.equal((desktop.match(/class="jb-calendar-slot/g)||[]).length,48);
 assert.match(desktop,/<button[^>]*is-closed[^>]*data-time="09:00"[^>]* disabled/);
 assert.match(desktop,/<button[^>]*class="jb-calendar-slot "[^>]*data-time="10:00"[^>]*aria-label[^>]*>/);
});
test('closed days and unsupported overnight hours never create bookable Day slots',()=>{
 for(const [date,hours] of [['2026-11-15',salon.hours],['2026-11-09',{start:'22:00',end:'06:00',days:[1]}]]){
  const s={...salon,hours},html=calendar.dayMobile({salon:s,date,staff:['a'],today:'2026-11-09'});
  const slots=[...html.matchAll(/<button[^>]*class="jg-calendar-mobile-slot[^>]*>/g)].map(m=>m[0]);
  assert.equal(slots.length,48);assert(slots.every(slot=>slot.includes('is-closed')&&slot.includes(' disabled')));
 }
});
test('Day opens one hour above the first actual filtered booking, with sensible empty-date defaults',()=>{
 assert.equal(calendar.dayStart({salon,date:'2026-11-09',staff:null}),480);
 assert.equal(calendar.dayStart({salon,date:'2026-11-09',staff:['b']}),510);
 assert.equal(calendar.dayStart({salon,date:'2026-11-10',staff:['a']}),540);
 assert.equal(calendar.dayStart({salon,date:'2026-11-15',staff:null}),480);
 const early={...salon,bookings:[{...salon.bookings[0],time:'00:30'}]};
 assert.equal(calendar.dayStart({salon:early,date:'2026-11-09',staff:['a']}),0);
 const late={...salon,bookings:[{...salon.bookings[0],time:'23:30',duration:30}]};
 assert.equal(calendar.dayStart({salon:late,date:'2026-11-09',staff:['a']}),1350);
 const lateHtml=calendar.dayMobile({salon:late,date:'2026-11-09',staff:['a'],today:'2026-11-09'});
 assert.match(lateHtml,/>00:00<\/span>/);assert.match(lateHtml,/>24:00<\/span>/);
 assert.match(lateHtml,/data-jg-day-minute="1350"/);assert.match(lateHtml,/23:30 to 24:00/);
 const a=calendar.dayViewport({salon:{...salon,id:'one'},date:'2026-11-09',staff:['b','a']}),b=calendar.dayViewport({salon:{...salon,id:'one'},date:'2026-11-09',staff:['a','b']});
 assert.equal(a,b);assert.match(a,/data-jg-day-key="one\|2026-11-09\|a,b"/);
});
test('Day initial scroll preserves user position on rerender and ignores unrelated pages',async()=>{
 let frame,changed,scrolled;
 const viewport=(key,minute)=>({dataset:{jgDayKey:key,jgDayMinute:String(minute),jgDayUnit:'68'},clientHeight:400,scrollHeight:1700,scrollTop:0,scrollLeft:0,getClientRects:()=>[{}]});
 let visible=viewport('one|2026-11-09|all',480);
 const doc={querySelectorAll:()=>visible?[visible]:[],getElementById:()=>({}),addEventListener:(name,fn)=>{if(name==='scroll')scrolled=fn;}};
 const env={window:{addEventListener:()=>{}},document:doc,Date,Intl,MutationObserver:class{constructor(fn){changed=fn;}observe(){}},requestAnimationFrame:fn=>{frame=fn;return 1;}};
 vm.runInNewContext(await readFile(new URL('../calendar-workspace.js',import.meta.url),'utf8'),env);
 frame();assert.equal(visible.scrollTop,544);
 visible.scrollTop=710;scrolled({target:visible});visible=viewport('one|2026-11-09|all',480);changed();frame();assert.equal(visible.scrollTop,710);
 visible=viewport('one|2026-11-10|all',540);changed();frame();assert.equal(visible.scrollTop,612);
 visible=viewport('one|2026-11-09|all',480);changed();frame();assert.equal(visible.scrollTop,544,'Returning to a Day starts at its first booking, not its old scroll position');
 visible.scrollTop=0;scrolled({target:visible});visible=viewport('one|2026-11-09|all',480);changed();frame();assert.equal(visible.scrollTop,0,'The user may scroll up to midnight and keep it during same-day updates');
 visible=null;changed();assert.doesNotThrow(()=>frame());
 visible=viewport('one|2026-11-09|all',480);changed();frame();assert.equal(visible.scrollTop,544,'Reopening Calendar anchors the first booking again');
});
