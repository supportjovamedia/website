begin;
-- Counts are prompts for a human review. They never create charges or penalties.
alter table jovabook_private.commission_config add column alert_window_days integer not null default 30 check(alert_window_days between 7 and 365),add column alert_min_sample integer not null default 20 check(alert_min_sample between 5 and 1000),add column alert_rate numeric not null default 0.30 check(alert_rate between 0.05 and 1);
create function public.operator_commission_alerts(p_salon uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
 )
 select coalesce(jsonb_agg(item),'[]'::jsonb) into result from (
  select jsonb_build_object('salon_id',r.salon_id,'business',r.business,'kind','report_rate','count',greatest(r.cancelled,r.price_edits),'cancellations',r.cancelled,'denominator',r.denominator,'rate',greatest(r.cancelled,r.price_edits)::numeric/r.denominator,'staff_reports',r.staff_reports,'unverified_link_reports',r.unverified_link_reports,'price_edits',r.price_edits,'status','review','message','Unusual cancellation, no-show or price-edit rate. Review the booking history and legitimate business reasons.',
   'bookings',(select coalesce(jsonb_agg(jsonb_build_object('booking_id',o.booking_id,'decision',o.decision)),'[]'::jsonb) from sample o where o.salon_id=r.salon_id)) item from rates r
  union all
  select jsonb_build_object('salon_id',m.salon_id,'business',s.name,'kind','possible_replacement','booking_id',m.booking_id,'replacement_id',m.replacement,'count',1,'denominator',(select count(*) from sample o where o.salon_id=m.salon_id),'status','review','message','Similar cancelled online and manual appointments. This is a possible match, not proof of avoidance and not another charge.') from matches m join public.salons s on s.id=m.salon_id
  limit 200
 ) items;
 return jsonb_build_object('ok',true,'window_days',cfg.alert_window_days,'minimum_sample',cfg.alert_min_sample,'rate_threshold',cfg.alert_rate,'alerts',result);
end$$;
revoke all on function public.operator_commission_alerts(uuid) from public,anon;
grant execute on function public.operator_commission_alerts(uuid) to authenticated;
commit;
