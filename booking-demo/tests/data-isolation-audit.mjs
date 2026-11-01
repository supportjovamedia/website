/* Isolated account adapter checks. All credentials, users and requests are mocks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=await readFile(new URL('../accounts.js',import.meta.url),'utf8');
const AUTH='jovabook-auth',RECOVERY='jovabook-recovery-v1';
const sidA='20000000-0000-4000-8000-000000000001',sidB='20000000-0000-4000-8000-000000000002';
const accessFor=owner=>({ok:true,access:'active',reason:'paid',business:{id:owner==='owner-a'?sidA:sidB,name:owner==='owner-a'?'Alpha Studio':'Bravo Studio',slug:owner,plan:'essential',status:'active'},lifecycle:{trialEndsAt:null,purgeAt:null},billing:{connected:false,canCheckout:false},staff_limit:1});
const session=(id='owner-a',expired=false)=>({access_token:'access-'+id,refresh_token:'refresh-'+id,expires_at:Math.floor(Date.now()/1000)+(expired?-1:3600),user:{id}});
const response=(data={},status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function harness({auth=session(),accessHandler,handler=async()=>response({plan:'essential'})}={}){const local=new Map(),tab=new Map(),requests=[],state={salons:[{id:'drink'}],accounts:[],resets:[]};if(auth)local.set(AUTH,JSON.stringify(auth));const store=map=>({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});const window={JOVA_SUPABASE:{url:'https://isolated.example.test',key:'mock-public'}};vm.runInNewContext(source,{window,crypto:webcrypto,Uint8Array,Date,Math,AbortController,setTimeout,clearTimeout,URLSearchParams,atob,location:{origin:'https://booking.example.test'},localStorage:store(local),sessionStorage:store(tab),fetch:async(url,options)=>{requests.push({url,options});if(url==='/api/jovabook/billing/status'){assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{});const owner=options.headers.Authorization?.replace('Bearer access-','');if(accessHandler)return accessHandler(owner,options);return ['owner-a','owner-b'].includes(owner)?response(accessFor(owner)):response({ok:false},401);}return handler(url,options);}});return {api:window.JovaAccounts.create(()=>state,()=>{}),local,tab,requests,state};}
const settle=()=>new Promise(r=>setImmediate(r));

test('a pending refresh cannot restore the account after logout',async()=>{
 const pending=deferred(),h=harness({auth:session('owner-a',true),handler:async url=>url.includes('refresh_token')?pending.promise:response({plan:'essential'})});const request=h.api.ownerCapabilities();await settle();await h.api.logout();pending.resolve(response(session()));await request;assert.equal(h.local.has(AUTH),false);assert.equal(h.api.hasSession(),false);
});
test('a late successful refresh for A cannot replace B or authorize a stale owner request',async()=>{
 const pending=deferred(),h=harness({auth:session('owner-a',true),handler:async url=>url.includes('refresh_token')?pending.promise:response({plan:'essential'})});const request=h.api.ownerRpc('owner_capabilities');await settle();h.local.set(AUTH,JSON.stringify(session('owner-b')));pending.resolve(response(session('owner-a')));const result=await request;assert.equal(result.ok,false);assert.equal(result.stale,true);assert.equal(result.auth,undefined);assert.equal(h.api.sessionIdentity(),'owner-b');assert.equal(h.requests.filter(x=>x.url.includes('/rpc/')).length,0);
});
test('a late rejected refresh for A cannot clear B',async()=>{
 const pending=deferred(),h=harness({auth:session('owner-a',true),handler:async url=>url.includes('refresh_token')?pending.promise:response({})});const request=h.api.ownerCapabilities();await settle();h.local.set(AUTH,JSON.stringify(session('owner-b')));pending.resolve(response({error:'expired'},401));await request;assert.equal(h.api.sessionIdentity(),'owner-b');
});
test('simultaneous owner operations share one refresh request',async()=>{
 const pending=deferred(),h=harness({auth:session('owner-a',true),handler:async url=>url.includes('refresh_token')?pending.promise:response(url.includes('email_delivery_info')?{enabled:false,provider:'Resend',reminder_hours:24}:{plan:'essential'})});const a=h.api.ownerCapabilities(),b=h.api.emailDeliveryInfo();await settle();assert.equal(h.requests.filter(x=>x.url.includes('refresh_token')).length,1);pending.resolve(response(session()));assert.equal((await a).plan,'essential');assert.equal((await b).ok,true);
});
test('a later login intent wins over an earlier password response',async()=>{
 const slow=deferred(),h=harness({auth:null,handler:async(url,options)=>{if(url.includes('grant_type=password'))return JSON.parse(options.body).email==='a@example.test'?slow.promise:response(session('owner-b'));if(url.includes('/salons?'))return response([{id:sidB,owner_id:'owner-b'}]);return response({});}});const a=h.api.login('a@example.test','Example123'),b=await h.api.login('b@example.test','Example123');assert.equal(b.ok,true);slow.resolve(response(session('owner-a')));assert.equal((await a).stale,true);assert.equal(h.api.sessionIdentity(),'owner-b');
});
test('a successful isolated demo login clears an unrelated live session without making a request',async()=>{
 const h=harness();h.api.seed({salonId:'drink',email:'demo@jovamedia.com',password:'Salon2026',owner:'Demo'});assert.equal((await h.api.login('demo@jovamedia.com','Salon2026')).ok,true);assert.equal(h.api.hasSession(),false);assert.equal(h.requests.length,0);
});
test('an owner response already in flight is discarded after account change',async()=>{
 const pending=deferred(),h=harness({handler:async()=>pending.promise});const request=h.api.ownerRpc('owner_capabilities');await settle();h.local.set(AUTH,JSON.stringify(session('owner-b')));pending.resolve(response({plan:'essential'}));const result=await request;assert.equal(result.ok,false);assert.equal(result.stale,true);assert.equal(result.data,undefined);
});
const tables=['categories','staff','services','customers','bookings','email_log','payments'];
function diaryHandler({mixed=false,wrongOwner=false,failEmail=false}={}){return async url=>{const u=new URL(url),name=u.pathname.split('/').at(-1);if(name==='salons')return response([{id:sidA,owner_id:wrongOwner?'owner-b':'owner-a'}]);if(name==='email_log'&&failEmail)return response({},503);return response([{salon_id:mixed&&name==='customers'?sidB:sidA,id:name+'-one'}]);};}
test('diary queries use explicit salon filters and accept only the authorized salon rows',async()=>{
 const h=harness({handler:diaryHandler()}),r=await h.api.loadDiary();assert.equal(r.ok,true);assert.equal(r.salon.id,sidA);assert.equal(h.requests[0].url,'/api/jovabook/billing/status');assert.equal(h.requests.at(-1).url,'/api/jovabook/billing/status');assert.equal(h.requests.filter(x=>x.url==='/api/jovabook/billing/status').length,2);for(const table of tables){const req=h.requests.find(x=>new URL(x.url,'https://booking.example.test').pathname.endsWith('/'+table));assert.equal(new URL(req.url).searchParams.get('salon_id'),'eq.'+sidA);assert.equal(r.rows[table][0].salon_id,sidA);}
});
test('mixed tenant rows and a salon belonging to a different owner are rejected',async()=>{
 assert.equal((await harness({handler:diaryHandler({mixed:true})}).api.loadDiary()).invalidTenant,true);const h=harness({handler:diaryHandler({wrongOwner:true})}),r=await h.api.loadDiary();assert.equal(r.invalidTenant,true);assert.equal(h.requests.length,2);assert.equal(h.requests.filter(r=>r.url.includes('/rest/v1/')).length,1);
});
test('unavailable email activity preserves core reads, while mixed activity never passes',async()=>{
 const r=await harness({handler:diaryHandler({failEmail:true})}).api.loadDiary();assert.equal(r.ok,true);assert.equal(r.emailActivityUnavailable,true);const h=harness({handler:async()=>response([{salon_id:sidB,id:'foreign'}])});assert.equal((await h.api.loadActivity(sidA)).invalidTenant,true);
});
test('switching accounts between salon discovery and table responses rejects the whole diary',async()=>{
 const pending=deferred(),h=harness({handler:async url=>url.includes('/salons?')?response([{id:sidA,owner_id:'owner-a'}]):pending.promise});const request=h.api.loadDiary();await settle();h.local.set(AUTH,JSON.stringify(session('owner-b')));pending.resolve(response([{salon_id:sidA,id:'old-a'}]));assert.equal((await request).stale,true);assert.equal(h.api.sessionIdentity(),'owner-b');
});
test('unverified, mixed and stale salon writes are refused before an HTTP mutation',async()=>{
 const h=harness({handler:diaryHandler()});assert.equal((await h.api.saveSalon({p_name:'Old A'},sidA)).stale,true);await h.api.loadDiary();const before=h.requests.length;assert.equal((await h.api.upsertRows('customers',[{salon_id:sidA,id:'one'},{salon_id:sidB,id:'two'}])).invalidTenant,true);h.local.set(AUTH,JSON.stringify(session('owner-b')));assert.equal((await h.api.saveSalon({p_name:'Old A'},sidA)).stale,true);assert.equal((await h.api.deleteRows('customers',sidA,['one'])).stale,true);assert.equal((await h.api.upsertRows('customers',[{salon_id:sidA,id:'one'}])).stale,true);assert.equal(h.requests.length,before);
});
test('a deferred save for A cannot affect or acknowledge a newer B login',async()=>{
 const pending=deferred(),h=harness({handler:async(url,options)=>{if(url.includes('grant_type=password'))return response(session('owner-b'));if(url.includes('/salons?'))return response([{id:options.headers.Authorization.endsWith('owner-b')?sidB:sidA,owner_id:options.headers.Authorization.endsWith('owner-b')?'owner-b':'owner-a'}]);if(url.includes('/rpc/save_salon'))return pending.promise;return response([]);}});await h.api.loadDiary();const saving=h.api.saveSalon({p_name:'A original business'},sidA);await settle();assert.equal((await h.api.login('b@example.test','Example123')).ok,true);pending.resolve(response(null));assert.equal((await saving).stale,true);assert.equal(h.api.sessionIdentity(),'owner-b');const sent=h.requests.find(r=>r.url.endsWith('/rpc/save_salon'));assert.equal(sent.options.headers.Authorization,'Bearer access-owner-a');assert.equal((await h.api.saveSalon({p_name:'A stale fields'},sidA)).stale,true);
});
const jwt=(expires=Math.floor(Date.now()/1000)+3600,id='recovery-a')=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:expires})).toString('base64url')+'.mockSignature';
const callback=token=>'#access_token='+token+'&type=recovery&expires_in=3600';
test('implicit recovery credentials stay isolated from the normal owner session and leave no token in return values',()=>{
 const h=harness(),before=h.local.get(AUTH),result=h.api.consumeRecoveryCallback(callback(jwt()));assert.equal(result.ok,true);assert.equal(result.handled,true);assert.equal(h.local.get(AUTH),before);assert.equal(JSON.parse(h.tab.get(RECOVERY)).kind,'recovery');assert.equal(JSON.stringify(result).includes('mockSignature'),false);
});
test('unrelated callbacks and arbitrary direct reset tokens do not establish recovery authorization',async()=>{
 const h=harness();assert.equal(h.api.consumeRecoveryCallback('#access_token='+jwt()+'&type=signup').handled,false);assert.equal((await h.api.checkResetToken(jwt())).ok,false);assert.equal((await h.api.resetPassword(jwt(),'Example123')).ok,false);assert.equal(h.requests.length,0);assert.equal(h.api.sessionIdentity(),'owner-a');
});
test('recovery verification calls the actual auth user endpoint before any password update',async()=>{
 const h=harness({handler:async(url,options)=>response(options.method==='GET'?{id:'recovery-a'}:{id:'recovery-a'})});h.api.consumeRecoveryCallback(callback(jwt()));assert.equal((await h.api.checkResetToken('')).ok,true);const checked=h.requests.length;assert.equal((await h.api.resetPassword('','Example123')).ok,true);assert.equal(h.requests[checked].options.method,'GET');assert.equal(h.requests[checked+1].options.method,'PUT');assert(h.requests.every(r=>r.url.endsWith('/auth/v1/user')));assert.equal(h.tab.has(RECOVERY),false);assert.equal(h.api.sessionIdentity(),'owner-a');
});
test('expired or denied recovery clears only recovery credentials',async()=>{
 const h=harness({handler:async()=>response({message:'Expired'},401)});h.api.consumeRecoveryCallback(callback(jwt()));assert.equal((await h.api.checkResetToken('')).reason,'expired');assert.equal(h.tab.has(RECOVERY),false);assert.equal(h.api.sessionIdentity(),'owner-a');assert.equal(h.api.consumeRecoveryCallback(callback(jwt(1))).reason,'expired');assert.equal(h.api.consumeRecoveryCallback('#error=access_denied&error_code=otp_expired').reason,'expired');
});
test('recovery request network, rate-limit and provider errors are reported honestly',async()=>{
 for(const [status,flag] of [[429,'locked'],[500,'ok'],[400,'ok']]){const h=harness({handler:async()=>response({error:'Unavailable'},status)}),r=await h.api.requestReset('missing@example.test');assert.equal(r.ok,false);if(flag==='locked')assert.equal(r.locked,true);}
 const failed=harness({handler:async()=>{throw Error('offline');}});assert.equal((await failed.api.requestReset('owner@example.test')).network,true);assert.equal((await harness({handler:async()=>response({})}).api.requestReset('missing@example.test')).ok,true);
});
test('late recovery verification cannot consume a newer recovery callback or another owner login',async()=>{
 const pending=deferred(),h=harness({handler:async()=>pending.promise});h.api.consumeRecoveryCallback(callback(jwt(undefined,'recovery-a')));const request=h.api.checkResetToken('');await settle();h.api.consumeRecoveryCallback(callback(jwt(undefined,'recovery-b')));h.local.set(AUTH,JSON.stringify(session('owner-b')));pending.resolve(response({id:'recovery-a'}));assert.equal((await request).stale,true);assert.equal(h.api.sessionIdentity(),'owner-b');assert(JSON.parse(h.tab.get(RECOVERY)).access_token.includes('.'));
});
test('invalid reset password is rejected before verifying or modifying an account',async()=>{
 const h=harness();h.api.consumeRecoveryCallback(callback(jwt()));assert.equal((await h.api.resetPassword('','weak')).ok,false);assert.equal(h.requests.length,0);assert.equal(h.tab.has(RECOVERY),true);
});

test('failed or forged access metadata never unlocks private reads or writes',async()=>{
 for(const accessHandler of [async()=>response({ok:false,message:'Unavailable'},503),async()=>response({...accessFor('owner-a'),access:'full'}),async()=>response({...accessFor('owner-a'),business:{...accessFor('owner-a').business,id:'salon-a'}})]){const h=harness({accessHandler,handler:diaryHandler()});assert.equal((await h.api.loadDiary()).ok,false);assert.equal(h.requests.filter(r=>r.url.includes('/rest/v1/')).length,0);assert.equal((await h.api.saveSalon({p_name:'Forbidden'},sidA)).ok,false);assert.equal(h.requests.filter(r=>r.url.includes('/rpc/save_salon')).length,0);}
 const h=harness({accessHandler:async()=>response(accessFor('owner-b')),handler:diaryHandler()});assert.equal((await h.api.loadDiary()).invalidTenant,true);assert.equal(h.requests.filter(r=>r.url.includes('/customers?')).length,0);
});
