/* Actual modules under deterministic clocks, with synthetic server responses only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const refundSource=await readFile(new URL('../refunds.js',import.meta.url),'utf8'),operatorSource=await readFile(new URL('../operator.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;return {promise:new Promise(done=>resolve=done),resolve:value=>resolve(value)};};
function eventTarget(){const listeners={};return {addEventListener(name,fn){(listeners[name]||=[]).push(fn);},emit(name,event={}){for(const fn of listeners[name]||[]){fn(event);if(event.stopped)break;}}};}
function refunds(handle){
 let owner='owner-a',salon='salon-a',visible=true,now=Date.now(),tools;const document={...eventTarget(),hidden:false},window={},intervals=[],calls=[];let html='';
 class Clock extends Date{static now(){return now;}}
 vm.runInNewContext(refundSource,{window,document,Date:Clock,queueMicrotask,setInterval:fn=>intervals.push(fn)});
 const api={ownerIdentity:()=>owner,salon:()=>({id:salon}),isLive:()=>true,isDashboardVisible:()=>visible,esc:String,humanDate:String,money:String,refundActivity:async()=>{calls.push(owner+'|'+salon);return handle(owner,salon);},render:()=>{html=tools.panel();}};
 tools=window.JovaRefunds.create(api);
 return {tools,calls,document,intervals,get html(){return html;},draw:()=>api.render(),refresh:()=>document.emit('click',{target:{closest:()=>({})}}),advance:()=>now+=120000,scope:(nextOwner,nextSalon)=>{owner=nextOwner;salon=nextSalon;},show:value=>visible=value};
}
test('refunds load once, stay quiet across idle, visibility and redraws, and refresh only after its button',async()=>{
 let status='requested';const ui=refunds(async()=>({ok:true,refunds:[{customer:'Client',amount_minor:25,status}]}));ui.draw();await settle();assert.equal(ui.calls.length,1);assert.match(ui.html,/Refund requested/);
 status='succeeded';ui.advance();ui.document.emit('visibilitychange');ui.document.emit('focus');ui.draw();await settle();assert.equal(ui.intervals.length,0);assert.equal(ui.calls.length,1);assert.match(ui.html,/Refund requested/);
 ui.refresh();await settle();assert.equal(ui.calls.length,2);assert.match(ui.html,/Refunded/);
});
test('failed refunds do not retry on render and stale owner responses cannot enter the new owner panel',async()=>{
 let failed=true;const ui=refunds(async()=>failed?null:{ok:true,refunds:[]});ui.draw();await settle();assert.equal(ui.calls.length,1);assert.match(ui.html,/unavailable/);ui.advance();ui.draw();await settle();assert.equal(ui.calls.length,1);failed=false;ui.refresh();await settle();assert.match(ui.html,/No refund requests/);
 const old=deferred(),scoped=refunds(async owner=>owner==='owner-a'?old.promise:{ok:true,refunds:[{customer:'New owner client',status:'pending',amount_minor:50}]});scoped.draw();await settle();scoped.scope('owner-b','salon-b');scoped.draw();await settle();old.resolve({ok:true,refunds:[{customer:'PRIVATE OLD OWNER',status:'succeeded',amount_minor:999}]});await settle();assert.match(scoped.html,/New owner client/);assert.doesNotMatch(scoped.html,/PRIVATE OLD OWNER/);assert.deepEqual(scoped.calls,['owner-a|salon-a','owner-b|salon-b']);
});

function operator(){
 const calls=[],intervals=[],timers=new Map(),store=new Map([['jovabook-operator-auth-v1',JSON.stringify({access_token:'operator-a',refresh_token:'refresh-a',expires_at:Date.now()/1000+3600,user_id:'operator-a'})]]),root={...eventTarget(),innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]},document={...eventTarget(),hidden:false,getElementById:()=>root,body:{classList:{toggle(){}}}},window={...eventTarget(),JOVA_SUPABASE:{url:'https://operator-fixture.example.test',key:'public-fixture'}},gates=new Map();
 let deny=false;
 const context={window,document,Date,Intl,URL,Map,Set,AbortController,FormData,queueMicrotask,MutationObserver:class{observe(){}},sessionStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)},location:{hash:'',pathname:'/operator.html'},history:{replaceState(){}},confirm:()=>true,setInterval:fn=>intervals.push(fn),setTimeout:fn=>{const id=timers.size+1;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),fetch:async(url,options)=>{
  const name=url.split('/').at(-1);calls.push({name,options});if(gates.has(name))await gates.get(name).promise;
  let data=name==='portal_identity'?{ok:true,role:'operator'}:name==='operator_businesses'?{ok:true,total:0,businesses:[]}:name==='operator_overview'?{ok:true,notifications:[],months:[],commission:{}}:name==='operator_referrals'?{ok:true,referrals:[],rewards:[]}:{ok:true};
  const status=deny&&name==='portal_identity'?403:200;return {ok:status===200,status,json:async()=>data};
 }};
 vm.runInNewContext(operatorSource,context);context.JovaOperatorReferrals=window.JovaOperatorReferrals;
 // Keep capture ordering and stopImmediatePropagation behavior for real root handlers.
 function send(action){const button={dataset:{action},disabled:false},event={target:{closest:selector=>selector==='[data-action]'?button:null},preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};root.emit('click',event);}
 return {calls,intervals,timers,root,document,window,store,gates,click:send,deny:()=>deny=true};
}
test('Operator initial authorization is followed by no idle, focus or visibility reads; Refresh still reloads',async()=>{
 const ui=operator();await settle();assert.match(ui.root.innerHTML,/<h1>Overview<\/h1>/);const count=ui.calls.length;assert(count>=3);assert.equal(ui.intervals.length,0);assert.equal(ui.timers.size,0);
 ui.window.emit('focus');ui.window.emit('pageshow');ui.document.emit('visibilitychange');ui.root.emit('focusin',{});await settle();assert.equal(ui.calls.length,count);
 ui.click('retry');await settle();assert(ui.calls.length>count);assert.match(ui.root.innerHTML,/<h1>Overview<\/h1>/);
 ui.click('referrals');await settle();assert.match(ui.root.innerHTML,/Referrals & rewards/);assert(ui.calls.some(call=>call.name==='operator_referrals'));
});
test('Operator manual refresh still refuses revoked access and cannot repaint after logout',async()=>{
 const denied=operator();await settle();denied.deny();denied.click('retry');await settle();assert.match(denied.root.innerHTML,/data-form="login"/);assert.equal(denied.store.has('jovabook-operator-auth-v1'),false);
 const ui=operator();await settle();const pending=deferred();ui.gates.set('operator_overview',pending);ui.click('retry');await settle();ui.click('logout');await settle();assert.match(ui.root.innerHTML,/data-form="login"/);pending.resolve();await settle();assert.match(ui.root.innerHTML,/data-form="login"/);assert.equal(ui.store.has('jovabook-operator-auth-v1'),false);
});

test('Operator Notifications navigation and Refresh each make only identity plus overview reads',async()=>{
 const ui=operator();await settle();assert.deepEqual(ui.calls.map(call=>call.name),['portal_identity','operator_businesses','operator_overview','operator_signup_flow','operator_owner_flow_events']);
 let before=ui.calls.length;ui.click('notifications');await settle();assert.match(ui.root.innerHTML,/<h1>Notifications<\/h1>/);assert.deepEqual(ui.calls.slice(before).map(call=>call.name),['portal_identity','operator_overview']);
 before=ui.calls.length;ui.click('retry');await settle();assert.deepEqual(ui.calls.slice(before).map(call=>call.name),['portal_identity','operator_overview']);
 before=ui.calls.length;ui.deny();ui.click('retry');await settle();assert.deepEqual(ui.calls.slice(before).map(call=>call.name),['portal_identity']);assert.match(ui.root.innerHTML,/data-form="login"/);
});
