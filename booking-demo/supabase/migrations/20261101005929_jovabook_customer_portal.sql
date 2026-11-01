-- Customer identities are independent from business-owner onboarding.
-- Cards and CVCs never enter this schema. Provider IDs are private server data.
create table public.customer_portal_memberships(
 salon_id uuid not null references public.salons(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 first_name text not null check(length(trim(first_name)) between 1 and 60),
 last_name text not null check(length(trim(last_name)) between 1 and 60),
 phone text not null check(length(phone) between 7 and 40),
 created_at timestamptz not null default now(),primary key(salon_id,user_id)
);
create index customer_portal_user_idx on public.customer_portal_memberships(user_id);
alter table public.customer_portal_memberships enable row level security;
revoke all on public.customer_portal_memberships from public,anon,authenticated;
grant select on public.customer_portal_memberships to authenticated;
create policy "customer reads own membership" on public.customer_portal_memberships for select to authenticated
 using(user_id=(select auth.uid()));

create table jovabook_private.customer_config(
 singleton boolean primary key default true check(singleton),worker_hash text,
 recovery_enabled boolean not null default false,payments_enabled boolean not null default false,
 salt text not null default gen_random_uuid()::text
);
insert into jovabook_private.customer_config(singleton) values(true);
create table jovabook_private.customer_recovery_limits(
 fingerprint text not null,window_start timestamptz not null,attempts int not null,
 primary key(fingerprint,window_start)
);
create table jovabook_private.customer_payment_accounts(
 salon_id uuid primary key references public.salons(id) on delete cascade,
 account_id text not null unique check(account_id ~ '^acct_[A-Za-z0-9]+$'),
 verified boolean not null default false
);
create table jovabook_private.customer_payment_profiles(
 salon_id uuid not null,user_id uuid not null,customer_id text not null,payment_method_id text,card jsonb,
 check(card is null or coalesce((card->>'last4' ~ '^[0-9]{4}$' and length(card->>'brand') between 1 and 24 and card->>'exp_month' ~ '^(1[0-2]|[1-9])$' and card->>'exp_year' ~ '^[0-9]{4}$' and jsonb_typeof(card)='object' and card ?& array['brand','last4','exp_month','exp_year'] and card-'brand'-'last4'-'exp_month'-'exp_year'='{}'::jsonb),false)),
 primary key(salon_id,user_id),unique(salon_id,customer_id),
 foreign key(salon_id,user_id) references public.customer_portal_memberships(salon_id,user_id) on delete cascade
);
create table jovabook_private.customer_payment_actions(
 id uuid primary key default gen_random_uuid(),salon_id uuid not null,user_id uuid not null,
 request_id uuid not null,account_id text not null,request_hash text not null,
 created_at timestamptz not null default now(),provider_id text,url text,completed_at timestamptz,
 unique(salon_id,user_id,request_id),foreign key(salon_id,user_id) references public.customer_portal_memberships(salon_id,user_id) on delete cascade
);
create table jovabook_private.customer_deposits(
 salon_id uuid not null,booking_id text not null,payment_intent text not null,
 account_id text not null,amount int not null check(amount>0),currency text not null check(currency='gbp'),
 captured_at timestamptz not null,
 primary key(salon_id,booking_id),unique(account_id,payment_intent),
 foreign key(salon_id,booking_id) references public.bookings(salon_id,id) on delete cascade
);
create table jovabook_private.customer_refunds(
 id uuid primary key default gen_random_uuid(),salon_id uuid not null,booking_id text not null,
 status text not null default 'requested' check(status in('requested','sending','pending','succeeded','failed','needs_attention')),
 requested_at timestamptz not null default now(),first_attempt_at timestamptz,provider_id text,lease uuid,lease_until timestamptz,
 unique(salon_id,booking_id),foreign key(salon_id,booking_id) references jovabook_private.customer_deposits(salon_id,booking_id) on delete cascade
);
create table jovabook_private.customer_cancellations(
 salon_id uuid not null,booking_id text not null,eligible_at timestamptz not null default now(),
 primary key(salon_id,booking_id),foreign key(salon_id,booking_id) references public.bookings(salon_id,id) on delete cascade
);
do $$declare t text;begin foreach t in array array['customer_config','customer_recovery_limits','customer_payment_accounts','customer_payment_profiles','customer_payment_actions','customer_deposits','customer_refunds','customer_cancellations'] loop
 execute format('alter table jovabook_private.%I enable row level security',t);
 execute format('revoke all on jovabook_private.%I from public,anon,authenticated',t);
end loop;end$$;

-- An owner deleting a booking must not erase a captured payment or refund job.
-- Reviewed salon retention performs its finance checks before the parent delete;
-- only that parent cascade may remove the protected child rows.
create function jovabook_private.customer_booking_delete_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.salons where id=old.salon_id) and (exists(select 1 from jovabook_private.customer_deposits where salon_id=old.salon_id and booking_id=old.id) or old.deposit>0 and exists(select 1 from jovabook_private.customer_cancellations where salon_id=old.salon_id and booking_id=old.id)) then
  raise exception 'This booking has a payment record and cannot be deleted. Cancel it if eligible, or contact support.' using errcode='23514';
 end if;
 return old;
end$$;
create trigger customer_booking_delete_guard before delete on public.bookings for each row execute function jovabook_private.customer_booking_delete_guard();
revoke all on function jovabook_private.customer_booking_delete_guard() from public,anon,authenticated;
create function jovabook_private.customer_late_capture() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||new.salon_id::text));
 insert into jovabook_private.customer_refunds(salon_id,booking_id)
 select new.salon_id,new.booking_id where exists(select 1 from jovabook_private.customer_cancellations where salon_id=new.salon_id and booking_id=new.booking_id)
 on conflict(salon_id,booking_id) do nothing;
 return new;
end$$;
create trigger customer_late_capture after insert on jovabook_private.customer_deposits for each row execute function jovabook_private.customer_late_capture();
revoke all on function jovabook_private.customer_late_capture() from public,anon,authenticated;

create function jovabook_private.customer_email() returns text language sql stable security definer set search_path='' as $$
 select lower(trim(email)) from auth.users where id=auth.uid() and email_confirmed_at is not null
$$;
create function jovabook_private.customer_member(p_slug text) returns uuid language sql stable security definer set search_path='' as $$
 select s.id from public.salons s join public.customer_portal_memberships m on m.salon_id=s.id
 where s.slug=lower(trim(p_slug)) and m.user_id=auth.uid() and jovabook_private.customer_email() is not null
$$;
create function jovabook_private.customer_booking_json(b public.bookings) returns jsonb language sql stable security definer set search_path='' as $$
 select (public.booking_json(b)-'notes'-'customerId'-'source')||jsonb_build_object(
 'can_cancel',b.status='confirmed' and coalesce(jovabook_private.sms_start(b)>=clock_timestamp()+interval '24 hours',false),
 'cancellation_cutoff',jovabook_private.sms_start(b)-interval '24 hours','server_now',clock_timestamp(),
 'refund_status',coalesce((select r.status from jovabook_private.customer_refunds r where r.salon_id=b.salon_id and r.booking_id=b.id),
 case when b.deposit>0 and b.status='cancelled' then 'needs_attention' else 'none' end))
$$;
create function public.customer_portal_register(p_slug text,p_first_name text,p_last_name text,p_phone text) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid uuid;verified_email text:=jovabook_private.customer_email();begin
 if verified_email is null then raise exception 'Verify your email before opening your bookings.' using errcode='42501';end if;
 select s.id into sid from public.salons s where s.slug=lower(trim(p_slug)) and
 (jovabook_private.billing_open(s.id) or exists(select 1 from public.bookings b where b.salon_id=s.id and lower(trim(b.email))=verified_email));
 if sid is null then raise exception 'This business is unavailable.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 if not exists(select 1 from public.salons s where s.id=sid and (jovabook_private.billing_open(s.id) or exists(select 1 from public.bookings b where b.salon_id=s.id and lower(trim(b.email))=verified_email))) then raise exception 'This business is unavailable.' using errcode='42501';end if;
 if length(trim(coalesce(p_first_name,''))) not between 1 and 60 or length(trim(coalesce(p_last_name,''))) not between 1 and 60 or length(trim(coalesce(p_phone,''))) not between 7 and 40 then raise exception 'Enter your name and phone number.' using errcode='22023';end if;
 insert into public.customer_portal_memberships(salon_id,user_id,first_name,last_name,phone) values(sid,auth.uid(),trim(p_first_name),trim(p_last_name),trim(p_phone))
 on conflict(salon_id,user_id) do update set first_name=excluded.first_name,last_name=excluded.last_name,phone=excluded.phone;
 -- Do not overwrite the business's existing client record with registration fields.
 insert into public.customers(salon_id,id,name,email,phone)
 select sid,'cp_'||auth.uid()::text,left(trim(p_first_name)||' '||trim(p_last_name),80),verified_email,trim(p_phone)
 where not exists(select 1 from public.customers c where c.salon_id=sid and lower(trim(c.email))=verified_email)
 on conflict(salon_id,id) do nothing;
 return jsonb_build_object('ok',true);
end$$;
create function public.customer_portal_bookings(p_slug text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare sid uuid:=jovabook_private.customer_member(p_slug);result jsonb;begin
 if sid is null then raise exception 'Log in and verify your email to view your bookings.' using errcode='42501';end if;
 select jsonb_build_object('ok',true,'server_now',now(),
 'business',jsonb_build_object('id',s.id,'name',s.name,'slug',s.slug,'timezone',coalesce(s.settings->>'timezone','Europe/London')),
 'customer',jsonb_build_object('first_name',m.first_name,'last_name',m.last_name,'email',jovabook_private.customer_email(),'phone',m.phone),
 'bookings',coalesce((select jsonb_agg(jovabook_private.customer_booking_json(b)||jsonb_build_object('service_name',b.service_name,'staff_name',coalesce(st.name,'')) order by b.date desc,b.time desc)
 from public.bookings b left join public.staff st on st.salon_id=b.salon_id and st.id=b.staff_id
 where b.salon_id=sid and lower(trim(b.email))=jovabook_private.customer_email()),'[]'::jsonb)) into result
 from public.salons s join public.customer_portal_memberships m on m.salon_id=s.id and m.user_id=auth.uid() where s.id=sid;
 return result;
end$$;
create function jovabook_private.customer_cancel(p_salon uuid,p_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.bookings;begin
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||p_salon::text));
 if not exists(select 1 from public.salons where id=p_salon) then return jsonb_build_object('ok',false,'message','This business is unavailable.');end if;
 select * into b from public.bookings where salon_id=p_salon and id=p_id for update;
 if b.id is null then return jsonb_build_object('ok',false,'message','Booking not found.');end if;
 if b.status='cancelled' then return jsonb_build_object('ok',true,'booking',jovabook_private.customer_booking_json(b));end if;
 if b.status<>'confirmed' then return jsonb_build_object('ok',false,'message','This booking cannot be cancelled.');end if;
 if not coalesce(jovabook_private.sms_start(b)>=clock_timestamp()+interval '24 hours',false) then
 return jsonb_build_object('ok',false,'message','Bookings cannot be cancelled within 24 hours of the start time.');end if;
 insert into jovabook_private.customer_cancellations(salon_id,booking_id) values(p_salon,p_id) on conflict(salon_id,booking_id) do nothing;
 update public.bookings set status='cancelled' where salon_id=p_salon and id=p_id returning * into b;
 insert into jovabook_private.customer_refunds(salon_id,booking_id)
 select d.salon_id,d.booking_id from jovabook_private.customer_deposits d where d.salon_id=p_salon and d.booking_id=p_id
 on conflict(salon_id,booking_id) do nothing;
 perform public.add_mail(p_salon,'cancelled',public.booking_json(b));
 return jsonb_build_object('ok',true,'booking',jovabook_private.customer_booking_json(b));
end$$;
create function public.customer_portal_cancel(p_slug text,p_booking_id text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid uuid:=jovabook_private.customer_member(p_slug);begin
 if sid is null or p_request_id is null then raise exception 'Log in to cancel your booking.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 if not exists(select 1 from public.bookings where salon_id=sid and id=p_booking_id and lower(trim(email))=jovabook_private.customer_email()) then
 return jsonb_build_object('ok',false,'message','Booking not found.');end if;
 return jovabook_private.customer_cancel(sid,p_booking_id);
end$$;
create or replace function public.get_booking(p_slug text,p_id text) returns jsonb language sql stable security definer set search_path='' as $$
 select jovabook_private.customer_booking_json(b) from public.bookings b join public.salons s on s.id=b.salon_id
 where s.slug=lower(trim(p_slug)) and b.id=p_id and length(p_id)>=30
$$;
create or replace function public.cancel_booking(p_slug text,p_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid uuid;begin
 select id into sid from public.salons where slug=lower(trim(p_slug));
 if sid is null or length(coalesce(p_id,''))<30 then return jsonb_build_object('ok',false,'message','Booking not found.');end if;
 return jovabook_private.customer_cancel(sid,p_id);
end$$;
create or replace function public.reschedule_booking(p_slug text,p_id text,p_date text,p_time text) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('ok',false,'message','Online rescheduling is unavailable. Cancel an eligible booking and book again, or contact the business.')
$$;

-- Only the authenticated backend worker may inspect recovery eligibility or provider refs.
create function public.customer_portal_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare c jovabook_private.customer_config;sid uuid;usr uuid;recovery_email text;fp text;ipfp text;bucket timestamptz;attempts int;result jsonb;r jovabook_private.customer_refunds;pa jovabook_private.customer_payment_actions;account text;
begin
 select * into c from jovabook_private.customer_config where singleton;
 if c.worker_hash is null or p_token is null or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>c.worker_hash then raise exception 'Invalid customer worker.' using errcode='42501';end if;
 if p_action='recovery' then
  if not c.recovery_enabled then return jsonb_build_object('send',false);end if;
  recovery_email:=lower(trim(p_payload->>'email'));bucket:=date_trunc('hour',now());
  if recovery_email is null or length(recovery_email)>254 or recovery_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return jsonb_build_object('send',false);end if;
  fp:=encode(sha256(convert_to(c.salt||recovery_email,'UTF8')),'hex');
  -- Global, address and network limits are persisted and serialized by this transaction.
  foreach ipfp in array array['global',fp,encode(sha256(convert_to(c.salt||coalesce(p_payload->>'network','unknown'),'UTF8')),'hex')] loop
   insert into jovabook_private.customer_recovery_limits values(ipfp,bucket,1) on conflict(fingerprint,window_start) do update set attempts=customer_recovery_limits.attempts+1 returning customer_recovery_limits.attempts into attempts;
   if attempts>(case when ipfp='global' then 100 when ipfp=fp then 3 else 20 end) then return jsonb_build_object('send',false);end if;
  end loop;
  delete from jovabook_private.customer_recovery_limits where window_start<now()-interval '2 days';
  select s.id into sid from public.salons s where s.slug=lower(trim(p_payload->>'salon'));
  select u.id into usr from auth.users u join public.customer_portal_memberships m on m.user_id=u.id and m.salon_id=sid
  where lower(trim(u.email))=recovery_email and u.email_confirmed_at is not null;
  return jsonb_build_object('send',usr is not null);
 elsif p_action in('payment_context','payment_status_context','bind_payment_customer','payment_begin','payment_finish','payment_complete') then
  sid:=(p_payload->>'salon_id')::uuid;usr:=(p_payload->>'user_id')::uuid;
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
  if not c.payments_enabled or (p_action not in('payment_status_context','payment_complete') and not jovabook_private.billing_open(sid)) then return null;end if;
  select a.account_id,jsonb_build_object('account_id',a.account_id,'customer_id',p.customer_id,'payment_method_id',p.payment_method_id,'card',p.card,'can_setup',jovabook_private.billing_open(sid)) into account,result
  from jovabook_private.customer_payment_accounts a join public.customer_portal_memberships m on m.salon_id=a.salon_id and m.user_id=usr
  left join jovabook_private.customer_payment_profiles p on p.salon_id=m.salon_id and p.user_id=m.user_id
  where a.salon_id=sid and a.verified and exists(select 1 from auth.users u where u.id=usr and u.email_confirmed_at is not null);
  if p_action='payment_context' or result is null then return result;end if;
  if p_action='payment_status_context' then
   if (select count(*) from jovabook_private.customer_payment_actions where salon_id=sid and user_id=usr and completed_at is null)>20 then raise exception 'Payment setup needs review.';end if;
   return result||jsonb_build_object('actions',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'provider_id',x.provider_id,'request_id',x.request_id,'created_at',x.created_at)) from jovabook_private.customer_payment_actions x where x.salon_id=sid and x.user_id=usr and x.completed_at is null),'[]'::jsonb));
  end if;
  if account<>p_payload->>'account_id' then raise exception 'Business payment account changed.' using errcode='42501';end if;
  if p_action='bind_payment_customer' then
   if coalesce(p_payload->>'customer_id','') !~ '^cus_[A-Za-z0-9]+$' then raise exception 'Invalid payment customer.';end if;
   insert into jovabook_private.customer_payment_profiles(salon_id,user_id,customer_id) values(sid,usr,p_payload->>'customer_id') on conflict(salon_id,user_id) do nothing;
   if not exists(select 1 from jovabook_private.customer_payment_profiles where salon_id=sid and user_id=usr and customer_id=p_payload->>'customer_id') then raise exception 'Payment customer binding changed.' using errcode='42501';end if;
   return jsonb_build_object('ok',true);
  elsif p_action='payment_begin' then
   if p_payload->>'hash' is null or length(p_payload->>'hash')<>64 then raise exception 'Invalid setup request.';end if;
   select * into pa from jovabook_private.customer_payment_actions where salon_id=sid and user_id=usr and completed_at is null order by created_at limit 1 for update;
   if pa.id is not null then
    if pa.account_id<>account or pa.request_hash<>p_payload->>'hash' then raise exception 'An earlier payment setup needs review.' using errcode='42501';end if;
    return to_jsonb(pa)-'request_hash'-'user_id';
   end if;
   insert into jovabook_private.customer_payment_actions(salon_id,user_id,request_id,account_id,request_hash) values(sid,usr,(p_payload->>'request_id')::uuid,account,p_payload->>'hash') on conflict(salon_id,user_id,request_id) do nothing;
   select * into pa from jovabook_private.customer_payment_actions where salon_id=sid and user_id=usr and request_id=(p_payload->>'request_id')::uuid for update;
   if pa.account_id<>account or pa.request_hash<>p_payload->>'hash' then raise exception 'Setup request changed.' using errcode='42501';end if;
   return to_jsonb(pa)-'request_hash'-'user_id';
  elsif p_action='payment_complete' then
   select * into pa from jovabook_private.customer_payment_actions where id=(p_payload->>'id')::uuid and salon_id=sid and user_id=usr and account_id=account for update;
   if pa.id is null or coalesce(p_payload->>'provider_id','') !~ '^cs_[A-Za-z0-9_]+$' or (pa.provider_id is not null and pa.provider_id<>p_payload->>'provider_id') then raise exception 'Payment setup binding changed.' using errcode='42501';end if;
   if p_payload->>'status' not in('complete','expired') then raise exception 'Setup session is still open.';end if;
   if p_payload->>'status'='complete' then
    if coalesce(p_payload->>'payment_method_id','') !~ '^pm_[A-Za-z0-9]+$' or jsonb_typeof(p_payload->'card') is distinct from 'object' then raise exception 'Verified payment method required.';end if;
    update jovabook_private.customer_payment_profiles set payment_method_id=p_payload->>'payment_method_id',card=p_payload->'card' where salon_id=sid and user_id=usr;
    if not found then raise exception 'Verified payment customer required.';end if;
   end if;
   update jovabook_private.customer_payment_actions set provider_id=p_payload->>'provider_id',completed_at=coalesce(completed_at,now()) where id=pa.id;
   return jsonb_build_object('ok',true);
  else
   select * into pa from jovabook_private.customer_payment_actions where id=(p_payload->>'id')::uuid and salon_id=sid and user_id=usr and account_id=account for update;
   if pa.id is null or p_payload->>'provider_id' is null or coalesce(p_payload->>'url','') !~ '^https://checkout\.stripe\.com/' then raise exception 'Invalid setup completion.';end if;
   if pa.provider_id is not null and (pa.provider_id<>p_payload->>'provider_id' or pa.url<>p_payload->>'url') then raise exception 'Setup result changed.' using errcode='42501';end if;
   update jovabook_private.customer_payment_actions set provider_id=p_payload->>'provider_id',url=p_payload->>'url' where id=pa.id;
   return jsonb_build_object('ok',true);
  end if;
 elsif p_action='refund_claim' then
  if not c.payments_enabled then return null;end if;
  select * into r from jovabook_private.customer_refunds where status='requested' order by requested_at for update skip locked limit 1;
  if r.id is null then return null;end if;
  update jovabook_private.customer_refunds set status='sending',first_attempt_at=coalesce(first_attempt_at,now()),lease=gen_random_uuid(),lease_until=now()+interval '10 minutes' where id=r.id returning * into r;
  select to_jsonb(r)||jsonb_build_object('payment_intent',d.payment_intent,'account_id',d.account_id,'amount',d.amount,'currency',d.currency) into result from jovabook_private.customer_deposits d where d.salon_id=r.salon_id and d.booking_id=r.booking_id;
  return result;
 elsif p_action='refund_reconcile' then
  if not c.payments_enabled then return null;end if;
  select * into r from jovabook_private.customer_refunds where status in('sending','pending','failed','needs_attention') and lease_until<now() order by requested_at for update skip locked limit 1;
  if r.id is null then return null;end if;
  update jovabook_private.customer_refunds set lease=gen_random_uuid(),lease_until=now()+interval '10 minutes' where id=r.id returning * into r;
  select to_jsonb(r)||jsonb_build_object('payment_intent',d.payment_intent,'account_id',d.account_id,'amount',d.amount,'currency',d.currency) into result from jovabook_private.customer_deposits d where d.salon_id=r.salon_id and d.booking_id=r.booking_id;
  return result;
 elsif p_action='refund_finish' then
  select * into r from jovabook_private.customer_refunds where id=(p_payload->>'id')::uuid and lease=(p_payload->>'lease')::uuid for update;
  if r.id is null then raise exception 'Refund lease changed.' using errcode='42501';end if;
  if r.provider_id is not null and p_payload->>'provider_id' is not null and r.provider_id<>p_payload->>'provider_id' then raise exception 'Refund provider binding changed.' using errcode='42501';end if;
  if p_payload->>'status' not in('pending','succeeded','failed','needs_attention') then raise exception 'Invalid refund state.';end if;
  if r.status='succeeded' and p_payload->>'status'<>'succeeded' then return jsonb_build_object('ok',true);end if;
  update jovabook_private.customer_refunds set status=p_payload->>'status',provider_id=coalesce(provider_id,p_payload->>'provider_id') where id=r.id;
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unknown customer action.';
end$$;
revoke all on function jovabook_private.customer_email(),jovabook_private.customer_member(text),jovabook_private.customer_booking_json(public.bookings),jovabook_private.customer_cancel(uuid,text) from public,anon,authenticated;
revoke all on function public.customer_portal_register(text,text,text,text),public.customer_portal_bookings(text),public.customer_portal_cancel(text,text,uuid),public.customer_portal_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.customer_portal_register(text,text,text,text),public.customer_portal_bookings(text),public.customer_portal_cancel(text,text,uuid) to authenticated;
grant execute on function public.customer_portal_worker(text,text,jsonb) to anon;
