import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import Stripe from 'stripe';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {parseArguments,validateEnvironment,guardedHttpClient,fixtureClockSql,safeError,createLocalLedger,verifyCatalog,cleanupFixtures,receiptWriter,runVerification,runCli} from '../scripts/jovabook-stripe-test.mjs';

const config={key:'rk_test_FictionalOnly',account:'acct_Fictional',prices:{essential:'price_Essential',standard:'price_Standard',premium:'price_Premium'}};
const environment={JOVABOOK_TEST_STRIPE_KEY:config.key,JOVABOOK_TEST_STRIPE_ACCOUNT_ID:config.account,...Object.fromEntries(Object.entries(config.prices).map(([plan,value])=>['JOVABOOK_TEST_PRICE_'+plan.toUpperCase(),value]))};
function fakeStripe(options={}){
 const calls=[],state={};const get=(name,fn)=>(...args)=>{calls.push({name,args});return Promise.resolve(fn(...args));};
 const stripe={
  accounts:{retrieveCurrent:get('account',()=>({id:options.account||config.account,charges_enabled:!options.paused}))},
  prices:{retrieve:get('price',id=>({id,active:true,livemode:options.live===true,currency:'gbp',unit_amount:{price_Essential:2000,price_Standard:5000,price_Premium:10000}[id],recurring:{interval:'month',interval_count:1}}))},
  paymentMethods:{create:get('method.create',body=>state.method={...body,id:'pm_Fixture',livemode:false,customer:null}),retrieve:get('method.retrieve',()=>state.method),detach:get('method.detach',()=>({...state.method,customer:null}))},
  customers:{create:get('customer.create',body=>{state.method.customer='cus_Fixture';return state.customer={...body,id:'cus_Fixture',livemode:false,balance:0};}),retrieve:get('customer.retrieve',()=>state.customer),del:get('customer.delete',id=>({id,deleted:true}))},
  subscriptions:{
   create:get('subscription.create',body=>{const start=Math.floor(Date.now()/1000),end=start+30*86400;state.invoice={id:'in_Fixture',customer:body.customer,parent:{subscription_details:{subscription:'sub_Fixture'}},livemode:false,currency:'gbp',status:'paid',total:2000,amount_paid:2000,amount_due:2000,amount_remaining:0,starting_balance:0,billing_reason:'subscription_create',status_transitions:{paid_at:start},lines:{data:[{id:'il_Fixture',currency:'gbp',amount:2000,quantity:1,pricing:{price_details:{price:config.prices.essential}},period:{start,end},parent:{subscription_item_details:{subscription:'sub_Fixture',proration:false}}}],has_more:false}};return state.subscription={...body,id:'sub_Fixture',livemode:false,status:'active',billing_cycle_anchor:start,items:{data:[{id:'si_Fixture',price:{id:config.prices.essential},quantity:1,current_period_start:start,current_period_end:end}]},latest_invoice:state.invoice};}),
   list:get('subscription.list',()=>({data:state.subscription?[state.subscription]:[],has_more:false})),retrieve:get('subscription.retrieve',()=>state.subscription),update:get('subscription.update',(_id,body)=>Object.assign(state.subscription,body)),cancel:get('subscription.cancel',()=>Object.assign(state.subscription,{status:'canceled'}))
  },
  invoices:{retrieve:get('invoice.retrieve',()=>state.invoice),update:get('invoice.update',(_id,body)=>Object.assign(state.invoice,body)),list:get('invoice.list',()=>({data:[state.invoice],has_more:false})),listLineItems:get('invoice.lines',()=>state.invoice.lines)},
  invoicePayments:{list:get('invoice.payments',()=>({data:[{id:'inpay_Fixture',invoice:state.invoice.id,status:'paid',currency:'gbp',amount_paid:2000,payment:{type:'payment_intent',payment_intent:'pi_Fixture'}}],has_more:false}))},
  paymentIntents:{retrieve:get('intent.retrieve',()=>({id:'pi_Fixture',customer:state.customer.id,livemode:false,status:'succeeded',currency:'gbp',amount_received:2000}))},
  creditNotes:{list:get('credits.list',()=>({data:[],has_more:false}))}
 };
 return {stripe,calls,state};
}
test('CLI confirmation is explicit and live or hosted configuration is rejected',async()=>{
 assert.deepEqual(parseArguments([]),{command:'preflight',confirmed:false});
 assert.throws(()=>parseArguments(['run']),/test_confirmation_required/);
 assert.throws(()=>parseArguments(['run','--confirm=live']),/invalid_option/);
 assert.deepEqual(validateEnvironment(environment,true),config);
 for(const env of [{...environment,JOVABOOK_TEST_STRIPE_KEY:'rk_live_FORBIDDEN'},{...environment,STRIPE_SECRET_KEY:'sk_live_FORBIDDEN'},{...environment,STRIPE_MODE:'live'},{...environment,DATABASE_URL:'postgres://forbidden'},{...environment,JOVABOOK_SUPABASE_URL:'https://forbidden.invalid'},{...environment,VERCEL:'1'},{...environment,JOVABOOK_TEST_STRIPE_KEY:'sk_test_unrestricted'},{...environment,JOVABOOK_TEST_PRICE_PREMIUM:config.prices.essential}])assert.throws(()=>validateEnvironment(env,true));
 const sdk=fakeStripe();await assert.rejects(runVerification(sdk.stripe,config),/test_confirmation_required/);assert.equal(sdk.calls.length,0);
});
test('transport refuses foreign network, live credentials, connected accounts and unconfirmed mutations before delegation',async()=>{
 const calls=[],base={makeRequest:(...args)=>calls.push(args)},headers={Authorization:'Bearer '+config.key},invoke=(client,changes={})=>client.makeRequest(changes.host??'api.stripe.com',changes.port??443,changes.path??'/v1/account',changes.method??'GET',changes.headers??headers,'',changes.protocol??'https',60000);
 const read=guardedHttpClient(base,config.key,false);await invoke(read);assert.equal(calls.length,1);assert.equal(calls[0][7],10000);
 for(const change of [{host:'api.stripe.com.evil.invalid'},{host:'localhost'},{port:80},{protocol:'http'},{path:'https://api.stripe.com/v1/account'},{path:'/v2/accounts'},{method:'POST'},{method:'DELETE'},{method:'PUT'},{headers:{Authorization:'Bearer rk_test_OTHER'}},{headers:{...headers,'Stripe-Account':'acct_Foreign'}}])await assert.rejects(invoke(read,change));
 assert.equal(calls.length,1);await invoke(guardedHttpClient(base,config.key,true),{method:'POST'});assert.equal(calls.length,2);
 await assert.rejects(invoke(guardedHttpClient(base,'rk_live_FORBIDDEN',true),{headers:{Authorization:'Bearer rk_live_FORBIDDEN'}}));assert.equal(calls.length,2);
});
test('account and exact test catalog fail closed before fixture writes',async()=>{
 for(const options of [{paused:true},{account:'acct_Foreign'},{live:true}]){const sdk=fakeStripe(options);await assert.rejects(verifyCatalog(sdk.stripe,config));assert(sdk.calls.every(call=>['account','price'].includes(call.name)));}
 const sdk=fakeStripe({paused:true}),report=await runVerification(sdk.stripe,config,{confirmed:true});assert.equal(report.status,'failed');assert.equal(report.error.code,'sandbox_payments_paused');assert.deepEqual(report.provider_objects,{});assert.equal(sdk.calls.length,1);
});
test('real installed SDK uses the guarded HTTP client contract without any socket',async()=>{
 let calls=0;
 const client=guardedHttpClient({makeRequest:async()=>{calls++;return {getStatusCode:()=>200,getHeaders:()=>({'request-id':'req_Fixture'}),getRawResponse:()=>({}),toJSON:async()=>({id:config.account,charges_enabled:true})};}},config.key,false);
 const sdk=new Stripe(config.key,{apiVersion:'2026-09-30.endive',maxNetworkRetries:0,telemetry:false,httpClient:client});
 assert.equal((await sdk.accounts.retrieveCurrent()).id,config.account);assert.equal(calls,1);
 await assert.rejects(sdk.customers.create({name:'Must not reach transport'}));assert.equal(calls,1);
});
test('offline preflight loads all current SQL without any network and binds auth and RPC to one ephemeral owner',async()=>{
 const previous={fetch:globalThis.fetch,http:http.request,https:https.request};let attempts=0;
 const deny=()=>{attempts++;throw Error('Network forbidden in offline proof');};globalThis.fetch=deny;http.request=deny;https.request=deny;
 try{
  let printed;const result=await runCli(['preflight'],{env:{},print:value=>{printed=value;}});assert.equal(result.status,'passed');assert.equal(printed.provider_mutations,0);assert.equal(attempts,0);
  const local=await createLocalLedger(randomUUID());try{
   assert.equal((await local.q('select count(*)::int n from salons')).rows[0].n,1);
   assert.equal((await local.work('context')).salon_id,local.salon);
   await assert.rejects(local.send('https://hosted.invalid/rest/v1/rpc/booking_billing_worker',{method:'POST'}),/nonlocal_database_transport_refused/);
   await assert.rejects(local.send('https://jovabook-local.invalid/auth/v1/user',{method:'GET',headers:{Authorization:'Bearer foreign'}}),/local_auth_refused/);
   await assert.rejects(local.send('https://jovabook-local.invalid/rest/v1/rpc/foreign',{method:'POST'}),/local_rpc_refused/);
   assert.equal((await local.q('select jovabook_test.fixture_time() instant')).rows[0].instant.toISOString(),new Date(local.now()).toISOString());
   await assert.rejects(local.setClock(local.now()-1),/fixture_clock_refused/);
  }finally{await local.close();}
 }finally{globalThis.fetch=previous.fetch;http.request=previous.http;https.request=previous.https;}
 assert.equal(attempts,0);
});
test('fixture-only clock patch does not alter qualified SQL calls; errors cannot expose provider secrets',()=>{
 assert.equal(fixtureClockSql('select now(),clock_timestamp(),x.now(),known_now();'),'select jovabook_test.fixture_time(),jovabook_test.fixture_time(),x.now(),known_now();');
 const result=safeError(Object.assign(Error('rk_test_SECRET customer@example.test'),{statusCode:403,requestId:'req_Safe',raw:{secret:'SECRET'}}));assert.deepEqual(result,{code:'stripe_test_verification_failed',http_status:403,request_id:'req_Safe'});
});
test('injected API path creates one paid subscription, reconciles actual SQL, accrues one local service and cleans up only that fixture',async()=>{
 const sdk=fakeStripe(),receipts=[];const original=sdk.stripe.paymentMethods.create;sdk.stripe.paymentMethods.create=(...args)=>{assert.equal(receipts.at(-1).provider_writes.at(-1).state,'started');assert(receipts.at(-1).fixture_scope.salon_id);return original(...args);};
 const report=await runVerification(sdk.stripe,config,{confirmed:true,onProgress:async value=>receipts.push(structuredClone(value))});assert.equal(report.status,'passed',JSON.stringify(report));assert.equal(report.steps.length,5);assert.deepEqual(report.local_commission,{amount_pence:50,status:'open',collected:false});assert.equal(report.cleanup.status,'cancelled_and_customer_deleted');
 assert.equal(sdk.calls.filter(call=>call.name==='subscription.create').length,1);assert.equal(sdk.calls.filter(call=>call.name==='subscription.update').length,1);assert.equal(sdk.calls.filter(call=>call.name==='subscription.cancel').length,1);assert.equal(sdk.calls.filter(call=>call.name==='customer.delete').length,1);assert.equal(sdk.state.subscription.status,'canceled');
 assert(!JSON.stringify(report).includes(config.key));assert(report.coverage_gaps.some(value=>value.includes('Guest merchant')));
});
test('unknown customer creation retains run key and manual review instead of a false clean receipt',async()=>{
 const sdk=fakeStripe(),create=sdk.stripe.customers.create,receipts=[];sdk.stripe.customers.create=async(...args)=>{await create(...args);throw Error('Accepted but response lost; rk_test_SECRET');};
 const report=await runVerification(sdk.stripe,config,{confirmed:true,onProgress:async value=>receipts.push(structuredClone(value))});
 assert.equal(report.status,'failed');assert.equal(report.cleanup.status,'manual_review_unknown_creation');assert.equal(report.cleanup.unknown_operations[0].operation,'customer');assert.equal(report.cleanup.unknown_operations[0].idempotency_key,'jovabook-test-'+report.run_id+'-customer');assert.equal(report.provider_objects.customer,undefined);
 assert.equal(sdk.calls.filter(call=>call.name==='customer.delete').length,0);assert.equal(receipts.at(-1).cleanup.status,'manual_review_unknown_creation');assert(!JSON.stringify(receipts).includes('rk_test_SECRET'));
});
test('failure to persist creation intent stops before any provider mutation',async()=>{
 const sdk=fakeStripe();
 await assert.rejects(runVerification(sdk.stripe,config,{confirmed:true,onProgress:async report=>{if(report.provider_writes.length)throw Error('Fixture receipt unavailable');}}),/Fixture receipt unavailable/);
 assert(sdk.calls.every(call=>['account','price'].includes(call.name)));
});
test('durable receipt writes immutable intent and progress snapshots without overwriting another run',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jovabook-stripe-receipt-')),runId=randomUUID(),write=receiptWriter(directory,runId);
 try{await write({run_id:runId,status:'intent'});await write({run_id:runId,status:'done'});assert.equal(JSON.parse(await fs.readFile(path.join(directory,runId+'.intent.json'),'utf8')).status,'intent');assert.equal(JSON.parse(await fs.readFile(path.join(directory,runId+'.0001.progress.json'),'utf8')).status,'intent');assert.equal(JSON.parse(await fs.readFile(path.join(directory,runId+'.0002.progress.json'),'utf8')).status,'done');await assert.rejects(receiptWriter(directory,runId)({status:'replacement'}),/local_receipt_write_failed/);}finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('cleanup rejects a customer or subscription that lost fixture ownership',async()=>{
 const runId=randomUUID(),salon=randomUUID(),meta={app:'jovabook',salon_id:salon,jovabook_test_run:runId};let deletes=0;
 const stripe={customers:{retrieve:async()=>({id:'cus_Fixture',livemode:false,metadata:meta}),del:async()=>{deletes++;}},subscriptions:{list:async()=>({data:[{id:'sub_Foreign',customer:'cus_Fixture',status:'active',livemode:false,metadata:{...meta,salon_id:randomUUID()}}],has_more:false}),cancel:async()=>{deletes++;}}};
 assert.equal((await cleanupFixtures(stripe,{customer:'cus_Fixture'},runId,salon)).status,'needs_attention');assert.equal(deletes,0);
 meta.jovabook_test_run='foreign';assert.equal((await cleanupFixtures(stripe,{customer:'cus_Fixture'},runId,salon)).status,'needs_attention');assert.equal(deletes,0);
});
