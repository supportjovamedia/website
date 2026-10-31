-- Runs after the reviewed delivery schema. No message is sent while enabled=false.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create function jovabook_private.invoke_email_worker() returns bigint
language plpgsql security definer set search_path='' as $$
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
end $$;
revoke all on function jovabook_private.invoke_email_worker() from public,anon,authenticated;
select cron.schedule('jovabook-email-delivery','* * * * *',$$select jovabook_private.invoke_email_worker();$$);
