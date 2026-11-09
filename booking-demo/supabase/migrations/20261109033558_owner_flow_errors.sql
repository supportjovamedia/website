begin;
create table jovabook_private.owner_flow_events(
 id uuid primary key,
 user_id uuid references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 step text not null check(step in ('signup','login','verification','business_setup','account_access','setup','runtime')),
 code text not null check(code in ('page_opened','network_unavailable','request_rejected','server_error','rate_limited','email_not_confirmed','verification_failed','region_unavailable','setup_resumed','runtime_error')),
 http_status smallint not null check(http_status between 0 and 599)
);
alter table jovabook_private.owner_flow_events enable row level security;
revoke all on table jovabook_private.owner_flow_events from public,anon,authenticated;
create index owner_flow_events_recent on jovabook_private.owner_flow_events(created_at desc);
create index owner_flow_events_account on jovabook_private.owner_flow_events(user_id,created_at desc);
-- The anonymous write surface accepts fixed classifications only, never arbitrary text or identity.
create function public.report_owner_flow_event(p_id uuid,p_step text,p_code text,p_status integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_id is null or p_step is null or p_code is null or p_status is null
  or p_step not in ('signup','login','verification','business_setup','account_access','setup','runtime')
  or p_code not in ('page_opened','network_unavailable','request_rejected','server_error','rate_limited','email_not_confirmed','verification_failed','region_unavailable','setup_resumed','runtime_error')
  or p_status<0 or p_status>599 then return jsonb_build_object('ok',false);end if;
 -- Serialize the bounded write budget without waiting behind another reporter.
 if not pg_try_advisory_xact_lock(6091127) then return jsonb_build_object('ok',true,'stored',false);end if;
 delete from jovabook_private.owner_flow_events where created_at<now()-interval '30 days';
 if exists(select 1 from jovabook_private.owner_flow_events where id=p_id) then return jsonb_build_object('ok',true,'stored',false);end if;
 if (select count(*) from jovabook_private.owner_flow_events where created_at>=now()-interval '1 day')>=2000
  or (select count(*) from jovabook_private.owner_flow_events where created_at>=now()-interval '1 minute')>=40
  or (auth.uid() is not null and (select count(*) from jovabook_private.owner_flow_events where user_id=auth.uid() and created_at>=now()-interval '15 minutes')>=20)
  then return jsonb_build_object('ok',true,'stored',false);end if;
 insert into jovabook_private.owner_flow_events(id,user_id,step,code,http_status) values(p_id,auth.uid(),p_step,p_code,p_status);
 return jsonb_build_object('ok',true,'stored',true);
end$$;
revoke all on function public.report_owner_flow_event(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.report_owner_flow_event(uuid,text,text,integer) to anon,authenticated;
create function public.operator_owner_flow_events() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform jovabook_private.require_operator();
 delete from jovabook_private.owner_flow_events where created_at<now()-interval '30 days';
 select jsonb_build_object('ok',true,'days',30,'events',coalesce(jsonb_agg(jsonb_build_object(
 'id',e.id,'at',e.created_at,'user_id',e.user_id,'name',left(u.raw_user_meta_data->>'owner_name',80),'email',u.email,
 'step',e.step,'code',e.code,'status',e.http_status,'severity',case when e.code in ('page_opened','setup_resumed') then 'info' else 'error' end) order by e.created_at desc,e.id),'[]'::jsonb)) into result
 from (select * from jovabook_private.owner_flow_events order by created_at desc,id limit 100) e left join auth.users u on u.id=e.user_id;
 insert into jovabook_private.operator_audit(actor_id,action) values(auth.uid(),'owner_flow_events');
 return result;
end$$;
revoke all on function public.operator_owner_flow_events() from public,anon,authenticated;
grant execute on function public.operator_owner_flow_events() to authenticated;
comment on table jovabook_private.owner_flow_events is 'Client-reported operational classifications, not confirmed signup, verification, booking or payment evidence. No form content, raw errors, tokens, IPs or user agents. Thirty-day rolling retention; purge on writes/reads and existing database daily cron where available.';
-- Database-only maintenance, no CDN requests. Hosted JovaBook already uses pg_cron.
do $$begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('jovabook-owner-flow-log-purge','17 3 * * *',$job$delete from jovabook_private.owner_flow_events where created_at<now()-interval '30 days'$job$);
 end if;
end$$;
commit;
