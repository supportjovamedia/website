-- Transactional reminders only. Disabled, no allowances, no historical backfill.
create schema if not exists jovabook_private;
revoke all on schema jovabook_private from public,anon,authenticated;
alter table public.bookings add column sms_consent boolean not null default false;

create table jovabook_private.sms_config(
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,provider_configured boolean not null default false,
 worker_token_hash text,sender text check(sender ~ '^[A-Za-z0-9]{3,11}$'),
 monthly_segment_limit integer check(monthly_segment_limit>=0),
 max_segments_per_message integer check(max_segments_per_message>0));
insert into jovabook_private.sms_config(singleton) values(true);
create table jovabook_private.sms_business_settings(
 salon_id uuid primary key references public.salons(id) on delete cascade,
 enabled boolean not null default false,
 monthly_segment_limit integer check(monthly_segment_limit>=0),
 max_segments_per_message integer check(max_segments_per_message>0));
create table jovabook_private.sms_usage(
 scope text not null,month date not null,reserved_segments integer not null default 0 check(reserved_segments>=0),primary key(scope,month));
create table jovabook_private.sms_queue(
 id uuid primary key default gen_random_uuid(),salon_id uuid not null references public.salons(id) on delete cascade,
 booking_id text not null,revision text not null,due_at timestamptz not null,
 status text not null default 'Scheduled' check(status in('Scheduled','Leased','Prepared','Sending','Sent','Delivered','Failed','Unknown','Cancelled','Suppressed')),
 lease uuid,lease_until timestamptz,provider_payload jsonb,segments integer,budget_month date,
 attempted boolean not null default false,provider_id text unique,cancellation_requested boolean not null default false,
 last_error text,provider_status text,poll_after timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(salon_id,booking_id,revision));
create index sms_queue_due on jovabook_private.sms_queue(due_at) where status in('Scheduled','Leased','Prepared','Sending');
create table jovabook_private.sms_booking_requests(
 salon_id uuid not null references public.salons(id) on delete cascade,request_id uuid not null,
 request_hash text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(salon_id,request_id));
alter table jovabook_private.sms_config enable row level security;
alter table jovabook_private.sms_business_settings enable row level security;
alter table jovabook_private.sms_usage enable row level security;
alter table jovabook_private.sms_queue enable row level security;
alter table jovabook_private.sms_booking_requests enable row level security;
revoke all on jovabook_private.sms_config,jovabook_private.sms_business_settings,jovabook_private.sms_usage,jovabook_private.sms_queue,jovabook_private.sms_booking_requests from public,anon,authenticated;

create function jovabook_private.sms_phone(p_phone text) returns text language plpgsql immutable set search_path='' as $$
declare n text:=regexp_replace(coalesce(p_phone,''),'[[:space:]()-]','','g');
begin
 if n ~ '^07[0-9]{9}$' then n:='44'||substr(n,2);
 elsif n ~ '^\+447[0-9]{9}$' then n:=substr(n,2);
 elsif n ~ '^00447[0-9]{9}$' then n:=substr(n,3);end if;
 return case when n ~ '^447[0-9]{9}$' then n else null end;
end $$;
create function jovabook_private.sms_segments(p_text text) returns integer language plpgsql immutable set search_path='' as $$
declare base text:='@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&''()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'||chr(10)||chr(13);
 ext text:='^{}\[~]|€'||chr(12);ch text;units integer:=0;utf integer:=0;gsm boolean:=true;i integer;
begin
 if coalesce(length(p_text),0)=0 then return 0;end if;
 for i in 1..length(p_text) loop ch:=substr(p_text,i,1);utf:=utf+case when ascii(ch)>65535 then 2 else 1 end;
  if strpos(base,ch)>0 then units:=units+1;elsif strpos(ext,ch)>0 then units:=units+2;else gsm:=false;end if;
 end loop;
 if gsm then return case when units<=160 then 1 else ceil(units/153.0)::integer end;end if;
 return case when utf<=70 then 1 else ceil(utf/67.0)::integer end;
end $$;
create function jovabook_private.sms_timezone(p_salon uuid) returns text language sql stable set search_path='' as $$
 select z.name from public.salons s join pg_timezone_names z on z.name=coalesce(nullif(s.settings->>'timezone',''),'Europe/London') where s.id=p_salon
$$;
create function jovabook_private.sms_start(b public.bookings) returns timestamptz language plpgsql stable set search_path='' as $$
declare zone text:=jovabook_private.sms_timezone(b.salon_id);local_time timestamp:=b.date+b.time::time;instant timestamptz;
begin
 if zone is null then return null;end if;instant:=local_time at time zone zone;
 if instant at time zone zone<>local_time or exists(select 1 from generate_series(-180,180,15) delta where delta<>0 and (instant+make_interval(mins=>delta)) at time zone zone=local_time) then return null;end if;
 return instant;
end $$;
create function jovabook_private.sms_budget_month(p_at timestamptz) returns date language sql immutable set search_path='' as $$
 select date_trunc('month',p_at at time zone 'UTC')::date
$$;
create function jovabook_private.sms_revision(b public.bookings) returns text language sql stable set search_path='' as $$
 select md5(jsonb_build_array(b.salon_id,b.id,b.date,b.time,b.status,b.sms_consent,jovabook_private.sms_phone(b.phone),jovabook_private.sms_timezone(b.salon_id))::text)
$$;
create function jovabook_private.sms_available(p_salon uuid,p_reserved boolean default false) returns boolean language sql stable set search_path='' as $$
 select coalesce((select s.plan in('standard','premium') and s.status in('trialing','active') and jovabook_private.sms_timezone(s.id) is not null and c.enabled and c.provider_configured and c.sender is not null
 and c.worker_token_hash is not null and c.monthly_segment_limit is not null and c.max_segments_per_message is not null
 and pref.enabled and pref.monthly_segment_limit is not null and pref.max_segments_per_message is not null
 and (p_reserved or coalesce((select reserved_segments from jovabook_private.sms_usage where scope='global' and month=jovabook_private.sms_budget_month(now())),0)<c.monthly_segment_limit
 and coalesce((select reserved_segments from jovabook_private.sms_usage where scope=s.id::text and month=jovabook_private.sms_budget_month(now())),0)<pref.monthly_segment_limit)
 from public.salons s cross join jovabook_private.sms_config c left join jovabook_private.sms_business_settings pref on pref.salon_id=s.id where s.id=p_salon and c.singleton),false)
$$;
create function jovabook_private.sms_cancel(p_id uuid,p_reason text) returns void language plpgsql set search_path='' as $$
declare q jovabook_private.sms_queue;
begin
 select * into q from jovabook_private.sms_queue where id=p_id for update;
 if q.status='Sending' then update jovabook_private.sms_queue set cancellation_requested=true,last_error=p_reason where id=p_id;return;end if;
 if q.attempted or q.status not in('Scheduled','Leased','Prepared') then return;end if;
 if q.budget_month is not null then
  update jovabook_private.sms_usage set reserved_segments=greatest(0,reserved_segments-q.segments) where month=q.budget_month and scope in('global',q.salon_id::text);
 end if;
 update jovabook_private.sms_queue set status='Cancelled',budget_month=null,segments=null,lease=null,lease_until=null,last_error=p_reason,updated_at=now() where id=p_id;
end $$;
create function jovabook_private.sms_booking_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare rev text;item record;due timestamptz;
begin
 if tg_op='DELETE' then
  for item in select id from jovabook_private.sms_queue where salon_id=old.salon_id and booking_id=old.id and status in('Scheduled','Leased','Prepared','Sending') loop perform jovabook_private.sms_cancel(item.id,'Booking deleted.');end loop;
  return old;
 end if;
 rev:=jovabook_private.sms_revision(new);
 if tg_op='UPDATE' and jovabook_private.sms_revision(old)=rev then return new;end if;
 for item in select id from jovabook_private.sms_queue where salon_id=new.salon_id and booking_id=new.id and revision<>rev and status in('Scheduled','Leased','Prepared','Sending') loop
  perform jovabook_private.sms_cancel(item.id,'Booking changed or SMS consent was withdrawn.');
 end loop;
 due:=jovabook_private.sms_start(new)-interval '24 hours';
 if new.status='confirmed' and new.sms_consent and jovabook_private.sms_phone(new.phone) is not null and due>now()
 and exists(select 1 from public.salons where id=new.salon_id and plan in('standard','premium')) then
  insert into jovabook_private.sms_queue(salon_id,booking_id,revision,due_at) values(new.salon_id,new.id,rev,due) on conflict do nothing;
 end if;
 return new;
end $$;
create trigger booking_sms_changed after insert or update or delete on public.bookings for each row execute function jovabook_private.sms_booking_changed();

create function public.sms_reminder_info() returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.salons;c jovabook_private.sms_config;p jovabook_private.sms_business_settings;used integer;configured boolean;
begin
 select * into s from public.salons where owner_id=(select auth.uid());if s.id is null then raise exception 'Sign in to view SMS reminders.' using errcode='42501';end if;
 select * into c from jovabook_private.sms_config where singleton;select * into p from jovabook_private.sms_business_settings where salon_id=s.id;
 select reserved_segments into used from jovabook_private.sms_usage where scope=s.id::text and month=jovabook_private.sms_budget_month(now());
 configured:=c.monthly_segment_limit is not null and c.max_segments_per_message is not null and p.monthly_segment_limit is not null and p.max_segments_per_message is not null;
 return jsonb_build_object('provider','The SMS Works','plan',s.plan,'eligible',s.plan in('standard','premium'),'provider_configured',c.provider_configured,'global_enabled',c.enabled,
 'business_enabled',coalesce(p.enabled,false),'budget_configured',configured,'remaining_segments',case when configured then greatest(0,p.monthly_segment_limit-coalesce(used,0)) else null end,
 'enabled',jovabook_private.sms_available(s.id),'consent_required',true,'reminder_hours',24,
 'delivery_counts',(select jsonb_build_object('scheduled',count(*) filter(where status in('Scheduled','Leased','Prepared') or status='Sending' and lease_until>=now()),'sent',count(*) filter(where status='Sent'),'delivered',count(*) filter(where status='Delivered'),'failed',count(*) filter(where status='Failed'),'unknown',count(*) filter(where status='Unknown' or status='Sending' and lease_until<now()),'cancelled',count(*) filter(where status='Cancelled'),'suppressed',count(*) filter(where status='Suppressed')) from jovabook_private.sms_queue where salon_id=s.id),
 'needs_review',exists(select 1 from jovabook_private.sms_queue where salon_id=s.id and (status in('Unknown','Failed') or status='Sending' and lease_until<now())));
end $$;
create function public.set_sms_reminders(p_enabled boolean,p_salon uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.salons;item record;
begin
 select * into s from public.salons where owner_id=(select auth.uid());if s.id is null or s.id<>p_salon then raise exception 'Your business changed. Refresh before saving.' using errcode='42501';end if;
 if p_enabled then
  if s.plan not in('standard','premium') then raise exception 'SMS reminders are available on Standard and Premium.' using errcode='42501';end if;
  if not exists(select 1 from jovabook_private.sms_config c join jovabook_private.sms_business_settings p on p.salon_id=s.id where c.singleton and c.enabled and c.provider_configured and c.sender is not null and c.worker_token_hash is not null and c.monthly_segment_limit is not null and c.max_segments_per_message is not null and p.monthly_segment_limit is not null and p.max_segments_per_message is not null) then raise exception 'SMS reminders need server configuration and an agreed segment budget.' using errcode='23514';end if;
 end if;
 insert into jovabook_private.sms_business_settings(salon_id,enabled) values(s.id,coalesce(p_enabled,false)) on conflict(salon_id) do update set enabled=excluded.enabled;
 if not coalesce(p_enabled,false) then for item in select id from jovabook_private.sms_queue where salon_id=s.id and status in('Scheduled','Leased','Prepared','Sending') loop perform jovabook_private.sms_cancel(item.id,'Business SMS reminders disabled.');end loop;end if;
 return public.sms_reminder_info();
end $$;
create function public.public_sms_reminder_info(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('available',coalesce((select jovabook_private.sms_available(id) from public.salons where slug=lower(trim(p_slug)) and status in('trialing','active')),false),'consent_required',true,'reminder_hours',24)
$$;
create function public.create_booking_with_sms(p_slug text,p_service text,p_staff text,p_date text,p_time text,p_name text,p_email text,p_phone text,p_notes text,p_method text,p_sms_consent boolean,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.salons;prior jovabook_private.sms_booking_requests;fingerprint text;result jsonb;consent boolean;
begin
 if p_request_id is null then raise exception 'A booking request ID is required.' using errcode='23514';end if;
 if coalesce(p_sms_consent,false) and jovabook_private.sms_phone(p_phone) is null then return jsonb_build_object('ok',false,'message','Enter a valid UK mobile number for an SMS reminder.');end if;
 select * into s from public.salons where slug=lower(trim(p_slug)) and status in('trialing','active');if s.id is null then return jsonb_build_object('ok',false,'message','This business is not taking bookings.');end if;
 fingerprint:=encode(sha256(convert_to(jsonb_build_array(p_slug,p_service,p_staff,p_date,p_time,p_name,p_email,p_phone,p_notes,p_method,p_sms_consent)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtext('sms-booking-request'),hashtext(s.id::text||p_request_id::text));
 select * into prior from jovabook_private.sms_booking_requests where salon_id=s.id and request_id=p_request_id;
 if prior.request_id is not null then if prior.request_hash<>fingerprint then raise exception 'Booking request changed. Use a new request ID.' using errcode='23514';end if;return prior.result;end if;
 result:=public.create_booking(p_slug,p_service,p_staff,p_date,p_time,p_name,p_email,p_phone,p_notes,p_method);
 if coalesce((result->>'ok')::boolean,false) then
  consent:=coalesce(p_sms_consent,false) and jovabook_private.sms_available(s.id);
  update public.bookings set sms_consent=consent where salon_id=s.id and id=result->'booking'->>'id';
  result:=result||jsonb_build_object('sms',jsonb_build_object('consent_saved',consent,'eligible',s.plan in('standard','premium')));
  insert into jovabook_private.sms_booking_requests(salon_id,request_id,request_hash,result) values(s.id,p_request_id,fingerprint,result);
 end if;
 return result;
end $$;

create function public.booking_sms_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare c jovabook_private.sms_config;p jovabook_private.sms_business_settings;q jovabook_private.sms_queue;b public.bookings;s public.salons;
 result jsonb:='[]';item record;lease_id uuid;month_id date;global_used integer;business_used integer;body text;parts integer;provider text;state text;
begin
 select * into c from jovabook_private.sms_config where singleton;
 if coalesce(p_token,'')!~'^[0-9a-f]{64}$' or c.worker_token_hash is null or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>c.worker_token_hash then raise exception 'Invalid SMS worker credentials.' using errcode='42501';end if;
 if p_action='health' then return jsonb_build_object('enabled',c.enabled,'provider_configured',c.provider_configured,'budgets_configured',c.monthly_segment_limit is not null and c.max_segments_per_message is not null);end if;
 if p_action='claim' then
  update jovabook_private.sms_queue set status='Unknown',last_error='Send outcome is unknown. Reconcile with provider; never automatically resend.',lease_until=null,updated_at=now() where status='Sending' and lease_until<now();
  if not c.enabled or not c.provider_configured then return '[]';end if;
  for q in select * from jovabook_private.sms_queue where status in('Scheduled','Leased','Prepared') and due_at<=now() and (lease_until is null or lease_until<now()) order by due_at,id for update skip locked limit 5 loop
   select * into b from public.bookings where salon_id=q.salon_id and id=q.booking_id;
   if b.id is null or b.status<>'confirmed' or not b.sms_consent or jovabook_private.sms_revision(b)<>q.revision or q.due_at<now()-interval '30 minutes' or not jovabook_private.sms_available(q.salon_id,q.budget_month is not null) then perform jovabook_private.sms_cancel(q.id,'Reminder is stale, disabled or ineligible.');continue;end if;
   lease_id:=gen_random_uuid();update jovabook_private.sms_queue set status='Leased',lease=lease_id,lease_until=now()+interval '2 minutes',updated_at=now() where id=q.id;
   result:=result||jsonb_build_array(jsonb_build_object('id',q.id,'lease',lease_id));
  end loop;return result;
 elsif p_action in('prepare','begin') then
  select * into c from jovabook_private.sms_config where singleton for update;
  select * into q from jovabook_private.sms_queue where id=(p_payload->>'id')::uuid and lease=(p_payload->>'lease')::uuid and lease_until>now() and status in('Leased','Prepared') for update;
  if q.id is null then return null;end if;
  select * into b from public.bookings where salon_id=q.salon_id and id=q.booking_id;select * into s from public.salons where id=q.salon_id;
  if b.id is null or b.status<>'confirmed' or not b.sms_consent or jovabook_private.sms_revision(b)<>q.revision or q.due_at<now()-interval '30 minutes' or jovabook_private.sms_start(b) is null or jovabook_private.sms_start(b)<=now() or not jovabook_private.sms_available(q.salon_id,q.budget_month is not null) then perform jovabook_private.sms_cancel(q.id,'Reminder changed before send.');return null;end if;
  if p_action='begin' then
   if q.status<>'Prepared' or q.provider_payload is null or q.budget_month is null or q.attempted then return null;end if;
   select * into p from jovabook_private.sms_business_settings where salon_id=q.salon_id for update;
   if q.budget_month<>jovabook_private.sms_budget_month(now()) or q.segments>least(c.max_segments_per_message,p.max_segments_per_message) or exists(select 1 from jovabook_private.sms_usage where month=q.budget_month and (scope='global' and reserved_segments>c.monthly_segment_limit or scope=q.salon_id::text and reserved_segments>p.monthly_segment_limit)) then perform jovabook_private.sms_cancel(q.id,'Segment budget changed before send.');return null;end if;
   update jovabook_private.sms_queue set status='Sending',attempted=true,lease_until=now()+interval '2 minutes',updated_at=now() where id=q.id;return q.provider_payload;
  end if;
  if q.provider_payload is not null and q.budget_month is not null then update jovabook_private.sms_queue set status='Prepared' where id=q.id;return q.provider_payload;end if;
  select * into p from jovabook_private.sms_business_settings where salon_id=q.salon_id for update;
  body:=left(regexp_replace(s.name,'[[:cntrl:]]',' ','g'),40)||': Your booking is '||to_char(b.date,'DD Mon YYYY')||' at '||b.time||' ('||jovabook_private.sms_timezone(b.salon_id)||').';
  parts:=jovabook_private.sms_segments(body);month_id:=jovabook_private.sms_budget_month(now());
  insert into jovabook_private.sms_usage(scope,month) values('global',month_id),(q.salon_id::text,month_id) on conflict do nothing;
  select reserved_segments into global_used from jovabook_private.sms_usage where scope='global' and month=month_id for update;
  select reserved_segments into business_used from jovabook_private.sms_usage where scope=q.salon_id::text and month=month_id for update;
  if parts=0 or parts>least(c.max_segments_per_message,p.max_segments_per_message) or global_used+parts>c.monthly_segment_limit or business_used+parts>p.monthly_segment_limit then update jovabook_private.sms_queue set status='Suppressed',last_error='Server segment budget unavailable.',lease_until=null where id=q.id;return null;end if;
  update jovabook_private.sms_usage set reserved_segments=reserved_segments+parts where month=month_id and scope in('global',q.salon_id::text);
  result:=jsonb_build_object('sender',c.sender,'destination',jovabook_private.sms_phone(b.phone),'content',body,'tag','jovabook-'||q.id::text,'ai',false,'validity',30);
  update jovabook_private.sms_queue set provider_payload=result,segments=parts,budget_month=month_id,status='Prepared',updated_at=now() where id=q.id;return result;
 elsif p_action='finish' then
  select * into q from jovabook_private.sms_queue where id=(p_payload->>'id')::uuid and lease=(p_payload->>'lease')::uuid for update;
  if q.id is null or q.status not in('Sending','Unknown') or not q.attempted then return jsonb_build_object('stale',true);end if;
  provider:=nullif(p_payload->>'provider_id','');state:=p_payload->>'state';
  if provider is not null and provider ~ '^[A-Za-z0-9_-]{1,100}$' and state in('Sent','Delivered','Failed') then update jovabook_private.sms_queue set provider_id=provider,status=state,provider_status=left(p_payload->>'provider_status',30),poll_after=now()+interval '5 minutes',lease_until=null,updated_at=now() where id=q.id;
  elsif state='Failed' then update jovabook_private.sms_queue set status='Failed',last_error='Provider rejected this request.',lease_until=null,updated_at=now() where id=q.id;
  else update jovabook_private.sms_queue set status='Unknown',last_error='Provider outcome unknown. Do not automatically retry.',lease_until=null,updated_at=now() where id=q.id;end if;
  return jsonb_build_object('ok',true);
 elsif p_action='poll' then
  return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'provider_id',provider_id,'destination',provider_payload->>'destination')),'[]') from(select * from jovabook_private.sms_queue where status='Sent' and provider_id is not null and poll_after<=now() order by poll_after limit 5) jobs);
 elsif p_action='report' then
  select * into q from jovabook_private.sms_queue where id=(p_payload->>'id')::uuid and provider_id=p_payload->>'provider_id' and status='Sent' for update;
  if q.id is null then return jsonb_build_object('stale',true);end if;
  state:=p_payload->>'state';if state not in('Sent','Delivered','Failed') then return jsonb_build_object('ok',false);end if;
  update jovabook_private.sms_queue set status=state,provider_status=left(p_payload->>'provider_status',30),poll_after=now()+interval '15 minutes',updated_at=now() where id=q.id;return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unknown SMS worker action.' using errcode='23514';
end $$;
revoke all on function public.sms_reminder_info(),public.set_sms_reminders(boolean,uuid) from public,anon;
grant execute on function public.sms_reminder_info(),public.set_sms_reminders(boolean,uuid) to authenticated;
revoke all on function public.public_sms_reminder_info(text),public.create_booking_with_sms(text,text,text,text,text,text,text,text,text,text,boolean,uuid),public.booking_sms_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.public_sms_reminder_info(text),public.create_booking_with_sms(text,text,text,text,text,text,text,text,text,text,boolean,uuid),public.booking_sms_worker(text,text,jsonb) to anon,authenticated;
revoke all on function jovabook_private.sms_phone(text),jovabook_private.sms_segments(text),jovabook_private.sms_timezone(uuid),jovabook_private.sms_start(public.bookings),jovabook_private.sms_budget_month(timestamptz),jovabook_private.sms_revision(public.bookings),jovabook_private.sms_available(uuid,boolean),jovabook_private.sms_cancel(uuid,text),jovabook_private.sms_booking_changed() from public,anon,authenticated;
