-- Forward-only. Online-booking commission is automatic by default:
--  * an untouched online booking becomes chargeable once its appointment time has passed (unchanged);
--  * a booking cancelled before it starts is waived automatically;
--  * a no-show (or cancellation after the start) reported within the window is waived while the
--    business is inside its monthly allowance, and stays chargeable once the allowance is used;
--  * deleting a booking that has already started never removes its fee;
--  * a business can dispute a chargeable report once per booking, up to a monthly cap, and only
--    disputes reach the JovaMedia review queue.
-- Existing invoices, entries and operator decisions are not rewritten.
begin;

alter table jovabook_private.commission_config
 add column noshow_allowance_pct numeric not null default 0.05 check(noshow_allowance_pct between 0 and 1),
 add column noshow_allowance_min integer not null default 2 check(noshow_allowance_min between 0 and 100),
 add column noshow_report_days integer not null default 7 check(noshow_report_days between 1 and 60),
 add column dispute_monthly_cap integer not null default 5 check(dispute_monthly_cap between 0 and 100);

-- Which automatic rule (if any) produced a waiver. Operator waivers leave this empty.
alter table jovabook_private.commission_origins
 add column waiver_kind text check(waiver_kind in('cancel_before_start','no_show_allowance')),
 add column waived_at timestamptz;

-- Monthly allowance for one business: its own timezone's calendar month containing p_at (the
-- time of the report). Online bookings counted are appointments in that month; waivers used are
-- those granted in that month.
create function jovabook_private.commission_allowance(p_salon uuid,p_at timestamptz) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare cfg jovabook_private.commission_config;tz text;ms timestamptz;me timestamptz;online integer;used integer;begin
 select * into cfg from jovabook_private.commission_config where singleton;
 select coalesce(nullif(s.settings->>'timezone',''),'Europe/London') into tz from public.salons s where s.id=p_salon;
 tz:=coalesce(tz,'Europe/London');
 begin perform now() at time zone tz;exception when others then tz:='Europe/London';end;
 ms:=date_trunc('month',p_at at time zone tz) at time zone tz;
 me:=(date_trunc('month',p_at at time zone tz)+interval '1 month') at time zone tz;
 select count(*) into online from jovabook_private.commission_origins o
 where o.salon_id=p_salon and o.source='Online' and o.booking_id=o.root_booking_id and o.current_start>=ms and o.current_start<me;
 select count(*) into used from jovabook_private.commission_origins o
 where o.salon_id=p_salon and o.source='Online' and o.decision='waived' and o.waiver_kind='no_show_allowance' and o.waived_at>=ms and o.waived_at<me;
 return jsonb_build_object('month_start',ms,'month_end',me,'online_bookings',online,'allowed',greatest(cfg.noshow_allowance_min,floor(cfg.noshow_allowance_pct*online)::integer),'used',used);
end$$;
revoke all on function jovabook_private.commission_allowance(uuid,timestamptz) from public,anon,authenticated;

-- A cancellation, no-show or deletion of an original online booking.
create function jovabook_private.commission_online_report(p_origin jovabook_private.commission_origins,p_status text,p_booking_email text) returns void
language plpgsql security definer set search_path='' as $$
declare cfg jovabook_private.commission_config;alw jsonb;handling text;waive boolean:=false;actor text;t timestamptz:=clock_timestamp();begin
 select * into p_origin from jovabook_private.commission_origins where salon_id=p_origin.salon_id and booking_id=p_origin.booking_id;
 select * into cfg from jovabook_private.commission_config where singleton;
 actor:=case when exists(select 1 from public.salons where id=p_origin.salon_id and owner_id=auth.uid()) then 'staff'
  when exists(select 1 from auth.users u join public.customer_portal_memberships m on m.user_id=u.id and m.salon_id=p_origin.salon_id where u.id=auth.uid() and u.email_confirmed_at is not null and lower(trim(u.email))=lower(trim(p_booking_email))) then 'verified_customer'
  else 'unverified_link_or_server' end;
 if p_origin.current_start>t then handling:='cancel_before_start';waive:=true;
 elsif p_status='deleted' then handling:='deleted_after_start';
 elsif t>p_origin.current_start+make_interval(days=>cfg.noshow_report_days) then handling:='late_report';
 else
  alw:=jovabook_private.commission_allowance(p_origin.salon_id,t);
  if (alw->>'used')::integer<(alw->>'allowed')::integer then handling:='no_show_allowance';waive:=true;else handling:='allowance_exceeded';end if;
 end if;
 -- Only an untouched fee is waived automatically. An operator ruling or open dispute stays as decided.
 if waive and p_origin.decision='pending' then
  update jovabook_private.commission_origins set decision='waived',waiver_kind=handling,waived_at=t where salon_id=p_origin.salon_id and booking_id=p_origin.booking_id;
 end if;
 insert into jovabook_private.commission_reviews(salon_id,booking_id,actor,action,evidence)
 values(p_origin.salon_id,p_origin.booking_id,auth.uid(),p_status,jsonb_build_object('actor_kind',actor,'scheduled_start',p_origin.current_start,'handling',handling,
  'waived',waive and p_origin.decision='pending','allowance',alw));
end$$;
revoke all on function jovabook_private.commission_online_report(jovabook_private.commission_origins,text,text) from public,anon,authenticated;

-- A cancelled or no-show booking returns to confirmed or completed.
create function jovabook_private.commission_online_reinstate(p_origin jovabook_private.commission_origins) returns void
language plpgsql security definer set search_path='' as $$
begin
 select * into p_origin from jovabook_private.commission_origins where salon_id=p_origin.salon_id and booking_id=p_origin.booking_id;
 if p_origin.decision<>'waived' or p_origin.waiver_kind is null then return;end if;
 if exists(select 1 from jovabook_private.commission_entries e where e.salon_id=p_origin.salon_id and e.booking_id=p_origin.booking_id and (e.status='void' or e.kind='cancellation_credit')) then
  update jovabook_private.commission_origins set decision='review' where salon_id=p_origin.salon_id and booking_id=p_origin.booking_id;
  update jovabook_private.commission_entries set review_required=true where salon_id=p_origin.salon_id and booking_id=p_origin.booking_id and kind='service';
  insert into jovabook_private.commission_reviews(salon_id,booking_id,actor,action,evidence) values(p_origin.salon_id,p_origin.booking_id,auth.uid(),'reinstated_review',jsonb_build_object('waiver_kind',p_origin.waiver_kind));
 else
  update jovabook_private.commission_origins set decision='pending',waiver_kind=null,waived_at=null where salon_id=p_origin.salon_id and booking_id=p_origin.booking_id;
  insert into jovabook_private.commission_reviews(salon_id,booking_id,actor,action,evidence) values(p_origin.salon_id,p_origin.booking_id,auth.uid(),'reinstated',jsonb_build_object('waiver_kind',p_origin.waiver_kind));
 end if;
end$$;
revoke all on function jovabook_private.commission_online_reinstate(jovabook_private.commission_origins) from public,anon,authenticated;

-- Route original online bookings through the automatic rules. Replacement links and manual
-- bookings keep the existing review behaviour. Fails loudly if the guard has changed upstream.
do $migration$
declare definition text;needle text;replacement text;begin
 definition:=pg_get_functiondef('jovabook_private.commission_origin_guard()'::regprocedure);
 needle:='if o.booking_id is not null and (tg_op=''DELETE'' or new.status in(''cancelled'',''no-show'') and new.status is distinct from old.status) then';
 replacement:=$guard$if o.booking_id is not null and o.source='Online' and o.booking_id=o.root_booking_id and (tg_op='DELETE' or new.status in('cancelled','no-show') and new.status is distinct from old.status) then
  perform jovabook_private.commission_online_report(o,case when tg_op='DELETE' then 'deleted' else new.status end,old.email);
 elsif o.booking_id is not null and o.source='Online' and o.booking_id=o.root_booking_id and tg_op='UPDATE' and old.status in('cancelled','no-show') and new.status in('confirmed','completed') then
  perform jovabook_private.commission_online_reinstate(o);
 elsif o.booking_id is not null and (tg_op='DELETE' or new.status in('cancelled','no-show') and new.status is distinct from old.status) then$guard$;
 if strpos(definition,needle)=0 then raise exception 'Unexpected commission origin guard foundation.';end if;
 execute replace(definition,needle,replacement);
end$migration$;

-- Business-facing view of the allowance and of reports that can still be disputed.
create function public.owner_commission_allowance() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare sid uuid:=public.my_salon_id();cfg jovabook_private.commission_config;alw jsonb;disputes integer;items jsonb;begin
 if sid is null then raise exception 'Log in to a business first.' using errcode='42501';end if;
 select * into cfg from jovabook_private.commission_config where singleton;
 alw:=jovabook_private.commission_allowance(sid,clock_timestamp());
 select count(*) into disputes from jovabook_private.commission_reviews r where r.salon_id=sid and r.action='dispute'
  and r.created_at>=(alw->>'month_start')::timestamptz and r.created_at<(alw->>'month_end')::timestamptz;
 select coalesce(jsonb_agg(jsonb_build_object('booking_id',o.booking_id,'service',b.service_name,'date',b.date,'time',b.time,'price_minor',o.original_price_minor) order by o.current_start),'[]'::jsonb) into items
 from jovabook_private.commission_origins o left join public.bookings b on b.salon_id=o.salon_id and b.id=o.booking_id
 where o.salon_id=sid and o.source='Online' and o.booking_id=o.root_booking_id and o.decision='pending'
  and exists(select 1 from jovabook_private.commission_reviews r where r.salon_id=o.salon_id and r.booking_id=o.booking_id and r.action in('cancelled','no-show') and r.evidence->>'handling'='allowance_exceeded' and r.created_at>=clock_timestamp()-make_interval(days=>cfg.noshow_report_days))
  and not exists(select 1 from jovabook_private.commission_reviews r where r.salon_id=o.salon_id and r.booking_id=o.booking_id and r.action='dispute');
 return jsonb_build_object('ok',true,'month_start',alw->'month_start','online_bookings',alw->'online_bookings','allowed',alw->'allowed','used',alw->'used',
  'allowance_percent',round(cfg.noshow_allowance_pct*100),'allowance_min',cfg.noshow_allowance_min,'report_days',cfg.noshow_report_days,'disputes_used',disputes,'dispute_cap',cfg.dispute_monthly_cap,'disputable',items);
end$$;

create function public.owner_dispute_commission(p_booking text,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid:=public.my_salon_id();cfg jovabook_private.commission_config;o jovabook_private.commission_origins;alw jsonb;disputes integer;reason text:=trim(coalesce(p_reason,''));begin
 if sid is null then raise exception 'Log in to a business first.' using errcode='42501';end if;
 if length(reason) not between 10 and 1000 then raise exception 'Explain the dispute in 10 to 1000 characters.';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 select * into cfg from jovabook_private.commission_config where singleton;
 select * into o from jovabook_private.commission_origins where salon_id=sid and booking_id=p_booking and source='Online' and booking_id=root_booking_id for update;
 if o.booking_id is null then raise exception 'That online booking was not found.';end if;
 if o.decision<>'pending' then raise exception 'This booking cannot be disputed.';end if;
 if not exists(select 1 from jovabook_private.commission_reviews r where r.salon_id=sid and r.booking_id=o.booking_id and r.action in('cancelled','no-show') and r.evidence->>'handling'='allowance_exceeded' and r.created_at>=clock_timestamp()-make_interval(days=>cfg.noshow_report_days)) then raise exception 'This booking cannot be disputed.';end if;
 if exists(select 1 from jovabook_private.commission_reviews r where r.salon_id=sid and r.booking_id=o.booking_id and r.action='dispute') then raise exception 'This booking has already been disputed.';end if;
 alw:=jovabook_private.commission_allowance(sid,clock_timestamp());
 select count(*) into disputes from jovabook_private.commission_reviews r where r.salon_id=sid and r.action='dispute'
  and r.created_at>=(alw->>'month_start')::timestamptz and r.created_at<(alw->>'month_end')::timestamptz;
 if disputes>=cfg.dispute_monthly_cap then raise exception 'The monthly dispute limit has been reached.';end if;
 insert into jovabook_private.commission_reviews(salon_id,booking_id,actor,action,reason,evidence) values(sid,o.booking_id,auth.uid(),'dispute',reason,jsonb_build_object('actor_kind','staff'));
 update jovabook_private.commission_origins set decision='review' where salon_id=sid and booking_id=o.booking_id;
 update jovabook_private.commission_entries set review_required=true where salon_id=sid and booking_id=o.booking_id and kind='service';
 return jsonb_build_object('ok',true);
end$$;
revoke all on function public.owner_commission_allowance(),public.owner_dispute_commission(text,text) from public,anon;
grant execute on function public.owner_commission_allowance(),public.owner_dispute_commission(text,text) to authenticated;

-- Operator prompts also fire when a business has used its whole monthly allowance.
create or replace function public.operator_commission_alerts(p_salon uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg jovabook_private.commission_config;result jsonb;begin
 perform jovabook_private.require_operator();select * into cfg from jovabook_private.commission_config where singleton;
 with sample as (
  select o.* from jovabook_private.commission_origins o where o.booked_at>=clock_timestamp()-make_interval(days=>cfg.alert_window_days) and o.source='Online' and o.booking_id=o.root_booking_id and (p_salon is null or o.salon_id=p_salon)
 ), counts as (
  select o.salon_id,count(*) denominator,
   count(*) filter(where exists(select 1 from jovabook_private.commission_reviews r where r.salon_id=o.salon_id and r.booking_id=o.booking_id and r.action in('cancelled','no-show'))) cancelled,
   count(*) filter(where exists(select 1 from jovabook_private.commission_reviews r where r.salon_id=o.salon_id and r.booking_id=o.booking_id and r.action in('cancelled','no-show') and r.evidence->>'actor_kind'='staff')) staff_reports,
   count(*) filter(where exists(select 1 from jovabook_private.commission_reviews r where r.salon_id=o.salon_id and r.booking_id=o.booking_id and r.action='cancelled' and r.evidence->>'actor_kind'='unverified_link_or_server')) unverified_link_reports,
   count(*) filter(where exists(select 1 from jovabook_private.commission_reviews r where r.salon_id=o.salon_id and r.booking_id=o.booking_id and r.action='price_edit')) price_edits
  from sample o group by o.salon_id
 ), rates as (
  select c.*,s.name business from counts c join public.salons s on s.id=c.salon_id where denominator>=cfg.alert_min_sample and greatest(cancelled,price_edits)::numeric/denominator>=cfg.alert_rate
 ), matches as (
  select o.salon_id,o.booking_id,b.id replacement from sample o join public.bookings a on a.salon_id=o.salon_id and a.id=o.booking_id and a.status in('cancelled','no-show')
  join public.bookings b on b.salon_id=a.salon_id and b.id<>a.id and b.source='Manual' and b.status in('confirmed','completed') and b.service_id=a.service_id
   and abs(b.date-a.date)<=7 and ((nullif(lower(trim(a.email)),'') is not null and lower(trim(b.email))=lower(trim(a.email))) or (nullif(regexp_replace(a.phone,'[^0-9]','','g'),'') is not null and regexp_replace(b.phone,'[^0-9]','','g')=regexp_replace(a.phone,'[^0-9]','','g')))
  join jovabook_private.commission_origins manual on manual.salon_id=b.salon_id and manual.booking_id=b.id and manual.root_booking_id=b.id
 ), allowance as (
  select s.id salon_id,s.name business,jovabook_private.commission_allowance(s.id,clock_timestamp()) j
  from public.salons s where (p_salon is null or s.id=p_salon) and exists(select 1 from jovabook_private.commission_origins o where o.salon_id=s.id and o.waiver_kind='no_show_allowance' and o.decision='waived' and o.waived_at>=clock_timestamp()-interval '40 days')
 )
 select coalesce(jsonb_agg(item),'[]'::jsonb) into result from (
  select jsonb_build_object('salon_id',r.salon_id,'business',r.business,'kind','report_rate','count',greatest(r.cancelled,r.price_edits),'cancellations',r.cancelled,'denominator',r.denominator,'rate',greatest(r.cancelled,r.price_edits)::numeric/r.denominator,'staff_reports',r.staff_reports,'unverified_link_reports',r.unverified_link_reports,'price_edits',r.price_edits,'status','review','message','Unusual cancellation, no-show or price-edit rate. Review the booking history and legitimate business reasons.',
   'bookings',(select coalesce(jsonb_agg(jsonb_build_object('booking_id',o.booking_id,'decision',o.decision)),'[]'::jsonb) from sample o where o.salon_id=r.salon_id)) item from rates r
  union all
  select jsonb_build_object('salon_id',m.salon_id,'business',s.name,'kind','possible_replacement','booking_id',m.booking_id,'replacement_id',m.replacement,'count',1,'denominator',(select count(*) from sample o where o.salon_id=m.salon_id),'status','review','message','Similar cancelled online and manual appointments. This is a possible match, not proof of avoidance and not another charge.') from matches m join public.salons s on s.id=m.salon_id
  union all
  select jsonb_build_object('salon_id',a.salon_id,'business',a.business,'kind','allowance_used','count',(a.j->>'used')::integer,'allowed',(a.j->>'allowed')::integer,'denominator',(a.j->>'online_bookings')::integer,'status','review','message','Used the whole monthly no-show allowance. Further reports stay chargeable unless the business sends a dispute. This is a prompt to look at the booking history, not proof of anything.') from allowance a where (a.j->>'used')::integer>=(a.j->>'allowed')::integer
  limit 200
 ) items;
 return jsonb_build_object('ok',true,'window_days',cfg.alert_window_days,'minimum_sample',cfg.alert_min_sample,'rate_threshold',cfg.alert_rate,'alerts',result);
end$$;
revoke all on function public.operator_commission_alerts(uuid) from public,anon;
grant execute on function public.operator_commission_alerts(uuid) to authenticated;

commit;
