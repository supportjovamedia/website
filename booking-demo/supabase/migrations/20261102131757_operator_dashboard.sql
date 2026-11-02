begin;
create table jovabook_private.operator_notification_reads(actor_id uuid not null references auth.users(id) on delete cascade,event_id text not null,read_at timestamptz not null default now(),primary key(actor_id,event_id));
alter table jovabook_private.operator_notification_reads enable row level security;
revoke all on jovabook_private.operator_notification_reads from public,anon,authenticated;
create function jovabook_private.operator_events() returns table(id text,salon_id uuid,business text,title text,at timestamptz) language sql stable security definer set search_path='' as $$
 select md5(kind||':'||sid::text||':'||event_at::text),sid,name,label,event_at from (
 select 'signup' kind,s.id sid,s.name,'New business registered' label,s.created_at event_at from public.salons s where s.created_at>now()-interval '14 days'
 union all select 'payment',s.id,s.name,'Subscription payment needs attention',a.failed_at from public.salons s join jovabook_private.billing_accounts a on a.salon_id=s.id where a.failed_at is not null
 union all select 'trial',s.id,s.name,'Trial ending soon',a.trial_ends_at from public.salons s join jovabook_private.billing_accounts a on a.salon_id=s.id where not a.ever_paid and a.trial_ends_at between now() and now()+interval '3 days'
 ) events order by event_at desc limit 12
$$;
create function public.operator_overview() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 perform jovabook_private.require_operator();
 select jsonb_build_object('ok',true,'total',count(*),'essential',count(*) filter(where case when a.ever_paid then a.paid_plan else 'essential' end='essential'),
 'standard',count(*) filter(where a.ever_paid and a.paid_plan='standard'),'premium',count(*) filter(where a.ever_paid and a.paid_plan='premium'),
 'new_this_month',count(*) filter(where s.created_at>=date_trunc('month',now())),
 'owner_signins_today',count(*) filter(where (to_jsonb(u)->>'last_sign_in_at')::timestamptz >= (date_trunc('day',now() at time zone 'Europe/London') at time zone 'Europe/London')))
 into result from public.salons s left join jovabook_private.billing_accounts a on a.salon_id=s.id left join auth.users u on u.id=s.owner_id;
 return result||jsonb_build_object('months',(select jsonb_agg(jsonb_build_object('label',to_char(m,'Mon'),'count',(select count(*) from public.salons s where s.created_at>=m and s.created_at<m+interval '1 month')) order by m) from generate_series(date_trunc('month',now())-interval '5 months',date_trunc('month',now()),interval '1 month') m),
 'recent',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'created_at',r.created_at) order by r.created_at desc),'[]') from (select id,name,created_at from public.salons order by created_at desc limit 5)r),
 'notifications',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'salon_id',e.salon_id,'business',e.business,'title',e.title,'at',e.at,'read',r.event_id is not null) order by e.at desc),'[]') from jovabook_private.operator_events() e left join jovabook_private.operator_notification_reads r on r.event_id=e.id and r.actor_id=auth.uid()));
end$$;
create function public.operator_read_notification(p_event text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform jovabook_private.require_operator();if not exists(select 1 from jovabook_private.operator_events() where id=p_event) then raise exception 'Notification unavailable.';end if;
 insert into jovabook_private.operator_notification_reads(actor_id,event_id) values(auth.uid(),p_event) on conflict do nothing;
 return jsonb_build_object('ok',true);
end$$;
create or replace function public.operator_businesses(p_search text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 perform jovabook_private.require_operator();
 select coalesce(jsonb_agg(item order by created desc),'[]') into result from (
 select s.created_at created,jsonb_build_object('id',s.id,'name',s.name,'slug',s.slug,'created_at',s.created_at,
 'status',s.status,'plan',case when a.ever_paid then a.paid_plan else 'essential' end,'access',jovabook_private.billing_access(s.id),
 'trial_end',a.trial_ends_at,'paid_until',a.paid_until,'cadence',a.paid_cadence,'cancel_at_period_end',a.cancel_at_period_end) item
 from public.salons s left join jovabook_private.billing_accounts a on a.salon_id=s.id
 where length(coalesce(p_search,''))<=100 and (coalesce(p_search,'')='' or position(lower(p_search) in lower(s.name||' '||s.slug))>0)
 order by s.created_at desc limit 200) entries;
 insert into jovabook_private.operator_audit(actor_id,action) values(auth.uid(),'business_directory');
 return jsonb_build_object('ok',true,'businesses',result,'total',(select count(*) from public.salons));
end$$;
do $$declare definition text;begin definition:=pg_get_functiondef('public.operator_business(uuid)'::regprocedure);execute replace(definition,'public.operator_business(','jovabook_private.operator_business_before_privacy(');end$$;
create or replace function public.operator_business(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 perform jovabook_private.require_operator();result:=jovabook_private.operator_business_before_privacy(p_id);
 return jsonb_set(result,'{business}',(result->'business')-'owner'-'email'-'phone'||jsonb_build_object('created_at',(select created_at from public.salons where id=p_id)));
end$$;
revoke all on function jovabook_private.operator_events(),jovabook_private.operator_business_before_privacy(uuid),public.operator_overview(),public.operator_read_notification(text) from public,anon,authenticated;
grant execute on function public.operator_overview(),public.operator_read_notification(text) to authenticated;
commit;
