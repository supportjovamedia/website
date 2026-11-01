-- Hosted transport only. Omit from the isolated PGlite schema manifest.
-- Applying this source creates an INACTIVE job. It never creates a Vault secret
-- or enables either integration_config flag.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
 if to_regclass('vault.decrypted_secrets') is null then
  raise exception 'Recovery scheduler unavailable: Vault is not installed.' using errcode='55000';
 end if;
 -- Newer pg_net versions expose a ceiling; 0.20.4 uses the timeout directly.
 -- Do not change a server setting or silently shorten the handler budget.
 if current_setting('pg_net.max_timeout_ms',true) is not null and current_setting('pg_net.max_timeout_ms',true)::bigint<330000 then
  raise exception 'Recovery scheduler unavailable: HTTP timeout ceiling is too low.' using errcode='55000';
 end if;
end$$;

create function jovabook_private.invoke_recovery_worker() returns bigint
language plpgsql security definer set search_path='' as $$
declare config jovabook_private.integration_config;secret text;
begin
 select * into config from jovabook_private.integration_config where singleton;
 if not coalesce(config.enabled and config.recovery_enabled,false) then return null;end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='jovabook_integrations_worker_token';
 if secret is null or secret !~ '^[a-f0-9]{64}$' or config.worker_hash is null or config.worker_hash<>encode(sha256(convert_to(secret,'UTF8')),'hex') then
  raise exception 'Recovery scheduler unavailable: worker credential is not configured correctly.' using errcode='55000';
 end if;
 return net.http_post(
  url:='https://www.jovamedia.com/api/jovabook/recovery/worker',
  body:='{}'::jsonb,
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
  -- Vercel handler budget is 300 seconds; allow 30 seconds for transport.
  -- The durable dispatch lease is 600 seconds, longer than either budget.
  timeout_milliseconds:=330000
 );
end$$;
revoke all on function jovabook_private.invoke_recovery_worker() from public,anon,authenticated;

do $$declare v_job bigint;
begin
 if exists(select 1 from cron.job where jobname='jovabook-slot-recovery') then
  raise exception 'Recovery scheduler already exists. Review it before applying this migration.';
 end if;
 -- This privileged API creates the row inactive from its first committed state.
 v_job:=cron.schedule_in_database(
  job_name:='jovabook-slot-recovery',schedule:='* * * * *',
  command:='select jovabook_private.invoke_recovery_worker();',
  database:=current_database(),username:=current_user,active:=false
 );
 if not exists(select 1 from cron.job where jobid=v_job and active=false) then
  raise exception 'Recovery scheduler could not be installed inactive.';
 end if;
end$$;
commit;
