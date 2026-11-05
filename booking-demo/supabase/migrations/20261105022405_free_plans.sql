begin;
-- Deploy with JOVABOOK_OFFER_VERSION=2026-11-free-v1 only after the release
-- readiness review has verified that retired subscriptions cannot renew.
do $$begin
 if exists(select 1 from jovabook_private.billing_accounts where subscription_id is not null
  and coalesce(provider_status,'unknown') not in('canceled','incomplete_expired')) then
  raise exception 'Close and reconcile retired Stripe subscriptions before activating the free offer.';
 end if;
end$$;

create table jovabook_private.offer_accounts(
 salon_id uuid primary key references public.salons(id) on delete cascade,
 plan text not null default 'essential' check(plan in('essential','standard','premium')),
 seats int not null default 1 check(seats between 1 and 1000),
 cadence text not null default 'monthly' check(cadence in('monthly','annual')),
 customer_id text unique,subscription_id text unique,provider_status text,
 paid_until timestamptz,period_start timestamptz,trial_started_at timestamptz,trial_ends_at timestamptz,
 cancel_at_period_end boolean not null default false,ever_paid boolean not null default false,
 pending_plan text,pending_seats int,pending_cadence text,pending_at timestamptz,schedule_id text,
 fence uuid,last_verified_at timestamptz,updated_at timestamptz not null default now(),
 check(plan='premium' or seats=1)
);
create table jovabook_private.offer_actions(
 id uuid primary key default gen_random_uuid(),salon_id uuid not null references public.salons(id) on delete cascade,
 request_id uuid not null,kind text not null,request_hash text not null,plan text,seats int,cadence text,
 result jsonb,provider_id text,trial boolean not null default false,created_at timestamptz not null default now(),closed_at timestamptz,
 unique(salon_id,request_id)
);
create unique index offer_one_open_action on jovabook_private.offer_actions(salon_id) where closed_at is null;
create table jovabook_private.offer_trial_ledger(
 email_hash text primary key,action_id uuid not null,started_at timestamptz,ends_at timestamptz
);
create table jovabook_private.offer_message_usage(
 salon_id uuid not null references public.salons(id) on delete cascade,
 channel text not null check(channel in('email','sms')),job_id uuid not null,month date not null,
 created_at timestamptz not null default now(),primary key(salon_id,channel,job_id)
);
create index offer_message_month on jovabook_private.offer_message_usage(salon_id,channel,month);
do $$declare t text;begin foreach t in array array['offer_accounts','offer_actions','offer_message_usage','offer_trial_ledger'] loop
 execute format('alter table jovabook_private.%I enable row level security',t);
 execute format('revoke all on jovabook_private.%I from public,anon,authenticated',t);
end loop;end$$;
insert into jovabook_private.offer_accounts(salon_id) select id from public.salons;

create function jovabook_private.offer_plan(p_salon uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when a.plan in('standard','premium') and
 ((a.paid_until>now() and a.provider_status in('active','canceled')) or
 (a.provider_status='trialing' and a.trial_ends_at>now() and a.trial_started_at is not null)) then a.plan else 'essential' end
 from jovabook_private.offer_accounts a where a.salon_id=p_salon
$$;
create function jovabook_private.offer_seats(p_salon uuid) returns int
language sql stable security definer set search_path='' as $$
 select case when jovabook_private.offer_plan(p_salon)='premium' then seats else 1 end
 from jovabook_private.offer_accounts where salon_id=p_salon
$$;
create function jovabook_private.offer_limits(p_salon uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p text;n int;m date;emails int;sms int;begin
 p:=jovabook_private.offer_plan(p_salon);n:=jovabook_private.offer_seats(p_salon);
 if p is null then return null;end if;
 m:=date_trunc('month',now() at time zone 'Europe/London')::date;
 emails:=case when p='essential' then 50 else 100*n end;sms:=case when p='essential' then 0 else 50*n end;
 return jsonb_build_object('offer_version','2026-11-free-v1','plan',p,'staff_limit',n,'seats',n,'commission_bps',0,
  'booking_limit',case when p='essential' then 20 end,'bookings_used',(select count(*) from public.bookings where salon_id=p_salon and status<>'cancelled' and date>=m and date<(m+interval '1 month')::date),
  'email_limit',emails,'emails_used',(select count(*) from jovabook_private.offer_message_usage where salon_id=p_salon and channel='email' and month=m),
  'sms_limit',sms,'sms_used',(select count(*) from jovabook_private.offer_message_usage where salon_id=p_salon and channel='sms' and month=m),
  'branding_required',p<>'premium','embed_allowed',p in('standard','premium'),'insights',p='premium','period_comparisons',p='premium','month',m);
end$$;
create function jovabook_private.offer_staff_limit(p_salon uuid) returns int
language sql stable security definer set search_path='' as $$
 select least(jovabook_private.offer_seats(p_salon),coalesce(pending_seats,1000)) from jovabook_private.offer_accounts where salon_id=p_salon
$$;
create function jovabook_private.offer_reserve_message(p_salon uuid,p_channel text,p_job uuid) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare m date;cap int;limits jsonb;begin
 perform pg_advisory_xact_lock(hashtext('jovabook-messages:'||p_salon::text));
 if exists(select 1 from jovabook_private.offer_message_usage where salon_id=p_salon and channel=p_channel and job_id=p_job) then return true;end if;
 limits:=jovabook_private.offer_limits(p_salon);if limits is null then return false;end if;
 cap:=(limits->>(case when p_channel='email' then 'email_limit' when p_channel='sms' then 'sms_limit' else '' end))::int;
 if cap is null then return false;end if;m:=(limits->>'month')::date;
 if (select count(*) from jovabook_private.offer_message_usage where salon_id=p_salon and channel=p_channel and month=m)>=cap then return false;end if;
 insert into jovabook_private.offer_message_usage(salon_id,channel,job_id,month) values(p_salon,p_channel,p_job,m);
 return true;
end$$;

-- A free workspace never expires or enters the retired trial deletion queue.
create or replace function jovabook_private.billing_due(p_salon uuid) returns timestamptz
language sql stable security definer set search_path='' as $$select null::timestamptz$$;
create or replace function jovabook_private.billing_effective_plan(p_salon uuid) returns text
language sql stable security definer set search_path='' as $$select jovabook_private.offer_plan(p_salon)$$;
create or replace function jovabook_private.billing_access(p_salon uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when b.deletion_state is not null then 'deleting'
 when (select count(*) from public.staff where salon_id=p_salon and active)>jovabook_private.offer_seats(p_salon) then 'billing_only'
 else 'active' end from jovabook_private.billing_accounts b join jovabook_private.offer_accounts o using(salon_id) where b.salon_id=p_salon
$$;
create or replace function public.plan_staff_limit(p_plan text) returns int
language sql immutable set search_path='' as $$select 1$$;
create or replace function jovabook_private.billing_new_salon() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=new.owner_id and email_confirmed_at is not null) then raise exception 'Verify your email before creating a business.' using errcode='42501';end if;
 insert into jovabook_private.billing_accounts(salon_id,card_trial_required) values(new.id,false);
 insert into jovabook_private.offer_accounts(salon_id) values(new.id);
 update public.salons set status='setup',plan='essential',trial_used=false,trial_ends_at=null where id=new.id;
 return new;
end$$;

do $$declare src text;begin
 src:=pg_get_functiondef('public.owner_account_access()'::regprocedure);
 execute replace(src,'public.owner_account_access(','jovabook_private.owner_access_before_free_offer(');
 src:=pg_get_functiondef('public.owner_capabilities()'::regprocedure);
 execute replace(src,'public.owner_capabilities(','jovabook_private.owner_capabilities_before_free_offer(');
 src:=pg_get_functiondef('public.public_salon(text)'::regprocedure);
 execute replace(src,'public.public_salon(','jovabook_private.public_salon_before_free_offer(');
 src:=pg_get_functiondef('public.save_setup(text,text,jsonb)'::regprocedure);
 execute replace(src,'public.save_setup(','jovabook_private.save_setup_before_free_offer(');
 src:=pg_get_functiondef('public.validate_staff_schedule()'::regprocedure);
 if position('public.plan_staff_limit(s.plan)' in src)=0 then raise exception 'Review verified staff limit insertion point.';end if;
 execute replace(src,'public.plan_staff_limit(s.plan)','jovabook_private.offer_staff_limit(s.id)');
end$$;
create or replace function public.owner_account_access() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;sid uuid;s public.salons;o jovabook_private.offer_accounts;limits jsonb;access text;begin
 result:=jovabook_private.owner_access_before_free_offer();
 if result->'business'->>'id' is null then return result;end if;
 sid:=(result->'business'->>'id')::uuid;select * into s from public.salons where id=sid and owner_id=auth.uid();
 if s.id is null then raise exception 'Sign in as the business owner.' using errcode='42501';end if;
 select * into o from jovabook_private.offer_accounts where salon_id=sid;limits:=jovabook_private.offer_limits(sid);
 access:=case when result->>'access'='deleting' then 'deleting' when s.status='setup' then 'setup' else jovabook_private.billing_access(sid) end;
 return result||jsonb_build_object('access',access,'reason',case when access='setup' then 'business_setup' when access='billing_only' then 'roster_exceeds_plan' else 'free_or_paid_plan' end,
 'full_until',case when o.provider_status='trialing' then o.trial_ends_at when limits->>'plan'<>'essential' then o.paid_until end,'lifecycle',jsonb_build_object('trialEndsAt',o.trial_ends_at,'purgeAt',null),'staff_limit',jovabook_private.offer_staff_limit(sid),
 'business',(result->'business')||jsonb_build_object('plan',limits->>'plan','status',s.status),
 'starter_calendars',case when limits->>'plan'='essential' and access='billing_only' then (select jsonb_agg(jsonb_build_object('id',id,'name',name)) from public.staff where salon_id=sid) else '[]'::jsonb end,
 'billing',(result->'billing')||limits||jsonb_build_object('card_required',false,'trial_eligible',not exists(select 1 from jovabook_private.offer_trial_ledger l join auth.users u on l.email_hash=jovabook_private.trial_fingerprint(u.email) where u.id=s.owner_id and l.started_at is not null),'trial_subscription',o.provider_status='trialing' and o.trial_ends_at>now(),
 'trial_ends_at',o.trial_ends_at,
 'cadence',o.cadence,'paid_until',o.paid_until,'current_period_end',o.paid_until,'provider_status',o.provider_status,
 'paid_subscription',(limits->>'plan')<>'essential','cancel_at_period_end',o.cancel_at_period_end,'pending_plan',o.pending_plan,'pending_seats',o.pending_seats,'pending_cadence',o.pending_cadence,'pending_effective_at',o.pending_at));
end$$;
create or replace function public.owner_capabilities() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;sid uuid;begin
 result:=jovabook_private.owner_capabilities_before_free_offer();select id into sid from public.salons where owner_id=auth.uid();
 return result||jovabook_private.offer_limits(sid)||jsonb_build_object('staff_limit',jovabook_private.offer_staff_limit(sid));
end$$;
create or replace function public.save_setup(p_address text,p_phone text,p_settings jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform jovabook_private.save_setup_before_free_offer(p_address,p_phone,p_settings);
 update public.salons set status='active',trial_ends_at=null where owner_id=auth.uid() and status='setup';
end$$;
create function public.offer_choose_starter_calendar(p_staff text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid;begin
 select s.id into sid from public.salons s join auth.users u on u.id=s.owner_id and u.email_confirmed_at is not null where s.owner_id=auth.uid();
 if sid is null then raise exception 'Sign in as the business owner.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 if jovabook_private.offer_plan(sid)<>'essential' or not exists(select 1 from public.staff where salon_id=sid and id=p_staff) then raise exception 'Choose your Starter calendar.';end if;
 update public.staff set active=false where salon_id=sid and id<>p_staff and active;
 update public.staff set active=true where salon_id=sid and id=p_staff;
 return public.owner_account_access();
end$$;
create or replace function public.trial_check() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('eligible',false,'card_required',false,'free_plan',true,'offer_version','2026-11-free-v1')
 where exists(select 1 from public.salons where owner_id=auth.uid())
$$;
create or replace function public.start_trial() returns jsonb language sql volatile security definer set search_path='' as $$
 select jsonb_build_object('eligible',false,'free_plan',true,'access',public.owner_account_access())
 where exists(select 1 from public.salons where owner_id=auth.uid())
$$;
create or replace function public.public_salon(p_slug text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;sid uuid;limits jsonb;website jsonb;begin
 result:=jovabook_private.public_salon_before_free_offer(p_slug);if result is null then return null;end if;
 sid:=(result->>'id')::uuid;
 if not exists(select 1 from public.salons where id=sid and status in('active','trialing')) then return null;end if;
 limits:=jovabook_private.offer_limits(sid);
 select jsonb_object_agg(k,v) into website from public.salons x,jsonb_each(coalesce(x.settings#>'{workspace,website}','{}')) e(k,v)
   where x.id=sid and (k in('version','template','headline','about','brandColor','headingColor','heroImage','logoImage') or limits->>'plan'='premium' and k in('premiumTemplate','homeIntro','aboutHeading','contactIntro'));
  if website is not null then result:=jsonb_set(result,'{settings,workspace,website}',website,true);end if;
 return result||jsonb_build_object('offer_version','2026-11-free-v1','branding_required',(limits->>'branding_required')::boolean,
 'embed_allowed',(limits->>'embed_allowed')::boolean,'website_entitlement','one-page','booking_limit',(limits->>'booking_limit')::int);
end$$;

-- Counts appointments by their calendar month, across online and manual entry.
-- Existing records, cancellations and same-month rescheduling remain editable.
create function jovabook_private.offer_check_booking_limit(p_salon uuid,p_date date,p_ignore text default null) returns void
language plpgsql volatile security definer set search_path='' as $$
declare used int;m date;begin
 if jovabook_private.offer_plan(p_salon)<>'essential' then return;end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||p_salon::text));m:=date_trunc('month',p_date)::date;
 select count(*) into used from public.bookings where salon_id=p_salon and status<>'cancelled' and date>=m and date<(m+interval '1 month')::date and (p_ignore is null or id<>p_ignore);
 used:=used+(select count(*) from jovabook_private.deposit_checkouts where salon_id=p_salon and date>=m and date<(m+interval '1 month')::date
 and stage in('creating','open','needs_attention') and (p_ignore is null or booking_id<>p_ignore));
 if used>=20 then raise exception 'Starter includes 20 bookings per month. Upgrade to Pro Solo or Team for unlimited bookings.' using errcode='23514';end if;
end$$;
create function jovabook_private.offer_booking_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare prior public.bookings;begin
 if new.status='cancelled' then return new;end if;
 select * into prior from public.bookings where salon_id=new.salon_id and id=new.id;
 if prior.id is not null and prior.status<>'cancelled' and date_trunc('month',prior.date)=date_trunc('month',new.date) then return new;end if;
 perform jovabook_private.offer_check_booking_limit(new.salon_id,new.date,new.id);return new;
end$$;
create trigger offer_booking_limit before insert or update on public.bookings for each row execute function jovabook_private.offer_booking_limit();
create function jovabook_private.offer_deposit_limit() returns trigger language plpgsql security definer set search_path='' as $$
begin perform jovabook_private.offer_check_booking_limit(new.salon_id,new.date,new.booking_id);return new;end$$;
create trigger offer_deposit_limit before insert on jovabook_private.deposit_checkouts for each row execute function jovabook_private.offer_deposit_limit();

-- The existing worker authentication, message snapshots and retry rules remain.
do $$declare src text;begin
 src:=pg_get_functiondef('public.booking_email_worker(text,text,jsonb)'::regprocedure);
 if position('lease:=gen_random_uuid();' in src)=0 then raise exception 'Review email allowance insertion point.';end if;
 src:=replace(src,'lease:=gen_random_uuid();',$body$
 if not jovabook_private.offer_reserve_message(q.salon_id,'email',q.id) then
  perform jovabook_private.record_email_status(q.id,'Suppressed','Monthly email allowance used.');continue;
 end if;lease:=gen_random_uuid();$body$);execute src;
 src:=pg_get_functiondef('public.booking_sms_worker(text,text,jsonb)'::regprocedure);
 if position('if p_action=''begin'' then' in src)=0 then raise exception 'Review SMS allowance insertion point.';end if;
 src:=replace(src,'if p_action=''begin'' then',$body$if p_action='begin' then
  if not jovabook_private.offer_reserve_message(q.salon_id,'sms',q.id) then
   perform jovabook_private.sms_cancel(q.id,'Monthly SMS allowance used.');return null;
  end if;$body$);execute src;
end$$;

-- No new commission or automatic trial charge under this offer.
create or replace function jovabook_private.billing_staff_cap() returns trigger
language plpgsql security definer set search_path='' as $$
declare cap int;begin
 if not new.active or exists(select 1 from public.staff where salon_id=new.salon_id and id=new.id and active) then return new;end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||new.salon_id::text));cap:=jovabook_private.offer_staff_limit(new.salon_id);
 if (select count(*) from public.staff where salon_id=new.salon_id and active and id<>new.id)>=cap then raise exception 'Your plan allows % active staff calendar(s).',cap using errcode='23514';end if;
 return new;
end$$;
create or replace function public.validate_staff_schedule() returns trigger
language plpgsql security definer set search_path='' as $$
declare cap int;begin
 if tg_op='UPDATE' and (new.salon_id is distinct from old.salon_id or new.id is distinct from old.id) then raise exception 'A calendar cannot be moved to another account.' using errcode='23514';end if;
 if new.hours is not null and not public.valid_schedule(new.hours) then raise exception 'Enter valid calendar hours.' using errcode='23514';end if;
 if not new.active or exists(select 1 from public.staff where salon_id=new.salon_id and id=new.id and active) then return new;end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||new.salon_id::text));cap:=jovabook_private.offer_staff_limit(new.salon_id);
 if (select count(*) from public.staff where salon_id=new.salon_id and active and id<>new.id)>=cap then raise exception 'Your plan allows % active staff calendar(s).',cap using errcode='23514';end if;
 return new;
end$$;
create function jovabook_private.offer_email_branding() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.payload:=coalesce(new.payload,'{}')||jsonb_build_object('branding_required',coalesce(jovabook_private.offer_plan(new.salon_id),'essential')<>'premium');
 return new;
end$$;
create trigger offer_email_branding before insert on jovabook_private.email_queue for each row execute function jovabook_private.offer_email_branding();
update jovabook_private.commission_config set enabled=false,invoice_enabled=false;
update public.salons set plan='essential',status=case when status='setup' then 'setup' else 'active' end,trial_ends_at=null;
update jovabook_private.billing_accounts set card_trial_required=false;

-- A 50-message allowance is separate from the provider's multipart credit cap.
-- Preserve the owner's reminder toggle; never turn on provider spending here.
create function jovabook_private.offer_sms_defaults() returns trigger
language plpgsql security definer set search_path='' as $$
declare n int;p text;begin
 p:=jovabook_private.offer_plan(new.salon_id);n:=jovabook_private.offer_seats(new.salon_id);
 insert into jovabook_private.sms_business_settings(salon_id,enabled,monthly_segment_limit,max_segments_per_message)
 values(new.salon_id,false,case when p='essential' then 0 else 150*n end,3)
 on conflict(salon_id) do update set monthly_segment_limit=excluded.monthly_segment_limit;
 return new;
end$$;
create trigger offer_sms_defaults after insert or update on jovabook_private.offer_accounts for each row execute function jovabook_private.offer_sms_defaults();

revoke all on function jovabook_private.offer_plan(uuid),jovabook_private.offer_seats(uuid),jovabook_private.offer_limits(uuid),
 jovabook_private.offer_reserve_message(uuid,text,uuid),jovabook_private.offer_check_booking_limit(uuid,date,text),
 jovabook_private.offer_booking_limit(),jovabook_private.offer_deposit_limit(),jovabook_private.offer_staff_limit(uuid),jovabook_private.offer_sms_defaults(),jovabook_private.offer_email_branding(),
 jovabook_private.owner_access_before_free_offer(),jovabook_private.owner_capabilities_before_free_offer(),
 jovabook_private.public_salon_before_free_offer(text),jovabook_private.save_setup_before_free_offer(text,text,jsonb)
 from public,anon,authenticated;
revoke all on function public.owner_account_access(),public.owner_capabilities(),public.save_setup(text,text,jsonb),public.start_trial(),public.trial_check(),public.offer_choose_starter_calendar(text) from public,anon;
grant execute on function public.owner_account_access(),public.owner_capabilities(),public.save_setup(text,text,jsonb),public.start_trial(),public.trial_check(),public.offer_choose_starter_calendar(text) to authenticated;
revoke all on function public.public_salon(text) from public;
grant execute on function public.public_salon(text) to anon,authenticated;
create function public.booking_offer_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jovabook_private.billing_config;o jovabook_private.offer_accounts;s public.salons;
 a jovabook_private.offer_actions;sid uuid;qty int;target text;frequency text;f uuid;v_email_hash text;eligible boolean;
 trial_row jovabook_private.offer_trial_ledger;begin
 select * into c from jovabook_private.billing_config where singleton;
 if coalesce(p_token,'')!~'^[0-9a-f]{64}$' or c.worker_hash is null or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>c.worker_hash then raise exception 'Invalid billing worker credentials.' using errcode='42501';end if;
 if p_payload ? 'customer' and not p_payload ? 'salon' then select salon_id into sid from jovabook_private.offer_accounts where customer_id=p_payload->>'customer';
 else sid:=(p_payload->>'salon')::uuid;end if;
 if sid is null then return null;end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 select * into o from jovabook_private.offer_accounts where salon_id=sid for update;
 select * into s from public.salons where id=sid;
 if o.salon_id is null then return null;end if;
 select jovabook_private.trial_fingerprint(email) into v_email_hash from auth.users where id=s.owner_id;
 select * into trial_row from jovabook_private.offer_trial_ledger l where l.email_hash=v_email_hash;
 if p_payload ? 'owner' and not exists(select 1 from auth.users where id=s.owner_id and id=(p_payload->>'owner')::uuid and email_confirmed_at is not null) then raise exception 'Business ownership mismatch.' using errcode='42501';end if;
 if p_action='context' then
  select * into a from jovabook_private.offer_actions where salon_id=sid and closed_at is null;
  return to_jsonb(o)||jsonb_build_object('enabled',c.enabled and c.provider_configured,'owner_id',s.owner_id,'trial_eligible',trial_row.started_at is null,'staff_count',(select count(*) from public.staff where salon_id=sid and active),'open_action',case when a.id is not null then to_jsonb(a) end,'limits',jovabook_private.offer_limits(sid));
 elsif p_action='bind_customer' then
  if coalesce(p_payload->>'customer_id','')!~'^cus_[A-Za-z0-9]+$' or o.customer_id is not null and o.customer_id<>p_payload->>'customer_id' then raise exception 'Customer binding mismatch.';end if;
  update jovabook_private.offer_accounts set customer_id=p_payload->>'customer_id' where salon_id=sid;return jsonb_build_object('ok',true);
 elsif p_action='begin' then
  target:=p_payload->>'plan';frequency:=p_payload->>'cadence';qty:=(p_payload->>'seats')::int;
  if target not in('essential','standard','premium') or frequency not in('monthly','annual') or qty not between 1 and 1000 or target<>'premium' and qty<>1
  or coalesce(p_payload->>'hash','')!~'^[0-9a-f]{64}$' or p_payload->>'kind' not in('checkout','change','cancel','withdraw') then raise exception 'Invalid billing selection.';end if;
  select * into a from jovabook_private.offer_actions where salon_id=sid and request_id=(p_payload->>'request_id')::uuid;
  if a.id is not null then if a.request_hash<>p_payload->>'hash' then raise exception 'Billing request changed. Review again.';end if;return to_jsonb(a);end if;
  if exists(select 1 from jovabook_private.offer_actions where salon_id=sid and closed_at is null) then raise exception 'Resolve the earlier billing request before starting another.';end if;
  if p_payload->>'kind'<>'cancel' and (select count(*) from public.staff where salon_id=sid and active)>qty then raise exception 'Review your staff calendars before reducing paid seats. No records have been removed.';end if;
  eligible:=p_payload->>'kind'='checkout' and trial_row.started_at is null;
  insert into jovabook_private.offer_actions(salon_id,request_id,kind,request_hash,plan,seats,cadence,trial) values(sid,(p_payload->>'request_id')::uuid,p_payload->>'kind',p_payload->>'hash',target,qty,frequency,eligible) returning * into a;
  if eligible then
   perform pg_advisory_xact_lock(hashtext('jovabook-offer-trial'),hashtext(v_email_hash));
   insert into jovabook_private.offer_trial_ledger(email_hash,action_id) values(v_email_hash,a.id)
    on conflict(email_hash) do update set action_id=excluded.action_id where jovabook_private.offer_trial_ledger.started_at is null;
   if not found then raise exception 'This paid trial has already been used. Refresh your plan details.';end if;
  end if;
  return to_jsonb(a);
 elsif p_action='finish' then
  select * into a from jovabook_private.offer_actions where salon_id=sid and id=(p_payload->>'id')::uuid;
  if a.id is null then raise exception 'Billing action not found.';end if;
  if a.result is not null and a.result is distinct from p_payload->'result' then raise exception 'Billing result changed.';end if;
  update jovabook_private.offer_actions set result=p_payload->'result',provider_id=p_payload->>'provider_id',closed_at=case when coalesce((p_payload->>'closed')::boolean,false) then now() end where id=a.id;
  return p_payload->'result';
 elsif p_action='close_action' then
  if p_payload->>'verified' is distinct from 'true' then raise exception 'Provider reconciliation required.';end if;
  update jovabook_private.offer_actions set closed_at=now() where salon_id=sid and id=(p_payload->>'id')::uuid;return jsonb_build_object('ok',true);
 elsif p_action='sync_begin' then
  f:=gen_random_uuid();update jovabook_private.offer_accounts set fence=f where salon_id=sid;return jsonb_build_object('fence',f);
 elsif p_action='sync_apply' then
  if o.fence is distinct from (p_payload->>'fence')::uuid then return jsonb_build_object('stale',true);end if;
  if p_payload->>'customer_id' is distinct from o.customer_id then raise exception 'Customer proof mismatch.';end if;
  if p_payload->>'trial_verified'='true' then
   if p_payload->>'provider_status'<>'trialing' or (p_payload->>'trial_ends_at')::timestamptz-(p_payload->>'trial_started_at')::timestamptz<>interval '14 days'
    or (p_payload->>'trial_ends_at')::timestamptz<=now() or (p_payload->>'trial_started_at')::timestamptz>now()
    or trial_row.action_id is distinct from (p_payload->>'trial_action_id')::uuid
    or trial_row.started_at is not null and (trial_row.started_at is distinct from (p_payload->>'trial_started_at')::timestamptz or trial_row.ends_at is distinct from (p_payload->>'trial_ends_at')::timestamptz) then raise exception 'Verified 14-day card trial required.';end if;
   update jovabook_private.offer_trial_ledger set started_at=(p_payload->>'trial_started_at')::timestamptz,ends_at=(p_payload->>'trial_ends_at')::timestamptz where offer_trial_ledger.email_hash=v_email_hash;
   update jovabook_private.offer_accounts set trial_started_at=(p_payload->>'trial_started_at')::timestamptz,trial_ends_at=(p_payload->>'trial_ends_at')::timestamptz where salon_id=sid;
  end if;
  if p_payload->>'paid_verified'='true' or p_payload->>'trial_verified'='true' then
   target:=p_payload->>'plan';qty:=(p_payload->>'seats')::int;frequency:=p_payload->>'cadence';
   if target not in('standard','premium') or qty not between 1 and 1000 or target<>'premium' and qty<>1 or frequency not in('monthly','annual')
   or (p_payload->>'paid_until')::timestamptz<=now() or coalesce(p_payload->>'subscription_id','')!~'^sub_[A-Za-z0-9]+$' then raise exception 'Unverified plan entitlement.';end if;
   update jovabook_private.offer_accounts set plan=target,seats=qty,cadence=frequency,paid_until=(p_payload->>'paid_until')::timestamptz,
    period_start=(p_payload->>'period_start')::timestamptz,subscription_id=p_payload->>'subscription_id' where salon_id=sid;
  end if;
  update jovabook_private.offer_accounts set provider_status=p_payload->>'provider_status',cancel_at_period_end=coalesce((p_payload->>'cancel_at_period_end')::boolean,false),
   ever_paid=ever_paid or coalesce((p_payload->>'paid_verified')::boolean,false),last_verified_at=now(),updated_at=now() where salon_id=sid;
  update public.salons set plan=jovabook_private.offer_plan(sid) where id=sid;
  if p_payload->>'paid_verified'='true' or p_payload->>'trial_verified'='true' or p_payload->>'provider_status' in('canceled','incomplete_expired') then
   update jovabook_private.offer_actions set closed_at=now() where salon_id=sid and closed_at is null and (plan=p_payload->>'plan' and seats=(p_payload->>'seats')::int and cadence=p_payload->>'cadence' or kind='cancel');
  end if;
  return jsonb_build_object('ok',true,'limits',jovabook_private.offer_limits(sid));
 elsif p_action='schedule' then
  qty:=(p_payload->>'seats')::int;
  if p_payload->>'verified' is distinct from 'true' or qty not between 1 and 1000 or (select count(*) from public.staff where salon_id=sid and active)>qty then raise exception 'Verified schedule and staff review required.';end if;
  update jovabook_private.offer_accounts set pending_plan=p_payload->>'plan',pending_seats=qty,pending_cadence=p_payload->>'cadence',pending_at=(p_payload->>'at')::timestamptz,schedule_id=p_payload->>'schedule_id' where salon_id=sid;return jsonb_build_object('ok',true);
 elsif p_action='clear_schedule' then
  if p_payload->>'verified' is distinct from 'true' then raise exception 'Provider reconciliation required.';end if;
  update jovabook_private.offer_accounts set pending_plan=null,pending_seats=null,pending_cadence=null,pending_at=null,schedule_id=null where salon_id=sid;return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unknown offer worker action.';
end$$;
revoke all on function public.booking_offer_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.booking_offer_worker(text,text,jsonb) to anon,authenticated;

-- Back-office reads follow the same verified offer as the owner workspace.
alter function jovabook_private.operator_billing_record(uuid,boolean) rename to operator_billing_before_free_offer;
create function jovabook_private.operator_billing_record(p_id uuid,p_batches boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;o jovabook_private.offer_accounts;begin
 result:=jovabook_private.operator_billing_before_free_offer(p_id,p_batches);select * into o from jovabook_private.offer_accounts where salon_id=p_id;
 if o.salon_id is null then return result;end if;
 return result||jsonb_build_object('offer_version','2026-11-free-v1','subscription',jsonb_build_object('ever_paid',o.ever_paid,'plan',jovabook_private.offer_plan(p_id),'cadence',o.cadence,'seats',o.seats,'paid_until',o.paid_until,'trial_end',o.trial_ends_at,'provider_status',o.provider_status,'last_verified_at',o.last_verified_at,'cancel_at_period_end',o.cancel_at_period_end,'pending_plan',o.pending_plan,'pending_cadence',o.pending_cadence,'pending_effective_at',o.pending_at));
end$$;
alter function jovabook_private.operator_business_record(uuid) rename to operator_business_before_free_offer;
create function jovabook_private.operator_business_record(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;o jovabook_private.offer_accounts;p text;begin
 result:=jovabook_private.operator_business_before_free_offer(p_id);select * into o from jovabook_private.offer_accounts where salon_id=p_id;
 if o.salon_id is null then return result;end if;p:=jovabook_private.offer_plan(p_id);
 return result||jsonb_build_object('offer_version','2026-11-free-v1','has_paid',o.ever_paid,'billing_state',case when o.provider_status='trialing' and o.trial_ends_at>now() then case when o.cancel_at_period_end then 'trial_cancelled' else 'trial' end when p<>'essential' then 'paid' when o.provider_status in('past_due','unpaid') then 'past_due' else 'free' end,'plan',p,'seats',jovabook_private.offer_seats(p_id),'trial_end',o.trial_ends_at,'paid_until',o.paid_until,'cadence',o.cadence,'cancel_at_period_end',o.cancel_at_period_end);
end$$;
alter function public.operator_overview() rename to operator_overview_before_free_offer;
alter function public.operator_overview_before_free_offer() set schema jovabook_private;
create function public.operator_overview() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;counts jsonb;begin
 perform jovabook_private.require_operator();result:=jovabook_private.operator_overview_before_free_offer();
 select jsonb_build_object('offer_version','2026-11-free-v1','essential',0,'starter',count(*) filter(where jovabook_private.offer_plan(a.salon_id)='essential'),
 'standard',count(*) filter(where a.ever_paid and a.provider_status<>'trialing' and jovabook_private.offer_plan(a.salon_id)='standard'),
 'premium',count(*) filter(where a.ever_paid and a.provider_status<>'trialing' and jovabook_private.offer_plan(a.salon_id)='premium'),
 'paid_total',count(*) filter(where a.ever_paid),'paid_active',count(*) filter(where a.ever_paid and a.provider_status<>'trialing' and jovabook_private.offer_plan(a.salon_id)<>'essential'),
 'trials_total',count(*) filter(where a.trial_started_at is not null and not a.ever_paid),
 'trials_active',count(*) filter(where a.provider_status='trialing' and a.trial_ends_at>now() and not a.cancel_at_period_end),
 'trials_cancelled',count(*) filter(where a.provider_status='trialing' and a.trial_ends_at>now() and a.cancel_at_period_end),
 'trials_ended',count(*) filter(where a.trial_started_at is not null and not a.ever_paid and coalesce(a.trial_ends_at,now())<=now())) into counts from jovabook_private.offer_accounts a;
 return result||counts;
end$$;
create or replace function jovabook_private.operator_events() returns table(id text,salon_id uuid,business text,title text,at timestamptz) language sql stable security definer set search_path='' as $$
 select md5(kind||':'||sid::text||':'||event_at::text),sid,name,label,event_at from (
 select 'signup' kind,s.id sid,s.name,'New business registered' label,s.created_at event_at from public.salons s where s.created_at>now()-interval '14 days'
 union all select 'payment',s.id,s.name,'Subscription needs attention',a.last_verified_at from public.salons s join jovabook_private.offer_accounts a on a.salon_id=s.id where a.provider_status in('past_due','unpaid')
 union all select 'trial',s.id,s.name,'Trial ending soon',a.trial_ends_at from public.salons s join jovabook_private.offer_accounts a on a.salon_id=s.id where a.provider_status='trialing' and not a.cancel_at_period_end and a.trial_ends_at between now() and now()+interval '3 days'
 ) events order by event_at desc limit 12
$$;
revoke all on function jovabook_private.operator_billing_before_free_offer(uuid,boolean),jovabook_private.operator_business_before_free_offer(uuid),jovabook_private.operator_overview_before_free_offer(),jovabook_private.operator_billing_record(uuid,boolean),jovabook_private.operator_business_record(uuid),public.operator_overview() from public,anon,authenticated;
grant execute on function public.operator_overview() to authenticated;

notify pgrst,'reload schema';
commit;
