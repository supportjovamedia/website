import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {sources,bootstrap} from '../scripts/jovabook-test-db.mjs';
const sid='30000000-0000-4000-8000-000000000001',bid='30000000-0000-4000-8000-0000000000b1',hex='a'.repeat(64);

test('queue schedulers only call the site when work is due',async t=>{
 const db=new PGlite(),q=(sql,args=[])=>db.query(sql,args),calls=async()=>Number((await q('select count(*)::int n from test_http_calls')).rows[0].n);
 try{
  await bootstrap(db,await sources());
  await db.exec(`create schema if not exists net;create table test_http_calls(url text);
   create or replace function net.http_post(url text,headers jsonb default '{}',body jsonb default '{}',timeout_milliseconds integer default 1000,params jsonb default '{}') returns bigint language sql as $$insert into public.test_http_calls values(url) returning 1::bigint$$;
   create schema if not exists vault;create table if not exists vault.decrypted_secrets(name text,decrypted_secret text);
   insert into vault.decrypted_secrets values('jovabook_email_worker_token','${hex}'),('jovabook_sms_worker_token','${hex}'),('jovabook_customer_payment_http_token','${hex}');`);

  await db.exec(`create or replace function jovabook_private.invoke_email_worker() returns bigint language plpgsql security definer set search_path='' as $f$
declare secret text;
begin
  if not (select enabled from jovabook_private.email_config where singleton) then return null; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name='jovabook_email_worker_token';
  if secret is null then return null; end if;
  return net.http_post(
    url:='https://www.jovamedia.com/api/jovabook/email/worker',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
    body:='{}'::jsonb,timeout_milliseconds:=55000
  );
end $f$;
create or replace function jovabook_private.invoke_sms_worker() returns bigint language plpgsql security definer set search_path='' as $f$
declare secret text;
begin
 if not (select enabled from jovabook_private.sms_config where singleton) then return null;end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='jovabook_sms_worker_token';
 if secret is null then return null;end if;
 return net.http_post(url:='https://www.jovamedia.com/api/jovabook/sms/worker',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=55000);
end$f$;
create or replace function jovabook_private.invoke_customer_payment_workers() returns jsonb language plpgsql security definer set search_path='' as $f$
declare cfg jovabook_private.customer_config;secret text;n int;deposit_job bigint;refund_job bigint;begin
 select * into cfg from jovabook_private.customer_config where singleton;
 if not cfg.payments_enabled or not cfg.scheduler_enabled then return null;end if;
 select count(*)::int,min(decrypted_secret) into n,secret from vault.decrypted_secrets where name='jovabook_customer_payment_http_token';
 deposit_job:=net.http_post(url:='https://www.jovamedia.com/api/jovabook/deposits/reconcile',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=120000);
 refund_job:=net.http_post(url:='https://www.jovamedia.com/api/jovabook/customer/refund-worker',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=120000);
 return jsonb_build_object('deposit_job',deposit_job,'refund_job',refund_job);
end$f$;`);
  await db.exec((await readFile(new URL('../booking-demo/supabase/migrations/20261105130000_workers_skip_when_idle.sql',import.meta.url),'utf8')).replace(/^begin;$/m,'').replace(/^commit;$/m,''));
  await q('set session_replication_role=replica');
  const run=async fn=>{await q('delete from test_http_calls');await q(`select jovabook_private.${fn}()`);return calls();};

  await t.test('email',async()=>{
   await q('delete from jovabook_private.email_queue');await q('update jovabook_private.email_config set enabled=true');
      assert.equal(await run('invoke_email_worker'),0,'step1');
   await q("insert into jovabook_private.email_queue(salon_id,event_id,booking_id,audience,recipient,kind,booking_revision,payload,due_at,status) values($1,gen_random_uuid(),$2,'customer','a@example.com','confirmed','r','{}'::jsonb,now()-interval '1 minute','Queued')",[sid,bid]);
   assert.equal(await run('invoke_email_worker'),1,'step2');
   await q("update jovabook_private.email_queue set status='Scheduled',due_at=now()+interval '1 day'");
   assert.equal(await run('invoke_email_worker'),0,'step3');
   await q("update jovabook_private.email_queue set status='Delivered',due_at=now()-interval '1 day'");
   assert.equal(await run('invoke_email_worker'),0,'step4');
  });

  await t.test('sms',async()=>{
   await q('delete from jovabook_private.sms_queue');await q('update jovabook_private.sms_config set enabled=true');
   assert.equal(await run('invoke_sms_worker'),0);
   await q("insert into jovabook_private.sms_queue(salon_id,booking_id,revision,due_at) values($1,$2,'r',now()-interval '1 minute')",[sid,bid]);
   assert.equal(await run('invoke_sms_worker'),1);
   await q("update jovabook_private.sms_queue set status='Sent',provider_id='p1',poll_after=now()+interval '1 hour'");
   assert.equal(await run('invoke_sms_worker'),0);
   await q("update jovabook_private.sms_queue set poll_after=now()-interval '1 minute'");
   assert.equal(await run('invoke_sms_worker'),1);
   await q("update jovabook_private.sms_queue set status='Delivered'");
   assert.equal(await run('invoke_sms_worker'),0);
  });

  await t.test('payments',async()=>{
   await q('delete from jovabook_private.customer_refunds');await q('delete from jovabook_private.deposit_checkouts');await q("update jovabook_private.customer_config set payments_enabled=true,scheduler_enabled=true");
   const urls=async()=>(await q('select url from test_http_calls order by url')).rows.map(r=>r.url.split('/').pop());
   assert.equal(await run('invoke_customer_payment_workers'),0);
   await q("insert into jovabook_private.customer_refunds(id,salon_id,booking_id,status,requested_at) values(gen_random_uuid(),$1,$2,'requested',now())",[sid,bid]);
   await run('invoke_customer_payment_workers');assert.deepEqual(await urls(),['refund-worker']);
   await q("update jovabook_private.customer_refunds set status='succeeded'");
   assert.equal(await run('invoke_customer_payment_workers'),0);
  });
 }finally{await db.close();}
});
