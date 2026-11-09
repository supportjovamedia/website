import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
const source=await readFile(new URL('../business-integrations.js',import.meta.url),'utf8');
const ctx={window:{},Date,Set,Map};vm.runInNewContext(source,ctx);const api=ctx.window.JovaBusinessIntegrations;
const status=()=>({salon_id:'s1',recovery_available:true,integrations:api.providers.map(p=>({provider:p.id,state:'not_connected',revision:null,account_verified:false,checkout_ready:false,recovery_ready:false,reminders_ready:false,missing_requirements:[]}))});
const preview=()=>({salon_id:'s1',preview_id:'preview-1',expires_at:'2030-01-01T00:00:00Z',slot:{booking_id:'b1',service:'Consultation',date:'2026-11-05',time:'10:00',duration:30},business:{name:'Studio',phone:'020 7946 0123',timezone:'Europe/London'},subject:'An appointment is available',message:'Call to book',candidates:[{id:'c1',name:'Alex <Client>',email:'a@example.test',match_reason:'same_service'}]});
test('status is bound to the exact business and requires explicit recovery readiness',()=>{assert(api.statusData(status(),'s1'));assert.equal(api.statusData(status(),'s2'),null);const data=status();delete data.recovery_available;assert.equal(api.statusData(data,'s1'),null);});
test('provider fields are allowlisted and secrets cannot enter retained connection state',()=>{const data=status();data.integrations[0].credentials={secret_key:'never retain'};data.integrations[0].secret_key='never retain';data.integrations[0].account_verified='true';const out=api.statusData(data,'s1');assert(!JSON.stringify(out).includes('never retain'));assert.equal(out.integrations[0].account_verified,false);});
test('unknown or missing providers fail closed and never look connected',()=>{const data=status();data.integrations[0].state='connected';data.integrations.pop();const out=api.statusData(data,'s1');assert.equal(out.integrations[0].state,'unavailable');assert.equal(out.integrations.at(-1).state,'unavailable');});
test('preview accepts only the requested business and cancellation',()=>{assert(api.previewData(preview(),'s1','b1'));assert.equal(api.previewData(preview(),'s2','b1'),null);assert.equal(api.previewData(preview(),'s1','b2'),null);});
test('missing business phone or invalid slot details cannot become a sendable preview',()=>{for(const edit of [p=>p.business.phone='',p=>p.slot.date='tomorrow',p=>p.slot.time='morning',p=>p.expires_at='not-a-date']){const p=preview();edit(p);assert.equal(api.previewData(p,'s1','b1'),null);}});
test('recipient duplicates, unknown eligibility and overlarge lists fail closed',()=>{const p=preview();p.candidates.push({...p.candidates[0]});assert.equal(api.previewData(p,'s1','b1'),null);p.candidates=[{...p.candidates[0],match_reason:'all_clients'}];assert.equal(api.previewData(p,'s1','b1'),null);p.candidates=Array.from({length:101},(_,i)=>({...preview().candidates[0],id:'c'+i}));assert.equal(api.previewData(p,'s1','b1'),null);});
test('preview retains server candidates only and does not include unexpected private fields',()=>{const p=preview();p.candidates[0].notes='private note';p.credentials='secret';const out=api.previewData(p,'s1','b1');assert.equal(out.candidates[0].name,'Alex <Client>');assert(!JSON.stringify(out).includes('private note'));assert(!JSON.stringify(out).includes('secret'));});

test('recovery dialog preserves the authoritative exact-slot copy, escapes clients and queues without a discount',async()=>{
 const calls=[],dialogs=[],button={disabled:false,textContent:''},all={checked:false},fieldset={toggleAttribute(){}},form={dataset:{form:'bi-recovery',owner:'owner-a|s1'},isConnected:true,elements:{selectAll:all},setAttribute(){},querySelector:selector=>selector==='[type=submit]'?button:selector==='[name=selectAll]'?all:selector==='fieldset'?fieldset:null,querySelectorAll:()=>[button,fieldset]};
 const window={},document={querySelector:()=>form};vm.runInNewContext(source,{window,document,Date,Set,Map,crypto:webcrypto});
 const p=preview();p.subject='Consultation on 5 November at 10:00';p.message='Hi there,\n\nCan you make the Consultation at 10:00 on 5 November? This exact appointment only.';
 const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const tools=window.JovaBusinessIntegrations.create({salon:()=>({id:'s1',phone:'020 7946 0123',entitlements:{plan:'standard'}}),ownerIdentity:()=> 'owner-a',isLive:()=>true,esc:escape,humanDate:()=> '5 November 2026',modal:(...args)=>dialogs.push(args),error(){},integrationRequest:async(action,body)=>{calls.push({action,body});return action==='integrations/status'?{ok:true,data:status()}:action==='recovery/preview'?{ok:true,data:p}:{ok:true,data:{action_id:'dispatch-1',status:'queued'}};}});
 await tools.openRecovery('b1');
 assert.equal(dialogs.at(-1)[0],'Recover slot');assert.match(dialogs.at(-1)[1],/Alex &lt;Client&gt;/);assert(dialogs.at(-1)[1].includes(p.message));assert.doesNotMatch(dialogs.at(-1)[1],/name="includeOffer"|name="discountPercent"/);assert.equal(button.disabled,true);
 tools.input({name:'recipient',value:'c1',checked:true,closest:()=>form});assert.equal(button.disabled,false);assert.equal(button.textContent,'Send email to 1 client');
 tools.submit('bi-recovery',form);await new Promise(resolve=>setImmediate(resolve));
 const sent=calls.filter(call=>call.action==='recovery/send');assert.equal(sent.length,1);assert.deepEqual(Array.from(sent[0].body.recipient_ids),['c1']);assert.equal(sent[0].body.include_offer,false);assert.equal(sent[0].body.discount_percent,0);assert.match(dialogs.at(-1)[1],/not been confirmed sent/);assert.doesNotMatch(dialogs.at(-1)[1],/type="submit"/);
});
test('Free loads status while all provider connections require Solo or Team',async()=>{
 const calls=[],dialogs=[],s={id:'s1',entitlements:{plan:'essential'}};
 const tools=api.create({salon:()=>s,ownerIdentity:()=> 'o1',isLive:()=>true,esc:v=>String(v??''),modal:(...args)=>dialogs.push(args),integrationRequest:async(...args)=>{calls.push(args);return {ok:true,data:status()};}});
 tools.pages.integrations();await new Promise(r=>setImmediate(r));const html=tools.pages.integrations();
 assert.deepEqual(Array.from(api.providers,p=>p.id),['stripe','mailchimp','sms_works','twilio']);
 assert(html.includes('More connections on Solo and Team'));assert.equal((html.match(/data-action="bi-upgrade"/g)||[]).length,4);
 assert.equal(calls.length,1);assert.equal(calls[0][0],'integrations/status');
 for(const provider of [...api.providers.map(p=>p.id),'paypal','unknown'])tools.click('bi-connect',{dataset:{provider}});
 assert.equal(dialogs.length,0,'A direct connect event cannot bypass the paid-plan guard');
 await tools.openRecovery('b1');assert(dialogs.at(-1)[1].includes('Slot recovery is available for signed-in'));assert.equal(calls.length,1);
});

const accountsSource=await readFile(new URL('../accounts.js',import.meta.url),'utf8'),sid='20000000-0000-4000-8000-000000000001';
const session=owner=>({user:{id:owner},access_token:'mock-'+owner,refresh_token:'mock-refresh',expires_at:Date.now()/1000+3600});
const access={ok:true,access:'active',reason:'paid',business:{id:sid,name:'Fixture',slug:'fixture',plan:'standard',status:'active'},lifecycle:{trialEndsAt:null,purgeAt:null},billing:{connected:false,canCheckout:false},staff_limit:5};
const response=data=>({ok:true,status:200,json:async()=>data});
function transport(handle){const local=new Map([['jovabook-auth',JSON.stringify(session('owner-a'))]]),requests=[],storage={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)},window={JOVA_SUPABASE:{url:'https://fixture.example.test',key:'mock'}};vm.runInNewContext(accountsSource,{window,localStorage:storage,sessionStorage:storage,crypto:webcrypto,Uint8Array,Date,Math,AbortController,setTimeout,clearTimeout,URLSearchParams,atob,location:{origin:'https://fixture.example.test'},fetch:async(url,options)=>{requests.push({url,options});return url==='/api/jovabook/billing/status'?response(access):handle(url,options);}});const state={salons:[],accounts:[],resets:[]};return {api:window.JovaAccounts.create(()=>state,()=>{}),local,requests};}
test('integration transport refuses unknown paths and unverified business scope without requests',async()=>{const h=transport(()=>{throw Error('Unexpected request');});assert.equal((await h.api.integrationCall('integrations/status',{salon_id:sid})).ok,false);assert.equal((await h.api.integrationCall('https://provider.example.test',{salon_id:sid})).ok,false);assert.equal(h.requests.length,0);await h.api.ownerAccess();const n=h.requests.length;assert.equal((await h.api.integrationCall('integrations/connect',{salon_id:'another-business'})).ok,false);assert.equal(h.requests.length,n);});
test('integration transport uses same-origin POST with current owner and exact requested body',async()=>{const h=transport(()=>response({ok:true,salon_id:sid}));await h.api.ownerAccess();const body={salon_id:sid,provider:'stripe',expected_revision:null,credentials:{secret_key:'fictional-only'}};assert.equal((await h.api.integrationCall('integrations/connect',body)).ok,true);const r=h.requests.at(-1);assert.equal(r.url,'/api/jovabook/integrations/connect');assert.equal(r.options.method,'POST');assert.equal(r.options.headers.Authorization,'Bearer mock-owner-a');assert.deepEqual(JSON.parse(r.options.body),body);});
test('integration transport refuses a response carrying another business identity',async()=>{const h=transport(()=>response({ok:true,salon_id:'another-business'}));await h.api.ownerAccess();assert.equal((await h.api.integrationCall('integrations/status',{salon_id:sid})).ok,false);});
test('a late connection response cannot authorize a newly signed-in owner',async()=>{let release;const pending=new Promise(r=>release=r),h=transport(()=>pending);await h.api.ownerAccess();const call=h.api.integrationCall('integrations/connect',{salon_id:sid,provider:'stripe',credentials:{secret_key:'fictional-only'},expected_revision:null});await new Promise(r=>setImmediate(r));h.local.set('jovabook-auth',JSON.stringify(session('owner-b')));release(response({ok:true,salon_id:sid}));assert.equal((await call).stale,true);assert.equal(h.api.canWrite(sid),false);});

test('Free can disconnect a previously saved paid-provider connection without reconnecting',async()=>{
 const data=status();data.integrations.find(p=>p.provider==='mailchimp').revision='saved-revision';
 const dialogs=[],calls=[],salon={id:'s1',entitlements:{plan:'essential'}};
 const tools=api.create({salon:()=>salon,ownerIdentity:()=> 'o1',isLive:()=>true,esc:v=>String(v??''),modal:(...args)=>dialogs.push(args),integrationRequest:async(...args)=>{calls.push(args);return {ok:true,data};}});
 tools.pages.integrations();await new Promise(r=>setImmediate(r));const html=tools.pages.integrations();
 assert.match(html,/data-action="bi-upgrade" data-provider="mailchimp"/);
 const disconnect=html.match(/<button[^>]*data-action="bi-disconnect"[^>]*data-provider="mailchimp"[^>]*>/)?.[0];assert(disconnect);assert(!/\sdisabled(?:\s|>)/.test(disconnect));
 tools.click('bi-connect',{dataset:{provider:'mailchimp'}});assert.equal(dialogs.length,0);
 tools.click('bi-disconnect',{dataset:{provider:'mailchimp'}});assert.equal(dialogs.at(-1)[0],'Disconnect Mailchimp?');assert(dialogs.at(-1)[1].includes('Future recovery emails will stop'));
});

test('revoked credentials can be repaired while an unavailable provider without saved credentials stays disabled',async()=>{
 const data=status();Object.assign(data.integrations.find(p=>p.provider==='stripe'),{state:'unavailable',revision:'saved-revision'});Object.assign(data.integrations.find(p=>p.provider==='mailchimp'),{state:'unavailable'});
 const dialogs=[],tools=api.create({salon:()=>({id:'s1',entitlements:{plan:'standard'}}),ownerIdentity:()=> 'owner',isLive:()=>true,esc:String,modal:(...a)=>dialogs.push(a),integrationRequest:async()=>({ok:true,data})});
 tools.pages.integrations();await new Promise(r=>setImmediate(r));const html=tools.pages.integrations();
 const reconnect=html.match(/<button[^>]*data-action="bi-connect"[^>]*data-provider="stripe"[^>]*>/)?.[0];assert(reconnect);assert(reconnect.includes('aria-label="Reconnect Stripe"'));assert(!/\sdisabled(?:\s|>)/.test(reconnect));
 const unavailable=html.match(/<button[^>]*data-action="bi-connect"[^>]*data-provider="mailchimp"[^>]*>/)?.[0];assert(unavailable);assert(/\sdisabled(?:\s|>)/.test(unavailable));
 tools.click('bi-connect',{dataset:{provider:'mailchimp'}});assert.equal(dialogs.length,0);tools.click('bi-connect',{dataset:{provider:'stripe'}});assert.equal(dialogs.at(-1)[0],'Connect Stripe');
});

function oauthUi(handle,hash='#integrations'){let owner='owner-a',visible=true;const listeners={},timers=new Map(),destinations=[],replaced=[],calls=[],window={location:{hash,pathname:'/',search:'',assign:url=>destinations.push(url)},history:{replaceState:(_a,_b,url)=>replaced.push(url)},addEventListener:(name,fn)=>(listeners[name]||=[]).push(fn)};vm.runInNewContext(source,{window,Date,Set,Map,URL,URLSearchParams,setTimeout:fn=>{const id=timers.size+1;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)});const data=status();data.integrations[0].authorization_available=true;const tools=window.JovaBusinessIntegrations.create({salon:()=>({id:'s1',entitlements:{plan:'standard'}}),ownerIdentity:()=>owner,isLive:()=>true,isIntegrationsVisible:()=>visible,esc:String,render:()=>{},integrationRequest:async(action,body)=>{calls.push({action,body});return action==='integrations/status'?{ok:true,data}:handle(action,body);}});return {tools,calls,destinations,replaced,window,emit:name=>{for(const fn of listeners[name]||[])fn();},setVisible:value=>visible=value,runTimers:()=>{for(const fn of [...timers.values()])fn();},switchOwner:()=>owner='owner-b'};}
test('configured provider button starts authenticated flow and accepts only the fixed provider host',async()=>{const ui=oauthUi(async()=>({ok:true,data:{authorization_url:'https://connect.stripe.com/oauth/authorize?state=fixture'}}));ui.tools.pages.integrations();await new Promise(r=>setImmediate(r));ui.tools.click('bi-connect',{dataset:{provider:'stripe'}});await new Promise(r=>setImmediate(r));assert.equal(ui.calls.at(-1).action,'integrations/oauth/start');assert.equal(ui.calls.at(-1).body.salon_id,'s1');assert.equal(ui.destinations.length,1);const blocked=oauthUi(async()=>({ok:true,data:{authorization_url:'https://attacker.example.test/oauth/authorize'}}));blocked.tools.pages.integrations();await new Promise(r=>setImmediate(r));blocked.tools.click('bi-connect',{dataset:{provider:'stripe'}});await new Promise(r=>setImmediate(r));assert.equal(blocked.destinations.length,0);assert(blocked.tools.pages.integrations().includes('could not be verified'));});
test('a late provider-start response cannot navigate after the owner changes',async()=>{let release;const wait=new Promise(r=>release=r),ui=oauthUi(()=>wait);ui.tools.pages.integrations();await new Promise(r=>setImmediate(r));ui.tools.click('bi-connect',{dataset:{provider:'stripe'}});ui.switchOwner();ui.tools.pages.integrations();release({ok:true,data:{authorization_url:'https://connect.stripe.com/oauth/authorize?state=fixture'}});await new Promise(r=>setImmediate(r));assert.equal(ui.destinations.length,0);});
test('callback finalization uses the current business and clears the one-use flow URL',async()=>{const flow='a'.repeat(64),ui=oauthUi(async()=>({ok:true,data:{ok:true,salon_id:'s1'}}),'#integrations?connection=complete&provider=stripe&flow='+flow);ui.tools.pages.integrations();await new Promise(r=>setImmediate(r));assert.equal(ui.calls[0].action,'integrations/oauth/complete');assert.equal(ui.calls[0].body.flow_id,flow);assert.equal(ui.calls[0].body.salon_id,'s1');assert.equal(ui.replaced.at(-1),'/#integrations');assert(ui.tools.pages.integrations().includes('Customer deposit checkout is not active yet'));});

const oauthSettle=()=>new Promise(r=>setImmediate(r));
test('provider opening is single flight and returning from page history permits a fresh connection',async()=>{const ui=oauthUi(async()=>({ok:true,data:{authorization_url:'https://connect.stripe.com/oauth/authorize?state=fixture'}}));ui.tools.pages.integrations();await oauthSettle();ui.tools.click('bi-connect',{dataset:{provider:'stripe'}});ui.tools.click('bi-connect',{dataset:{provider:'stripe'}});await oauthSettle();assert.equal(ui.calls.filter(c=>c.action==='integrations/oauth/start').length,1);assert.match(ui.tools.pages.integrations(),/Opening Stripe/);ui.emit('pagehide');ui.emit('pageshow');await oauthSettle();assert.doesNotMatch(ui.tools.pages.integrations(),/Opening Stripe/);ui.tools.click('bi-connect',{dataset:{provider:'stripe'}});await oauthSettle();assert.equal(ui.destinations.length,2);});
test('focus return and a failed navigation timeout release the temporary opening state',async()=>{for(const event of ['focus','timeout']){const ui=oauthUi(async()=>({ok:true,data:{authorization_url:'https://connect.stripe.com/oauth/authorize?state=fixture'}}));ui.tools.pages.integrations();await oauthSettle();ui.tools.click('bi-connect',{dataset:{provider:'stripe'}});await oauthSettle();event==='timeout'?ui.runTimers():ui.emit(event);await oauthSettle();assert.doesNotMatch(ui.tools.pages.integrations(),/Opening Stripe/);assert.match(ui.tools.pages.integrations(),/Provider sign-in was not completed/);}});
test('leaving integrations to log out invalidates a pending redirect even if the same owner logs in',async()=>{let release;const ui=oauthUi(()=>new Promise(r=>release=r));ui.tools.pages.integrations();await oauthSettle();ui.tools.click('bi-connect',{dataset:{provider:'stripe'}});ui.setVisible(false);ui.emit('hashchange');ui.setVisible(true);ui.tools.pages.integrations();release({ok:true,data:{authorization_url:'https://connect.stripe.com/oauth/authorize?state=fixture'}});await oauthSettle();assert.equal(ui.destinations.length,0);assert.doesNotMatch(ui.tools.pages.integrations(),/Opening Stripe/);});
test('a callback arriving after the page was already loaded finalizes only once and cancellation stays retryable',async()=>{const ui=oauthUi(async()=>({ok:true,data:{ok:true,salon_id:'s1'}}));ui.tools.pages.integrations();await oauthSettle();ui.window.location.hash='#integrations?connection=complete&provider=stripe&flow='+'a'.repeat(64);ui.emit('hashchange');ui.emit('hashchange');await oauthSettle();ui.tools.click('bi-refresh',{});await oauthSettle();assert.equal(ui.calls.filter(c=>c.action==='integrations/oauth/complete').length,1);ui.window.location.hash='#integrations?connection=cancelled&provider=stripe';ui.emit('hashchange');await oauthSettle();assert.match(ui.tools.pages.integrations(),/Connection cancelled/);assert.doesNotMatch(ui.tools.pages.integrations(),/Opening Stripe/);});

function recoveryUi(handle){
 let owner='owner-a',active=null,now=Date.parse('2026-11-01T00:00:00Z');const dialogs=[],calls=[];
 class Clock extends Date{static now(){return now;}}
 const document={addEventListener(){},querySelector:()=>active},window={};vm.runInNewContext(source,{window,document,Date:Clock,Set,Map,crypto:webcrypto});
 function modal(title,html){
  if(active)active.isConnected=false;
  const all={checked:false},button=html.includes('type="submit"')?{disabled:false,textContent:''}:null,fieldset={disabled:false,toggleAttribute(_name,value){this.disabled=value;}};
  const form={dataset:{form:'bi-recovery',owner:owner+'|s1'},isConnected:true,elements:{selectAll:all},setAttribute(){},querySelector:selector=>selector==='[type=submit]'?button:selector==='[name=selectAll]'?all:selector==='fieldset'?fieldset:null,querySelectorAll:selector=>selector==='[name=recipient]'?[]:[button,fieldset].filter(Boolean)};
  active=form;dialogs.push({title,html,form,button});
 }
 const tools=window.JovaBusinessIntegrations.create({salon:()=>({id:'s1',phone:'020 7946 0123',entitlements:{plan:'standard'}}),ownerIdentity:()=>owner,isLive:()=>true,esc:String,humanDate:()=> '5 November 2026',modal,error(){},integrationRequest:async(action,body)=>{calls.push({action,body});return handle(action,body,{now});}});
 return {tools,dialogs,calls,form:()=>active,select(){tools.input({name:'recipient',value:'c1',checked:true,closest:()=>active});},close(){active.isConnected=false;active=null;},switchOwner(){owner='owner-b';},advance(){now+=3600000;}};
}
const recoveryGate=()=>{let release;return {promise:new Promise(resolve=>release=resolve),release:value=>release(value)};};

test('closing recovery during either status or preview loading prevents late modal resurrection',async()=>{
 for(const pendingAction of ['integrations/status','recovery/preview']){
  const pending=recoveryGate(),ui=recoveryUi(async action=>action===pendingAction?pending.promise:{ok:true,data:action==='integrations/status'?status():preview()});
  const opening=ui.tools.openRecovery('b1');await oauthSettle();ui.close();pending.release({ok:true,data:pendingAction==='integrations/status'?status():preview()});await opening;
  assert.equal(ui.dialogs.length,1,pendingAction+' must not reopen after Cancel');assert.equal(ui.form(),null);
  if(pendingAction==='integrations/status')assert.equal(ui.calls.filter(call=>call.action==='recovery/preview').length,0);
 }
});

test('a recovery preview completing after an owner switch cannot update the old dialog',async()=>{
 const pending=recoveryGate(),ui=recoveryUi(async action=>action==='recovery/preview'?pending.promise:{ok:true,data:status()});
 const opening=ui.tools.openRecovery('b1');await oauthSettle();ui.switchOwner();pending.release({ok:true,data:preview()});await opening;assert.equal(ui.dialogs.length,1);
});

test('expired and stale recovery previews expose refresh and obtain new eligibility without sending twice',async()=>{
 for(const failure of ['expired','stale']){
  let sends=0;const ui=recoveryUi(async(action,_body,{now})=>{
   if(action==='integrations/status')return {ok:true,data:status()};
   if(action==='recovery/preview')return {ok:true,data:{...preview(),expires_at:new Date(now+60000).toISOString()}};
   sends++;return {ok:false,data:{code:'refresh_required',message:'This cancelled slot has changed.'}};
  });
  await ui.tools.openRecovery('b1');ui.select();if(failure==='expired')ui.advance();ui.tools.submit('bi-recovery',ui.form());await oauthSettle();
  assert.match(ui.dialogs.at(-1).html,/data-action="bi-preview-refresh"/);assert.equal(sends,failure==='expired'?0:1);
  if(failure==='expired')assert.equal(ui.dialogs.at(-1).button.disabled,true);
  ui.tools.click('bi-preview-refresh',{});await oauthSettle();assert.equal(ui.calls.filter(call=>call.action==='recovery/preview').length,2);assert.equal(ui.dialogs.at(-1).button.disabled,true,'Fresh eligibility requires a new client selection');
 }
});

test('unavailable recovery can refresh but ambiguous dispatch must keep the same request',async()=>{
 let failPreview=true;const ui=recoveryUi(async action=>action==='integrations/status'?{ok:true,data:status()}:action==='recovery/preview'?failPreview?{ok:false,message:'Temporarily unavailable'}:{ok:true,data:preview()}:{ok:false,message:'Sending outcome is unknown'});
 await ui.tools.openRecovery('b1');assert.match(ui.dialogs.at(-1).html,/data-action="bi-preview-refresh"/);failPreview=false;ui.tools.click('bi-preview-refresh',{});await oauthSettle();ui.select();ui.tools.submit('bi-recovery',ui.form());await oauthSettle();
 assert.match(ui.dialogs.at(-1).html,/Retry same request/);assert.doesNotMatch(ui.dialogs.at(-1).html,/data-action="bi-preview-refresh"/);
 const before=ui.calls.length;ui.tools.click('bi-preview-refresh',{});await oauthSettle();assert.equal(ui.calls.length,before,'Forged refresh cannot replace an ambiguous dispatch');
 ui.tools.submit('bi-recovery',ui.form());await oauthSettle();const sends=ui.calls.filter(call=>call.action==='recovery/send');assert.equal(sends.length,2);assert.deepEqual(sends[0].body,sends[1].body);
});
