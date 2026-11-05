-- Approved trial policy: one bookable calendar and email only.
create or replace function jovabook_private.offer_seats(p_salon uuid) returns int
language sql stable security definer set search_path='' as $$
 select case when provider_status='trialing' then 1 when jovabook_private.offer_plan(p_salon)='premium' then seats else 1 end
 from jovabook_private.offer_accounts where salon_id=p_salon
$$;
create or replace function jovabook_private.offer_limits(p_salon uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p text;n int;m date;emails int;sms int;begin
 p:=jovabook_private.offer_plan(p_salon);n:=jovabook_private.offer_seats(p_salon);
 if p is null then return null;end if;
 m:=date_trunc('month',now() at time zone 'Europe/London')::date;
 emails:=case when p='essential' then 50 else 100*n end;sms:=case when p='essential' or exists(select 1 from jovabook_private.offer_accounts where salon_id=p_salon and provider_status='trialing') then 0 else 50*n end;
 return jsonb_build_object('offer_version','2026-11-free-v1','plan',p,'staff_limit',n,'seats',n,'commission_bps',0,
  'booking_limit',case when p='essential' then 20 end,'bookings_used',(select count(*) from public.bookings where salon_id=p_salon and status<>'cancelled' and date>=m and date<(m+interval '1 month')::date),
  'email_limit',emails,'emails_used',(select count(*) from jovabook_private.offer_message_usage where salon_id=p_salon and channel='email' and month=m),
  'sms_limit',sms,'sms_used',(select count(*) from jovabook_private.offer_message_usage where salon_id=p_salon and channel='sms' and month=m),
  'branding_required',p<>'premium','embed_allowed',p in('standard','premium'),'insights',p='premium','period_comparisons',p='premium','month',m);
end$$;

create function jovabook_private.offer_trial_selection_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.seats<>1 and (new.trial or new.kind in('checkout','change') and exists(select 1 from jovabook_private.offer_accounts where salon_id=new.salon_id and provider_status='trialing')) then raise exception 'Free trials include one staff calendar. Add extra seats after your subscription is paid.';end if;
 return new;
end$$;
revoke all on function jovabook_private.offer_trial_selection_guard() from public,anon,authenticated;
create trigger offer_trial_selection_guard before insert or update on jovabook_private.offer_actions for each row execute function jovabook_private.offer_trial_selection_guard();

-- The worker rechecks this gate immediately before sending, including reserved jobs.
do $$declare src text;begin
 src:=pg_get_functiondef('jovabook_private.sms_available(uuid,boolean)'::regprocedure);
 if position('select coalesce(' in src)=0 then raise exception 'Review SMS availability gate.';end if;
 src:=replace(src,'select coalesce(','select coalesce((jovabook_private.offer_limits(p_salon)->>''sms_limit'')::int,0)>0 and coalesce(');execute src;
end$$;
