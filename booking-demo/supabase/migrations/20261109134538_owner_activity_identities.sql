begin;
alter table jovabook_private.owner_flow_events add column browser_session uuid, add column setup_stage text;
alter table jovabook_private.owner_flow_events drop constraint owner_flow_events_step_check, drop constraint owner_flow_events_code_check;
alter table jovabook_private.owner_flow_events add constraint owner_flow_events_step_check check(step in ('signup','login','verification','business_setup','account_access','setup','runtime','dashboard','calendar','bookings','customers','services','staff','insights','personalise','website','billing','settings','availability'));
alter table jovabook_private.owner_flow_events add constraint owner_flow_events_code_check check(code in ('page_opened','network_unavailable','request_rejected','server_error','rate_limited','email_not_confirmed','verification_failed','region_unavailable','setup_resumed','runtime_error','session_identified','step_viewed','step_saved','verification_requested'));
alter table jovabook_private.owner_flow_events add constraint owner_flow_events_stage_check check(setup_stage is null or setup_stage in ('email','check-email','profile','business','category','team','location','source','ready'));
create index owner_flow_events_session on jovabook_private.owner_flow_events(browser_session,created_at desc) where browser_session is not null;

-- A random browser-session label is for grouping, never authentication or proof of a person.
-- Old clients keep their existing four-argument writer. New clients use this bounded writer.
create function public.report_owner_activity(p_id uuid,p_session uuid,p_step text,p_code text,p_status integer,p_stage text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare identity uuid:=auth.uid();
begin
 if p_id is null or p_session is null or p_step is null or p_code is null or p_status is null
  or p_step not in ('signup','login','verification','business_setup','account_access','setup','runtime','dashboard','calendar','bookings','customers','services','staff','insights','personalise','website','billing','settings','availability')
  or p_code not in ('page_opened','network_unavailable','request_rejected','server_error','rate_limited','email_not_confirmed','verification_failed','region_unavailable','setup_resumed','runtime_error','session_identified','step_viewed','step_saved','verification_requested')
  or p_status<0 or p_status>599
  or (p_stage is not null and p_stage not in ('email','check-email','profile','business','category','team','location','source','ready'))
  or (identity is null and (p_code='session_identified' or p_step not in ('signup','login','verification','business_setup','account_access','setup','runtime')))
  then return jsonb_build_object('ok',false);end if;
 if not pg_try_advisory_xact_lock(6091127) then return jsonb_build_object('ok',true,'stored',false);end if;
 delete from jovabook_private.owner_flow_events where created_at<now()-interval '30 days';
 if exists(select 1 from jovabook_private.owner_flow_events where id=p_id) then return jsonb_build_object('ok',true,'stored',false);end if;
 if (select count(*) from jovabook_private.owner_flow_events where created_at>=now()-interval '1 day')>=2000
  or (select count(*) from jovabook_private.owner_flow_events where created_at>=now()-interval '1 minute')>=40
  or (select count(*) from jovabook_private.owner_flow_events where browser_session=p_session and created_at>=now()-interval '15 minutes')>=20
  or (identity is not null and (select count(*) from jovabook_private.owner_flow_events where user_id=identity and created_at>=now()-interval '15 minutes')>=20)
  then return jsonb_build_object('ok',true,'stored',false);end if;
 insert into jovabook_private.owner_flow_events(id,user_id,step,code,http_status,browser_session,setup_stage)
 values(p_id,identity,p_step,p_code,p_status,p_session,p_stage);
 return jsonb_build_object('ok',true,'stored',true);
end$$;
revoke all on function public.report_owner_activity(uuid,uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.report_owner_activity(uuid,uuid,text,text,integer,text) to anon,authenticated;

create or replace function public.operator_owner_flow_events() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;counts jsonb;
begin
 perform jovabook_private.require_operator();
 delete from jovabook_private.owner_flow_events where created_at<now()-interval '30 days';
 select jsonb_build_object('accounts',count(distinct user_id),
  'browser_sessions',count(distinct browser_session),
  'unidentified_events',count(*) filter(where user_id is null and browser_session is null),
  'events',count(*),'errors',count(*) filter(where code not in ('page_opened','setup_resumed','session_identified','step_viewed','step_saved','verification_requested')),
  'last_activity_at',max(created_at)) into counts from jovabook_private.owner_flow_events;
 select jsonb_build_object('ok',true,'days',30,'summary',counts,'limit',100,'events',coalesce(jsonb_agg(jsonb_build_object(
  'id',e.id,'at',e.created_at,'user_id',e.user_id,'browser_session',e.browser_session,'stage',e.setup_stage,
  'name',left(coalesce(nullif(u.raw_user_meta_data->>'owner_name',''),nullif(concat_ws(' ',u.raw_user_meta_data->>'first_name',u.raw_user_meta_data->>'last_name'),''),u.raw_user_meta_data->>'full_name'),80),
  'email',u.email,'business_name',b.names,'business_id',b.id,
  'step',e.step,'code',e.code,'status',e.http_status,
  'severity',case when e.code in ('page_opened','setup_resumed','session_identified','step_viewed','step_saved','verification_requested') then 'info' else 'error' end
 ) order by e.created_at desc,e.id),'[]'::jsonb)) into result
 from (select * from jovabook_private.owner_flow_events order by created_at desc,id limit 100) e
 left join auth.users u on u.id=e.user_id
 left join lateral (select string_agg(s.name,', ' order by s.name) names,(array_agg(s.id order by s.created_at,s.id))[1] id from public.salons s where s.owner_id=e.user_id) b on true;
 insert into jovabook_private.operator_audit(actor_id,action) values(auth.uid(),'owner_flow_events');
 return result;
end$$;
revoke all on function public.operator_owner_flow_events() from public,anon;
grant execute on function public.operator_owner_flow_events() to authenticated;
comment on column jovabook_private.owner_flow_events.browser_session is 'Random, tab-scoped operational grouping label. Not a device fingerprint, person count or authorisation credential. No retrospective identity attribution.';
commit;
