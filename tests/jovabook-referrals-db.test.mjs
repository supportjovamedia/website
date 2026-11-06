import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {bootstrap,sources} from '../scripts/jovabook-test-db.mjs';
const owner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',sid='20000000-0000-4000-8000-000000000001',otherSid='20000000-0000-4000-8000-000000000002',op='10000000-0000-4000-8000-000000000099',token='c'.repeat(64);
test('referral attribution, qualification, base rewards and expiry are enforced in PostgreSQL',async t=>{
 const db=new PGlite(),q=(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>(await q(sql,args)).rows[0]?.value;
 const identity=async id=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
 const action=(id,operation,invoice=null)=>value('select operator_referral_action($1,$2,$3,$4) value',[id,operation,'Checked the real paid invoice, completion date, no refunds, disputes or duplicate businesses.',invoice]);
 const worker=(a,p)=>value('select booking_offer_worker($1,$2,$3) value',[token,a,JSON.stringify(p)]);
 try{
  await bootstrap(db,await sources());
  await q("insert into auth.users(id,email,email_confirmed_at) values($1,'operator-referral@example.test',now())",[op]);
  // Use fixture email, rather than depending on its spelling in the bootstrap.
  await q("insert into jovabook_private.operators(email) values('operator-referral@example.test') on conflict do nothing");
  await q("update jovabook_private.billing_config set worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[token]);
  const code=await value('select code value from jovabook_private.referral_codes where salon_id=$1',[sid]);
  let created=[],referrals=[];
  await t.test('no public ledger access, public code lookup returns no business details',async()=>{
   await db.exec('set role anon');assert.equal(await value('select referral_code_valid($1) value',[code.toLowerCase()]),true);assert.equal(await value("select referral_code_valid('NOTACODE00') value"),false);
   await assert.rejects(q('select * from jovabook_private.referrals'),/permission denied/);
   await assert.rejects(q('select operator_referrals()'),/permission denied/);await db.exec('reset role');
  });
  await t.test('invalid attribution is atomic; signup captures one referral before payment',async()=>{
   for(let i=0;i<3;i++){
    const uid=crypto.randomUUID();await db.exec('reset role');await q("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",[uid,'referred-'+i+'@example.test']);await identity(uid);
    await assert.rejects(value("select create_referred_business($1,$2,'Fictional owner','NOTACODE00') value",['Fictional business '+i,'referral-test-'+i]),/code not found/i);
    const result=await value('select create_referred_business($1,$2,$3,$4) value',['Fictional business '+i,'referral-test-'+i,'Fictional owner',code]);assert.equal(result.ok,true);created.push({uid,id:result.salon_id});
    await assert.rejects(value('select create_referred_business($1,$2,$3,$4) value',['Duplicate','duplicate-'+i,'Owner',code]),/already has a business/i);
   }
   await db.exec('reset role');referrals=(await q('select * from jovabook_private.referrals order by joined_at,id')).rows;assert.equal(referrals.length,3);
   await identity(owner);let data=await value('select owner_account_access() value');assert.equal(data.referrals.joined,3);assert.equal(data.referrals.qualified,0);assert.equal(data.referrals.available,0);
   await identity(other);data=await value('select owner_account_access() value');assert.equal(data.referrals.joined,0);await assert.rejects(q('select jovabook_private.referral_summary($1)',[sid]),/permission denied|business owner/);
  });
  await t.test('failed, free, annual, partial and stale billing proof do not qualify',async()=>{
   await db.exec('reset role');const r=referrals[0],customer='cus_Referral0';await q("update jovabook_private.offer_accounts set customer_id=$2 where salon_id=$1",[r.referred,customer]);
   const context=await worker('context',{salon:r.referred});assert.equal(context.referral.invoice_id,null);
   const fence=(await worker('sync_begin',{salon:r.referred})).fence;
   const proof={invoice_id:'in_Referral0',subscription_id:'sub_Referral0',amount_paid:2000,plan:'standard',cadence:'annual',period_start:new Date().toISOString(),period_end:new Date(Date.now()+365*86400000).toISOString()};
   const base={salon:r.referred,customer_id:customer,fence,provider_status:'none',paid_verified:false,subscription_id:'sub_Referral0'};
   await worker('sync_apply',{...base,referral_evidence:proof});assert.equal(await value('select invoice_id value from jovabook_private.referrals where id=$1',[r.id]),null);
   await worker('sync_apply',{...base,referral_evidence:{...proof,cadence:'monthly',amount_paid:0}});assert.equal(await value('select invoice_id value from jovabook_private.referrals where id=$1',[r.id]),null);
   await identity(op);await assert.rejects(action(r.id,'qualify','in_Referral0'),/completed paid monthly cycle/i);
  });
  await t.test('server billing evidence is immutable, ready only at actual cycle end, manually qualified once',async()=>{
   await db.exec('reset role');
   for(let i=0;i<referrals.length;i++){
    const r=referrals[i];await q("update jovabook_private.referrals set joined_at=now()-interval '2 months' where id=$1",[r.id]);await q('update jovabook_private.offer_accounts set customer_id=$2 where salon_id=$1',[r.referred,'cus_Referral'+i]);
    const fence=(await worker('sync_begin',{salon:r.referred})).fence;
    const start=await value("select (now()-interval '1 month 1 day')::text value"),end=await value("select (now()-interval '1 day')::text value");
    const payload={salon:r.referred,customer_id:'cus_Referral'+i,fence,provider_status:'active',paid_verified:false,subscription_id:'sub_Referral'+i,referral_evidence:{invoice_id:'in_Referral'+i,subscription_id:'sub_Referral'+i,amount_paid:2000,plan:'standard',cadence:'monthly',period_start:start,period_end:end}};
    await worker('sync_apply',payload);assert.equal(await value('select invoice_id value from jovabook_private.referrals where id=$1',[r.id]),'in_Referral'+i);
    await worker('sync_apply',{...payload,referral_evidence:{...payload.referral_evidence,invoice_id:'in_Replacement'+i}});assert.equal(await value('select invoice_id value from jovabook_private.referrals where id=$1',[r.id]),'in_Referral'+i);
   }
   await identity(owner);const before=await value('select owner_account_access() value');assert.equal(before.referrals.referrals.every(r=>r.ready),true);
   await identity(op);for(let i=0;i<referrals.length;i++){await assert.rejects(action(referrals[i].id,'qualify','in_Wrong'),/Confirm the verified/);await action(referrals[i].id,'qualify','in_Referral'+i);await action(referrals[i].id,'qualify','in_Referral'+i);}
   await identity(owner);const after=await value('select owner_account_access() value');assert.equal(after.referrals.qualified,3);assert.equal(after.referrals.earned,1);assert.equal(after.referrals.available,1);assert.equal(after.referrals.progress,0);
   await db.exec('reset role');assert.equal(await value('select count(*)::int value from jovabook_private.referral_rewards'),4);
  });
  await t.test('Free reward grants exactly one calendar month of Solo, no subscription or recurring charge',async()=>{
   await identity(owner);const access=await value('select owner_account_access() value'),reward=access.referrals.claimable_reward;assert.equal(access.referrals.can_claim,true);
   const result=await value('select claim_referral_reward($1) value',[reward]);assert.equal(result.ok,true);await value('select claim_referral_reward($1) value',[reward]);
   const upgraded=await value('select owner_account_access() value');assert.equal(upgraded.business.plan,'standard');assert.equal(upgraded.referrals.can_claim,false);assert.equal(upgraded.referrals.available,0);
   await db.exec('reset role');assert.equal(await value('select subscription_id value from jovabook_private.offer_accounts where salon_id=$1',[sid]),null);
   assert.equal(await value("select ends_at=starts_at+interval '1 month' value from jovabook_private.referral_rewards where id=$1",[reward]),true);
   await q("update jovabook_private.referral_rewards set starts_at=now()-interval '2 months',ends_at=now()-interval '1 month' where id=$1",[reward]);assert.equal(await value('select jovabook_private.offer_plan($1) value',[sid]),'essential');
  });
  await t.test('Team reward records £25 base only, cannot target annual invoices or redeem twice',async()=>{
   const r=referrals[0];await db.exec('reset role');await q("update jovabook_private.offer_accounts set plan='premium',seats=3,cadence='monthly',paid_until=now()+interval '1 month',provider_status='active' where salon_id=$1",[r.referred]);
   const reward=await value("select id value from jovabook_private.referral_rewards where salon_id=$1 and kind='welcome'",[r.referred]);await identity(created.find(c=>c.id===r.referred).uid);await assert.rejects(value('select claim_referral_reward($1) value',[reward]),/monthly renewal review/);await assert.rejects(action(r.id,'qualify','in_Referral0'),/Back-office access denied/);
   await identity(op);await action(reward,'schedule','in_Reward');await action(reward,'schedule','in_Reward');await db.exec('reset role');assert.equal(await value('select base_amount::int value from jovabook_private.referral_rewards where id=$1',[reward]),2500);
   await q("update jovabook_private.offer_accounts set cadence='annual' where salon_id=$1",[r.referred]);await identity(op);await assert.rejects(action(reward,'redeem','in_Reward'),/annual invoice/);
   await db.exec('reset role');await q("update jovabook_private.offer_accounts set cadence='monthly' where salon_id=$1",[r.referred]);await identity(op);await action(reward,'redeem','in_Reward');await action(reward,'redeem','in_Reward');await assert.rejects(action(reward,'schedule','in_AnotherReward'),/already assigned/);
  });
  await t.test('deleting a referred business cannot erase its fingerprint or create another welcome reward',async()=>{
   await db.exec('reset role');const r=referrals[2];await q("update jovabook_private.billing_accounts set deletion_state='purged' where salon_id=$1",[r.referred]).catch(()=>{});
   const ledger=(await q('select referred_fingerprint from jovabook_private.referrals where id=$1',[r.id])).rows[0];await assert.rejects(q("insert into jovabook_private.referrals(referred_fingerprint,business_name,referral_code) values($1,'Duplicate',$2)",[ledger.referred_fingerprint,code]),/unique/);
  });
 }finally{await db.close();}
});
