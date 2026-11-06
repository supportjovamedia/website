begin;

-- Existing appointments store business-local dates and times, not viewer-local
-- instants. Keep UK defaults and prevent a settings edit from reinterpreting them.
create function jovabook_private.locale_valid(p_country text,p_timezone text,p_currency text) returns boolean
language sql stable set search_path='' as $$
 select coalesce(p_currency in('GBP','USD') and exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) and
 case when p_country in('GB','IM','JE','GG') then p_timezone='Europe/London'
 when p_country='US' then p_timezone=any(array['America/New_York','America/Detroit','America/Kentucky/Louisville','America/Kentucky/Monticello','America/Indiana/Indianapolis','America/Indiana/Vincennes','America/Indiana/Winamac','America/Indiana/Marengo','America/Indiana/Petersburg','America/Indiana/Vevay','America/Chicago','America/Indiana/Tell_City','America/Indiana/Knox','America/Menominee','America/North_Dakota/Center','America/North_Dakota/New_Salem','America/North_Dakota/Beulah','America/Denver','America/Boise','America/Phoenix','America/Los_Angeles','America/Anchorage','America/Juneau','America/Sitka','America/Metlakatla','America/Yakutat','America/Nome','America/Adak','Pacific/Honolulu'])
 else false end,false)
$$;
revoke all on function jovabook_private.locale_valid(text,text,text) from public,anon,authenticated;

create function jovabook_private.enforce_business_locale() returns trigger
language plpgsql security definer set search_path='' as $$
declare previous jsonb:='{}';code text;zone text;currency text;old_code text;old_zone text;old_currency text;
begin
 if tg_op='UPDATE' then previous:=coalesce(old.settings,'{}');end if;
 if jsonb_typeof(new.settings) is distinct from 'object' then raise exception 'Enter valid business settings.' using errcode='22023';end if;
 code:=coalesce(new.settings->>'country',previous->>'country','GB');
 if code in('IM','JE','GG') then code:='GB';end if;
 zone:=coalesce(new.settings->>'timezone',previous->>'timezone',case code when 'US' then 'America/New_York' else 'Europe/London' end);
 currency:=coalesce(new.settings->>'currency',previous->>'currency',case code when 'US' then 'USD' else 'GBP' end);
 if not jovabook_private.locale_valid(code,zone,currency) then raise exception 'Choose a supported business country, its time zone, and GBP or USD.' using errcode='22023';end if;
 if tg_op='UPDATE' then
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||new.id::text));
  old_code:=coalesce(previous->>'country','GB');old_zone:=coalesce(previous->>'timezone','Europe/London');old_currency:=coalesce(previous->>'currency','GBP');
  if old_code in('IM','JE','GG') then old_code:='GB';end if;
  if (code,zone,currency) is distinct from (old_code,old_zone,old_currency) and (
   exists(select 1 from public.bookings where salon_id=new.id) or exists(select 1 from public.payments where salon_id=new.id)
   or exists(select 1 from jovabook_private.deposit_checkouts where salon_id=new.id)) then
   raise exception 'Country, time zone and service currency are locked after appointments or payments exist. Contact support before moving the business.' using errcode='23514';
  end if;
 end if;
 new.settings:=new.settings||jsonb_build_object('country',code,'timezone',zone,'currency',currency);
 return new;
end$$;
revoke all on function jovabook_private.enforce_business_locale() from public,anon,authenticated;
create trigger international_business_locale before insert or update of settings on public.salons for each row execute function jovabook_private.enforce_business_locale();

-- Preserve the existing onboarding, verified-owner and Free-plan activation
-- implementation. Older callers keep their locale when the new keys are absent.
alter function public.save_setup(text,text,jsonb) set schema jovabook_private;
alter function jovabook_private.save_setup(text,text,jsonb) rename to international_before_save_setup;
revoke all on function jovabook_private.international_before_save_setup(text,text,jsonb) from public,anon,authenticated;
create function public.save_setup(p_address text,p_phone text,p_settings jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare sid uuid;locale jsonb;
begin
 if jsonb_typeof(p_settings) is distinct from 'object' then raise exception 'Enter valid business settings.' using errcode='22023';end if;
 select id into sid from public.salons where owner_id=auth.uid();
 if sid is null then raise exception 'Business access denied.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 locale:=p_settings-(array(select jsonb_object_keys(p_settings) except select unnest(array['country','timezone','currency'])));
 perform jovabook_private.international_before_save_setup(p_address,p_phone,p_settings-'country'-'timezone'-'currency');
 if locale<>'{}' then update public.salons set settings=settings||locale where id=sid and owner_id=auth.uid();end if;
end$$;
revoke all on function public.save_setup(text,text,jsonb) from public,anon;
grant execute on function public.save_setup(text,text,jsonb) to authenticated;

alter function public.owner_account_access() set schema jovabook_private;
alter function jovabook_private.owner_account_access() rename to international_before_owner_access;
revoke all on function jovabook_private.international_before_owner_access() from public,anon,authenticated;
create function public.owner_account_access() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;s public.salons;
begin
 result:=jovabook_private.international_before_owner_access();
 if result->>'access'='setup' and result->'business'->>'id' is not null then
  select * into s from public.salons where id=(result->'business'->>'id')::uuid and owner_id=auth.uid();
  if s.id is null then raise exception 'Business access denied.' using errcode='42501';end if;
  result:=result||jsonb_build_object('setup',(case when jsonb_typeof(result->'setup')='object' then result->'setup' else '{}'::jsonb end)||jsonb_build_object('address',coalesce(s.address,''),'phone',coalesce(s.phone,''),
   'hours',s.settings->'hours','color',coalesce(s.settings->>'color','#77504e'),'country',coalesce(s.settings->>'country','GB'),
   'timezone',coalesce(s.settings->>'timezone','Europe/London'),'currency',coalesce(s.settings->>'currency','GBP')));
 end if;
 return result;
end$$;
revoke all on function public.owner_account_access() from public,anon;
grant execute on function public.owner_account_access() to authenticated;

-- No offset is guessed for a skipped or repeated local clock reading. The
-- date/time schema has no fold selector, so ambiguous appointments are refused.
create function jovabook_private.business_instant(p_date date,p_time text,p_zone text) returns timestamptz
language plpgsql stable set search_path='' as $$
declare local_time timestamp;instant timestamptz;
begin
 if p_date is null or coalesce(p_time,'')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_zone) then return null;end if;
 local_time:=p_date+p_time::time;instant:=local_time at time zone p_zone;
 if instant at time zone p_zone<>local_time or exists(select 1 from generate_series(-180,180,15) delta where delta<>0 and (instant+make_interval(mins=>delta)) at time zone p_zone=local_time) then return null;end if;
 return instant;
end$$;
revoke all on function jovabook_private.business_instant(date,text,text) from public,anon,authenticated;
create or replace function jovabook_private.sms_start(b public.bookings) returns timestamptz
language sql stable set search_path='' as $$
 select jovabook_private.business_instant(b.date,b.time,jovabook_private.sms_timezone(b.salon_id))
$$;

create or replace function jovabook_private.online_booking_window(p_salon uuid,p_now timestamptz default now()) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:=jovabook_private.sms_timezone(p_salon);local_today date;
begin
 if zone is null then return null;end if;local_today:=(p_now at time zone zone)::date;
 return jsonb_build_object('today',local_today,'max_date',local_today+75,'days',75,'timezone',zone,'server_now',p_now,
  'utc_offset_minutes',extract(epoch from ((p_now at time zone zone)-(p_now at time zone 'UTC')))/60);
end$$;
revoke all on function jovabook_private.online_booking_window(uuid,timestamptz) from public,anon,authenticated;

-- The public wrapper still applies private deposit holds. Replace only its
-- canonical schedule implementation, retaining writer locks and overlap checks.
create or replace function jovabook_private.deposit_original_slot_free(p_salon uuid,p_staff text,p_date date,p_time text,p_duration int,p_ignore text default null) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare cfg jsonb;st public.staff;bh jsonb;sh jsonb;a text;z text;t int;buf int;notice int;zone text;now_l timestamp;starts timestamptz;
begin
 if p_time is null or p_time!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_duration is null or p_duration not between 5 and 600 or p_date is null then return false;end if;
 select settings into cfg from public.salons where id=p_salon;
 zone:=jovabook_private.sms_timezone(p_salon);if zone is null then return false;end if;
 now_l:=now() at time zone zone;starts:=jovabook_private.business_instant(p_date,p_time,zone);
 if starts is null then return false;end if;
 select * into st from public.staff where salon_id=p_salon and id=p_staff;
 if st.id is null or not st.active then return false;end if;
 bh:=public.schedule_day(cfg->'hours',extract(dow from p_date)::int);
 sh:=case when st.hours is null then bh else public.schedule_day(st.hours,extract(dow from p_date)::int) end;
 if (bh->>'closed')::boolean or (sh->>'closed')::boolean then return false;end if;
 a:=greatest(bh->>'start',sh->>'start');z:=least(bh->>'end',sh->>'end');
 buf:=greatest(0,coalesce((cfg->>'buffer')::int,0));notice:=greatest(0,coalesce((cfg->>'notice')::int,0));t:=public.clock_mins(p_time);
 if a>=z or p_date<now_l::date or t<public.clock_mins(a) or t+p_duration+buf>public.clock_mins(z) or (t-public.clock_mins(a))%30<>0 then return false;end if;
 if starts<=now()+make_interval(mins=>notice) then return false;end if;
 if (starts+make_interval(mins=>p_duration+buf)) at time zone zone<>p_date+p_time::time+make_interval(mins=>p_duration+buf) then return false;end if;
 return not exists(select 1 from public.bookings b where b.salon_id=p_salon and b.staff_id=p_staff and b.date=p_date and b.status<>'cancelled' and (p_ignore is null or b.id<>p_ignore)
  and t<public.clock_mins(b.time)+b.duration+buf and t+p_duration+buf>public.clock_mins(b.time));
end$$;
revoke all on function jovabook_private.deposit_original_slot_free(uuid,text,date,text,integer,text) from public,anon,authenticated;

-- Preserve all existing origin, consent, suppression, lease and entitlement
-- guards. Require exact known insertion points rather than patching all SQL.
do $patch$
declare src text;needle text;
begin
 src:=pg_get_functiondef('jovabook_private.enqueue_booking_email(public.bookings,text,timestamp with time zone)'::regprocedure);
 needle:='''timezone'',''Europe/London'');';
 if position(needle in src)=0 then raise exception 'Review email locale payload insertion point.';end if;
 execute replace(src,needle,'''timezone'',jovabook_private.sms_timezone(s.id),''country'',coalesce(s.settings->>''country'',''GB''),''currency'',coalesce(s.settings->>''currency'',''GBP''));');
 src:=pg_get_functiondef('jovabook_private.booking_email_event()'::regprocedure);
 needle:='starts_at:=(b.date+b.time::time) at time zone ''Europe/London'';';
 if position(needle in src)=0 then raise exception 'Review email reminder instant insertion point.';end if;
 execute replace(src,needle,'starts_at:=jovabook_private.sms_start(b);');
 src:=pg_get_functiondef('public.booking_email_worker(text,text,jsonb)'::regprocedure);
 needle:='(q.kind=''reminder'' and (b.date+b.time::time) at time zone ''Europe/London''<=now())';
 if position(needle in src)=0 then raise exception 'Review email worker reminder guard.';end if;
 execute replace(src,needle,'(q.kind=''reminder'' and (jovabook_private.sms_start(b) is null or jovabook_private.sms_start(b)<=now()))');
 src:=pg_get_functiondef('public.customer_portal_bookings(text)'::regprocedure);
 needle:='''timezone'',coalesce(s.settings->>''timezone'',''Europe/London'')';
 if position(needle in src)=0 then raise exception 'Review customer portal locale insertion point.';end if;
 execute replace(src,needle,needle||',''country'',coalesce(s.settings->>''country'',''GB''),''currency'',coalesce(s.settings->>''currency'',''GBP'')');
 src:=pg_get_functiondef('jovabook_private.offer_limits(uuid)'::regprocedure);
 needle:='m:=date_trunc(''month'',now() at time zone ''Europe/London'')::date;';
 if position(needle in src)=0 then raise exception 'Review business-month allowance insertion point.';end if;
 execute replace(src,needle,'m:=date_trunc(''month'',now() at time zone jovabook_private.sms_timezone(p_salon))::date;');
 src:=pg_get_functiondef('public.protect_staff_deletion()'::regprocedure);
 needle:='(now() at time zone ''Europe/London'')::date';
 if position(needle in src)=0 then raise exception 'Review staff deletion local-date insertion point.';end if;
 execute replace(src,needle,'(now() at time zone jovabook_private.sms_timezone(old.salon_id))::date');
 src:=pg_get_functiondef('jovabook_private.billing_original_public_salon(text)'::regprocedure);
 needle:='(now() at time zone ''Europe/London'')::date - 1';
 if position(needle in src)=0 then raise exception 'Review public availability local-date insertion point.';end if;
 execute replace(src,needle,'(now() at time zone jovabook_private.sms_timezone(s.id))::date - 1');
end$patch$;

-- SaaS commission totals remain GBP. A reviewed booking's original service
-- price needs its own currency and must never be relabelled as subscription GBP.
do $patch$
declare src text;needle text:='''original_price_minor'',o.original_price_minor,''booked_at''';
begin
 src:=pg_get_functiondef('public.operator_commission_reviews(uuid)'::regprocedure);
 if position(needle in src)=0 then raise exception 'Review operator booking-price currency insertion point.';end if;
 execute replace(src,needle,'''original_price_minor'',o.original_price_minor,''currency'',upper(coalesce(nullif(s.settings->>''currency'',''''),''GBP'')),''booked_at''');
end$patch$;

-- Service prices and their hosted deposits use the business currency. JovaBook
-- subscription invoices keep their existing separate GBP catalogue.
create function jovabook_private.service_currency(p_salon uuid) returns text language sql stable set search_path='' as $$
 select lower(coalesce(settings->>'currency','GBP')) from public.salons where id=p_salon
$$;
revoke all on function jovabook_private.service_currency(uuid) from public,anon,authenticated;
alter table jovabook_private.deposit_checkouts drop constraint deposit_checkouts_currency_check;
alter table jovabook_private.deposit_checkouts add constraint deposit_checkouts_currency_check check(currency in('gbp','usd'));
alter table jovabook_private.deposit_checkouts add constraint international_deposit_amount check(amount>=case currency when 'gbp' then 30 else 50 end);
alter table jovabook_private.customer_deposits drop constraint customer_deposits_currency_check;
alter table jovabook_private.customer_deposits add constraint customer_deposits_currency_check check(currency in('gbp','usd'));
do $patch$
declare src text;needle text;
begin
 src:=pg_get_functiondef('jovabook_private.online_deposit_pence(uuid,numeric)'::regprocedure);
 needle:='if amount<30 then return 0;end if;';
 if position(needle in src)=0 then raise exception 'Review service-currency minimum insertion point.';end if;
 execute replace(src,needle,'if amount<(case jovabook_private.service_currency(p_salon) when ''gbp'' then 30 else 50 end) then return 0;end if;');
 src:=pg_get_functiondef('jovabook_private.deposit_worker_before_attention(text,text,jsonb)'::regprocedure);
 needle:='return jsonb_build_object(''account_id'',a.account_id);';
 if position(needle in src)=0 then raise exception 'Review deposit quote currency insertion point.';end if;
 src:=replace(src,needle,'return jsonb_build_object(''account_id'',a.account_id,''currency'',jovabook_private.service_currency(a.salon_id));');
 needle:='phone,notes,amount,sms_consent)';
 if position(needle in src)=0 then raise exception 'Review deposit checkout currency column insertion point.';end if;
 src:=replace(src,needle,'phone,notes,amount,currency,sms_consent)');
 needle:='dep::int,coalesce((p_payload->>''sms_consent'')::boolean,false)';
 if position(needle in src)=0 then raise exception 'Review deposit checkout currency value insertion point.';end if;
 execute replace(src,needle,'dep::int,jovabook_private.service_currency(s.id),coalesce((p_payload->>''sms_consent'')::boolean,false)');
end$patch$;

-- Add service currency only after the existing worker has checked the dedicated
-- secret, verified membership, access state and connected payment account.
alter function public.customer_portal_worker(text,text,jsonb) set schema jovabook_private;
alter function jovabook_private.customer_portal_worker(text,text,jsonb) rename to international_before_customer_portal_worker;
revoke all on function jovabook_private.international_before_customer_portal_worker(text,text,jsonb) from public,anon,authenticated;
create function public.customer_portal_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=jovabook_private.international_before_customer_portal_worker(p_token,p_action,p_payload);
 if result is not null and p_action in('payment_context','payment_status_context') then
  result:=result||jsonb_build_object('currency',jovabook_private.service_currency((p_payload->>'salon_id')::uuid));
 end if;
 return result;
end$$;
revoke all on function public.customer_portal_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.customer_portal_worker(text,text,jsonb) to anon;

-- Provider accounting tags come only from the verified server queue record.
create or replace function jovabook_private.sms_template_valid(value text) returns boolean language sql immutable set search_path='' as $$
 select length(trim(value)) between 1 and 320 and strpos(value,'{time}')>0 and strpos(value,'{date}')>0 and strpos(value,'{business}')>0
 and regexp_replace(value,'\{(time|day|date|business|address|timezone)\}','','g')!~'[{}]'
$$;
create function jovabook_private.sms_render_message(template text,business text,address text,appt_date date,appt_time text,appt_timezone text) returns text
language sql immutable set search_path='' as $$
 select replace(jovabook_private.sms_render_message(template,business,address,appt_date,appt_time),'{timezone}',left(regexp_replace(coalesce(appt_timezone,'Europe/London'),'[[:cntrl:]]',' ','g'),80))
$$;
revoke all on function jovabook_private.sms_render_message(text,text,text,date,text,text) from public,anon,authenticated;
-- Defaults affect future preferences only. Existing owner templates are retained.
alter table jovabook_private.sms_business_settings alter column message_template set default 'Reminder: next appt at {time} on {day}, {date} ({timezone}). {business}, {address}.';
do $patch$
declare src text;needle text;
begin
 src:=pg_get_functiondef('public.set_sms_message(text,uuid)'::regprocedure);
 needle:='jovabook_private.sms_render_message(message,s.name,s.address,date ''2026-09-30'',''12:59'')';
 if position(needle in src)=0 then raise exception 'Review SMS template zone validation insertion point.';end if;
 src:=replace(src,needle,'jovabook_private.sms_render_message(message,s.name,s.address,date ''2026-09-30'',''12:59'',jovabook_private.sms_timezone(s.id))');
 execute replace(src,'at most three SMS credits.','at most three SMS parts.');
 src:=pg_get_functiondef('public.booking_sms_worker(text,text,jsonb)'::regprocedure);
 needle:='if p_action=''health'' then';
 if position(needle in src)=0 then raise exception 'Review unavailable sender worker action insertion point.';end if;
 src:=replace(src,needle,$action$if p_action='unavailable' then
  select * into q from jovabook_private.sms_queue where id=(p_payload->>'id')::uuid and lease=(p_payload->>'lease')::uuid
   and lease_until>now() and status in('Leased','Prepared') and not attempted for update;
  if q.id is null then return null;end if;
  perform jovabook_private.sms_cancel(q.id,'SMS destination sender is not ready.');
  return jsonb_build_object('ok',true,'cancelled',true);
 end if;
 $action$||needle);
 needle:='jovabook_private.sms_render_message(p.message_template,s.name,s.address,b.date,b.time)';
 if position(needle in src)=0 then raise exception 'Review SMS business-zone rendering insertion point.';end if;
 src:=replace(src,needle,'jovabook_private.sms_render_message(p.message_template,s.name,s.address,b.date,b.time,jovabook_private.sms_timezone(b.salon_id))');
 needle:='return q.provider_payload;';
 if position(needle in src)=0 then raise exception 'Review cached SMS client tag insertion point.';end if;
 src:=replace(src,needle,'return q.provider_payload||jsonb_build_object(''salon_id'',q.salon_id);');
 needle:='result:=jsonb_build_object(''sender'',c.sender,';
 if position(needle in src)=0 then raise exception 'Review SMS client tag insertion point.';end if;
 execute replace(src,needle,'result:=jsonb_build_object(''salon_id'',q.salon_id,''sender'',c.sender,');
end$patch$;

-- Phone metadata is pinned to the same Google libphonenumber revision as
-- lib/jovabook-phone.mjs. US exact dial plans exclude other NANP countries.
create or replace function jovabook_private.sms_phone(p_phone text) returns text language plpgsql immutable set search_path='' as $$
declare n text;begin
 if length(coalesce(p_phone,''))>40 or trim(coalesce(p_phone,''))!~'^\+?[0-9[:space:]().-]+$' then return null;end if;
 n:=regexp_replace(trim(p_phone),'[[:space:]().-]','','g');
 if n like '+%' then n:=substr(n,2);elsif n like '00%' then n:=substr(n,3);end if;
 if n~'^07[0-9]{9}$' then n:='44'||substr(n,2);end if;
 if n~'^447([1-5789][0-9]{8}|624[0-9]{6})$' or n~'^1(983[2-57-9][0-9]{6}|(?:2(?:0[1-35-9]|1[02-9]|2[03-57-9]|3[1459]|4[08]|5[1-46]|6[0279]|7[02469]|8[13])|3(?:0[1-57-9]|1[02-9]|2[013-79]|3[0-24679]|4[167]|5[0-3]|6[01349]|8[056])|4(?:0[124-9]|1[02-579]|2[3-5]|3[0245]|4[023578]|58|6[349]|7[02589]|8[04])|5(?:0[1-57-9]|1[0235-8]|20|3[0149]|4[01]|5[179]|6[1-47]|7[0-5]|8[0256])|6(?:0[1-35-9]|1[024-9]|2[03689]|3[016]|4[0156]|5[01679]|6[0-279]|78|8[0-269])|7(?:0[1-46-8]|1[2-9]|2[04-8]|3[0-2478]|4[0378]|5[47]|6[02359]|7[0-59]|8[156])|8(?:0[1-68]|1[02-8]|2[0168]|3[0-2589]|4[03578]|5[046-9]|6[02-5]|7[028])|9(?:0[1346-9]|1[02-9]|2[0589]|3[0146-8]|4[01357-9]|5[12469]|7[0-3589]|8[04-69]))[2-9][0-9]{6})$' then return n;end if;
 return null;end$$;
revoke all on function jovabook_private.sms_phone(text) from public,anon,authenticated;
do $patch$declare src text;needle text:='Enter a valid UK mobile number for an SMS reminder.';begin
 src:=pg_get_functiondef('jovabook_private.billing_original_create_booking_with_sms(text,text,text,text,text,text,text,text,text,text,boolean,uuid)'::regprocedure);
 if position(needle in src)=0 then raise exception 'Review SMS validation message insertion point.';end if;
 execute replace(src,needle,'Enter a valid UK or US mobile number for an SMS reminder.');
end$patch$;

notify pgrst,'reload schema';
commit;
