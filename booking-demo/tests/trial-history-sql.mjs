/* Full isolated schema, fictional identities only. No hosted DB or providers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {bootstrap,LEGACY_SOURCE_FILES,prepareSchemaSql,installOfflineGuard} from '../../scripts/jovabook-test-db.mjs';
const require=createRequire(import.meta.url),{PGlite}=require('@electric-sql/pglite');
const migration='migrations/20261102134215_trial_history.sql';
const operator='10000000-0000-4000-8000-000000000011',customer='10000000-0000-4000-8000-000000000012',unverified='10000000-0000-4000-8000-000000000013';
const owner='10000000-0000-4000-8000-000000000014',cascadeOwner='10000000-0000-4000-8000-000000000015';
const originalEmail='Fictional.Trial+initial@googlemail.com',normalEmail='fictionaltrial@gmail.com';
const fingerprintSQL='select jovabook_private.trial_fingerprint($1) value';
const sha=value=>createHash('sha256').update(value).digest('hex');
installOfflineGuard();

test('minimal private trial history survives full-schema purge and blocks repeat trials',async t=>{
 const db=new PGlite(),q=(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>(await q(sql,args)).rows[0].data;
 const as=async id=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec(id?'set role authenticated':'set role anon');};
 const ledger=async email=>(await q('select * from jovabook_private.trial_ledger where email_hash=jovabook_private.trial_fingerprint($1)',[email])).rows[0];
 const create=async(id,email,slug)=>{await db.exec('reset role');await q('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,email]);await as(id);const result=await value('select create_business_for_existing_user($1,$2,$3) data',['Fictional private business',slug,'Fictional private owner']);assert.equal(result.ok,true);await db.exec('reset role');return result.salon_id;};
 const lifeToken='c'.repeat(64),work=async(action,payload={})=>value('select booking_billing_worker($1,$2,$3) data',[lifeToken,action,JSON.stringify(payload)]);
 let business,original,deletedAt,opaque,baselineMarkers;
 const useCardTrial=async(salon)=>{
  // Registration no longer consumes a trial. Establish it through the real,
  // token-protected verification path using fictional provider references.
  const key='a'.repeat(64),customer='cus_'+salon.replaceAll('-',''),subscription='sub_'+salon.replaceAll('-','');
  const trialWork=async(action,payload={})=>value('select booking_billing_worker($1,$2,$3) data',[key,action,JSON.stringify({salon,...payload})]);
  await q("update jovabook_private.billing_config set enabled=true,provider_configured=true,worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[key]);
  await trialWork('bind_customer',{customer});const action=await trialWork('action_begin',{kind:'checkout',target:'essential',cadence:'monthly',request:randomUUID(),hash:'b'.repeat(64),trial:true});
  const {fence}=await trialWork('sync_begin'),start=new Date(Date.now()-1000),end=new Date(+start+72*3600000);
  const result=await trialWork('sync_apply',{fence,customer,subscription,plan:'essential',cadence:'monthly',status:'trialing',trial_verified:true,trial_action_id:action.id,trial_started_at:start.toISOString(),trial_ends_at:end.toISOString(),trial_payment_method:'pm_FictionalHistory'});assert.equal(result.trial_verified,true);
 };

 try{
  // Explicitly append this new version until the parent-owned manifest is updated.
  const files=[...LEGACY_SOURCE_FILES];if(!files.includes(migration))files.push(migration);
  const entries=await Promise.all(files.map(async name=>{const raw=await readFile(new URL('../supabase/'+name,import.meta.url),'utf8');return {name,sql:prepareSchemaSql(raw),sha256:sha(raw)};}));
  await bootstrap(db,{entries,hashes:Object.fromEntries(entries.map(e=>[e.name,e.sha256])),order:files,digest:sha(JSON.stringify(files))});
  for(const [id,email,confirmed] of [[operator,'support.jovamedia@gmail.com',true],[customer,'fictional-customer@example.test',true],[unverified,'fictional-unverified@example.test',false]])await q('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)',[id,email,confirmed?new Date():null]);
  await as(customer);await q("select portal_identity('customer')");await db.exec('reset role');
  baselineMarkers=(await q('select count(*)::int n from jovabook_private.trial_ledger')).rows[0].n;
  business=await create(owner,originalEmail,'fictional-trial-history');assert.equal(await ledger(normalEmail),undefined,'registration alone cannot consume a trial');await useCardTrial(business);
  // The contact address is deliberately different from the anti-repeat Auth email.
  await q("update public.salons set email='different-contact@example.test' where id=$1",[business]);
  original=await ledger(normalEmail);assert(original);assert.equal(original.business_deleted_at,null);

  await t.test('only a current verified operator can read minimal opaque trial markers',async()=>{
   for(const id of [null,'10000000-0000-4000-8000-000000000001',customer,unverified]){await as(id);await assert.rejects(q('select operator_trial_history()'));}
   await as(operator);const data=await value('select operator_trial_history() data');assert.equal(data.ok,true);assert.equal(data.total,baselineMarkers+1);assert.equal(data.has_more,false);
   await db.exec('reset role');const fingerprint=(await q(fingerprintSQL,[normalEmail])).rows[0].value;
   opaque='trial_'+sha('jovabook-trial-history-v1:'+fingerprint);
   await as(operator);const record=data.history.find(row=>row.reference===opaque);assert(record);assert.match(record.reference,/^trial_[a-f0-9]{64}$/);assert.deepEqual(Object.keys(record).sort(),['deleted','deleted_at','reference','trial_used_at']);assert.equal(record.deleted,false);assert.equal(record.deleted_at,null);
   for(const secret of [fingerprint,originalEmail,normalEmail,business,owner,'Fictional private','different-contact','email_hash','trial_pepper'])assert(!JSON.stringify(data).includes(secret),secret);
   await assert.rejects(q('select * from jovabook_private.trial_ledger'));await db.exec('reset role');
  });

  await t.test('full lifecycle purge removes the business and its content while preserving one trial marker',async()=>{
   await q("insert into customers(salon_id,id,name,email) values($1,'private-fixture','PRIVATE CUSTOMER','private-customer@example.test')",[business]);
   await q("update jovabook_private.billing_config set enabled=true,provider_configured=true,deletion_enabled=true,lifecycle_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[lifeToken]);
   await q("update jovabook_private.billing_accounts set trial_ends_at=now()-interval '49 hours' where salon_id=$1",[business]);
   const claim=await work('lifecycle_claim',{salon:business});assert(claim?.lease);
   await work('lifecycle_provider_closed',{salon:business,lease:claim.lease,closed_verified:true});
   const result=await work('lifecycle_purge',{salon:business,lease:claim.lease});assert.equal(result.purged,true);
   // Existing conservative FK scanning retains Auth for portal_roles. Do not
   // weaken that deletion policy as part of a history-only migration.
   assert.equal(result.auth_retained,true);
   for(const table of ['salons','customers','services','staff','bookings'])assert.equal((await q('select count(*)::int n from public.'+table+' where '+(table==='salons'?'id':'salon_id')+'=$1',[business])).rows[0].n,0);
   const row=await ledger(normalEmail);assert.equal(row.email_hash,original.email_hash);assert.equal(new Date(row.used_at).toISOString(),new Date(original.used_at).toISOString());assert(row.business_deleted_at);deletedAt=new Date(row.business_deleted_at).toISOString();
   await q('delete from auth.users where id=$1',[owner]);assert.equal((await q('select count(*)::int n from auth.users where id=$1',[owner])).rows[0].n,0);assert.equal(new Date((await ledger(normalEmail)).business_deleted_at).toISOString(),deletedAt);
   await as(operator);const data=await value('select operator_trial_history() data'),record=data.history.find(row=>row.reference===opaque);assert.equal(record.deleted,true);assert.equal(new Date(record.deleted_at).toISOString(),deletedAt);assert(!JSON.stringify(data).includes('PRIVATE CUSTOMER'));await db.exec('reset role');
  });

  await t.test('the same email and existing Gmail aliases re-register without a second trial or duplicate marker',async()=>{
   const before=(await q('select count(*)::int n from jovabook_private.trial_ledger')).rows[0].n;
   for(const [index,email] of [normalEmail,' FICTIONAL.TRIAL+again@GMAIL.COM ','fictional.trial+third@googlemail.com'].entries()){
    const id='10000000-0000-4000-8000-'+String(30+index).padStart(12,'0'),salon=await create(id,email,'fictional-repeat-'+index);
    await as(id);const access=await value('select owner_account_access() data');assert.equal(access.access,'setup');assert.equal(access.reason,'business_setup');assert.equal(access.full_until,null);assert.equal(access.billing.trial_eligible,false);assert.equal((await value('select start_trial() data')).eligible,false);assert.equal((await value('select public_booking_status($1) data',['fictional-repeat-'+index])).available,false);await db.exec('reset role');
    const account=(await q('select trial_started_at,trial_ends_at from jovabook_private.billing_accounts where salon_id=$1',[salon])).rows[0];assert.equal(account.trial_started_at,null);assert.equal(account.trial_ends_at,null);
    const row=await ledger(email);assert.equal(row.email_hash,original.email_hash);assert.equal(new Date(row.business_deleted_at).toISOString(),deletedAt);
    await q('delete from auth.users where id=$1',[id]);
   }
   assert.equal((await q('select count(*)::int n from jovabook_private.trial_ledger')).rows[0].n,before);
  });

  await t.test('Auth cascade captures the current Auth email before deleting all business rows',async()=>{
   const salon=await create(cascadeOwner,'cascade+trial@example.test','fictional-auth-cascade');await useCardTrial(salon);await q("update public.salons set email='other-contact@example.test' where id=$1",[salon]);
   const before=await ledger('cascade@example.test');assert.equal(before.business_deleted_at,null);await q('delete from auth.users where id=$1',[cascadeOwner]);assert.equal((await q('select count(*)::int n from public.salons where id=$1',[salon])).rows[0].n,0);assert((await ledger('cascade@example.test')).business_deleted_at);assert.equal(await ledger('other-contact@example.test'),undefined);
   const again='10000000-0000-4000-8000-000000000040';await create(again,'CASCADE+again@example.test','fictional-cascade-repeat');await as(again);assert.equal((await value('select start_trial() data')).eligible,false);await db.exec('reset role');assert.equal((await ledger('cascade+again@example.test')).email_hash,before.email_hash);
  });

  await t.test('rolled-back business deletion cannot leave a false deletion marker',async()=>{
   const id='10000000-0000-4000-8000-000000000050',salon=await create(id,'rollback@example.test','fictional-rollback');await useCardTrial(salon);await db.exec('begin');await q('delete from public.salons where id=$1',[salon]);assert((await ledger('rollback@example.test')).business_deleted_at);await db.exec('rollback');assert.equal((await ledger('rollback@example.test')).business_deleted_at,null);assert.equal((await q('select count(*)::int n from public.salons where id=$1',[salon])).rows[0].n,1);
  });

  await t.test('private deletion helpers and raw markers remain inaccessible to every browser role',async()=>{
   for(const id of [null,'10000000-0000-4000-8000-000000000001',customer,operator]){await as(id);await assert.rejects(q('select * from jovabook_private.trial_ledger'));await assert.rejects(q('select jovabook_private.trial_fingerprint($1)',[normalEmail]));await assert.rejects(q('select jovabook_private.mark_trial_business_deleted()'));}await db.exec('reset role');
   assert.deepEqual((await q("select column_name from information_schema.columns where table_schema='jovabook_private' and table_name='trial_ledger' order by ordinal_position")).rows.map(row=>row.column_name),['email_hash','used_at','business_deleted_at']);
  });

  await t.test('operator allowlist and email verification are rechecked for each history request',async()=>{
   await q('update auth.users set email_confirmed_at=null where id=$1',[operator]);await as(operator);await assert.rejects(q('select operator_trial_history()'));await db.exec('reset role');await q('update auth.users set email_confirmed_at=now(),email=$1 where id=$2',['revoked-operator@example.test',operator]);await as(operator);await assert.rejects(q('select operator_trial_history()'));await db.exec('reset role');
  });
 }finally{await db.close();}
});
