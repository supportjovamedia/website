begin;
-- The scheduler is installed inactive. Its Vault credential is configured only
-- during reviewed live activation, separate from the private database worker.
create function jovabook_private.invoke_customer_payment_workers() returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg jovabook_private.customer_config;secret text;n int;deposit_job bigint;refund_job bigint;begin
 select * into cfg from jovabook_private.customer_config where singleton;
 if not cfg.payments_enabled or not cfg.scheduler_enabled then return null;end if;
 if cfg.worker_hash is null or cfg.scheduler_hash is null or cfg.worker_hash=cfg.scheduler_hash or to_regclass('vault.decrypted_secrets') is null or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then raise exception 'Customer payment workers are unavailable.';end if;
 select count(*)::int,min(decrypted_secret) into n,secret from vault.decrypted_secrets where name='jovabook_customer_payment_http_token';
 if n<>1 or coalesce(secret,'')!~'^[0-9a-f]{64}$' or encode(sha256(convert_to(secret,'UTF8')),'hex')<>cfg.scheduler_hash then raise exception 'Customer payment workers are unavailable.';end if;
 deposit_job:=net.http_post(url:='https://www.jovamedia.com/api/jovabook/deposits/reconcile',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=120000);
 refund_job:=net.http_post(url:='https://www.jovamedia.com/api/jovabook/customer/refund-worker',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=120000);
 return jsonb_build_object('deposit_job',deposit_job,'refund_job',refund_job);
end$$;
revoke all on function jovabook_private.invoke_customer_payment_workers() from public,anon,authenticated;
do $$declare job_id bigint;begin
 if to_regclass('cron.job') is null then return;end if;
 if exists(select 1 from cron.job where jobname='jovabook-customer-payments') then raise exception 'Review the existing customer payment job before migration.';end if;
 select cron.schedule('jovabook-customer-payments','* * * * *','select jovabook_private.invoke_customer_payment_workers();') into job_id;
 perform cron.alter_job(job_id,active:=false);
end$$;
notify pgrst,'reload schema';
commit;
