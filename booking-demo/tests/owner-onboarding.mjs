import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{PGlite}=require('@electric-sql/pglite');
const sql=await readFile(new URL('../supabase/migrations/20261109115800_owner_onboarding_progress.sql',import.meta.url),'utf8');
const owner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',business='20000000-0000-4000-8000-000000000001';
test('submitted onboarding is private, resumable and cannot grant a paid plan or skip verification',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema jovabook_private;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
   create table public.salons(id uuid primary key,owner_id uuid,name text,status text,settings jsonb,plan text,slug text);
   create table jovabook_private.portal_roles(user_id uuid,role text);
   create table jovabook_private.team_logins(user_id uuid);
   create table jovabook_private.operators(email text);
   create function jovabook_private.require_operator() returns void language plpgsql as $$begin if auth.uid() is distinct from '${owner}'::uuid then raise exception 'Operator only';end if;end$$;
   create function public.operator_signup_flow(integer default 0) returns jsonb language sql as $$select jsonb_build_object('ok',true,'recent',jsonb_build_array(jsonb_build_object('id','${owner}')))$$;
   create function public.owner_account_access() returns jsonb language sql as $$select '{"access":"active","billing":{"plan":"essential"}}'::jsonb$$;
   insert into auth.users values('${owner}','owner@example.test',now(),'{}'),('${other}','other@example.test',null,'{}');`);
  await db.exec(sql);
  await db.exec('set role anon');await assert.rejects(db.query('select public.owner_onboarding_progress()'),/permission denied/);
  await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
  await assert.rejects(db.query('select public.owner_onboarding_progress()'),/verified business/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  const progress=async(step,values={})=>(await db.query('select public.owner_onboarding_progress($1,$2::jsonb) data',[step,JSON.stringify(values)])).rows[0].data;
  for(const values of [{password:'Secret2026'},{user_id:other},{plan:'premium'},{role:'operator'}])await assert.rejects(progress('profile',values),/Unsupported/);
  await assert.rejects(progress(null),/Invalid setup/);
  await assert.rejects(progress('profile',{first_name:'A',last_name:'B',country:'FR'}),/Check your name/);
  await progress('profile',{first_name:'Avery',last_name:'Smith',mobile:'',country:'GB'});
  await progress('business',{business_name:'Avery Studio',booking_slug:'avery-studio',referral_code:''});
  await progress('category',{primary_category:'photography',related_categories:['professional']});
  await progress('team',{team_size:'20+'});await progress('location',{service_location:'physical'});await assert.rejects(progress('source',{heard_about:''}),/Choose how/);await progress('source',{heard_about:'friend'});
  await assert.rejects(progress('complete'),/Finish your business details/);
  await db.exec(`reset role;insert into public.salons values('${business}','${owner}','Avery Studio','setup','{}','essential','avery-studio');set role authenticated;`);
  const overview=(await db.query('select public.operator_signup_flow() data')).rows[0].data;assert.equal(overview.recent[0].onboarding.profile.first_name,'Avery');assert(overview.recent[0].onboarding.steps.profile);
  const finished=await progress('complete');assert(finished.completed_at);assert.equal(finished.data.first_name,'Avery');assert(finished.steps.profile);assert(finished.steps.location);
  const access=(await db.query('select public.owner_account_access() data')).rows[0].data;assert.equal(access.onboarding_completed,true);assert.equal(access.billing.plan,'essential');
  await assert.rejects(db.query('select * from jovabook_private.owner_onboarding'),/permission denied/);
  await db.exec('reset role');const row=(await db.query('select * from public.salons')).rows[0];assert.equal(row.status,'active');assert.equal(row.plan,'essential');assert.deepEqual(row.settings.hours.days,[]);assert.equal(row.settings.currency,'GBP');
  await db.exec(`update auth.users set email_confirmed_at=now() where id='${other}';set role authenticated;`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
  const blank=await progress('read');assert.equal(blank.data.first_name,undefined);assert.deepEqual(blank.steps,{});assert.equal(blank.business_id,null);
  await db.exec(`reset role;insert into jovabook_private.portal_roles values('${other}','customer');set role authenticated;`);await assert.rejects(progress('read'),/verified business/);
 }finally{await db.close();}
});

