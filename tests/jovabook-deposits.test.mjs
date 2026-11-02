import test from 'node:test';
import assert from 'node:assert/strict';
import {createJovaBookDepositHandlers} from '../lib/jovabook-deposits.mjs';
import {createJovaBookIntegrationHandlers,sealCredentials} from '../lib/jovabook-integrations.mjs';
const time=Date.UTC(2026,10,2,12),sid='20000000-0000-4000-8000-000000000001',uid='10000000-0000-4000-8000-000000000001',hid='30000000-0000-4000-8000-000000000001',rid='40000000-0000-4000-8000-000000000001';
const account='acct_Salon',platform='acct_JovaMedia',verifier='b'.repeat(64),bookingId='bk_'+'a'.repeat(32);
const env={JOVABOOK_DEPOSIT_WORKER_READY:'true',JOVABOOK_SUPABASE_URL:'https://fixture.example.test',JOVABOOK_SUPABASE_PUBLISHABLE_KEY:'fixture',JOVABOOK_CUSTOMER_WORKER_TOKEN:'a'.repeat(64),JOVABOOK_CUSTOMER_REFUND_WORKER_TOKEN:'c'.repeat(64),JOVABOOK_CUSTOMER_PAYMENTS_ENABLED:'true',JOVABOOK_CUSTOMER_PAYMENTS_APPROVED:'true',JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY:'sk_test_Fixture',JOVABOOK_CUSTOMER_STRIPE_ACCOUNT_ID:platform,JOVABOOK_CUSTOMER_STRIPE_MODE:'test',JOVABOOK_DEPOSIT_WEBHOOK_SECRET:'whsec_Fixture'};
const hold=()=>({id:hid,salon_id:sid,account_id:account,booking_id:bookingId,amount:1000,currency:'gbp',stage:'creating',created_at:new Date(time).toISOString(),expires_at:new Date(time+35*60000).toISOString(),email:'guest@example.test',service_name:'Haircut',date:'2026-11-10',time:'12:00'});
const meta=()=>({app:'jovabook-deposit',checkout_id:hid,salon_id:sid,booking_id:bookingId});
const req=(path,body,origin='https://book.jovamedia.com',extra={})=>new Request('https://book.jovamedia.com/api/jovabook/deposits/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...extra},body:JSON.stringify(body)});
const startBody=()=>({slug:'fixture-studio',request_id:rid,verifier,service_id:'haircut',staff_id:'owner',date:'2026-11-10',time:'12:00',name:'Test Guest',email:'guest@example.test',phone:'',notes:''});
function fixture(options={}){
 const calls=[],db=[];let record={...hold(),...options.hold};
 let session={id:'cs_test_Fixture',mode:'payment',livemode:false,client_reference_id:hid,amount_total:1000,currency:'gbp',metadata:meta(),payment_intent:'pi_Fixture',status:'open',payment_status:'unpaid',url:'https://checkout.stripe.com/c/pay/fixture',...options.session};
 const log=(method,args)=>calls.push({method,args});
 const stripe={accounts:{retrieveCurrent:async()=>{log('platform',[]);return {id:options.platform||platform};},retrieve:async(...args)=>{log('merchant',args);return {id:account,charges_enabled:true,payouts_enabled:true,details_submitted:true,capabilities:{card_payments:'active'},...options.merchant};}},checkout:{sessions:{create:async(...args)=>{log('create',args);if(options.lostCreate)throw Error('Lost response');return session;},retrieve:async(...args)=>{log('retrieve',args);return session;},list:async(...args)=>{log('list',args);return {data:options.noSession?[]:[session],has_more:false};},expire:async(...args)=>{log('expire',args);session={...session,status:'expired'};return session;}}},paymentIntents:{retrieve:async(...args)=>{log('paymentProof',args);return {id:'pi_Fixture',status:'succeeded',livemode:false,currency:'gbp',amount:1000,amount_received:1000,metadata:meta(),latest_charge:{id:'ch_Fixture',paid:true,captured:true,status:'succeeded',currency:'gbp',amount_captured:1000,amount_refunded:0,disputed:false,payment_intent:'pi_Fixture',created:Math.floor(time/1000)},...options.intent};}},webhooks:{constructEvent:()=>{if(options.badSignature)throw Error('Invalid signature');return {livemode:false,account,type:'checkout.session.completed',data:{object:session},...options.event};}}};
 stripe.refunds={list:async(...args)=>{log('refundProof',args);return options.refunds||{data:[],has_more:false};}};
 const send=async(url,init)=>{const path=new URL(url).pathname;if(path==='/auth/v1/user')return Response.json({id:uid,email_confirmed_at:'2026-01-01'});if(path==='/rest/v1/rpc/owner_account_access')return Response.json({ok:true,business:{id:options.foreignOwner?'foreign':sid},access:'active'});const b=JSON.parse(init.body);db.push(b);let result;
  if(b.p_action==='quote')result={account_id:account};
  else if(b.p_action==='begin'||b.p_action==='status'||b.p_action==='context')result=record;
  else if(b.p_action==='attach'){record={...record,provider_id:b.p_payload.provider_id,stage:'open'};result=record;}
  else if(b.p_action==='owner_status'||b.p_action==='owner_verify'||b.p_action==='owner_save')result={ok:true,salon_id:sid,account_id:account,ready:true,payments:{enabled:true,deposit_percent:20,deposit:0}};
  else if(b.p_action==='paid'){record.stage='paid';result={ok:true,booking:{id:bookingId,status:'confirmed',deposit_percent:20,deposit:0}};}
  else if(b.p_action==='expired'||b.p_action==='expired_without_session')result={ok:true};
  else if(b.p_action==='reconcile')result=[record];
  else if(b.p_action==='attention')result={ok:true,stage:'needs_attention'};
  else if(b.p_action==='externally_refunded')result={ok:true,stage:'refunded'};
  else throw Error('Unexpected fixture action '+b.p_action);return Response.json(result);
 };
 return {calls,db,handlers:createJovaBookDepositHandlers({env:{...env,...options.env},send,stripe,now:()=>options.now||time})};
}
test('disabled, hostile-origin, card-data and malformed requests fail before any provider side effect',async()=>{
 for(const [options,body,origin,status] of [[{env:{JOVABOOK_CUSTOMER_PAYMENTS_ENABLED:'false'}},startBody(),undefined,503],[{},startBody(),'https://hostile.test',403],[{},{...startBody(),card:'4242'},undefined,400],[{},{...startBody(),verifier:'bad'},undefined,400]]){const f=fixture(options),r=await f.handlers.start(req('start',body,origin));assert.equal(r.status,status);assert.equal(f.calls.length,0);assert.equal(f.db.length,0);}
});
test('deposit Checkout uses only the salon account and database amount, without a platform commission fee',async()=>{
 const f=fixture(),r=await f.handlers.start(req('start',startBody()));assert.equal(r.status,200);assert.equal((await r.json()).id,hid);const c=f.calls.find(c=>c.method==='create');assert.equal(c.args[1].stripeAccount,account);assert.equal(c.args[0].line_items[0].price_data.unit_amount,1000);assert.equal(c.args[0].mode,'payment');assert.equal(c.args[0].payment_method_types,undefined);assert(!c.args[0].payment_intent_data.application_fee_amount);assert(!c.args[0].payment_intent_data.transfer_data);assert.deepEqual(c.args[0].payment_intent_data.metadata,meta());assert.equal(c.args[1].idempotencyKey,'jovabook-deposit-'+hid);assert.equal(f.db.find(x=>x.p_action==='begin').p_payload.verifier,undefined);
});
test('wrong platform or unready merchant never starts a checkout',async()=>{
 for(const options of [{platform:'acct_Wrong'},{merchant:{charges_enabled:false}},{env:{JOVABOOK_STRIPE_SECRET_KEY:env.JOVABOOK_CUSTOMER_STRIPE_SECRET_KEY}}]){const f=fixture(options);assert.notEqual((await f.handlers.start(req('start',startBody()))).status,200);assert(!f.calls.some(x=>x.method==='create'));assert(!f.db.some(x=>x.p_action==='begin'));}
});
test('a lost response retries the same request, never asserts payment, and does not attach an invented session',async()=>{
 const f=fixture({lostCreate:true});assert.equal((await f.handlers.start(req('start',startBody()))).status,503);assert.equal((await f.handlers.start(req('start',startBody()))).status,503);const creates=f.calls.filter(x=>x.method==='create');assert.equal(creates.length,2);assert.deepEqual(creates[0].args,creates[1].args);assert(!f.db.some(x=>['attach','paid'].includes(x.p_action)));
});
test('payment success requires exact account, session, amount and captured-charge proof',async()=>{
 const f=fixture({hold:{provider_id:'cs_test_Fixture',stage:'open'},session:{status:'complete',payment_status:'paid'}}),r=await f.handlers.status(req('status',{id:hid,verifier}));assert.equal(r.status,200);assert.equal((await r.json()).stage,'paid');assert.equal(f.calls.find(x=>x.method==='paymentProof').args[2].stripeAccount,account);assert.equal(f.db.find(x=>x.p_action==='paid').p_payload.amount,1000);
 for(const options of [{session:{livemode:true}},{session:{metadata:{...meta(),salon_id:'foreign'}}},{intent:{amount_received:500}},{intent:{application_fee_amount:100}},{intent:{transfer_data:{destination:'acct_Other'}}}]){const f=fixture({hold:{provider_id:'cs_test_Fixture',stage:'open'},session:{status:'complete',payment_status:'paid',...options.session},intent:options.intent});assert.equal((await f.handlers.status(req('status',{id:hid,verifier}))).status,503);assert(!f.db.some(x=>x.p_action==='paid'));}
});
test('browser cancellation expires its own unpaid Stripe session before releasing the slot',async()=>{
 const f=fixture({hold:{provider_id:'cs_test_Fixture',stage:'open'}}),r=await f.handlers.status(req('status',{id:hid,verifier,cancel:true}));assert.equal(r.status,200);assert.equal((await r.json()).stage,'expired');assert.equal(f.calls.find(x=>x.method==='expire').args[2].stripeAccount,account);assert(f.db.some(x=>x.p_action==='expired'));assert(!f.db.some(x=>x.p_action==='paid'));
});

test('failed asynchronous payments release a hold only after Stripe proves no money was captured',async()=>{
 for(const [amount_received,expected] of [[0,'expired'],[1000,'pending']]){
  const f=fixture({hold:{provider_id:'cs_test_Fixture',stage:'open'},session:{status:'complete',payment_status:'unpaid'},intent:{status:'requires_payment_method',amount_received,latest_charge:null}});
  const r=await f.handlers.status(req('status',{id:hid,verifier}));assert.equal(r.status,200);assert.equal((await r.json()).stage,expected);assert.equal(f.db.some(x=>x.p_action==='expired'),amount_received===0);assert(!f.db.some(x=>x.p_action==='paid'));
 }
});

test('an externally refunded or disputed capture is flagged without confirming a booking or charging again',async()=>{
 for(const [amount_refunded,disputed] of [[500,false],[0,true]]){
  const charge={id:'ch_Fixture',paid:true,captured:true,status:'succeeded',currency:'gbp',amount_captured:1000,amount_refunded,disputed,payment_intent:'pi_Fixture',created:Math.floor(time/1000)};
  const f=fixture({hold:{provider_id:'cs_test_Fixture',stage:'open'},session:{status:'complete',payment_status:'paid'},intent:{latest_charge:charge}});
  const response=await f.handlers.status(req('status',{id:hid,verifier}));assert.equal(response.status,200);assert.equal((await response.json()).stage,'needs_attention');assert(f.db.some(x=>x.p_action==='attention'));assert(!f.db.some(x=>x.p_action==='paid'));assert(!f.calls.some(x=>x.method==='create'));
 }
});

test('a resolved external refund survives reload without showing an unpaid checkout',async()=>{
 const f=fixture({hold:{stage:'expired',resolution:'externally_refunded'}});const r=await f.handlers.status(req('status',{id:hid,verifier}));assert.equal(r.status,200);assert.equal((await r.json()).stage,'refunded');assert(!f.db.some(x=>x.p_action==='paid'));assert(!f.calls.some(x=>x.method==='create'));
});

test('only exact succeeded refunds on the same salon charge release a paid checkout',async()=>{
 const charge={id:'ch_Fixture',paid:true,captured:true,status:'succeeded',currency:'gbp',amount_captured:1000,amount_refunded:1000,disputed:false,payment_intent:'pi_Fixture',created:Math.floor(time/1000)};
 const refund={id:'re_Fixture',livemode:false,status:'succeeded',payment_intent:'pi_Fixture',charge:'ch_Fixture',currency:'gbp',amount:1000};
 for(const [changes,expected] of [[{},'refunded'],[{status:'pending'},'needs_attention'],[{charge:'ch_Other'},'needs_attention'],[{amount:500},'needs_attention'],[{livemode:true},'needs_attention']]){
  const f=fixture({hold:{provider_id:'cs_test_Fixture',stage:'open'},session:{status:'complete',payment_status:'paid'},intent:{latest_charge:charge},refunds:{data:[{...refund,...changes}],has_more:false}});
  const r=await f.handlers.status(req('status',{id:hid,verifier}));assert.equal(r.status,200);assert.equal((await r.json()).stage,expected);assert(!f.db.some(x=>x.p_action==='paid'));assert.equal(f.calls.find(x=>x.method==='refundProof').args[1].stripeAccount,account);
 }
});
test('signed Connect webhook rejects foreign account and retrieves Stripe proof before booking',async()=>{
 const request=()=>req('webhook',{},undefined,{'stripe-signature':'fixture'});
 const f=fixture({session:{status:'complete',payment_status:'paid'}});assert.equal((await f.handlers.webhook(request())).status,200);assert(f.db.some(x=>x.p_action==='attach'));assert(f.db.some(x=>x.p_action==='paid'));
 for(const options of [{event:{account:'acct_Foreign'}},{badSignature:true}]){const f=fixture(options);assert.equal((await f.handlers.webhook(request())).status,400);assert(!f.db.some(x=>x.p_action==='paid'));}
});
test('settings require the authenticated owner and preserve business Stripe readiness',async()=>{
 const f=fixture(),r=await f.handlers.settings(req('settings',{salon_id:sid,deposit_percent:20},undefined,{Authorization:'Bearer fixture'}));assert.equal(r.status,200);assert(f.db.some(x=>x.p_action==='owner_verify'));assert(f.db.some(x=>x.p_action==='owner_save'));
 const foreign=fixture({foreignOwner:true});assert.equal((await foreign.handlers.settings(req('settings',{salon_id:sid},undefined,{Authorization:'Bearer fixture'}))).status,403);assert.equal(foreign.calls.length,0);
});
test('only verified salon OAuth connections bind payment readiness, and only when all deposit workers are activated',async()=>{
 for(const [kind,active,expected] of [['oauth',true,true],['oauth',false,false],['api',true,false]]){
  const options={...env,JOVABOOK_INTEGRATIONS_ENABLED:'true',JOVABOOK_INTEGRATIONS_WORKER_TOKEN:'d'.repeat(64),JOVABOOK_INTEGRATIONS_ENCRYPTION_KEY:'e'.repeat(64),JOVABOOK_STRIPE_CONNECT_ENABLED:'true',JOVABOOK_STRIPE_CONNECT_CLIENT_ID:'ca_Fixture',JOVABOOK_STRIPE_CONNECT_SECRET_KEY:'sk_test_Connect',...(active?{}:{JOVABOOK_DEPOSIT_WORKER_READY:'false'})};
  const credentials=kind==='oauth'?{auth_method:'stripe_connect',connected_account_id:account,mode:'test'}:{secret_key:'rk_test_AccountRead'};
  const row={salon_id:sid,provider:'stripe',revision:rid,encrypted:sealCredentials(credentials,options.JOVABOOK_INTEGRATIONS_ENCRYPTION_KEY,sid,'stripe')},bound=[];
  const send=async(url,init)=>{const path=new URL(url).pathname;if(path==='/auth/v1/user')return Response.json({id:uid,email_confirmed_at:'2026-01-01'});if(path==='/rest/v1/rpc/owner_account_access')return Response.json({ok:true,business:{id:sid},access:'active'});if(path==='/v1/account')return Response.json({id:account,charges_enabled:true,payouts_enabled:true,details_submitted:true,capabilities:{card_payments:'active'}});const body=JSON.parse(init.body);if(path.endsWith('booking_deposit_worker')){bound.push(body);return Response.json({ok:true,ready:true});}return Response.json({integrations:[row],actions:[],recovery_eligible:false,recovery_enabled:false});};
  const handlers=createJovaBookIntegrationHandlers({env:options,send});
  const response=await handlers.status(req('settings',{salon_id:sid},undefined,{Authorization:'Bearer fixture'}));
  assert.equal(response.status,200);const data=await response.json();assert.equal(data.integrations.find(x=>x.provider==='stripe').checkout_ready,expected);
  assert.equal(bound.length,expected?1:0);if(expected)assert.deepEqual(bound[0].p_payload,{salon_id:sid,user_id:uid,account_id:account,ready:true});
 }
});
