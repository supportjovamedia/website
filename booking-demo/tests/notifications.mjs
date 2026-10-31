import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../notifications.js',import.meta.url),'utf8');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const event=(id,kind='confirmed',overrides={})=>({id,kind,at:'2026-10-31T10:00:00Z',booking:{id:'b1',name:'Alex <Client>',serviceName:'Brow & tint',date:'2026-11-03',time:'10:00'},...overrides});
function harness({storage=new Map(),owner='owner-one',state={id:'salon-one',emails:[],bookings:[{id:'b1'}]}}={}){
 let identity=owner,dialog=false;const seen={modals:[],toasts:[],opened:[],renders:0,closed:0};
 const ctx=vm.createContext({window:{},Date,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},document:{querySelector:()=>dialog?{}:null}});vm.runInContext(source,ctx);
 const api={salon:()=>state,esc:escape,humanDate:date=>'3 Nov 2026',modal:(title,html)=>{dialog=true;seen.modals.push({title,html});},closeModal:()=>{dialog=false;seen.closed++;},render:()=>seen.renders++,toast:text=>seen.toasts.push(text),openBooking:id=>seen.opened.push(id),ownerIdentity:()=>identity};
 return {tools:ctx.window.JovaNotifications.create(api),api,state,seen,storage,setOwner:value=>identity=value};
}
test('empty activity is honest and does not infer notifications from booking status',()=>{
 const {tools,state}=harness();state.bookings.push({id:'cancelled-without-event',status:'cancelled'});
 assert.deepEqual(Array.from(tools.routes),['activity']);assert.match(tools.header(),/no unread updates/);assert.match(tools.pages.activity(),/No appointment updates yet/);assert(!tools.pages.activity().includes('Appointment cancelled'));
});
test('new, cancellation and reschedule events have plain labels and escaped details',()=>{
 const {tools,state}=harness();state.emails=[event('e1'),event('e2','cancelled'),event('e3','rescheduled'),event('e4','reminder')];
 const html=tools.pages.activity();assert.match(tools.header(),/Notifications, 3 unread/);
 for(const label of ['New appointment','Appointment cancelled','Appointment rescheduled'])assert(html.includes(label));
 assert(html.includes('Alex &lt;Client&gt;'));assert(html.includes('Brow &amp; tint'));assert(!html.includes('data-event="e4"'));assert(!html.includes('email sent'));
});
test('duplicate event IDs render once and opening an event marks it read',()=>{
 const {tools,state,seen}=harness();state.emails=[event('same'),event('same'),event('other','cancelled')];
 assert.match(tools.header(),/Notifications, 2 unread/);assert.equal((tools.pages.activity().match(/data-event="same"/g)||[]).length,1);
 assert.equal(tools.click('notif-item',{dataset:{event:'same'}}),true);assert.deepEqual(seen.opened,['b1']);assert.match(tools.header(),/Notifications, 1 unread/);
});
test('read state persists across module recreation',()=>{
 const storage=new Map(),state={id:'salon-one',emails:[event('e1')],bookings:[{id:'b1'}]};
 const first=harness({storage,state});first.tools.click('notif-read-all',{});assert.match(first.tools.header(),/no unread updates/);
 const next=harness({storage,state});assert.match(next.tools.header(),/no unread updates/);
 state.emails.unshift(event('e2','rescheduled'));assert.match(next.tools.header(),/Notifications, 1 unread/);
});
test('read state is isolated per owner and per salon',()=>{
 const {tools,state,setOwner}=harness();state.emails=[event('e1')];tools.click('notif-read-all',{});assert.match(tools.header(),/no unread updates/);
 setOwner('owner-two');assert.match(tools.header(),/Notifications, 1 unread/);tools.click('notif-read-all',{});
 state.id='salon-two';assert.match(tools.header(),/Notifications, 1 unread/);state.id='salon-one';setOwner('owner-one');assert.match(tools.header(),/no unread updates/);
});
test('bell shows the latest 20, and mark-all refreshes unread state',()=>{
 const {tools,state,seen}=harness();state.emails=Array.from({length:25},(_,i)=>event('e'+i,'confirmed',{at:new Date(Date.UTC(2026,9,31,0,i)).toISOString()}));
 assert.equal(tools.click('notif-open',{}),true);const html=seen.modals.at(-1).html;assert.equal((html.match(/data-action="notif-item"/g)||[]).length,20);assert(html.includes('latest 20 updates'));assert(html.indexOf('data-event="e24"')<html.indexOf('data-event="e23"'));
 tools.click('notif-read-all',{});assert.match(tools.header(),/no unread updates/);assert.match(seen.modals.at(-1).html,/0 unread/);assert.match(seen.modals.at(-1).html,/data-action="notif-read-all" disabled/);
});
test('deleted appointment remains an honest activity entry and cannot open fake details',()=>{
 const {tools,state,seen}=harness();state.emails=[event('gone','cancelled',{booking:{id:'missing',name:'Removed Client',serviceName:'Lash lift',date:'2026-11-03',time:'14:00'}})];
 tools.click('notif-item',{dataset:{event:'gone'}});assert.equal(seen.opened.length,0);assert.match(seen.toasts[0],/no longer in your diary/);assert.match(tools.header(),/no unread updates/);assert.match(tools.pages.activity(),/Removed Client/);
});
test('history and stored read IDs are bounded at 200 latest actual events',()=>{
 const {tools,state,storage}=harness();state.emails=Array.from({length:250},(_,i)=>event('e'+i,'confirmed',{at:new Date(Date.UTC(2026,9,31,0,i)).toISOString()}));
 assert.match(tools.header(),/Notifications, 200 unread/);assert.equal((tools.pages.activity().match(/data-action="notif-item"/g)||[]).length,200);
 tools.click('notif-read-all',{});assert.equal(JSON.parse([...storage.values()][0]).length,200);assert.match(tools.header(),/no unread updates/);assert.match(tools.pages.activity(),/latest 200 appointment updates/);
});
test('corrupt local read state recovers and unrelated hooks return false',()=>{
 const {tools,state,storage}=harness();state.emails=[event('e1')];storage.set('jovabook-notification-reads-v1:owner-one:salon-one','{invalid');
 assert.match(tools.header(),/Notifications, 1 unread/);assert.equal(tools.click('unrelated',{}),false);assert.equal(tools.change({}),false);assert.equal(tools.submit('unrelated',{}),false);
});
