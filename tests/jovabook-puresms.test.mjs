import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {normaliseSmsPhone} from '../lib/jovabook-phone.mjs';
import {createPureSmsAdapter,selectSmsProvider,createBookingSmsHandlers} from '../lib/jovabook-sms.mjs';

const json=(data,status=200)=>Response.json(data,{status});
const config={apiKey:'fixture-key',ukSender:'JovaBook',usSender:'+18885550100',caSender:'+18885550101',auSender:'JovaBook',approvedCountries:['GB','US','CA','AU']};
const salon_id='20000000-0000-4000-8000-000000000001';

test('browser and server phone rules stay identical without runtime dependencies',async()=>{
 const context={window:{}};vm.runInNewContext(await readFile(new URL('../booking-demo/sms-phone.js',import.meta.url),'utf8'),context);
 for(const [value,country] of [['07700 900123','GB'],['+1 415 555 2671','US'],['+1 416 555 2671','CA'],['0412 345 678','AU'],['+1 242 555 2671','US']])assert.equal(context.window.JovaSmsPhone.normalise(value,country),normaliseSmsPhone(value,country)?.destination||'');
 for(let area=200;area<=999;area++)for(const exchange of ['200','555','999']){
  const value=`+1${area}${exchange}0000`;
  assert.equal(context.window.JovaSmsPhone.normalise(value,'US'),normaliseSmsPhone(value,'US')?.destination||'',value);
 }
});

test('phone routing supports the four markets and refuses other NANP destinations',()=>{
 for(const [input,defaultCountry,destination,country] of [
  ['07700 900123','GB','447700900123','GB'],['0044 (7700) 900123','GB','447700900123','GB'],
  ['(415) 555-2671','US','14155552671','US'],['+1 212 555 2671','GB','12125552671','US'],
  ['+1 604 555 2671','GB','16045552671','CA'],['416-555-2671','CA','14165552671','CA'],
  ['+61 412 345 678','GB','61412345678','AU'],['0412 345 678','AU','61412345678','AU'],
 ])assert.deepEqual(normaliseSmsPhone(input,defaultCountry),{destination,country},input);
 for(const input of ['+1 242 555 2671','+1 246 555 2671','+1 787 555 2671','+1 671 555 2671','+1 876 555 2671','+1 800 555 2671','+1 999 555 2671','+61 2 1234 5678','07000 900123','+33 612345678','+447700900123 ext 9','++447700900123','+00447700900123',''])assert.equal(normaliseSmsPhone(input),null,input);
});

test('approved platform sender is selected by recipient country with one direct API POST',async()=>{
 const calls=[],adapter=createPureSmsAdapter({...config,send:async(url,options)=>{calls.push({url,options});return json({id:String(calls.length),countryCode:1});}});
 for(const destination of ['447700900123','14155552671','14165552671','61412345678'])assert.equal((await adapter.sendMessage({destination,sender:'Unapproved',salon_id,content:'Your appointment is tomorrow.'})).state,'Sent');
 assert.equal(calls.length,4);
 assert.deepEqual(calls.map(c=>JSON.parse(c.options.body).sender),['JovaBook','+18885550100','+18885550101','JovaBook']);
 for(const call of calls){
  assert.equal(call.url,'https://connect-api.divergent.cloud/sms/send');
  assert.equal(call.options.method,'POST');assert.equal(call.options.headers['X-Api-Key'],'fixture-key');
  const body=JSON.parse(call.options.body);assert.match(body.recipient,/^\+/);assert.equal(body.kind,'Transactional');assert.equal(body.enableLinkShortening,false);assert.equal(body.clientTag,'jovabook-'+salon_id);
 }
});

test('missing or unsuitable country sender prevents a request instead of falling back',async()=>{
 let calls=0;const send=async()=>{calls++;return json({id:'1'});};
 for(const options of [{...config,usSender:undefined},{...config,usSender:'JovaBook'},{...config,apiKey:undefined},{...config,approvedCountries:[]}]){
  const adapter=createPureSmsAdapter({...options,send});
  assert.equal((await adapter.sendMessage({destination:'14155552671',salon_id,content:'Hi'})).state,'Failed');
 }
 const adapter=createPureSmsAdapter({...config,send});
 assert.equal((await adapter.sendMessage({destination:'12425552671',content:'Hi'})).state,'Failed');
 assert.equal((await adapter.sendMessage({destination:'+14155552671',content:'Hi'})).state,'Failed');
 assert.equal(calls,0);
});

test('usage tags require the trusted business UUID and ignore arbitrary client labels',async()=>{
 const calls=[],adapter=createPureSmsAdapter({...config,send:async(_url,options)=>{calls.push(JSON.parse(options.body));return json({id:'1'});}});
 for(const business of [undefined,'client@example.test','20000000-0000-4000-8000-000000000001/private'])assert.equal((await adapter.sendMessage({destination:'14155552671',salon_id:business,content:'Hi'})).state,'Failed');
 assert.equal(calls.length,0);
 assert.equal((await adapter.sendMessage({destination:'14155552671',salon_id,clientTag:'client@example.test',content:'Hi'})).state,'Sent');
 assert.equal(calls[0].clientTag,'jovabook-'+salon_id);assert.doesNotMatch(JSON.stringify(calls),/example\.test/);
});

test('uncertain acceptance never fabricates an ID, retries or claims delivery',async()=>{
 for(const respond of [()=>json({},200),()=>json({id:9007199254740992},200),()=>new Response('bad',{status:202}),()=>json({id:'safe'},503),()=>{throw Error('timeout');}]){
  let calls=0;const adapter=createPureSmsAdapter({...config,send:async()=>{calls++;return respond();}});
  const result=await adapter.sendMessage({destination:'14155552671',salon_id,content:'Hi'});
  assert.equal(result.state,'Unknown');assert.equal(result.provider_id,undefined);assert.equal(calls,1);
  assert.equal(await adapter.delivery('1','14155552671'),null);assert.equal(calls,1);
 }
 const adapter=createPureSmsAdapter({...config,send:async()=>json({id:'9223372036854775807'},202)});
 assert.deepEqual(await adapter.sendMessage({destination:'14155552671',salon_id,content:'Hi'}),{state:'Sent',provider_id:'9223372036854775807',provider_status:'SENT'});
});

test('PureSMS is selected explicitly and missing credentials never activate SMS Works',()=>{
 const legacy={SMS_WORKS_JWT:'fixture-old-key'};
 assert.equal(selectSmsProvider(legacy).name,'PureSMS');assert.equal(selectSmsProvider(legacy).configured,false);
 assert.equal(selectSmsProvider({...legacy,JOVABOOK_SMS_PROVIDER:'puresms'}).configured,false);
 assert.equal(selectSmsProvider({...legacy,JOVABOOK_SMS_PROVIDER:'smsworks'}).name,'The SMS Works');
 assert.equal(selectSmsProvider({...legacy,JOVABOOK_SMS_PROVIDER:'unknown'}).configured,false);
});

test('readiness reports unverified PureSMS transport separately from configured countries and balance',async()=>{
 const token='a'.repeat(64),calls=[],env={JOVABOOK_SMS_WORKER_TOKEN:token,JOVABOOK_SMS_PROVIDER:'puresms',PURESMS_API_KEY:'fixture-key',PURESMS_UK_SENDER:'JovaBook',PURESMS_APPROVED_COUNTRIES:'GB',JOVABOOK_SUPABASE_URL:'https://database.example.test',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'fixture-public'};
 const send=async(url,options)=>{calls.push(url);const action=JSON.parse(options.body).p_action;assert.equal(action,'health');return json({enabled:false,provider_configured:false,budgets_configured:true});};
 const handler=createBookingSmsHandlers({env,send});
 const response=await handler.worker(new Request('https://example.test/worker',{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify({action:'status'})}));
 const body=await response.json();assert.equal(body.provider_name,'PureSMS');assert.equal(body.provider_configuration_ready,true);assert.equal(body.provider_ready,null);assert.equal(body.provider_verification,'not_checked');assert.equal(body.delivery_verified,false);assert.equal(body.credits,null);assert.equal(body.attempted,0);assert.deepEqual(body.configured_countries,['GB']);assert.deepEqual(body.missing_countries,['US','AU','CA']);assert.equal(calls.length,1);
});

test('unapproved prepared route is cancelled before begin, retail debit or provider HTTP',async()=>{
 const token='a'.repeat(64),actions=[],env={JOVABOOK_SMS_ENABLED:'true',JOVABOOK_SMS_WORKER_TOKEN:token,JOVABOOK_SMS_PROVIDER:'puresms',PURESMS_API_KEY:'fixture-key',PURESMS_UK_SENDER:'JovaBook',PURESMS_US_SENDER:'+18885550100',PURESMS_APPROVED_COUNTRIES:'GB',JOVABOOK_SUPABASE_URL:'https://database.example.test',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'fixture-public'};
 const handler=createBookingSmsHandlers({env,send:async(url,options)=>{
  assert.match(url,/database\.example\.test\/rest\/v1\/rpc\/booking_sms_worker$/);
  const body=JSON.parse(options.body),action=body.p_action;actions.push(action);
  if(action==='health')return json({enabled:true,provider_configured:true,budgets_configured:true});
  if(action==='claim')return json([{id:'job',lease:'lease'}]);
  if(action==='prepare')return json({salon_id,destination:'14155552671',content:'Hi'});
  if(action==='unavailable'){assert.deepEqual(body.p_payload,{id:'job',lease:'lease'});return json({ok:true,cancelled:true});}
  if(action==='poll')return json([]);
  throw Error('Must not begin or send an unapproved route');
 }});
 const response=await handler.worker(new Request('https://example.test/worker',{method:'POST',headers:{authorization:'Bearer '+token}}));
 assert.equal(response.status,200);assert.equal((await response.json()).attempted,0);
 assert.deepEqual(actions,['health','claim','prepare','unavailable','poll']);
});

test('unconfigured replacement refuses worker claims without exposing secrets or using old transport',async()=>{
 const token='a'.repeat(64),env={JOVABOOK_SMS_WORKER_TOKEN:token,JOVABOOK_SMS_ENABLED:'true',JOVABOOK_SMS_PROVIDER:'puresms',SMS_WORKS_JWT:'never-use-this',JOVABOOK_SUPABASE_URL:'https://database.example.test',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'fixture-public'};
 const handler=createBookingSmsHandlers({env,send:async()=>{throw Error('No database or provider request expected');}});
 const response=await handler.worker(new Request('https://example.test/worker',{method:'POST',headers:{authorization:'Bearer '+token}}));
 assert.equal(response.status,503);assert.doesNotMatch(JSON.stringify(await response.json()),/never-use-this/);
});
