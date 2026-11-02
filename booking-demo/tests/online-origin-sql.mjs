import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const {PGlite}=createRequire(import.meta.url)('@electric-sql/pglite');
const files=['setup_new_project.sql','migration_owner_experience.sql','migration_subscription_requests.sql','migrations/20261031161318_jovabook_email_delivery.sql','migrations/20261031232653_jovabook_sms_reminders.sql','migrations/20261101003559_jovabook_billing_access.sql','migrations/20261101005929_jovabook_customer_portal.sql','migrations/20261101013754_jovabook_monthly_commission.sql','migrations/20261101051423_jovabook_annual_billing.sql','migrations/20261101054615_jovabook_commission_supervisor.sql','migrations/20261102160000_jovabook_online_origin.sql','migrations/20261102161000_operator_commission_review.sql','migrations/20261102161500_commission_pattern_alerts.sql'];
const owner='10000000-0000-4000-8000-000000000001',salon='20000000-0000-4000-8000-000000000001',token='d'.repeat(64);
test('online-origin policy runs in isolated PostgreSQL',async t=>{
 const db=new PGlite(),q=(s,p=[])=>db.query(s,p),work=async(action,payload={})=>(await q('select booking_commission_worker($1,$2,$3) data',[token,action,JSON.stringify({salon,...payload})])).rows[0].data;
 const get=async id=>(await q('select * from jovabook_private.commission_entries where booking_id=$1 order by kind',[id])).rows;
 try{
 await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 for(const f of files)await db.exec(await readFile(new URL('../supabase/'+f,import.meta.url),'utf8'));
 await q('insert into auth.users(id,email) values($1,$2)',[owner,'owner@example.test']);
 await q("insert into salons(id,owner_id,name,slug,owner_name,email,status,settings) values($1,$2,'Fixture','fixture','Owner','owner@example.test','active',$3)",[salon,owner,JSON.stringify({timezone:'Europe/London',hours:{start:'00:00',end:'23:59',days:[0,1,2,3,4,5,6]}})]);
 await q("insert into staff(salon_id,id,name) values($1,'staff','Staff')",[salon]);await q("insert into services(salon_id,id,name,price,duration,staff_ids) values($1,'svc','Service',100,30,array['staff'])",[salon]);
 await q("update jovabook_private.billing_accounts set ever_paid=true,paid_plan='standard',paid_until=now()+interval '30 days',customer_id='cus_fixture',subscription_id='sub_fixture',commission_terms_version='2026-11-02-online-origin-v3',commission_terms_accepted_at=now()-interval '30 days',trial_started_at=now()-interval '60 days',trial_ends_at=now()-interval '50 days' where salon_id=$1",[salon]);
 await q("update jovabook_private.commission_config set enabled=true,enabled_at=now()-interval '30 days',invoice_enabled=true,worker_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[token]);
 await q("insert into jovabook_private.commission_plan_history(salon_id,invoice_id,line_id,subscription_id,plan,effective_start,period_end) values($1,'in_standard','il_standard','sub_fixture','standard',now()-interval '30 days',now()+interval '30 days')",[salon]);
 await db.exec('alter table bookings disable trigger owner_experience_booking_schedule');
 const make=async(id,manual=false,future=false)=>{
 await q("select set_config('request.jwt.claim.sub',$1,false)",[manual?owner:'']);await q("select set_config('jovabook.online_booking',$1,false)",[manual?'':'trusted']);
 await q("insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,status,source,deposit) values($1,$2,'svc','Service',100,30,current_date+$3::int,'12:00','staff','Test','test@example.test','confirmed',$4,0)",[salon,id,future?3:-2,manual?'Manual':'Online']);
 await q("select set_config('request.jwt.claim.sub','',false)");await q("select set_config('jovabook.online_booking','',false)");
 };

 await t.test('canonical public journey remains online for anonymous, customer and owner sessions',async()=>{
 const customer='10000000-0000-4000-8000-000000000002';await q('insert into auth.users(id,email) values($1,$2)',[customer,'test@example.test']);
 for(const [offset,actor] of [[5,''],[6,customer],[7,owner]]){
 await q("select set_config('request.jwt.claim.sub',$1,false)",[actor]);const result=(await q("select public.create_booking('fixture','svc','staff',(current_date+$1::int)::text,'12:00','Test','test@example.test','','','Card') data",[offset])).rows[0].data;
 assert.equal(result.ok,true,JSON.stringify(result));const id=result.booking.id;assert.equal((await q('select source from jovabook_private.commission_origins where booking_id=$1',[id])).rows[0].source,'Online');assert.equal((await q("select current_setting('jovabook.online_booking',true) marker")).rows[0].marker,'');
 }
 await q("select set_config('request.jwt.claim.sub','',false)");
 });
 await t.test('cancellation actors distinguish verified customer, staff and unverified manage link',async()=>{
 const customer='10000000-0000-4000-8000-000000000002';await q("insert into public.customer_portal_memberships(salon_id,user_id,first_name,last_name,phone) values($1,$2,'Test','Customer','07123456789')",[salon,customer]);
 for(const [id,actor,expected] of [['actor-customer',customer,'verified_customer'],['actor-owner',owner,'staff'],['actor-link','','unverified_link_or_server']]){
 await make(id,false,true);await q("select set_config('request.jwt.claim.sub',$1,false)",[actor]);
 if(actor===customer){const r=(await q("select customer_portal_cancel('fixture',$1,'40000000-0000-4000-8000-000000000001') data",[id])).rows[0].data;assert.equal(r.ok,true,JSON.stringify(r));}
 else await q("update bookings set status='cancelled' where id=$1",[id]);
 assert.equal((await q("select evidence->>'actor_kind' kind from jovabook_private.commission_reviews where booking_id=$1 and action='cancelled'",[id])).rows[0].kind,expected);
 }
 await q("select set_config('request.jwt.claim.sub','',false)");
 });

 await t.test('owner REST cannot forge online row source and customer cutoff stays 24 hours',async()=>{
 await q("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await q("insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,source,status,deposit) values($1,'forged','svc','Service',100,30,current_date+8,'12:00','staff','Test','test@example.test','Online','confirmed',0)",[salon]);
 assert.equal((await q("select source from bookings where id='forged'")).rows[0].source,'Manual');assert.equal((await q("select source from jovabook_private.commission_origins where booking_id='forged'")).rows[0].source,'Manual');
 await make('cutoff',false,true);await q("update bookings set date=((now()+interval '1 hour') at time zone 'Europe/London')::date,time=to_char((now()+interval '1 hour') at time zone 'Europe/London','HH24:MI') where id='cutoff'");await q("select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false)");
 const r=(await q("select customer_portal_cancel('fixture','cutoff','40000000-0000-4000-8000-000000000002') data")).rows[0].data;assert.equal(r.ok,false);assert.match(r.message,/24 hours/);assert.equal((await q("select status from bookings where id='cutoff'")).rows[0].status,'confirmed');await q("select set_config('request.jwt.claim.sub','',false)");
 });
 await t.test('manual is free and zero-deposit online is 1% of original price',async()=>{await make('manual',true);await make('online');await work('accrue');assert.equal((await get('manual')).length,0);assert.equal(Number((await get('online'))[0].amount_minor),100);});
 await t.test('trial and verified Premium periods remain exempt',async()=>{
 await q("update jovabook_private.billing_accounts set trial_started_at=now()-interval '3 days',trial_ends_at=now()+interval '1 day' where salon_id=$1",[salon]);await make('trial');await work('accrue');assert.equal((await get('trial'))[0].status,'waived_trial');
 await q("update jovabook_private.billing_accounts set trial_ends_at=now()-interval '10 days' where salon_id=$1",[salon]);
 await q("insert into jovabook_private.commission_plan_history(salon_id,invoice_id,line_id,subscription_id,plan,effective_start,period_end) values($1,'in_premium','il_premium','sub_fixture','premium',now()-interval '4 days',now()+interval '4 days')",[salon]);await make('premium');await work('accrue');assert.equal(Number((await get('premium'))[0].amount_minor),0);
 await q("delete from jovabook_private.commission_plan_history where invoice_id='in_premium'");
 });
 await t.test('price edits cannot reduce immutable confirmed value or change origin',async()=>{await q("update bookings set price=20 where id='online'");await work('accrue');assert.equal(Number((await get('online'))[0].amount_minor),100);await assert.rejects(q("update bookings set source='Manual' where id='online'"),/source cannot change/);});
 await t.test('cancellation requires explicit review before waiver',async()=>{await q("update bookings set status='cancelled' where id='online'");await work('accrue');assert.equal((await get('online'))[0].review_required,true);assert.equal((await get('online'))[0].status,'open');await work('origin_review',{booking:'online',decision:'waived',reason:'Verified closure',actor:owner});assert.equal((await get('online'))[0].status,'void');});
 await t.test('no-show cannot be reported before scheduled start',async()=>{await make('future',false,true);await assert.rejects(q("update bookings set status='no-show' where id='future'"),/after the appointment starts/);await assert.rejects(q("insert into bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,name,email,source,status,deposit) select salon_id,'future-noshow',service_id,service_name,price,duration,date,time,staff_id,name,email,source,'no-show',deposit from bookings where id='future'"),/after the appointment starts/);});
 await t.test('linked manual replacement keeps original fee exactly once',async()=>{await make('original');await make('replacement',true);await work('accrue');await q("update bookings set status='cancelled' where id='original'");await work('origin_link',{booking:'original',replacement:'replacement',reason:'Same appointment moved',actor:owner});await work('accrue');assert.equal((await get('original')).length,1);assert.equal(Number((await get('original'))[0].amount_minor),100);assert.equal((await get('replacement')).length,0);await make('unrelated',true);await work('accrue');assert.equal((await get('unrelated')).length,0);});
 await t.test('rescheduling produces no duplicate ledger entry',async()=>{await make('move');await work('accrue');await q("update bookings set date=current_date-1 where id='move'");await work('accrue');assert.equal((await get('move')).length,1);});

 await t.test('already-accrued unbilled reschedule waits then uses the new verified Premium period once',async()=>{
 await make('move-premium');await work('accrue');assert.equal(Number((await get('move-premium'))[0].amount_minor),100);
 await q("update bookings set date=current_date+30 where id='move-premium'");await work('accrue');assert.equal((await get('move-premium'))[0].status,'needs_history');assert.equal((await get('move-premium'))[0].amount_minor,null);
 await q("insert into jovabook_private.commission_plan_history(salon_id,invoice_id,line_id,subscription_id,plan,effective_start,period_end) values($1,'in_move_premium','il_move_premium','sub_fixture','premium',now()-interval '36 hours',now()+interval '60 days')",[salon]);await q("update bookings set date=current_date-1 where id='move-premium'");await work('accrue');
 const entries=await get('move-premium');assert.equal(entries.length,1);assert.equal(entries[0].status,'open');assert.equal(Number(entries[0].amount_minor),0);assert.equal(entries[0].history_invoice,'in_move_premium');await q("delete from jovabook_private.commission_plan_history where invoice_id='in_move_premium'");
 });
 await t.test('paid cancellation credits exact original fee through existing ledger',async()=>{await make('paid');await work('accrue');await q("update jovabook_private.commission_entries set status='paid' where booking_id='paid'");await q("update bookings set status='no-show' where id='paid'");await work('origin_review',{booking:'paid',decision:'waived',reason:'Confirmed genuine no show',actor:owner});await work('accrue');assert.equal((await q("select count(*)::int n from jovabook_private.email_queue where booking_id='paid' and kind='no-show' and audience='customer'")).rows[0].n,1);assert.equal((await get('paid')).length,2);assert.equal(Number((await get('paid')).find(x=>x.kind==='cancellation_credit').amount_minor),-100);});

 await t.test('configurable alerts show denominators and ambiguous replacements never create fees',async()=>{
 // Load the actual production operator predicates, with a fixture allowlist entry.
 const operatorSource=await readFile(new URL('../supabase/migrations/20261102125334_portal_access_backoffice.sql',import.meta.url),'utf8');
 await db.exec("create table jovabook_private.operators(email text primary key);insert into jovabook_private.operators values('owner@example.test');");
 for(const name of ['is_operator','require_operator']){const start=operatorSource.indexOf('create function jovabook_private.'+name+'()');const body=operatorSource.indexOf('$$',start);const end=operatorSource.indexOf('$$;',body+2);assert(start>=0&&body>start&&end>body,name);await db.exec(operatorSource.slice(start,end+3));}
 for(let n=0;n<20;n++){await make('rate-'+n);if(n<15)await q("update bookings set status='cancelled' where id=$1",['rate-'+n]);}
 await q("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 let alerts=(await q('select operator_commission_alerts($1) data',[salon])).rows[0].data;
 const rate=alerts.alerts.find(x=>x.kind==='report_rate');assert(rate);assert(rate.denominator>=20);assert(rate.count>=15);assert.equal(rate.status,'review');assert.equal(alerts.minimum_sample,20);
 const match=alerts.alerts.find(x=>x.kind==='possible_replacement');assert(match);const before=(await q('select count(*)::int n from jovabook_private.commission_entries')).rows[0].n;
 await q('select operator_commission_alerts($1)',[salon]);assert.equal((await q('select count(*)::int n from jovabook_private.commission_entries')).rows[0].n,before);
 await q('update jovabook_private.commission_config set alert_min_sample=100');alerts=(await q('select operator_commission_alerts($1) data',[salon])).rows[0].data;assert(!alerts.alerts.some(x=>x.kind==='report_rate'));
 await q("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(q('select operator_commission_alerts($1)',[salon]),/Back-office access denied/);
 });
 }finally{await db.close();}
});

