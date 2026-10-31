/* Local PostgreSQL tests only. No hosted access or provider calls.
   BOOKING_NODE_MODULES may select an existing node_modules directory. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
let PGlite;
for(const base of [null,process.env.BOOKING_NODE_MODULES]){
  try{({PGlite}=base?require(path.join(base,'@electric-sql/pglite')):require('@electric-sql/pglite'));break;}catch{}
}
if(!PGlite)throw Error('Use an existing @electric-sql/pglite installation or set BOOKING_NODE_MODULES.');
const scripts=await Promise.all(['setup_new_project.sql','migration_owner_experience.sql','migration_subscription_requests.sql'].map(file=>readFile(new URL('../supabase/'+file,import.meta.url),'utf8')));
const owner='10000000-0000-4000-8000-000000000001',foreign='10000000-0000-4000-8000-000000000002',outsider='10000000-0000-4000-8000-000000000003';
const sid='20000000-0000-4000-8000-000000000001',foreignSid='20000000-0000-4000-8000-000000000002';
test('subscription requests preserve protected plans, enforce owner access and capacity, and retain cancellation history',async()=>{
 const db=new PGlite();const q=(sql,args=[])=>db.query(sql,args);
 const state=async()=> (await q('select owner_subscription() value')).rows[0].value;
 const request=async(target,salon=sid)=>(await q('select request_plan_change($1,$2) value',[target,salon])).rows[0].value;
 const cancel=async(id,salon=sid)=>(await q('select cancel_plan_change($1,$2) value',[id,salon])).rows[0].value;
 const signIn=async id=>q("select set_config('request.jwt.claim.sub',$1,false)",[id]);
 const adminPlan=async plan=>{await db.exec('reset role');await q('update salons set plan=$1 where id=$2',[plan,sid]);await db.exec('set role authenticated');};
 const addStaff=async(from,to)=>q(`insert into staff(salon_id,id,name,active) select $1,'member-'||n,'Member '||n,n%2=1 from generate_series($2::int,$3::int) n`,[sid,from,to]);
 try{
  await db.exec(`create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
   insert into auth.users values('${owner}'),('${foreign}'),('${outsider}');`);
  for(const script of scripts)await db.exec(script);
  await q(`insert into salons(id,owner_id,name,slug,owner_name,email,email_norm,status) values($1,$2,'Owner Salon','owner-salon','Owner','owner@example.test','owner@example.test','active'),($3,$4,'Foreign Salon','foreign-salon','Foreign','foreign@example.test','foreign@example.test','active')`,[sid,owner,foreignSid,foreign]);
  // Existing application table grants do not grant write access to the new request table.
  await db.exec('grant select,insert,update,delete on salons,staff to authenticated;');
  await signIn(owner);await db.exec('set role authenticated');
  await addStaff(1,1);
  assert.deepEqual(await state(),{plan:'essential',staff_limit:1,staff_count:1,billing_connected:false,pending_request:null,changes_supported:true});
  await assert.rejects(request('unknown'),/Choose Essential, Standard or Premium/);
  await assert.rejects(request('essential'),/already on this plan/);
  await assert.rejects(request('premium',foreignSid),/salon changed/);
  await assert.rejects(request('premium',null),/salon changed/);
  const initial=await request('standard');assert.equal(initial.ok,true);assert.equal(initial.plan,'essential');assert.equal(initial.pending_request.from_plan,'essential');assert.equal(initial.pending_request.to_plan,'standard');
  assert.equal((await request('standard')).pending_request.id,initial.pending_request.id,'Repeated target is idempotent');
  assert.equal((await q('select count(*)::int n from subscription_change_requests')).rows[0].n,1);
  const replacement=await request('premium');assert.notEqual(replacement.pending_request.id,initial.pending_request.id);
  let history=(await q('select id,status from subscription_change_requests order by requested_at,id')).rows;
  assert.equal(history.find(row=>row.id===initial.pending_request.id).status,'cancelled');
  assert.equal(history.filter(row=>row.status==='pending').length,1);
  const saved=(await q('select plan,status,payments,usage from salons where id=$1',[sid])).rows[0];
  assert.deepEqual(saved,{plan:'essential',status:'active',payments:{},usage:{}},'Requests never change plan, salon status, payments or usage');
  for(const query of [
   "insert into subscription_change_requests(salon_id,requested_by,from_plan,to_plan) values($1,$2,'essential','premium')",
   "update subscription_change_requests set status='applied' where salon_id=$1 and requested_by=$2",
   'delete from subscription_change_requests where salon_id=$1 and requested_by=$2'
  ])await assert.rejects(q(query,[sid,owner]),/permission denied/);
  await signIn(foreign);
  assert.equal((await q('select count(*)::int n from subscription_change_requests')).rows[0].n,0,'Foreign owner cannot read request history');
  await assert.rejects(cancel(replacement.pending_request.id,sid),/salon changed/);
  await assert.rejects(cancel(replacement.pending_request.id,foreignSid),/no longer available/);
  await signIn(outsider);await assert.rejects(state(),/Sign in as the salon owner/);await assert.rejects(request('premium'),/Sign in as the salon owner/);
  await signIn(owner);
  await assert.rejects(cancel(initial.pending_request.id),/no longer available/);
  const cancelled=await cancel(replacement.pending_request.id);assert.equal(cancelled.ok,true);assert.equal(cancelled.pending_request,null);assert.equal(cancelled.plan,'essential');
  assert.equal((await q("select count(*)::int n from subscription_change_requests where status='cancelled'")).rows[0].n,2);
  await assert.rejects(cancel(replacement.pending_request.id),/no longer available/);
  // Trusted administrative plan changes are fixtures, not a client activation path.
  await adminPlan('standard');await addStaff(2,2);
  await assert.rejects(request('essential'),/allows 1 staff member.*Inactive staff also count/);
  assert.equal((await state()).staff_count,2,'Inactive staff count toward a downgrade');
  const upgrade=await request('premium');assert.equal(upgrade.plan,'standard');
  await assert.rejects(request('essential'),/Remove unused staff/);
  assert.equal((await state()).pending_request.id,upgrade.pending_request.id,'Rejected replacement preserves pending request');
  await cancel(upgrade.pending_request.id);
  await adminPlan('premium');await addStaff(3,6);
  await assert.rejects(request('standard'),/allows 5 staff member/);
  await assert.rejects(request('essential'),/allows 1 staff member/);
  await q("delete from staff where salon_id=$1 and id='member-6'",[sid]);
  const downgrade=await request('standard');assert.equal(downgrade.plan,'premium');assert.equal(downgrade.staff_limit,10);assert.equal(downgrade.staff_count,5);assert.equal(downgrade.pending_request.to_plan,'standard');
  await cancel(downgrade.pending_request.id);
  await q("delete from staff where salon_id=$1 and id<>'member-1'",[sid]);
  const essential=await request('essential');assert.equal(essential.plan,'premium');assert.equal(essential.pending_request.to_plan,'essential');
  await db.exec('reset role;set role anon;');
  for(const query of ['select owner_subscription()',`select request_plan_change('premium','${sid}')`,`select cancel_plan_change('${essential.pending_request.id}','${sid}')`])await assert.rejects(q(query),/permission denied/);
  await assert.rejects(q('select * from subscription_change_requests'),/permission denied/);
  await db.exec('reset role');
  assert.equal((await q('select count(*)::int n from staff where salon_id=$1',[sid])).rows[0].n,1);
  assert.equal((await q('select plan from salons where id=$1',[sid])).rows[0].plan,'premium','Only the explicit trusted admin fixture changed active plan');
  await q('delete from auth.users where id=$1',[owner]);
  assert.equal((await q('select count(*)::int n from subscription_change_requests where salon_id=$1',[sid])).rows[0].n,0,'Parent cleanup cascades through request history');
  assert.equal((await q('select count(*)::int n from salons where id=$1',[foreignSid])).rows[0].n,1,'Unrelated salon preserved');
 }finally{await db.close();}
});
