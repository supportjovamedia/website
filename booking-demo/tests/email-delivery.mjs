import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';

const source=await readFile(new URL('../email-delivery.js',import.meta.url),'utf8');
const appSource=await readFile(new URL('../app.js',import.meta.url),'utf8');
const accountSource=await readFile(new URL('../accounts.js',import.meta.url),'utf8');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const row=(id='e1',changes={})=>({id,kind:'confirmed',subject:'Booking <update>',to_email:'client@example.test',from_email:'Bookings <bookings@example.test>',reply_to:'business@example.test',sent_at:'2026-10-31T10:00:00Z',status:'Queued',owner_status:'Queued',scheduled_at:null,updated_at:'2026-10-31T10:00:00Z',booking:{id:'b1',name:'Alex <Client>',serviceName:'Brow & tint',date:'2026-11-03',time:'10:00',price:25},...changes});
function harness(live=true){const window={};vm.runInNewContext(source,{window,Date,Promise,Map,Set});const state={id:'salon-one',emails:[],emailDelivery:{available:true,enabled:true,provider:'Resend',reminder_hours:24}},seen={modals:[],renders:0,refreshes:0};const tools=window.JovaEmailDelivery.create({salon:()=>state,isLive:()=>live,esc,humanDate:()=> 'Tue 3 Nov',money:n=>'£'+n,modal:(title,html)=>seen.modals.push({title,html}),render:()=>seen.renders++,refreshEmailDelivery:async()=>seen.refreshes++});return {core:window.JovaEmailDelivery,tools,state,seen};}

test('server email fields survive mapping and updates to an existing ID are detected',()=>{
 const {core}=harness(),event=core.fromRow(row());assert.equal(event.ownerStatus,'Queued');assert.equal(event.updatedAt,row().updated_at);assert.equal(core.changed([event],[row()]),false);
 assert.equal(core.changed([event],[row('e1',{status:'Delivered'})]),true);assert.equal(core.changed([event],[row('e1',{owner_status:'Failed'})]),true);assert.equal(core.changed([event],[row('e1',{scheduled_at:'2026-11-02T10:00:00Z'})]),true);assert.equal(core.changed([event],[row('e2')]),true);
 assert.equal(core.latest([{at:'2026-10-31T11:00:00Z',updatedAt:'2026-10-31T12:00:00Z'},event]),'2026-10-31T12:00:00Z');
});

test('live activity shows actual client and business statuses with no preview controls',()=>{
 const {core,tools,state}=harness();for(const status of ['Queued','Scheduled','Sending','Sent','Delivered','Failed','Bounced','Suppressed','Cancelled'])state.emails.push(core.fromRow(row(status,{status,owner_status:'Failed'})));
 state.emails.push(core.fromRow(row('reminder',{kind:'reminder',status:'Scheduled',scheduled_at:'2026-11-02T10:00:00Z',owner_status:''})));
 const html=tools.page();for(const status of ['Queued','Scheduled','Sending','Sent','Delivered','Failed','Bounced','Suppressed','Cancelled'])assert(html.includes('>'+status+'</span>'));
 assert.match(html,/Client only/);assert.match(html,/Scheduled:/);assert.match(html,/Automatic emails are on/);assert.match(html,/24 hours/);assert.match(html,/Booking &lt;update&gt;/);assert(!html.includes('data-action="reminders"'));assert(!html.includes('Preview email'));assert(!html.includes('Preview saved'));
});

test('unavailable and paused states never claim delivery is enabled',()=>{
 const {tools,state}=harness();state.emailDelivery={available:false};let html=tools.page();assert.match(html,/Email delivery status unavailable/);assert.match(html,/Delivery has not been confirmed/);assert(!html.includes('Automatic emails are on'));
 state.emailDelivery={available:true,enabled:false};html=tools.page();assert.match(html,/Email delivery is paused/);assert.match(html,/messages are not being sent/);assert(!html.includes('Automatic emails are on'));
 state.emailActivityUnavailable=true;assert.match(tools.page(),/Showing the last saved status/);
});

test('live email details distinguish provider acceptance, delivery and unavailable status',()=>{
 const {core,tools,state,seen}=harness();state.emails=[core.fromRow(row('e1',{status:'Sent',owner_status:'Bounced'}))];tools.details('e1');let html=seen.modals.at(-1).html;
 assert.equal(seen.modals.at(-1).title,'Email details');assert.match(html,/Delivery to the inbox is not confirmed/);assert.match(html,/receiving mail server rejected/);assert.match(html,/Alex &lt;Client&gt;/);assert(!html.includes('simulated locally'));assert(!html.includes('has not been sent'));
 state.emails[0].status='Delivered';tools.details('e1');assert.match(seen.modals.at(-1).html,/does not confirm it was read/);
 state.emails[0].status='unexpected';tools.details('e1');assert.match(seen.modals.at(-1).html,/Delivery status is unavailable/);
});

test('demo activity remains explicitly unsent and retains the reminder preview control',()=>{
 const {core,tools,state}=harness(false);state.emails=[core.fromRow(row('e1',{status:'Delivered'}))];const html=tools.page();assert.match(html,/No emails are sent/);assert.match(html,/data-action="reminders"/);assert.match(html,/Preview email/);assert.match(html,/Preview saved/);assert(!html.includes('>Delivered</span>'));assert(!html.includes('Refresh status'));
});

test('refresh is read-only, prevents concurrent refreshes and returns a synchronous action result',async()=>{
 const {tools,seen}=harness();assert.equal(tools.click('email-delivery-refresh'),true);assert.equal(tools.click('email-delivery-refresh'),true);assert.equal(tools.click('unrelated'),false);await new Promise(resolve=>setImmediate(resolve));assert.equal(seen.refreshes,1);assert.equal(seen.renders,2);
});

test('live notify creates no browser email while the isolated demo still creates an unsent preview',()=>{
 const notify=appSource.match(/^function notify\(kind,b\).*$/m)[0];for(const live of [true,false]){const state={name:'Business',email:'owner@example.test',emails:[]},context={salon:()=>state,isLive:()=>live,uid:()=> 'preview',Date};vm.runInNewContext(notify+';notify("confirmed",{email:"client@example.test"});',context);assert.equal(state.emails.length,live?0:1);if(!live)assert.equal(state.emails[0].status,'Preview saved');}
});

test('sync pump writes bookings but never writes or deletes server-owned email logs',async()=>{
 const tables=['categories','staff','services','customers','bookings','email_log','payments'],state={id:'salon-one',ownerId:'session'},rows=Object.fromEntries(tables.map(t=>[t,[]]));rows.bookings=[{id:'new-booking'}];rows.email_log=[{id:'new-server-event',status:'Queued'}];const previous=Object.fromEntries(tables.map(t=>[t,{}]));previous.email_log['old-server-event']='old';const writes=[],deletes=[];
 const context={syncBusy:false,syncBlocked:false,syncDirty:true,syncFail:0,syncTimer:null,state:{active:'salon-one',salons:[state]},saveRevision:0,hasUnsavedEditor:()=>true,snap:{'salon-one':previous},salonSnap:{'salon-one':'{}'},dir:{sessionIdentity:()=> 'session',upsertRows:async(table)=>{writes.push(table);return {ok:true};},deleteRows:async(table)=>{deletes.push(table);return {ok:true};}},isLive:()=>true,showSync:()=>{},rowsOf:()=>rows,salonFields:()=>({}),Date,JSON};
 vm.runInNewContext(appSource.match(/^var TABLES=.*$/m)[0]+'\n'+appSource.match(/^var WRITE_TABLES=.*$/m)[0]+'\n'+appSource.slice(appSource.indexOf('async function pump(){'),appSource.indexOf("window.addEventListener('beforeunload'")),context);await context.pump();assert.deepEqual(writes,['bookings']);assert.deepEqual(deletes,[]);assert.deepEqual(previous.email_log,{'old-server-event':'old'});
});

function directory(response={ok:true,status:200,data:{enabled:true,provider:'Resend',reminder_hours:24}}){const requests=[],storage=new Map([['jovabook-auth',JSON.stringify({access_token:'fake-owner-token',expires_at:Date.now()/1000+3600,user:{id:'test-owner'}})]]),window={JOVA_SUPABASE:{url:'https://accounts.example.test',key:'test-public'}};vm.runInNewContext(accountSource,{window,crypto:webcrypto,Uint8Array,Date,Math,AbortController,setTimeout,clearTimeout,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},fetch:async(url,options)=>{requests.push({url,options});const actual=typeof response==='function'?response(url,options):response;return {ok:actual.ok,status:actual.status,json:async()=>actual.data};}});return {api:window.JovaAccounts.create(()=>({accounts:[],salons:[],resets:[]}),()=>{}),requests};}

test('activity refresh filters updated_at so delivery changes to existing events are fetched',async()=>{
 const {api,requests}=directory({ok:true,status:200,data:[]});await api.loadActivity('salon-one','2026-10-31T10:00:00Z');assert.match(requests[0].url,/updated_at=gte\./);assert.match(requests[0].url,/order=updated_at.desc/);assert(!requests[0].url.includes('&sent_at=gte.'));assert.equal(requests[0].options.headers.Authorization,'Bearer fake-owner-token');
});

test('delivery info is an authenticated RPC and invalid/unavailable responses stay unavailable',async()=>{
 const {api,requests}=directory();const result=await api.emailDeliveryInfo();assert.equal(result.ok,true);assert.equal(result.data.enabled,true);assert.match(requests[0].url,/rpc\/email_delivery_info$/);assert.equal(requests[0].options.headers.Authorization,'Bearer fake-owner-token');
 for(const response of [{ok:false,status:500,data:null},{ok:true,status:200,data:{enabled:'yes',provider:'Resend',reminder_hours:24}}])assert.equal((await directory(response).api.emailDeliveryInfo()).ok,false);
});

test('email_log write and delete guards reject before any HTTP request',async()=>{
 const {api,requests}=directory();assert.equal((await api.upsertRows('email_log',[row()])).status,403);assert.equal((await api.deleteRows('email_log','salon-one',['e1'])).status,403);assert.equal(requests.length,0);
});

test('an unavailable email log does not block core diary reads, while core failures still fail honestly',async()=>{
 const response=url=>url.includes('/email_log?')?{ok:false,status:503,data:{message:'Unavailable'}}:{ok:true,status:200,data:url.includes('/salons?')?[{id:'live-salon',owner_id:'test-owner',name:'Business'}]:url.includes('/bookings?')?[{id:'booking-one',salon_id:'live-salon'}]:[]};
 const {api}=directory(response),result=await api.loadDiary();assert.equal(result.ok,true);assert.equal(result.salon.id,'live-salon');assert.equal(result.emailActivityUnavailable,true);assert.equal(result.rows.email_log.length,0);
 const failed=directory(url=>url.includes('/bookings?')?{ok:false,status:401,data:{}}:response(url));assert.equal((await failed.api.loadDiary()).ok,false);assert.equal((await failed.api.loadDiary()).auth,true);
});
