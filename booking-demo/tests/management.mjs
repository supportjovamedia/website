import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const sources=await Promise.all(['scheduling-core.js','management.js'].map(file=>readFile(new URL('../'+file,import.meta.url),'utf8')));
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function fixture(){
 const hours={start:'09:00',end:'17:00',days:[1,2,3,4,5],weekly:{'2':{closed:true,start:'09:00',end:'17:00'}}};
 return {id:'salon-a',hours,staff:[{id:'a',name:'Sam Taylor',role:'Stylist',active:true,hours:null},{id:'b',name:'Alex Brown',role:'Nail technician',active:false,hours:{start:'18:00',end:'20:00',days:[1]}},{id:'c',name:'River Lee',role:'Colour specialist',active:true,hours:{start:'10:00',end:'16:00',days:[1,2]}}],services:[{name:'Haircut',staffIds:['a']},{name:'Colour',staffIds:['a','c']}],bookings:[{staffId:'a',date:'2026-11-01',status:'confirmed'},{staffId:'a',date:'2026-10-31',status:'confirmed'},{staffId:'a',date:'2026-10-30',status:'confirmed'},{staffId:'a',date:'2026-11-01',status:'cancelled'},{staffId:'a',date:'2026-11-01',status:'completed'}]};
}
function setup({live=false,allowed=true,plan={name:'Standard',staffLimit:5}}={}){
 const context={window:{}};sources.forEach(source=>vm.runInNewContext(source,context));let current=fixture(),renders=0,guardCalls=0;
 const api={salon:()=>current,esc:escape,today:()=> '2026-10-31',render:()=>{renders++;},isLive:()=>live,planFor:()=>plan,canAddStaff:()=>{guardCalls++;return allowed;}};
 const module=context.window.JovaManagement.create(api);
 return {module,get salon(){return current;},setSalon:value=>{current=value;},get renders(){return renders;},get guardCalls(){return guardCalls;}};
}
const row=(html,id)=>html.match(new RegExp('<tr data-mg-staff="'+id+'">([\\s\\S]*?)</tr>'))?.[1]||'';
test('staff table uses actual services, upcoming bookings, initials and host CRUD actions',()=>{
 const s=setup(),before=structuredClone(s.salon),html=s.module.pages.staff(),a=row(html,'a');
 assert(html.includes('Staff <span class="mg-count">3</span>'));assert(a.includes('ST</span>'));assert(a.includes('Haircut, Colour'));assert(a.includes('>2</span>'));
 for(const action of ['edit-staff','staff-calendar','delete-staff'])assert(a.includes(`data-action="${action}" data-id="a"`));
 assert(a.includes('href="#availability?staff=a"'));assert(!html.includes('<img'));assert(!html.includes('mailto:'));assert(!html.includes('tel:'));
 assert(html.includes('Not bookable'));assert.deepEqual(s.salon,before);assert.equal(s.guardCalls,1);
});
test('working-day chips reflect daily closure and the intersection of business and staff hours',()=>{
 const s=setup(),html=s.module.pages.staff();
 const inherited=row(html,'a');assert(inherited.includes('Monday: 09:00 to 17:00'));assert(inherited.includes('Tuesday: Closed'));
 const custom=row(html,'c');assert(custom.includes('Monday: 10:00 to 16:00'));assert(custom.includes('Tuesday: Closed'));assert.equal((custom.match(/class="mg-day mg-day-open"/g)||[]).length,1);
 assert.equal((row(html,'b').match(/class="mg-day mg-day-open"/g)||[]).length,0,'Non-overlapping hours stay closed');
});
test('search and status filters combine, accept inactive staff and do not create writes',()=>{
 const s=setup();s.module.pages.staff();
 assert.equal(s.module.submit('unrelated',{},{}),false);
 s.module.submit('mg-staff-filter',{}, {q:'NAIL',status:'inactive'});
 let html=s.module.pages.staff();assert(row(html,'b'));assert(!row(html,'a'));assert(!row(html,'c'));assert(html.includes('Showing 1 of 3'));
 s.module.submit('mg-staff-filter',{}, {q:'not-a-person',status:'all'});assert(s.module.pages.staff().includes('No matching staff'));
 assert.equal(s.module.click('mg-clear-staff'),true);assert(s.module.pages.staff().includes('Showing 3 of 3'));
 const el={dataset:{change:'mg-staff-status'},value:'active',closest:()=>({elements:{q:{value:'River'}}})};
 assert.equal(s.module.change(el),true);html=s.module.pages.staff();assert(row(html,'c'));assert(!row(html,'a'));assert(!row(html,'b'));
 const details={open:true};assert.equal(s.module.click('edit-staff',{closest:()=>details}),false,'Host still handles the actual edit');assert.equal(details.open,false);
});
test('capacity and missing-server guards disable adding staff without hiding existing rows',()=>{
 const s=setup({live:true,allowed:false,plan:{name:'Essential',staffLimit:1}}),html=s.module.pages.staff();
 assert(html.includes('data-action="add-staff" disabled'));assert(html.includes('All existing staff records have been kept'));assert(html.includes('Adding staff needs a booking system update'));assert(row(html,'b'));
 s.salon.capabilities={version:1};assert(!s.module.pages.staff().includes('Adding staff needs a booking system update'));
 const ordinary=setup({allowed:false,plan:{name:'Standard',staffLimit:3}}),full=ordinary.module.pages.staff();
 assert(full.includes('data-action="add-staff" disabled'));assert(full.includes('title="Standard includes 3 staff members."'));
 assert(!full.includes('class="mg-notice"'),'Normal full capacity does not add a persistent warning');
 for(const id of ['a','b','c'])assert(row(full,id),'Full capacity preserves existing staff management');
});
test('tenant changes reset filters and untrusted names remain escaped',()=>{
 const s=setup();s.module.pages.staff();s.module.submit('mg-staff-filter',{}, {q:'Sam',status:'active'});
 const next=fixture();next.id='salon-b';next.staff[0].name='<img src=x onerror=alert(1)>';s.setSalon(next);
 const html=s.module.pages.staff();assert(html.includes('Showing 3 of 3'));assert(html.includes('&lt;img src=x onerror=alert(1)&gt;'));assert(!html.includes('<img src=x'));
});
