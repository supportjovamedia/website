-- Hosted direct-charge deposits. No browser can assert that a payment succeeded.
-- Private holds reserve availability until Stripe confirms payment or expiry.
begin;
-- Return integer pence using decimal arithmetic. Below Stripe's GBP minimum,
-- nothing is collected online and the whole service price remains due in person.
create function jovabook_private.online_deposit_pence(p_salon uuid,p_price numeric) returns int
language plpgsql stable security definer set search_path='' as $$
declare payment jsonb;value numeric;amount numeric;begin
 select payments into payment from public.salons where id=p_salon;
 if not coalesce((payment->>'enabled')::boolean,false) or coalesce(p_price,0)<=0 then return 0;end if;
 if payment ? 'deposit_percent' then
  value:=(payment->>'deposit_percent')::numeric;
  if value is null or value::text in('NaN','Infinity','-Infinity') or value<0 or value>100 or value<>round(value,2) then raise exception 'Invalid deposit percentage.';end if;
  amount:=round(p_price*value);
 else
  value:=coalesce((payment->>'deposit')::numeric,0);
  if value::text in('NaN','Infinity','-Infinity') or value<0 or value>10000 then raise exception 'Invalid deposit amount.';end if;
  amount:=round(least(value,p_price)*100);
 end if;
 if amount<30 then return 0;end if;
 return least(amount,round(p_price*100))::int;
end$$;
revoke all on function jovabook_private.online_deposit_pence(uuid,numeric) from public,anon,authenticated;

-- Legacy no-payment booking paths may never manufacture a paid deposit or an
-- estimated processor fee. Verified capture is recorded only by the worker below.
do $$declare definition text;marker text;begin
 definition:=pg_get_functiondef('jovabook_private.billing_original_create_booking(text,text,text,text,text,text,text,text,text,text)'::regprocedure);
 marker:='if coalesce((s.payments->>''enabled'')::boolean, false) then dep := least(coalesce((s.payments->>''deposit'')::numeric, 0), svc.price); end if;';
 if strpos(definition,marker)=0 then raise exception 'Legacy booking writer changed. Review the deposit migration.';end if;
 execute replace(definition,marker,'dep := 0;');
end$$;
create or replace function public.create_booking(p_slug text,p_service text,p_staff text,p_date text,p_time text,p_name text,p_email text,p_phone text,p_notes text,p_method text default 'Card') returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare business public.salons;service public.services;amount int;begin
 select * into business from public.salons where slug=lower(trim(p_slug));if business.id is null then return null;end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||business.id::text));
 select * into business from public.salons where id=business.id and slug=lower(trim(p_slug)) for share nowait;
 if business.id is null or not jovabook_private.billing_open(business.id) then return null;end if;
 select * into service from public.services where salon_id=business.id and id=p_service for share nowait;
 if service.id is null then return jsonb_build_object('ok',false,'message','Choose a valid service.');end if;
 begin amount:=jovabook_private.online_deposit_pence(business.id,service.price);
 exception when others then return jsonb_build_object('ok',false,'code','online_deposit_unavailable','message','Online payments are unavailable. Please contact the business to book.');end;
 if amount>0 then return jsonb_build_object('ok',false,'code','online_deposit_unavailable','message','Complete the secure deposit checkout or contact the business to book.');end if;
 return jovabook_private.deposit_original_create_booking(p_slug,p_service,p_staff,p_date,p_time,p_name,p_email,p_phone,p_notes,p_method);
exception when lock_not_available then return jsonb_build_object('ok',false,'code','booking_busy','message','Booking details are being updated. Try again shortly or contact the business.');
end$$;
-- Other owner forms save business details without overwriting the separate,
-- canonical deposit rule with a stale browser snapshot.
create or replace function public.save_salon(p_name text,p_email text,p_phone text,p_address text,p_settings jsonb,p_payments jsonb,p_usage jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare sid uuid;current_payments jsonb;begin
 select id into sid from public.salons where owner_id=auth.uid();
 if sid is null then raise exception 'Business access denied.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 if not jovabook_private.billing_open(sid) then raise exception 'Subscription payment is required.' using errcode='42501';end if;
 select payments into current_payments from public.salons where id=sid;
 perform jovabook_private.billing_original_save_salon(p_name,p_email,p_phone,p_address,p_settings,current_payments,p_usage);
end$$;
create table jovabook_private.deposit_checkouts(
 id uuid primary key default gen_random_uuid(),salon_id uuid not null references public.salons(id) on delete cascade,
 request_id uuid not null,verifier_hash text not null check(verifier_hash ~ '^[a-f0-9]{64}$'),
 request_hash text not null,network_hash text not null,
 account_id text not null,booking_id text not null unique,
 service_id text not null,service_name text not null,price numeric(8,2) not null,
 duration int not null,staff_id text not null,date date not null,time text not null,
 name text not null,email text not null,phone text not null,notes text not null,
 amount int not null check(amount>=30 and amount<=1000000),currency text not null default 'gbp' check(currency='gbp'),
 stage text not null default 'creating' check(stage in('creating','open','paid','expired','needs_attention')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '35 minutes',
 provider_id text unique,payment_intent text,checkout_url text,finished_at timestamptz,
 unique(salon_id,request_id)
);
alter table jovabook_private.deposit_checkouts enable row level security;
revoke all on jovabook_private.deposit_checkouts from public,anon,authenticated;
create index deposit_checkouts_slots on jovabook_private.deposit_checkouts(salon_id,date,staff_id) where stage in('creating','open','needs_attention');
create index deposit_checkouts_reconcile on jovabook_private.deposit_checkouts(created_at) where stage in('creating','open','needs_attention');

-- A verified checkout preserves the exact offer accepted before payment. The
-- private paid record is not writable by owners, guests or customer accounts.
do $$declare definition text;marker text;addition text;begin
 definition:=pg_get_functiondef('public.validate_booking_schedule()'::regprocedure);
 marker:='perform pg_advisory_xact_lock(hashtext(''jovabook-owner:''||new.salon_id::text));';
 addition:=$code$
  if tg_op='INSERT' and new.source='Online' and new.status in('confirmed','cancelled') and exists(
   select 1 from jovabook_private.deposit_checkouts proof where proof.stage='paid' and proof.salon_id=new.salon_id and proof.booking_id=new.id
    and (proof.service_id,proof.service_name,proof.price,proof.duration,proof.staff_id,proof.date,proof.time,proof.name,proof.email,proof.phone,proof.notes,proof.amount/100.0)
     is not distinct from (new.service_id,new.service_name,new.price,new.duration,new.staff_id,new.date,new.time,new.name,new.email,new.phone,new.notes,new.deposit)) then
   if new.status='cancelled' or public.slot_free(new.salon_id,new.staff_id,new.date,new.time,new.duration) then return new;end if;
   raise exception 'That time is no longer available.' using errcode='23514';
  end if;
 $code$;
 if strpos(definition,marker)=0 then raise exception 'Schedule trigger changed. Review the deposit migration.';end if;
 execute replace(definition,marker,marker||addition);
end$$;

-- Preserve the canonical schedule check, adding only private checkout holds.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.slot_free(uuid,text,date,text,integer,text)'::regprocedure);
 execute replace(definition,'public.slot_free(','jovabook_private.deposit_original_slot_free(');
end$$;
revoke all on function jovabook_private.deposit_original_slot_free(uuid,text,date,text,integer,text) from public,anon,authenticated;
create or replace function public.slot_free(p_salon uuid,p_staff text,p_date date,p_time text,p_duration integer,p_ignore text default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare buf int;begin
 if not jovabook_private.deposit_original_slot_free(p_salon,p_staff,p_date,p_time,p_duration,p_ignore) then return false;end if;
 select greatest(0,coalesce((settings->>'buffer')::int,0)) into buf from public.salons where id=p_salon;
 return not exists(select 1 from jovabook_private.deposit_checkouts h where h.salon_id=p_salon and h.staff_id=p_staff and h.date=p_date
  and h.stage in('creating','open','needs_attention')
  and public.clock_mins(p_time)<public.clock_mins(h.time)+h.duration+buf
  and public.clock_mins(p_time)+p_duration+buf>public.clock_mins(h.time));
end$$;

create function jovabook_private.deposit_pending(p_salon uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from jovabook_private.deposit_checkouts where salon_id=p_salon and stage in('creating','open','needs_attention'))
$$;
revoke all on function jovabook_private.deposit_pending(uuid) from public,anon,authenticated;
create function jovabook_private.deposit_delete_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||old.id::text));
 if jovabook_private.deposit_pending(old.id) then raise exception 'A deposit checkout is still being reconciled.' using errcode='23514';end if;
 return old;
end$$;
revoke all on function jovabook_private.deposit_delete_guard() from public,anon,authenticated;
create trigger deposit_delete_guard before delete on public.salons for each row execute function jovabook_private.deposit_delete_guard();

-- New public data contains only amounts and anonymous blocked times.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.public_salon(text)'::regprocedure);
 execute replace(definition,'public.public_salon(','jovabook_private.deposit_original_public_salon(');
end$$;
revoke all on function jovabook_private.deposit_original_public_salon(text) from public,anon,authenticated;
create or replace function public.public_salon(p_slug text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;sid uuid;holds jsonb;available boolean;begin
 result:=jovabook_private.deposit_original_public_salon(p_slug);if result is null then return null;end if;
 sid:=(result->>'id')::uuid;
 select coalesce(jsonb_agg(jsonb_build_object('id','hold_'||h.id,'date',h.date,'time',h.time,'duration',h.duration,'staffId',h.staff_id,'status','confirmed')),'[]') into holds
 from jovabook_private.deposit_checkouts h where h.salon_id=sid and h.stage in('creating','open','needs_attention');
 select coalesce(c.payments_enabled and a.verified and i.summary->>'connection_method'='provider_login' and i.summary->>'account_id'=a.account_id,false) into available
 from jovabook_private.customer_config c left join jovabook_private.customer_payment_accounts a on a.salon_id=sid
 left join jovabook_private.business_integrations i on i.salon_id=sid and i.provider='stripe' where c.singleton;
 return jsonb_set(result,'{busy}',coalesce(result->'busy','[]')||holds)||jsonb_build_object('deposit_checkout_available',coalesce(available,false));
end$$;

-- Worker-only gateway. The server verifies the owner, Stripe account and all
-- payment proofs before calling it. The existing customer worker secret is used.
create function public.booking_deposit_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare cfg jovabook_private.customer_config;s public.salons;svc public.services;h jovabook_private.deposit_checkouts;
 a jovabook_private.customer_payment_accounts;i jovabook_private.business_integrations;
 sid uuid;usr uuid;picked text;st record;bounds jsonb;chosen date;dep numeric;cust text;rec public.bookings;
 fingerprint text;valid_slot boolean;outcome text;
begin
 select * into cfg from jovabook_private.customer_config where singleton;
 if cfg.worker_hash is null or p_token is null or length(p_token)<>64 or cfg.worker_hash<>encode(sha256(convert_to(p_token,'UTF8')),'hex') then raise exception 'Invalid deposit worker.' using errcode='42501';end if;
 if p_action in('owner_status','owner_save','owner_verify') then
  sid:=(p_payload->>'salon_id')::uuid;usr:=(p_payload->>'user_id')::uuid;
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
  if not jovabook_private.integration_owner(sid,usr,p_action<>'owner_status') then raise exception 'Business access denied.' using errcode='42501';end if;
  select * into s from public.salons where id=sid;
  select * into i from jovabook_private.business_integrations where salon_id=sid and provider='stripe';
  if p_action='owner_verify' then
   if i.summary->>'connection_method' is distinct from 'provider_login' or i.summary->>'account_id' is distinct from p_payload->>'account_id' then raise exception 'Reconnect Stripe using provider sign-in.';end if;
   insert into jovabook_private.customer_payment_accounts(salon_id,account_id,verified) values(sid,p_payload->>'account_id',coalesce((p_payload->>'ready')::boolean,false))
    on conflict(salon_id) do update set account_id=excluded.account_id,verified=excluded.verified;
  elsif p_action='owner_save' then
   dep:=(p_payload->>'deposit_percent')::numeric;
   if dep is null or dep::text in('NaN','Infinity','-Infinity') or dep<0 or dep>100 or dep<>round(dep,2) then raise exception 'Enter a deposit percentage from 0 to 100, using at most two decimal places.';end if;
   if dep>0 and (not cfg.payments_enabled or not exists(select 1 from jovabook_private.customer_payment_accounts where salon_id=sid and verified and account_id=i.summary->>'account_id') or i.summary->>'connection_method' is distinct from 'provider_login') then raise exception 'Connect a payment-ready Stripe account first.';end if;
   update public.salons set payments=coalesce(payments,'{}')||jsonb_build_object('enabled',dep>0,'deposit',0,'deposit_percent',dep) where id=sid returning * into s;
  end if;
  select * into a from jovabook_private.customer_payment_accounts where salon_id=sid;
  return jsonb_build_object('ok',true,'salon_id',sid,'account_id',case when i.summary->>'connection_method'='provider_login' then i.summary->>'account_id' end,
   'ready',coalesce(cfg.payments_enabled and a.verified and a.account_id=i.summary->>'account_id' and i.summary->>'connection_method'='provider_login',false),'payments',s.payments);
 end if;
 if p_action='reconcile' then
  return coalesce((select jsonb_agg(to_jsonb(x)) from (select id,account_id,provider_id,created_at,expires_at from jovabook_private.deposit_checkouts where stage in('creating','open','needs_attention') order by created_at limit 10) x),'[]');
 end if;
 if p_action='quote' then
  select pa.* into a from jovabook_private.customer_payment_accounts pa join public.salons biz on biz.id=pa.salon_id
   join jovabook_private.business_integrations conn on conn.salon_id=biz.id and conn.provider='stripe'
   where biz.slug=lower(trim(p_payload->>'slug')) and pa.verified and cfg.payments_enabled
    and jovabook_private.billing_open(biz.id) and conn.summary->>'connection_method'='provider_login' and conn.summary->>'account_id'=pa.account_id;
  if a.account_id is null then raise exception 'Connect a payment-ready Stripe account first.';end if;
  return jsonb_build_object('account_id',a.account_id);
 end if;
 if p_action='begin' then
  if not cfg.payments_enabled then raise exception 'Online deposits are unavailable.';end if;
  select * into s from public.salons where slug=lower(trim(p_payload->>'slug'));
  if s.id is null then raise exception 'This business is unavailable.';end if;
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||s.id::text));
  select * into s from public.salons where id=s.id for share;
  if not jovabook_private.billing_open(s.id) or s.status not in('active','trialing') then raise exception 'This business is unavailable.';end if;
  fingerprint:=encode(sha256(convert_to((p_payload-array['request_id','verifier_hash','network_hash'])::text,'UTF8')),'hex');
  select * into h from jovabook_private.deposit_checkouts where salon_id=s.id and request_id=(p_payload->>'request_id')::uuid;
  if h.id is not null then
   if h.verifier_hash is distinct from p_payload->>'verifier_hash' or h.request_hash<>fingerprint then raise exception 'This checkout belongs to a different request.';end if;
   return to_jsonb(h);
  end if;
  if coalesce(p_payload->>'verifier_hash','') !~ '^[a-f0-9]{64}$' or coalesce(p_payload->>'network_hash','') !~ '^[a-f0-9]{64}$' then raise exception 'Invalid checkout request.';end if;
  if (select count(*) from jovabook_private.deposit_checkouts where created_at>now()-interval '1 hour' and (salon_id=s.id or network_hash=p_payload->>'network_hash'))>=30
   or (select count(*) from jovabook_private.deposit_checkouts where salon_id=s.id and lower(email)=lower(trim(p_payload->>'email')) and created_at>now()-interval '1 hour')>=3 then raise exception 'Too many checkout attempts. Try again later.';end if;
  if length(trim(coalesce(p_payload->>'name',''))) not between 1 and 80 or length(coalesce(p_payload->>'email',''))>254 or coalesce(p_payload->>'email','') !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$' or length(coalesce(p_payload->>'phone',''))>40 or length(coalesce(p_payload->>'notes',''))>500 then raise exception 'Add your name and a valid email.';end if;
  if coalesce(p_payload->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or coalesce(p_payload->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Choose a date and time.';end if;
  chosen:=(p_payload->>'date')::date;bounds:=jovabook_private.online_booking_window(s.id);
  if bounds is null or chosen<(bounds->>'today')::date or chosen>(bounds->>'max_date')::date then raise exception 'Choose a date within 75 days.';end if;
  select * into svc from public.services where salon_id=s.id and id=p_payload->>'service_id' for share;
  select * into a from jovabook_private.customer_payment_accounts where salon_id=s.id and verified;
  select * into i from jovabook_private.business_integrations where salon_id=s.id and provider='stripe';
  if svc.id is null or a.account_id is null or i.summary->>'account_id' is distinct from a.account_id or i.summary->>'connection_method' is distinct from 'provider_login' or not coalesce((s.payments->>'enabled')::boolean,false) then raise exception 'Online deposits are unavailable.';end if;
  dep:=jovabook_private.online_deposit_pence(s.id,svc.price);
  if dep is null or dep<30 or dep>1000000 then raise exception 'This service does not need an online deposit. Return to the booking page.';end if;
  perform pg_advisory_xact_lock(hashtext(s.id::text||chosen::text));
  for st in select id from public.staff where salon_id=s.id and active and id=any(svc.staff_ids) and (coalesce(p_payload->>'staff_id','any')='any' or id=p_payload->>'staff_id') order by created_at,id loop
   if public.slot_free(s.id,st.id,chosen,p_payload->>'time',svc.duration) then picked:=st.id;exit;end if;
  end loop;
  if picked is null then raise exception 'That time is no longer available. Choose another slot.';end if;
  insert into jovabook_private.deposit_checkouts(salon_id,request_id,verifier_hash,request_hash,network_hash,account_id,booking_id,service_id,service_name,price,duration,staff_id,date,time,name,email,phone,notes,amount)
  values(s.id,(p_payload->>'request_id')::uuid,p_payload->>'verifier_hash',fingerprint,p_payload->>'network_hash',a.account_id,'bk_'||replace(gen_random_uuid()::text,'-',''),svc.id,svc.name,svc.price,svc.duration,picked,chosen,p_payload->>'time',trim(p_payload->>'name'),lower(trim(p_payload->>'email')),coalesce(p_payload->>'phone',''),coalesce(p_payload->>'notes',''),dep::int) returning * into h;
  return to_jsonb(h);
 end if;
 select * into h from jovabook_private.deposit_checkouts where id=(p_payload->>'id')::uuid;
 if h.id is null then raise exception 'Checkout not found.';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||h.salon_id::text));
 perform pg_advisory_xact_lock(hashtext(h.salon_id::text||h.date::text));
 select * into h from jovabook_private.deposit_checkouts where id=h.id for update;
 if p_action='status' then
  if h.verifier_hash is distinct from p_payload->>'verifier_hash' then raise exception 'Checkout access denied.' using errcode='42501';end if;
  return to_jsonb(h);
 elsif p_action='context' then return to_jsonb(h);
 elsif p_action='expired_without_session' then
  if h.stage='creating' and h.provider_id is null and h.expires_at<now()-interval '5 minutes' then
   update jovabook_private.deposit_checkouts set stage='expired',finished_at=now() where id=h.id;
  end if;
  return jsonb_build_object('ok',true);
 elsif p_action='attach' then
  if p_payload->>'account_id' is distinct from h.account_id or coalesce(p_payload->>'provider_id','') !~ '^cs_[A-Za-z0-9_]+$' or h.provider_id is not null and h.provider_id<>p_payload->>'provider_id' then raise exception 'Checkout mismatch.';end if;
  if h.stage='creating' then update jovabook_private.deposit_checkouts set provider_id=p_payload->>'provider_id',checkout_url=p_payload->>'url',stage='open' where id=h.id returning * into h;end if;
  return to_jsonb(h);
 elsif p_action in('expired','paid') then
  if h.account_id is distinct from p_payload->>'account_id' or h.provider_id is null or h.provider_id is distinct from p_payload->>'provider_id' then raise exception 'Payment account mismatch.';end if;
  if h.stage='paid' then select * into rec from public.bookings where salon_id=h.salon_id and id=h.booking_id;return jsonb_build_object('ok',true,'booking',public.booking_json(rec),'refund_requested',rec.status='cancelled');end if;
  if p_action='expired' then update jovabook_private.deposit_checkouts set stage='expired',finished_at=now() where id=h.id;return jsonb_build_object('ok',true);end if;
  if h.stage='expired' or coalesce(p_payload->>'payment_intent','') !~ '^pi_[A-Za-z0-9]+$' or (p_payload->>'amount')::int is distinct from h.amount or p_payload->>'currency' is distinct from h.currency then raise exception 'Payment proof mismatch.';end if;
  -- Release only this hold inside the same locked transaction. All other holds
  -- and confirmed bookings still participate in the canonical availability check.
  update jovabook_private.deposit_checkouts set stage='paid',payment_intent=p_payload->>'payment_intent',finished_at=now() where id=h.id;
  valid_slot:=jovabook_private.billing_open(h.salon_id) and public.slot_free(h.salon_id,h.staff_id,h.date,h.time,h.duration)
   and exists(select 1 from public.services current_service where current_service.salon_id=h.salon_id and current_service.id=h.service_id and h.staff_id=any(current_service.staff_ids));
  outcome:=case when coalesce(valid_slot,false) then 'confirmed' else 'cancelled' end;
  select id into cust from public.customers where salon_id=h.salon_id and lower(email)=h.email limit 1;
  if cust is null then cust:='c_'||substr(gen_random_uuid()::text,1,8);insert into public.customers(salon_id,id,name,email,phone) values(h.salon_id,cust,h.name,h.email,h.phone);end if;
  insert into public.bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,customer_id,name,email,phone,notes,source,status,deposit)
  values(h.salon_id,h.booking_id,h.service_id,h.service_name,h.price,h.duration,h.date,h.time,h.staff_id,cust,h.name,h.email,h.phone,h.notes,'Online',outcome,h.amount/100.0) returning * into rec;
  if outcome='cancelled' then insert into jovabook_private.customer_cancellations(salon_id,booking_id) values(h.salon_id,h.booking_id) on conflict do nothing;end if;
  insert into jovabook_private.customer_deposits(salon_id,booking_id,payment_intent,account_id,amount,currency,captured_at)
   values(h.salon_id,h.booking_id,p_payload->>'payment_intent',h.account_id,h.amount,h.currency,to_timestamp((p_payload->>'captured_at')::bigint));
  perform public.add_mail(h.salon_id,outcome,public.booking_json(rec));
  return jsonb_build_object('ok',true,'booking',public.booking_json(rec),'refund_requested',outcome='cancelled');
 end if;
 raise exception 'Unknown deposit action.';
end$$;
revoke all on function public.booking_deposit_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.booking_deposit_worker(text,text,jsonb) to anon;

alter table jovabook_private.customer_config add column scheduler_enabled boolean not null default false;
alter table jovabook_private.customer_config add column scheduler_hash text;
notify pgrst,'reload schema';
commit;
