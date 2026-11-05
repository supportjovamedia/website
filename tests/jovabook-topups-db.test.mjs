import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {sources,bootstrap} from '../scripts/jovabook-test-db.mjs';
const sid='20000000-0000-4000-8000-000000000001',token='f'.repeat(64);
const job=n=>'40000000-0000-4000-8000-'+String(n).padStart(12,'0');

test('60 SMS per seat on paid plans; top-ups extend the allowance and never double-credit',async t=>{
 const db=new PGlite(),q=(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>(await q(sql,args)).rows[0]?.value;
 const limits=()=>value('select jovabook_private.offer_limits($1) value',[sid]);
 const reserve=(channel,n)=>value('select jovabook_private.offer_reserve_message($1,$2,$3) value',[sid,channel,job(n)]);
 const credit=(payload,secret=token)=>value('select booking_topup_worker($1,$2,$3) value',[secret,'credit',JSON.stringify({salon:sid,...payload})]);
 try{
  await bootstrap(db,await sources());
  await q("update jovabook_private.billing_config set worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex'),enabled=true,provider_configured=true",[token]);
  await t.test('allowances',async()=>{
   let l=await limits();assert.equal(l.sms_limit,0);assert.equal(l.email_limit,50);assert.equal(l.sms_credits,0);assert.equal(l.email_credits,0);
   await q("update jovabook_private.offer_accounts set plan='standard',seats=1,provider_status='active',paid_until=now()+interval '30 days',ever_paid=true");
   l=await limits();assert.equal(l.sms_limit,60);assert.equal(l.email_limit,100);
   await q("update jovabook_private.offer_accounts set plan='premium',seats=3");
   l=await limits();assert.equal(l.sms_limit,180);assert.equal(l.email_limit,300);
   await q("update jovabook_private.offer_accounts set plan='standard',seats=1");
  });
  await t.test('credits are verified, idempotent and only for published packs',async()=>{
   await assert.rejects(credit({channel:'sms',quantity:50,pence:500,ref:'pi_test_aaaaaaaa'},'0'.repeat(64)),/Invalid billing/);
   await assert.rejects(credit({channel:'sms',quantity:1000,pence:100,ref:'pi_test_aaaaaaaa'}),/Unknown top-up pack/);
   await assert.rejects(credit({channel:'sms',quantity:50,pence:500,ref:'not-a-ref'}),/Invalid payment reference/);
   const first=await credit({channel:'sms',quantity:50,pence:500,ref:'pi_test_aaaaaaaa'});assert.equal(first.duplicate,false);assert.equal(first.sms_credits,50);
   const again=await credit({channel:'sms',quantity:50,pence:500,ref:'pi_test_aaaaaaaa'});assert.equal(again.duplicate,true);assert.equal(again.sms_credits,50);
   const e=await credit({channel:'email',quantity:1000,pence:500,ref:'pi_test_bbbbbbbb'});assert.equal(e.email_credits,1000);
   await db.exec('set role anon');await assert.rejects(q('select * from jovabook_private.message_credits'),/permission denied/);await db.exec('reset role');
  });
  await t.test('a message uses the monthly allowance first, then credit, and each job is counted once',async()=>{
   await q('delete from jovabook_private.message_credit_use');
   await q("insert into jovabook_private.offer_message_usage(salon_id,channel,job_id,month) select $1,'email',gen_random_uuid(),(jovabook_private.offer_limits($1)->>'month')::date from generate_series(1,100)",[sid]);
   assert.equal((await limits()).email_credits,1000);
   assert.equal(await reserve('email',1),true);assert.equal(await reserve('email',1),true);
   assert.equal((await limits()).email_credits,999);
   // Texts: 60 monthly, then credit
   await q("insert into jovabook_private.offer_message_usage(salon_id,channel,job_id,month) select $1,'sms',gen_random_uuid(),(jovabook_private.offer_limits($1)->>'month')::date from generate_series(1,60)",[sid]);
   assert.equal(await reserve('sms',2),true);assert.equal((await limits()).sms_credits,49);
   await q("delete from jovabook_private.message_credits where channel='sms'");
   await q("delete from jovabook_private.message_credit_use where channel='sms'");
   assert.equal(await reserve('sms',3),false);
  });
 }finally{await db.close();}
});
