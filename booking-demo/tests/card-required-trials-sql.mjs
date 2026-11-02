/* Full-schema, isolated PostgreSQL. Fictional identities and worker proofs only. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';
import {SOURCE_FILES,prepareSchemaSql,installOfflineGuard} from '../../scripts/jovabook-test-db.mjs';
const {PGlite}=createRequire(import.meta.url)('@electric-sql/pglite');installOfflineGuard();
const token='a'.repeat(64),policy='3day-card-v1';
test('card-required three-day trials across every plan and cadence use actual isolated SQL',async t=>{
 const db=new PGlite(),q=(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>(await q(sql,args)).rows[0]?.data;
 const as=async id=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);if(id)await db.exec('set role authenticated');};
 const work=(action,payload={})=>value('select booking_billing_worker($1,$2,$3) data',[token,action,JSON.stringify(payload)]);
 let serial=0;
 const fixture=async()=>{
  await as(null);const n=++serial,owner=randomUUID(),email=`card-trial-${n}@example.test`,slug=`card-trial-${n}`;
  await q('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[owner,email]);await as(owner);
  const created=await value('select create_business_for_existing_user($1,$2,$3) data',['Fictional card-trial business',slug,'Fictional owner']);assert.equal(created.ok,true,JSON.stringify(created));await as(null);
  return {owner,email,slug,salon:created.salon_id,customer:`cus_Trial${n}`,subscription:`sub_Trial${n}`,paymentMethod:`pm_Trial${n}`};
 };
 const account=async f=>(await q('select * from jovabook_private.billing_accounts where salon_id=$1',[f.salon])).rows[0];
 const reserve=async(f,plan='standard',cadence='monthly')=>{
  await work('bind_customer',{salon:f.salon,owner:f.owner,customer:f.customer});
  const action=await work('action_begin',{salon:f.salon,owner:f.owner,kind:'checkout',target:plan,cadence,request:randomUUID(),hash:'b'.repeat(64),trial:true,trial_policy:policy});assert(action?.id,JSON.stringify(action));
  const context=await work('context',{salon:f.salon});assert.equal(context.card_trial_policy,policy);assert.equal(context.card_trial_action_id,action.id);assert.equal(context.card_trial_plan,plan);assert.equal(context.card_trial_cadence,cadence);assert.equal((await q('select count(*)::int n from jovabook_private.trial_ledger where email_hash=jovabook_private.trial_fingerprint($1)',[f.email])).rows[0].n,0);
  await work('action_finish',{salon:f.salon,id:action.id,provider_id:'cs_Trial'+serial,result:{url:'https://checkout.stripe.com/test'}});
  return {...f,action,plan,cadence};
 };
 const proof=async f=>{
  const state=await work('sync_begin',{salon:f.salon});const start=new Date(Date.now()-1000),end=new Date(+start+3*86400000);
  return {salon:f.salon,customer:f.customer,subscription:f.subscription,status:'trialing',plan:f.plan,cadence:f.cadence,fence:state.fence,trial_verified:true,trial_policy:policy,trial_action_id:f.action.id,trial_started_at:start.toISOString(),trial_ends_at:end.toISOString(),trial_payment_method:f.paymentMethod};
 };
 const noGrant=async f=>{const a=await account(f);assert.equal(a.trial_started_at,null);assert.equal(a.trial_ends_at,null);assert.equal(a.ever_paid,false);assert.equal((await q('select jovabook_private.billing_open($1) open',[f.salon])).rows[0].open,false);};
 try{
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key,email text not null,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),name text not null,owner uuid,owner_id text,unique(bucket_id,name));alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
  const migration=(await readdir(new URL('../supabase/migrations/',import.meta.url))).find(f=>f.endsWith('_card_required_trials.sql'));assert(migration,'Card-required trial migration must exist');
  const files=[...SOURCE_FILES];if(!files.includes('migrations/'+migration))files.push('migrations/'+migration);
  for(const [index,file] of files.entries()){const raw=await readFile(new URL('../supabase/'+file,import.meta.url),'utf8');assert(raw.trim(),file);await db.exec(prepareSchemaSql(raw));if(index===0)await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated;grant select on all tables in schema public to anon;');}
  await q("update jovabook_private.billing_config set enabled=true,provider_configured=true,worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[token]);
  await t.test('registration and start_trial cannot grant diary or online-booking access without a card',async()=>{
   const f=await fixture();assert.equal((await account(f)).card_trial_required,true);await noGrant(f);await as(f.owner);assert.equal((await value('select trial_check() data')).eligible,true);await value('select start_trial() data');const access=await value('select owner_account_access() data');assert.equal(access.access,'billing_only');await as(null);await noGrant(f);assert.equal((await value('select public_booking_status($1) data',[f.slug])).available,false);assert.equal(await value("select create_booking($1,'missing','missing',(current_date+7)::text,'12:00','Fictional','client@example.test','','','Card') data",[f.slug]),null);
  });
  for(const plan of ['essential','standard','premium'])for(const cadence of ['monthly','annual'])await t.test(`${plan} ${cadence}: verified saved card grants exactly three days with selected entitlements`,async()=>{
   const f=await reserve(await fixture(),plan,cadence),payload=await proof(f);const result=await work('sync_apply',payload);assert.equal(result.ok,true,JSON.stringify(result));const a=await account(f);assert.equal(a.ever_paid,false);assert.equal(+new Date(a.trial_ends_at)-+new Date(a.trial_started_at),3*86400000);await as(f.owner);const access=await value('select owner_account_access() data');assert.equal(access.access,'active');assert.equal(access.business.plan,plan);assert.equal(access.staff_limit,{essential:1,standard:5,premium:10}[plan]);await q("select save_setup('Fictional test address','+447700900123',$1)",[JSON.stringify({hours:{start:'09:00',end:'18:00',days:[0,1,2,3,4,5,6]},buffer:0,notice:0,workspace:{website:{premiumTemplate:'fixture-premium',homeIntro:'Fictional premium introduction'}}})]);const existing=(await q('select count(*)::int n from staff where salon_id=$1',[f.salon])).rows[0].n;for(let n=existing;n<access.staff_limit;n++)await q("insert into staff(salon_id,id,name) values($1,$2,'Fictional staff')",[f.salon,'staff-'+n]);await assert.rejects(q("insert into staff(salon_id,id,name) values($1,'over-cap','Over cap')",[f.salon]),/staff|supports|plan/i);await as(null);assert.equal((await value('select public_booking_status($1) data',[f.slug])).available,true);const website=await value('select public_salon($1) data',[f.slug]);assert(website);assert.equal(website.website_entitlement,plan==='premium'?'premium':'one-page');if(plan==='premium')assert.equal(website.settings.workspace.website.homeIntro,'Fictional premium introduction');else assert.equal(website.settings.workspace.website.homeIntro,undefined);assert.equal((await work('context',{salon:f.salon})).card_trial_eligible,false);
   const before=+new Date(a.trial_ends_at);const replay={...payload,fence:(await work('sync_begin',{salon:f.salon})).fence};await work('sync_apply',replay);assert.equal(+new Date((await account(f)).trial_ends_at),before,'replay cannot extend original trial');
  });

  await t.test('legacy trials retain their original clock and no card requirement is imposed retrospectively',async()=>{
   const f=await fixture();await q("update jovabook_private.billing_accounts set card_trial_required=false,trial_started_at=now()-interval '2 days',trial_ends_at=now()+interval '1 day' where salon_id=$1",[f.salon]);const before=(await account(f)).trial_ends_at;await as(f.owner);await value('select start_trial() data');assert.equal((await value('select owner_account_access() data')).access,'active');await as(null);assert.equal(+new Date((await account(f)).trial_ends_at),+new Date(before));assert.equal((await account(f)).card_trial_required,false);assert.equal((await work('context',{salon:f.salon})).card_trial_eligible,false);
  });
  await t.test('concurrent checkout submissions reserve one action without granting entitlement',async()=>{
   const f=await fixture();await work('bind_customer',{salon:f.salon,customer:f.customer});const submit=target=>work('action_begin',{salon:f.salon,kind:'checkout',target,cadence:'monthly',request:randomUUID(),hash:'d'.repeat(64),trial:true});const requests=await Promise.allSettled([submit('essential'),submit('premium')]);assert.equal(requests.filter(r=>r.status==='fulfilled').length,1);assert.equal(requests.filter(r=>r.status==='rejected').length,1);assert.equal((await q('select count(*)::int n from jovabook_private.billing_actions where salon_id=$1 and trial',[f.salon])).rows[0].n,1);await noGrant(f);
  });
  await t.test('wrong action, customer, missing card and stale fence cannot grant a trial',async()=>{
   for(const mutate of [p=>({...p,trial_action_id:randomUUID()}),p=>({...p,customer:'cus_AnotherBusiness'}),p=>({...p,trial_payment_method:null}),p=>({...p,plan:'premium'}),p=>({...p,cadence:'annual'})]){const f=await reserve(await fixture()),payload=mutate(await proof(f));await assert.rejects(work('sync_apply',payload));await noGrant(f);}
   const f=await reserve(await fixture()),payload=await proof(f);await work('sync_begin',{salon:f.salon});const stale=await work('sync_apply',payload);assert.equal(stale.stale,true);await noGrant(f);
  });

  await t.test('an owner cannot grant a tier, call the private worker or restart a trial as an upgrade',async()=>{
   const f=await reserve(await fixture(),'standard','monthly');await work('sync_apply',await proof(f));await as(f.owner);await q("update salons set plan='premium' where id=$1 returning plan",[f.salon]);assert.equal((await value('select owner_account_access() data')).business.plan,'standard');await assert.rejects(q("update jovabook_private.billing_accounts set ever_paid=true where salon_id=$1",[f.salon]),/permission denied/);await assert.rejects(value("select booking_billing_worker('bad','sync_apply',$1) data",[JSON.stringify({salon:f.salon})]),/Invalid billing worker/);await as(null);await assert.rejects(work('action_begin',{salon:f.salon,kind:'upgrade',target:'premium',cadence:'monthly',request:randomUUID(),hash:'c'.repeat(64),trial:true}));assert.equal((await account(f)).paid_plan,'standard');assert.equal((await account(f)).ever_paid,false);
  });
  await t.test('a used anti-repeat marker cannot be exchanged for a new card trial',async()=>{
   const f=await fixture();await q('insert into jovabook_private.trial_ledger(email_hash,used_at) values(jovabook_private.trial_fingerprint($1),now())',[f.email]);assert.equal((await work('context',{salon:f.salon})).card_trial_eligible,false);await assert.rejects(reserve(f));await noGrant(f);
  });

  await t.test('post-grant cancellation and payment failure lock access without restarting the trial clock',async()=>{
   for(const status of ['canceled','past_due']){const f=await reserve(await fixture(),'premium','annual'),payload=await proof(f);await work('sync_apply',payload);const end=+new Date((await account(f)).trial_ends_at);const fence=(await work('sync_begin',{salon:f.salon})).fence;await work('sync_apply',{salon:f.salon,customer:f.customer,subscription:f.subscription,plan:f.plan,cadence:f.cadence,status,fence,trial_verified:false,recurring_failed:status==='past_due'});assert.equal((await q('select jovabook_private.billing_open($1) open',[f.salon])).rows[0].open,false);assert.equal(+new Date((await account(f)).trial_ends_at),end);assert.equal((await work('context',{salon:f.salon})).card_trial_eligible,false);await assert.rejects(work('sync_apply',await proof(f)),/restarted|extended|verified/);assert.equal(+new Date((await account(f)).trial_ends_at),end);}
  });
  await t.test('expired and canceled provider trial states cannot start or extend a trial',async()=>{
   const f=await reserve(await fixture()),payload=await proof(f);await assert.rejects(work('sync_apply',{...payload,trial_started_at:new Date(Date.now()-4*86400000).toISOString(),trial_ends_at:new Date(Date.now()-86400000).toISOString()}));await noGrant(f);
   await assert.rejects(work('sync_apply',{...await proof(f),status:'canceled'}));await noGrant(f);
  });
 }finally{await db.close();}
});

