import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {sources,bootstrap} from '../scripts/jovabook-test-db.mjs';
const salon='20000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002',owner='10000000-0000-4000-8000-000000000001';
const token='a'.repeat(64),verifier='b'.repeat(64),network='c'.repeat(64),account='acct_Fictional';

test('direct deposits reserve privately, verify payment, isolate tenants and refund eligible cancellations',async t=>{
 const db=new PGlite(),q=(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>(await q(sql,args)).rows[0].value;
 const worker=(action,payload={},secret=token)=>value('select booking_deposit_worker($1,$2,$3) value',[secret,action,JSON.stringify(payload)]);
 let date,hold;
 const begin=(extra={})=>worker('begin',{slug:'fictional-business-1',request_id:crypto.randomUUID(),verifier_hash:verifier,network_hash:network,service_id:'consultation',staff_id:'owner',date,time:'12:00',name:'Fixture Guest',email:'guest@example.test',phone:'07700900123',notes:'',...extra});
 try{
  await bootstrap(db,await sources());date=await value("select (current_date+15)::text value");
  await q("update jovabook_private.customer_config set payments_enabled=true,worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[token]);
  await q("insert into jovabook_private.business_integrations(salon_id,provider,encrypted,summary) values($1,'stripe','{\"v\":1}',jsonb_build_object('connection_method','provider_login','account_id',$2::text))",[salon,account]);
  await worker('owner_verify',{salon_id:salon,user_id:owner,account_id:account,ready:true});
  await worker('owner_save',{salon_id:salon,user_id:owner,deposit_percent:40});
  await t.test('anonymous public deposit rule matches the saved percentage and browser calculation',async()=>{
   const browser={window:{}};vm.runInNewContext(await readFile(new URL('../booking-demo/deposits.js',import.meta.url),'utf8'),browser);
   for(const [percent,price,pence] of [[100,1,100],[1,1,0],[1,30,30],[20,50,1000],[0,50,0]]){
    await worker('owner_save',{salon_id:salon,user_id:owner,deposit_percent:percent});
    await db.exec('set role anon');const data=await value("select public_salon('fictional-business-1') value");await db.exec('reset role');
    assert.equal(data.payments.deposit_percent,percent);assert.equal(data.payments.enabled,percent>0);
    assert.equal(Math.round(browser.window.JovaDeposits.amount(data,{price})*100),pence);
    assert.equal(await value('select jovabook_private.online_deposit_pence($1,$2) value',[salon,price]),pence);
    assert.deepEqual(Object.keys(data.payments).sort(),['deposit','deposit_percent','enabled']);assert.equal(data.deposit_checkout_available,true);
   }
   await q("update salons set payments='{\"enabled\":true,\"deposit\":5}'::jsonb where id=$1",[salon]);
   const legacy=await value("select public_salon('fictional-business-1') value");assert.equal(legacy.payments.deposit_percent,undefined);assert.equal(browser.window.JovaDeposits.amount(legacy,{price:50}),5);
   assert.equal(await value("select public_salon('missing-business') value"),null);
   await worker('owner_save',{salon_id:salon,user_id:owner,deposit_percent:40});
  });
  await t.test('untrusted callers and foreign owners cannot change payment settings',async()=>{
   await assert.rejects(worker('owner_status',{salon_id:salon,user_id:owner},'wrong'),/Invalid deposit worker/);
   await assert.rejects(worker('owner_save',{salon_id:other,user_id:owner,deposit_percent:40}),/Business access denied/);
   await db.exec('set role anon');await assert.rejects(q('select * from jovabook_private.deposit_checkouts'),/permission denied/);await db.exec('reset role');
   for(const amount of [-1,100.01,10001,1.111])await assert.rejects(worker('owner_save',{salon_id:salon,user_id:owner,deposit_percent:amount}),/Enter a deposit/);
  });
  await t.test('percentage calculation rounds to pence, handles zero/full deposits and never exceeds the price',async()=>{
   for(const [percent,price,pence] of [[5,30,150],[10,80,800],[15,19.99,300],[50,9.99,500],[7.5,19.99,150],[100,25,2500],[100,10000,1000000],[20,0,0],[5,1,0],[0,50,0]]){
    await worker('owner_save',{salon_id:salon,user_id:owner,deposit_percent:percent});
    assert.equal(await value('select jovabook_private.online_deposit_pence($1,$2) value',[salon,price]),pence);
   }
   await worker('owner_save',{salon_id:salon,user_id:owner,deposit_percent:40});
  });
  await t.test('a stale business-details save cannot turn off or overwrite the deposit percentage',async()=>{
   await q("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');
   await q("select save_salon(name,email,phone,address,settings,'{\"enabled\":false,\"deposit\":999}'::jsonb,usage) from salons where id=$1",[salon]);
   await db.exec('reset role');await q("select set_config('request.jwt.claim.sub','',false)");
   assert.equal(await value("select (payments->>'deposit_percent')::numeric value from salons where id=$1",[salon]),'40');
  });
  await t.test('hold uses database price and blocks a concurrent booking without creating a booking or email',async()=>{
   assert.equal((await worker('quote',{slug:'fictional-business-1'})).account_id,account);
   const before=await value('select count(*)::int value from bookings');hold=await begin();assert.equal(hold.amount,1000);assert.equal(Number(hold.price),25);
   assert.equal(await value('select count(*)::int value from bookings'),before);
   assert.equal(await value('select slot_free($1,\'owner\',$2,\'12:00\',30) value',[salon,date]),false);
   await assert.rejects(begin({email:'second@example.test'}),/no longer available/);
   const publicData=await value("select public_salon('fictional-business-1') value");assert(publicData.busy.some(b=>b.id==='hold_'+hold.id));
   assert(!JSON.stringify(publicData).includes('guest@example.test'));assert.equal(publicData.deposit_checkout_available,true);
   assert.equal((await value("select create_booking('fictional-business-1','consultation','owner',$1,'13:00','Client','bypass@example.test','','','Card') value",[date])).code,'online_deposit_unavailable');
  });
  await t.test('retry is idempotent and browser verification is bound to the same request',async()=>{
   const again=await begin({request_id:hold.request_id});assert.equal(again.id,hold.id);
   await assert.rejects(begin({request_id:hold.request_id,name:'Changed'}),/different request/);
   await assert.rejects(worker('status',{id:hold.id,verifier_hash:'d'.repeat(64)}),/access denied/);
   await worker('attach',{id:hold.id,account_id:account,provider_id:'cs_test_Fictional',url:'https://checkout.stripe.com/c/pay/example'});
   await assert.rejects(worker('paid',{id:hold.id,account_id:'acct_Other',provider_id:'cs_test_Fictional'}),/account mismatch/);
   await assert.rejects(worker('paid',{id:hold.id,account_id:account,provider_id:'cs_test_Fictional',payment_intent:'pi_Fictional',amount:1,currency:'gbp'}),/proof mismatch/);
  });
  await t.test('verified payment confirms exactly one booking and captures the real deposit ledger',async()=>{
   const proof={id:hold.id,account_id:account,provider_id:'cs_test_Fictional',payment_intent:'pi_Fictional',amount:1000,currency:'gbp',captured_at:Math.floor(Date.now()/1000)};
   const result=await worker('paid',proof);assert.equal(result.booking.status,'confirmed');assert.equal(Number(result.booking.deposit),10);assert.equal(result.booking.id,hold.booking_id);
   const retry=await worker('paid',proof);assert.equal(retry.booking.id,hold.booking_id);
   assert.equal(await value('select count(*)::int value from jovabook_private.customer_deposits'),1);
   assert.equal(await value('select count(*)::int value from bookings where id=$1',[hold.booking_id]),1);
   assert.equal(await value('select count(*)::int value from payments where booking_id=$1',[hold.booking_id]),0);
  });
  await t.test('business changes during checkout create a cancelled payment record and durable refund',async()=>{
   const h=await begin({time:'14:00',email:'refund@example.test'});
   await worker('attach',{id:h.id,account_id:account,provider_id:'cs_test_Refund'});
   await q("update staff set active=false where salon_id=$1 and id='owner'",[salon]);
   const r=await worker('paid',{id:h.id,account_id:account,provider_id:'cs_test_Refund',payment_intent:'pi_Refund',amount:1000,currency:'gbp',captured_at:Math.floor(Date.now()/1000)});
   assert.equal(r.booking.status,'cancelled');assert.equal(r.refund_requested,true);
   assert.equal(await value('select count(*)::int value from jovabook_private.customer_refunds where booking_id=$1',[h.booking_id]),1);
   await q("update staff set active=true where salon_id=$1 and id='owner'",[salon]);
  });
  await t.test('changing service price and deposit percentage during checkout preserves the accepted offer',async()=>{
   const h=await begin({time:'16:00',email:'price-change@example.test'});assert.equal(h.amount,1000);
   await worker('attach',{id:h.id,account_id:account,provider_id:'cs_test_Price'});
   await q("update services set price=50 where salon_id=$1 and id='consultation'",[salon]);
   await worker('owner_save',{salon_id:salon,user_id:owner,deposit_percent:80});
   const result=await worker('paid',{id:h.id,account_id:account,provider_id:'cs_test_Price',payment_intent:'pi_Price',amount:1000,currency:'gbp',captured_at:Math.floor(Date.now()/1000)});
   assert.equal(result.booking.price,25);assert.equal(result.booking.deposit,10);
   await q("update services set price=25 where salon_id=$1 and id='consultation'",[salon]);
   await worker('owner_save',{salon_id:salon,user_id:owner,deposit_percent:40});
  });
  await t.test('only provider-confirmed expiry releases a held slot; unfinished finance blocks deletion',async()=>{
   const h=await begin({time:'15:00',email:'expires@example.test'});
   await worker('expired_without_session',{id:h.id});assert.equal((await worker('status',{id:h.id,verifier_hash:verifier})).stage,'creating');
   await assert.rejects(q('delete from salons where id=$1',[salon]),/deposit checkout|payment|refund/i);
   await worker('attach',{id:h.id,account_id:account,provider_id:'cs_test_Expired'});
   await worker('expired',{id:h.id,account_id:account,provider_id:'cs_test_Expired'});
   assert.equal(await value('select slot_free($1,\'owner\',$2,\'15:00\',30) value',[salon,date]),true);
  });
  await t.test('cancellation at least 24 hours ahead requests exactly one refund and remains tenant-bound',async()=>{
   const foreign=await value("select cancel_booking('fictional-business-2',$1) value",[hold.booking_id]);assert.equal(foreign.ok,false);
   const cancel=()=>value("select cancel_booking('fictional-business-1',$1) value",[hold.booking_id]);
   const result=await cancel();assert.equal(result.ok,true);assert.equal(result.booking.status,'cancelled');
   await cancel();assert.equal(await value('select count(*)::int value from jovabook_private.customer_refunds where booking_id=$1',[hold.booking_id]),1);
  });
  await t.test('exceptional Stripe payments are visible only to their owner and a verified full refund releases the hold',async()=>{
   const h=await begin({time:'17:00',email:'attention@example.test'});
   const proof={id:h.id,account_id:account,provider_id:'cs_test_Attention',payment_intent:'pi_Attention'};
   await worker('attach',proof);await worker('attention',{...proof,reason:'external_refund'});
   assert.equal(await value('select slot_free($1,\'owner\',$2,\'17:00\',30) value',[salon,date]),false);
   const own=await worker('owner_status',{salon_id:salon,user_id:owner});assert(own.attention.some(row=>row.id===h.id));
   await assert.rejects(worker('owner_status',{salon_id:salon,user_id:'10000000-0000-4000-8000-000000000002'}),/Business access denied/);
   await assert.rejects(worker('externally_refunded',{...proof,amount:1,currency:'gbp'}),/Refund proof mismatch/);
   assert.equal((await worker('externally_refunded',{...proof,amount:1000,currency:'gbp'})).stage,'refunded');
   assert.equal(await value('select slot_free($1,\'owner\',$2,\'17:00\',30) value',[salon,date]),true);
   assert.equal(await value('select count(*)::int value from bookings where id=$1',[h.booking_id]),0);
  });
  await t.test('the server refuses cancellation within 24 hours, even if a caller ignores the hidden button',async()=>{
   await q("update salons set settings=jsonb_set(settings,'{hours}','{\"start\":\"00:00\",\"end\":\"23:59\",\"days\":[0,1,2,3,4,5,6]}'::jsonb) where id=$1",[salon]);
   const moment=(await q("select ((now() at time zone 'Europe/London')+interval '2 hours')::date::text date,to_char((now() at time zone 'Europe/London')+interval '2 hours','HH24:00') time")).rows[0];
   const h=await begin({...moment,email:'cutoff@example.test'});
   await worker('attach',{id:h.id,account_id:account,provider_id:'cs_test_Cutoff'});
   await worker('paid',{id:h.id,account_id:account,provider_id:'cs_test_Cutoff',payment_intent:'pi_Cutoff',amount:1000,currency:'gbp',captured_at:Math.floor(Date.now()/1000)});
   const result=await value("select cancel_booking('fictional-business-1',$1) value",[h.booking_id]);assert.equal(result.ok,false);assert.match(result.message,/24 hours/);
   assert.equal(await value('select count(*)::int value from jovabook_private.customer_refunds where booking_id=$1',[h.booking_id]),0);
   const b=await value("select get_booking('fictional-business-1',$1) value",[h.booking_id]);assert.equal(b.can_cancel,false);
  });
 }finally{await db.close();}
});
