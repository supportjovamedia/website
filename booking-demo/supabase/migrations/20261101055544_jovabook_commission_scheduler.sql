-- Source only. Creates one inactive managed schedule, never activates collection.
begin;
create function jovabook_private.invoke_commission_supervisor() returns bigint language plpgsql security definer set search_path='' as $$
declare cfg jovabook_private.commission_config;secret text;n int;begin
 select * into cfg from jovabook_private.commission_config where singleton;
 if not cfg.enabled or not cfg.supervisor_enabled then return null;end if;
 if cfg.worker_hash is null or cfg.supervisor_http_hash is null or cfg.supervisor_http_hash=cfg.worker_hash or not exists(select 1 from jovabook_private.billing_config where singleton and enabled and provider_configured) then raise exception 'Commission supervisor is unavailable.';end if;
 if to_regclass('vault.decrypted_secrets') is null or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then raise exception 'Commission supervisor is unavailable.';end if;
 select count(*)::int,min(decrypted_secret) into n,secret from vault.decrypted_secrets where name='jovabook_commission_http_token';
 if n<>1 or coalesce(secret,'')!~'^[0-9a-f]{64}$' or encode(sha256(convert_to(secret,'UTF8')),'hex')<>cfg.supervisor_http_hash then raise exception 'Commission supervisor is unavailable.';end if;
 return net.http_post(url:='https://www.jovamedia.com/api/jovabook/billing/commission-supervisor',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=330000);
end$$;
revoke all on function jovabook_private.invoke_commission_supervisor() from public,anon,authenticated;
-- Managed extensions are optional in offline PostgreSQL. The core due queue is
-- always installed. On Supabase this creates one named INACTIVE job atomically.
do $$declare job_id bigint;begin
 if to_regclass('cron.job') is null then return;end if;
 if exists(select 1 from cron.job where jobname='jovabook-commission-supervisor') then raise exception 'Review the existing commission supervisor job before migration.';end if;
 select cron.schedule('jovabook-commission-supervisor','* * * * *','select jovabook_private.invoke_commission_supervisor();') into job_id;
 perform cron.alter_job(job_id,active:=false);
end$$;
notify pgrst,'reload schema';
commit;
