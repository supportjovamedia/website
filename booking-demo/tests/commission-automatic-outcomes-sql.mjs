import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const {PGlite}=createRequire(import.meta.url)('@electric-sql/pglite');
const files=['setup_new_project.sql','migration_owner_experience.sql','migration_subscription_requests.sql','migrations/20261031161318_jovabook_email_delivery.sql','migrations/20261031232653_jovabook_sms_reminders.sql','migrations/20261101003559_jovabook_billing_access.sql','migrations/20261101005929_jovabook_customer_portal.sql','migrations/20261101013754_jovabook_monthly_commission.sql','migrations/20261101051423_jovabook_annual_billing.sql','migrations/20261101054615_jovabook_commission_supervisor.sql','migrations/20261102160000_jovabook_online_origin.sql','migrations/20261102161000_operator_commission_review.sql','migrations/20261102161500_commission_pattern_alerts.sql','migrations/20261102190000_booking_origin_upsert.sql','migrations/20261102233500_commission_automatic_outcomes.sql'];
const owner='10000000-0000-4000-8000-000000000001',salon='20000000-0000-4000-8000-000000000001',token='d'.repeat(64);
test('automatic commission outcomes run in isolated PostgreSQL',async t=>{
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

 const origin=async id=>(await q('select decision,waiver_kind from jovabook_private.commission_origins where booking_id=$1',[id])).rows[0];
 const asOwner=async fn=>{await q("select set_config('request.jwt.claim.sub',$1,false)",[owner]);try{return await fn();}finally{await q("select set_config('request.jwt.claim.sub','',false)");}};
 const live=async id=>(await get(id)).filter(x=>x.status!=='void');
 await t.test('an untouched online booking is chargeable automatically once its appointment time has passed',async()=>{await make('auto');await work('accrue');const rows=await get('auto');assert.equal(rows.length,1);assert.equal(rows[0].status,'open');assert.equal(Number(rows[0].amount_minor),100);});
 await t.test('a booking cancelled before it starts is waived automatically without review',async()=>{await make('early',false,true);await asOwner(()=>q("update bookings set status='cancelled' where id='early'"));assert.deepEqual(await origin('early'),{decision:'waived',waiver_kind:'cancel_before_start'});await work('accrue');assert.equal((await live('early')).length,0);});
 await t.test('no-shows inside the monthly allowance are waived and the next one stays chargeable',async()=>{
 for(const id of ['ns1','ns2','ns3'])await make(id);await work('accrue');
 for(const id of ['ns1','ns2','ns3'])await asOwner(()=>q("update bookings set status='no-show' where id=$1",[id]));
 assert.deepEqual(await origin('ns1'),{decision:'waived',waiver_kind:'no_show_allowance'});assert.deepEqual(await origin('ns2'),{decision:'waived',waiver_kind:'no_show_allowance'});assert.deepEqual(await origin('ns3'),{decision:'pending',waiver_kind:null});
 await work('accrue');assert.equal((await live('ns1')).length,0);assert.equal((await live('ns2')).length,0);assert.equal((await live('ns3')).length,1);assert.equal((await live('ns3'))[0].status,'open');
 const handling=(await q("select evidence->>'handling' h from jovabook_private.commission_reviews where booking_id='ns3' and action='no-show'")).rows[0].h;assert.equal(handling,'allowance_exceeded');
 });
 await t.test('deleting a booking that has already started keeps its fee',async()=>{await make('del');await work('accrue');await asOwner(()=>q("delete from bookings where id='del'"));assert.equal((await origin('del')).decision,'pending');await work('accrue');assert.equal((await live('del')).length,1);});
 await t.test('a report after the reporting window keeps the fee',async()=>{await make('late');await q("update bookings set date=current_date-10 where id='late'");await work('accrue');await asOwner(()=>q("update bookings set status='no-show' where id='late'"));assert.equal((await origin('late')).decision,'pending');assert.equal((await q("select evidence->>'handling' h from jovabook_private.commission_reviews where booking_id='late' and action='no-show'")).rows[0].h,'late_report');await work('accrue');assert.equal((await live('late')).length,1);});
 await t.test('restoring a cancelled booking restores the fee path',async()=>{await make('flip',false,true);await asOwner(()=>q("update bookings set status='cancelled' where id='flip'"));assert.equal((await origin('flip')).decision,'waived');await asOwner(()=>q("update bookings set status='confirmed' where id='flip'"));assert.deepEqual(await origin('flip'),{decision:'pending',waiver_kind:null});});
 await t.test('manual bookings stay free and unaffected',async()=>{await make('man',true);await asOwner(()=>q("update bookings set status='cancelled' where id='man'"));assert.equal((await origin('man')).decision,'pending');await work('accrue');assert.equal((await get('man')).length,0);});
 await t.test('a business can dispute a charged report once and only disputes reach review',async()=>{
 const disputable=await asOwner(async()=>(await q('select public.owner_commission_allowance() data')).rows[0].data);assert.equal(disputable.used,2);assert.equal(disputable.allowed,2);assert(disputable.disputable.some(x=>x.booking_id==='ns3'));assert(!disputable.disputable.some(x=>x.booking_id==='ns1'));
 await assert.rejects(asOwner(()=>q("select public.owner_dispute_commission('ns3','too short')")),/10 to 1000/);
 await assert.rejects(asOwner(()=>q("select public.owner_dispute_commission('ns1','This was already waived automatically.')")),/cannot be disputed/);
 await asOwner(()=>q("select public.owner_dispute_commission('ns3','The customer never arrived and did not answer calls.')"));assert.equal((await origin('ns3')).decision,'review');
 await assert.rejects(asOwner(()=>q("select public.owner_dispute_commission('ns3','Trying a second time with another long reason.')")),/cannot be disputed|already/);
 await q("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(q("select public.owner_dispute_commission('ns3','Anonymous attempt to dispute a booking.')"),/Log in/);
 await work('origin_review',{booking:'ns3',decision:'chargeable',reason:'Reviewed: no evidence of a no-show',actor:owner});assert.equal((await origin('ns3')).decision,'chargeable');await work('accrue');assert.equal((await live('ns3')).length,1);
 await assert.rejects(asOwner(()=>q("select public.owner_dispute_commission('ns3','Disputing again after the ruling stands.')")),/cannot be disputed/);
 });
 await t.test('the monthly dispute limit is enforced',async()=>{await make('cap');await asOwner(()=>q("update bookings set status='no-show' where id='cap'"));assert.equal((await origin('cap')).decision,'pending');await q('update jovabook_private.commission_config set dispute_monthly_cap=1');await assert.rejects(asOwner(()=>q("select public.owner_dispute_commission('cap','Second dispute this month should be refused.')")),/monthly dispute limit/);await q('update jovabook_private.commission_config set dispute_monthly_cap=5');});
 await t.test('operator prompts show when a business has used its whole monthly allowance',async()=>{
 const operatorSource=await readFile(new URL('../supabase/migrations/20261102125334_portal_access_backoffice.sql',import.meta.url),'utf8');
 await db.exec("create table jovabook_private.operators(email text primary key);insert into jovabook_private.operators values('owner@example.test');");
 for(const name of ['is_operator','require_operator']){const start=operatorSource.indexOf('create function jovabook_private.'+name+'()');const body=operatorSource.indexOf('$$',start);const end=operatorSource.indexOf('$$;',body+2);assert(start>=0&&body>start&&end>body,name);await db.exec(operatorSource.slice(start,end+3));}
 const alerts=await asOwner(async()=>(await q('select operator_commission_alerts($1) data',[salon])).rows[0].data);
 const used=alerts.alerts.find(x=>x.kind==='allowance_used');assert(used);assert.equal(used.count,2);assert.equal(used.allowed,2);
 });
 }finally{await db.close();}
});
