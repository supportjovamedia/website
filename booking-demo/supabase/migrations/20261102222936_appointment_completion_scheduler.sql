begin;
-- Offline SQL fixtures have no scheduler; production already has pg_cron.
do $$begin
 if exists(select 1 from pg_namespace where nspname='cron') then
  execute $job$select cron.schedule('jovabook-complete-appointments','* * * * *','select jovabook_private.complete_elapsed_appointments();')$job$;
 end if;
end$$;
commit;
