begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;
-- This independent switch never changes any billing, SMS or customer configuration.
create table jovabook_private.funnel_scheduler_config (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false
);
insert into jovabook_private.funnel_scheduler_config(singleton,enabled) values(true,false);
alter table jovabook_private.funnel_scheduler_config enable row level security;
revoke all on jovabook_private.funnel_scheduler_config from public,anon,authenticated,service_role;
create function jovabook_private.invoke_funnel_worker() returns bigint
language plpgsql security definer set search_path='' as $$
declare secret text;
begin
 if not coalesce((select enabled from jovabook_private.funnel_scheduler_config where singleton),false) then return null;end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='jovabook_funnel_worker_token';
 if secret is null or secret !~ '^[a-f0-9]{64}$' then return null;end if;
 return net.http_post(url:='https://www.jovamedia.com/api/jovabook/funnel/worker',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
 body:='{}'::jsonb,timeout_milliseconds:=55000);
end$$;
revoke all on function jovabook_private.invoke_funnel_worker() from public,anon,authenticated,service_role;
-- Installed inactive. Enable only after the dedicated Vault and Vercel secrets match.
select cron.schedule_in_database(job_name:='jovabook-owner-funnel',schedule:='*/5 * * * *',
 command:='select jovabook_private.invoke_funnel_worker();',database:=current_database(),active:=false);
commit;
