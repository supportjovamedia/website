import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {sources,bootstrap} from '../scripts/jovabook-test-db.mjs';

test('paid signup is verified, private, idempotent and resumes the same business after payment',async t=>{
 const db=new PGlite(),token='c'.repeat(64),owner=crypto.randomUUID(),unverified=crypto.randomUUID(),customer=crypto.randomUUID();
 const q=(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>(await q(sql,args)).rows[0]?.value;
 const as=async(id,role='authenticated')=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role);};
 const root=()=>db.exec('reset role');
 const rpc=(action='read',values={})=>value('select owner_signup_payment($1,$2) value',[action,JSON.stringify(values)]);
 const step=(name,values={})=>value('select owner_onboarding_progress($1,$2) value',[name,JSON.stringify(values)]);
 const choice={plan:'premium',cadence:'annual',seats:3},consent={legal_accepted:true,legal_version:'2026-11-free-v1'};
 let sid,slug,referralCode;
 try{
  await bootstrap(db,await sources());
  referralCode=await value("select code value from jovabook_private.referral_codes where salon_id='20000000-0000-4000-8000-000000000001'");
  await q("insert into auth.users(id,email,email_confirmed_at) values($1,'new-paid@example.test',now()),($2,'unverified-paid@example.test',null),($3,'customer-paid@example.test',now())",[owner,unverified,customer]);
  await q("insert into jovabook_private.portal_roles(user_id,role) values($1,'customer')",[customer]);
  await q("update jovabook_private.billing_config set worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex'),enabled=true,provider_configured=true",[token]);
  await t.test('anonymous, unverified and customer identities cannot prepare a draft',async()=>{
   await as(null,'anon');await assert.rejects(rpc('prepare',{...choice,...consent}),/permission denied/);
   await as(unverified);await assert.rejects(rpc('prepare',{...choice,...consent}),/verified business/);
   await as(customer);await assert.rejects(rpc('prepare',{...choice,...consent}),/verified business/);
  });
  await t.test('a quote creates nothing and current consent is required before preparing payment',async()=>{
   await as(owner);const quote=await rpc('read',choice);assert.equal(quote.amount_pence,35520);assert.equal(quote.currency,'GBP');assert.equal(quote.managed_signup,false);
   for(const invalid of [choice,{...choice,legal_accepted:true},{...choice,legal_accepted:'true',legal_version:consent.legal_version},{...choice,...consent,legal_version:'old'}])await assert.rejects(rpc('prepare',invalid),/terms/);
   await assert.rejects(rpc('prepare',{...choice,...consent,user_id:customer}),/Invalid signup/);
   await assert.rejects(rpc('prepare',{...choice,...consent,referral_code:'INVALID000'}),/Referral code not found/);
   await root();assert.equal(await value('select count(*)::integer value from salons where owner_id=$1',[owner]),0);
  });
  await t.test('double submissions produce one unpublished closed-hours business with a locked choice',async()=>{
   await as(owner);const [first,retry]=await Promise.all([rpc('prepare',{...choice,...consent,referral_code:referralCode}),rpc('prepare',{...choice,...consent,referral_code:referralCode})]);
   assert.equal(first.business_id,retry.business_id);sid=first.business_id;assert.equal(first.payment_required,true);assert.equal(first.legal_accepted,true);assert.equal(first.amount_pence,35520);assert.equal(first.referral_code,referralCode);assert.equal(first.referral_applied,true);
   await assert.rejects(rpc('prepare',{plan:'standard',cadence:'monthly',seats:1,...consent}),/saved subscription/);
   assert.deepEqual(await rpc('read',{plan:'standard',cadence:'monthly',seats:1}),first,'Saved intent wins over stale browser selection');
   await assert.rejects(q('select * from jovabook_private.owner_signup_payments'),/permission denied/);
   await root();assert.equal(await value('select count(*)::integer value from salons where owner_id=$1',[owner]),1);
   const business=(await q('select status,slug,settings from salons where id=$1',[sid])).rows[0];slug=business.slug;assert.equal(business.status,'setup');assert.deepEqual(business.settings.hours.days,[]);
   await as(null,'anon');assert.equal(await value('select public_salon($1) value',[slug]),null);
  });
  await t.test('payment flags from the browser cannot unlock setup or activate the business',async()=>{
   await as(owner);await assert.rejects(rpc('prepare',{...choice,...consent,paid_verified:true}),/Invalid signup/);
   await assert.rejects(step('business',{business_name:'Paid fixture',booking_slug:'paid-fixture'}),/subscription payment/);
   await assert.rejects(step('complete'),/subscription payment/);
   await assert.rejects(q("select save_setup('Fictional address','00000000000','{}')"),/subscription payment/);
   const progress=await step('read');assert.equal(progress.signup_payment.payment_required,true);
   const access=await value('select owner_account_access() value');assert.equal(access.onboarding_required,true);assert.equal(access.access,'setup');
  });
  await t.test('verified provider payment permits setup but does not publish the placeholder',async()=>{
   await root();const worker=(action,payload={})=>value('select booking_offer_worker($1,$2,$3) value',[token,action,JSON.stringify({salon:sid,...payload})]);
   const action=await worker('begin',{owner,kind:'checkout',request_id:crypto.randomUUID(),plan:choice.plan,cadence:choice.cadence,seats:choice.seats,hash:'f'.repeat(64)});assert.equal(action.trial,false);
   await worker('bind_customer',{customer_id:'cus_PaidSignupFixture'});const fence=await worker('sync_begin');
   const start=new Date(),end=new Date(Date.now()+365*86400000);
   await worker('sync_apply',{fence:fence.fence,customer_id:'cus_PaidSignupFixture',subscription_id:'sub_PaidSignupFixture',plan:'premium',cadence:'annual',seats:3,provider_status:'active',paid_verified:true,trial_verified:false,period_start:start.toISOString(),paid_until:end.toISOString()});
   await q("update salons set status='active' where id=$1",[sid]);assert.equal(await value('select status value from salons where id=$1',[sid]),'setup','Even an old activation path cannot publish the paid placeholder');
   await as(null,'anon');assert.equal(await value('select public_salon($1) value',[slug]),null);
   await as(owner);const summary=await rpc();assert.equal(summary.paid_verified,true);assert.equal(summary.payment_required,false);assert.equal(summary.business_id,sid);
   assert.equal((await value('select owner_account_access() value')).onboarding_required,true);await assert.rejects(q("select save_setup('Fictional address','00000000000','{}')"),/Complete your account setup/);
  });
  await t.test('the existing setup steps rename and complete that same business atomically',async()=>{
   await as(owner);
   await step('profile',{first_name:'Fictional',last_name:'Owner',mobile:'',country:'GB',legal_accepted:'accepted'});
   await assert.rejects(step('business',{business_name:'Your business',booking_slug:slug,referral_code:referralCode}),/Choose your business booking address/);
   await assert.rejects(step('business',{business_name:'Fictional paid business',booking_slug:'paid-signup-fixture',referral_code:'DIFFERENT0'}),/before payment/);
   await assert.rejects(step('business',{business_name:'Fictional paid business',booking_slug:'fictional-business-1',referral_code:''}),/unavailable/);
   await root();assert.equal(await value('select name value from salons where id=$1',[sid]),'Your business');await as(owner);
   const legitimate=await step('business',{business_name:'Your business',booking_slug:'paid-signup-fixture',referral_code:referralCode});assert.equal(legitimate.data.business_name,'Your business','A legitimate name is accepted with the chosen booking address');
   const renamed=await step('business',{business_name:'Fictional paid business',booking_slug:'paid-signup-fixture',referral_code:referralCode});assert.equal(renamed.signup_payment.referral_code,referralCode);assert.equal(renamed.business_id,sid);assert.equal(renamed.data.business_name,'Fictional paid business');
   await step('category',{primary_category:'hair'});await step('team',{team_size:'2-5'});await step('location',{service_locations:['physical']});await step('software',{current_software:'none'});await step('source',{heard_about:'search'});
   const complete=await step('complete');assert.equal(complete.signup_payment.onboarding_completed,true);assert.equal(complete.signup_payment.business_id,sid);
   const access=await value('select owner_account_access() value');assert.equal(access.onboarding_required,false);assert.equal(access.signup_payment.existing_account,true);assert.equal(access.access,'active');
   await root();assert.equal(await value('select count(*)::integer value from salons where owner_id=$1',[owner]),1);assert.equal(await value('select status value from salons where id=$1',[sid]),'active');assert.equal(await value('select business_name value from jovabook_private.referrals where referred=$1',[sid]),'Fictional paid business');
  });
  await t.test('new Free registration skips payment and still creates its ordinary business at the existing step',async()=>{
   await root();const free=crypto.randomUUID();await q("insert into auth.users(id,email,email_confirmed_at) values($1,'free-signup@example.test',now())",[free]);await as(free);const summary=await rpc();assert.equal(summary.payment_required,false);assert.equal(summary.amount_pence,0);assert.equal(summary.business_id,null);
   await step('profile',{first_name:'Free',last_name:'Owner',mobile:'',country:'GB',legal_accepted:'accepted'});const business=await value("select create_business_for_existing_user('Free fictional business','free-signup-fixture','Free Owner') value");assert.equal(business.ok,true);await step('business',{business_name:'Free fictional business',booking_slug:'free-signup-fixture',referral_code:''});assert.equal((await step('read')).signup_payment.payment_required,false);
   await root();assert.equal(await value('select count(*)::integer value from jovabook_private.owner_signup_payments where user_id=$1',[free]),0);
  });
  await t.test('existing accounts retain their plan and do not enter a new payment gate',async()=>{
   const existing='10000000-0000-4000-8000-000000000001';await as(existing);const summary=await rpc('prepare',{...choice,...consent});assert.equal(summary.existing_account,true);assert.equal(summary.managed_signup,false);assert.equal(summary.payment_required,false);
   assert.equal((await value('select owner_account_access() value')).onboarding_required,false);
   await root();assert.equal(await value('select count(*)::integer value from jovabook_private.owner_signup_payments where user_id=$1',[existing]),0);
  });
 }finally{await db.close();}
});
