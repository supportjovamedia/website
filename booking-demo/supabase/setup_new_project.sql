-- JovaBook: accounts, booking addresses and free-trial checks.
-- Salons are created by the `signup` edge function (service role). The browser can
-- only read its own salon and call the functions below.

create table public.salons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 30),
  owner_name text not null,
  email text not null,
  email_norm text not null unique,
  address text,
  address_norm text,
  phone text,
  phone_norm text,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'setup' check (status in ('setup','trialing','active','cancelled')),
  trial_used boolean not null default false,
  trial_ends_at timestamptz,
  device_id text,
  signup_ip text,
  flags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index salons_address_norm_idx on public.salons(address_norm) where address_norm is not null;
create index salons_phone_norm_idx on public.salons(phone_norm) where phone_norm is not null;
create index salons_device_idx on public.salons(device_id);
create index salons_ip_idx on public.salons(signup_ip, created_at);

alter table public.salons enable row level security;
create policy "owner reads own salon" on public.salons for select to authenticated using (owner_id = auth.uid());
-- No insert/update/delete policies: changes go through the functions below.

-- Two addresses that reach the same inbox count as one: Gmail ignores dots and +tags, others ignore +tags.
create function public.norm_email(p text) returns text language sql immutable set search_path = '' as $$
  select case
    when split_part(lower(trim(p)), '@', 2) in ('gmail.com','googlemail.com')
      then replace(split_part(split_part(lower(trim(p)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(lower(trim(p)), '@', 1), '+', 1) || '@' || split_part(lower(trim(p)), '@', 2)
  end
$$;
create function public.norm_text(p text) returns text language sql immutable set search_path = '' as $$
  select nullif(regexp_replace(lower(coalesce(p,'')), '[^a-z0-9]', '', 'g'), '')
$$;
create function public.norm_phone(p text) returns text language sql immutable set search_path = '' as $$
  select nullif(regexp_replace(regexp_replace(coalesce(p,''), '\D', '', 'g'), '^44', '0'), '')
$$;

create function public.salons_set_norms() returns trigger language plpgsql set search_path = '' as $$
begin
  new.email_norm := public.norm_email(new.email);
  new.address_norm := public.norm_text(new.address);
  new.phone_norm := public.norm_phone(new.phone);
  return new;
end $$;
create trigger salons_norms before insert or update of email, address, phone on public.salons
  for each row execute function public.salons_set_norms();

-- "Is yourname.jovamedia.com free?"
create function public.slug_status(p_slug text) returns text language plpgsql stable security definer set search_path = '' as $$
declare s text := lower(trim(coalesce(p_slug,'')));
begin
  if length(s) < 3 or length(s) > 30 or s !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then return 'format'; end if;
  if s = any (array['www','app','admin','support','salon','api','bookings','book','mail','help','billing','status','blog','login','signup','dashboard','jova','jova-demo','jovamedia','jovabook','staging','test','demo']) then return 'reserved'; end if;
  if exists (select 1 from public.salons where slug = s) then return 'taken'; end if;
  return 'ok';
end $$;

-- "Does this email already have an account?"
create function public.email_available(p_email text) returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.salons where email_norm = public.norm_email(p_email))
$$;

-- Owner saves step 2 (address, phone, hours, colour).
create function public.save_setup(p_address text, p_phone text, p_settings jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if length(trim(coalesce(p_address,''))) < 3 or length(public.norm_phone(p_phone)) < 7 then raise exception 'address and phone required'; end if;
  update public.salons set address = trim(p_address), phone = trim(p_phone), settings = coalesce(p_settings,'{}'::jsonb)
   where owner_id = auth.uid() and status = 'setup';
end $$;

-- One free trial per business: same phone, address or device as an earlier trial means no trial.
create function public.trial_check() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me public.salons; reasons text[] := '{}';
begin
  select * into me from public.salons where owner_id = auth.uid();
  if me.id is null then raise exception 'not signed in'; end if;
  if me.trial_used then reasons := array_append(reasons, 'already_used'); end if;
  if exists (select 1 from public.salons o where o.id <> me.id and o.trial_used and me.phone_norm is not null and o.phone_norm = me.phone_norm) then reasons := array_append(reasons, 'same_phone'); end if;
  if exists (select 1 from public.salons o where o.id <> me.id and o.trial_used and me.address_norm is not null and o.address_norm = me.address_norm) then reasons := array_append(reasons, 'same_address'); end if;
  if exists (select 1 from public.salons o where o.id <> me.id and o.trial_used and me.device_id is not null and o.device_id = me.device_id) then reasons := array_append(reasons, 'same_device'); end if;
  return jsonb_build_object('eligible', coalesce(array_length(reasons,1),0) = 0, 'reasons', to_jsonb(reasons));
end $$;

-- Owner confirms step 3. Demo: no card is taken. Production: Stripe confirms the card first.
create function public.start_trial() returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.salons; chk jsonb; ends timestamptz;
begin
  select * into me from public.salons where owner_id = auth.uid() for update;
  if me.id is null then raise exception 'not signed in'; end if;
  if me.status <> 'setup' then return jsonb_build_object('eligible', me.status = 'trialing', 'status', me.status, 'trial_ends_at', me.trial_ends_at); end if;
  chk := public.trial_check();
  if (chk->>'eligible')::boolean then
    ends := now() + interval '3 days';
    update public.salons set status = 'trialing', trial_used = true, trial_ends_at = ends where id = me.id;
    return jsonb_build_object('eligible', true, 'status', 'trialing', 'trial_ends_at', ends);
  end if;
  update public.salons set status = 'active', trial_used = true,
    flags = (select array_agg(distinct f) from unnest(flags || array(select 'repeat_trial:' || r from jsonb_array_elements_text(chk->'reasons') r)) f)
   where id = me.id;
  return jsonb_build_object('eligible', false, 'status', 'active', 'reasons', chk->'reasons');
end $$;

revoke all on function public.slug_status(text), public.email_available(text), public.save_setup(text,text,jsonb), public.trial_check(), public.start_trial() from public;
grant execute on function public.slug_status(text), public.email_available(text) to anon, authenticated;
grant execute on function public.save_setup(text,text,jsonb), public.trial_check(), public.start_trial() to authenticated;

-- ---- diary ----
alter table public.salons
  add column payments jsonb not null default '{}'::jsonb,
  add column usage jsonb not null default '{}'::jsonb;
create function public.my_salon_id() returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.salons where owner_id = auth.uid()
$$;

-- Owner saves salon-level details.
create function public.save_salon(p_name text, p_email text, p_phone text, p_address text, p_settings jsonb, p_payments jsonb, p_usage jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 60 then raise exception 'bad name'; end if;
  update public.salons set
    name = trim(p_name), email = trim(p_email), phone = trim(p_phone), address = trim(p_address),
    settings = settings || coalesce(p_settings,'{}'::jsonb),
    payments = coalesce(p_payments, payments), usage = coalesce(p_usage, usage)
  where owner_id = auth.uid();
end $$;

create function public.cancel_subscription() returns void language sql security definer set search_path = '' as $$
  update public.salons set status = 'cancelled' where owner_id = auth.uid() and status in ('trialing','active')
$$;
-- Demo: no card is charged. Production: only after Stripe confirms the payment.
create function public.resubscribe() returns void language sql security definer set search_path = '' as $$
  update public.salons set status = 'active' where owner_id = auth.uid() and status = 'cancelled'
$$;

create function public.clock_mins(p text) returns int language sql immutable set search_path = '' as $$
  select split_part(p,':',1)::int * 60 + split_part(p,':',2)::int
$$;


-- Replaces the single salon_items table with one real table per kind of data.
-- Every table carries salon_id, and a salon can only reach rows with its own salon_id.

create table public.categories (
  salon_id uuid not null references public.salons(id) on delete cascade,
  id text not null check (length(id) between 1 and 64),
  name text not null check (length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (salon_id, id)
);
create table public.staff (
  salon_id uuid not null references public.salons(id) on delete cascade,
  id text not null check (length(id) between 1 and 64),
  name text not null check (length(trim(name)) between 1 and 80),
  role text not null default '' check (length(role) <= 80),
  active boolean not null default true,
  color text not null default '#235789',
  hours jsonb check (hours is null or jsonb_typeof(hours) = 'object'),
  created_at timestamptz not null default now(),
  primary key (salon_id, id)
);
create table public.services (
  salon_id uuid not null references public.salons(id) on delete cascade,
  id text not null check (length(id) between 1 and 64),
  name text not null check (length(trim(name)) between 1 and 80),
  price numeric(8,2) not null check (price >= 0 and price <= 10000),
  duration int not null check (duration between 5 and 600),
  category_id text not null default '',
  staff_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (salon_id, id)
);
create table public.customers (
  salon_id uuid not null references public.salons(id) on delete cascade,
  id text not null check (length(id) between 1 and 64),
  name text not null check (length(trim(name)) between 1 and 80),
  email text not null check (length(email) <= 254),
  phone text not null default '' check (length(phone) <= 40),
  notes text not null default '' check (length(notes) <= 1000),
  created_at timestamptz not null default now(),
  primary key (salon_id, id)
);
create index customers_email_idx on public.customers (salon_id, lower(email));
create table public.bookings (
  salon_id uuid not null references public.salons(id) on delete cascade,
  id text not null check (length(id) between 1 and 64),
  service_id text not null,
  service_name text not null,
  price numeric(8,2) not null check (price >= 0),
  duration int not null check (duration between 5 and 600),
  date date not null,
  time text not null check (time ~ '^\d{2}:\d{2}$'),
  staff_id text not null,
  customer_id text not null default '',
  name text not null check (length(trim(name)) between 1 and 80),
  email text not null default '' check (length(email) <= 254),
  phone text not null default '' check (length(phone) <= 40),
  notes text not null default '' check (length(notes) <= 1000),
  source text not null default 'Online' check (source in ('Online','Manual')),
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','completed','no-show')),
  deposit numeric(8,2) not null default 0 check (deposit >= 0),
  created_at timestamptz not null default now(),
  primary key (salon_id, id)
);
create index bookings_day_idx on public.bookings (salon_id, date);
create index bookings_email_idx on public.bookings (salon_id, lower(email), created_at);
create table public.email_log (
  salon_id uuid not null references public.salons(id) on delete cascade,
  id text not null check (length(id) between 1 and 64),
  kind text not null,
  subject text not null default '',
  to_email text not null default '',
  from_email text not null default '',
  reply_to text not null default '',
  sent_at timestamptz not null default now(),
  status text not null default 'Preview saved',
  salon_name text not null default '',
  address text not null default '',
  booking jsonb check (booking is null or jsonb_typeof(booking) = 'object'),
  primary key (salon_id, id)
);
create table public.payments (
  salon_id uuid not null references public.salons(id) on delete cascade,
  id text not null check (length(id) between 1 and 64),
  booking_id text not null default '',
  name text not null default '',
  amount numeric(8,2) not null check (amount >= 0),
  fee numeric(8,2) not null default 0,
  net numeric(8,2) not null default 0,
  method text not null default 'Card',
  created_at timestamptz not null default now(),
  primary key (salon_id, id)
);

do $$ declare t text; begin
  foreach t in array array['categories','staff','services','customers','bookings','email_log','payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own salon only" on public.%I for all to authenticated using (salon_id = public.my_salon_id()) with check (salon_id = public.my_salon_id())', t);
  end loop;
end $$;

-- Same rules the owner's diary uses to decide if a time is free.
create function public.slot_free(p_salon uuid, p_staff text, p_date date, p_time text, p_duration int, p_ignore text default null)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare cfg jsonb; st record; h jsonb; t int; hs int; he int; buf int; notice int; now_l timestamp := now() at time zone 'Europe/London';
begin
  select settings into cfg from public.salons where id = p_salon;
  select * into st from public.staff where salon_id = p_salon and id = p_staff;
  if st.id is null or not st.active then return false; end if;
  h := case when st.hours is not null and jsonb_typeof(st.hours) = 'object' then st.hours else cfg->'hours' end;
  if h is null or jsonb_typeof(h) <> 'object' then return false; end if;
  buf := coalesce((cfg->>'buffer')::int, 0); notice := coalesce((cfg->>'notice')::int, 0);
  t := public.clock_mins(p_time); hs := public.clock_mins(h->>'start'); he := public.clock_mins(h->>'end');
  if not ((h->'days') @> to_jsonb(extract(dow from p_date)::int)) then return false; end if;
  if p_date < now_l::date then return false; end if;
  if t < hs or t + p_duration + buf > he or (t - hs) % 30 <> 0 then return false; end if;
  if p_date = now_l::date and t <= extract(hour from now_l) * 60 + extract(minute from now_l) + notice then return false; end if;
  return not exists (
    select 1 from public.bookings b
    where b.salon_id = p_salon and b.staff_id = p_staff and b.date = p_date and b.status <> 'cancelled'
      and (p_ignore is null or b.id <> p_ignore)
      and t < public.clock_mins(b.time) + b.duration + buf
      and t + p_duration + buf > public.clock_mins(b.time));
end $$;

-- A booking as the app expects it.
create function public.booking_json(b public.bookings) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', b.id, 'serviceId', b.service_id, 'serviceName', b.service_name, 'price', b.price, 'duration', b.duration,
    'date', b.date::text, 'time', b.time, 'staffId', b.staff_id, 'notes', b.notes, 'customerId', b.customer_id, 'name', b.name, 'email', b.email,
    'phone', b.phone, 'source', b.source, 'status', b.status, 'deposit', b.deposit)
$$;

create function public.add_mail(p_salon uuid, p_kind text, p_booking jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare s public.salons; title text;
begin
  select * into s from public.salons where id = p_salon;
  title := case p_kind when 'confirmed' then 'your booking is confirmed' when 'cancelled' then 'your booking has been cancelled' else 'your booking has changed' end;
  insert into public.email_log(salon_id, id, kind, subject, to_email, from_email, reply_to, salon_name, address, booking)
  values (p_salon, 'email_' || substr(gen_random_uuid()::text, 1, 8), p_kind, s.name || ': ' || title, p_booking->>'email',
          'Jova Bookings <bookings@jovamedia.com>', coalesce(s.email, ''), s.name, coalesce(s.address, ''), p_booking);
end $$;

-- What a customer sees: the salon's public details, services, active staff and which times are taken (no names).
create function public.public_salon(p_slug text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.salons;
begin
  select * into s from public.salons where slug = lower(trim(p_slug)) and status in ('trialing','active');
  if s.id is null then return null; end if;
  return jsonb_build_object(
    'id', s.id, 'name', s.name, 'slug', s.slug, 'email', s.email, 'phone', s.phone, 'address', s.address,
    'settings', s.settings, 'payments', jsonb_build_object('enabled', coalesce((s.payments->>'enabled')::boolean, false), 'deposit', coalesce((s.payments->>'deposit')::numeric, 0)),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by created_at, id) from public.categories where salon_id = s.id), '[]'),
    'services', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'price', price, 'duration', duration, 'categoryId', category_id, 'staffIds', to_jsonb(staff_ids)) order by created_at, id) from public.services where salon_id = s.id), '[]'),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'role', role, 'active', active, 'color', color, 'hours', hours) order by created_at, id) from public.staff where salon_id = s.id and active), '[]'),
    'busy', coalesce((select jsonb_agg(jsonb_build_object('id', 'busy_' || substr(md5(b.id), 1, 8), 'date', b.date::text, 'time', b.time, 'duration', b.duration, 'staffId', b.staff_id, 'status', b.status))
              from public.bookings b where b.salon_id = s.id and b.status <> 'cancelled' and b.date >= (now() at time zone 'Europe/London')::date - 1), '[]'));
end $$;

create function public.create_booking(p_slug text, p_service text, p_staff text, p_date text, p_time text, p_name text, p_email text, p_phone text, p_notes text, p_method text default 'Card')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.salons; svc public.services; st record; d date; cust text; bid text; dep numeric := 0; picked text; fee numeric; rec public.bookings; pid text := 'pay_' || substr(gen_random_uuid()::text, 1, 8);
begin
  select * into s from public.salons where slug = lower(trim(p_slug)) and status in ('trialing','active');
  if s.id is null then return jsonb_build_object('ok', false, 'message', 'This salon is not taking bookings right now.'); end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 80 or coalesce(p_email,'') !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or length(coalesce(p_email,'')) > 254 then
    return jsonb_build_object('ok', false, 'message', 'Add your name and a valid email before confirming.'); end if;
  if coalesce(p_date,'') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_time,'') !~ '^\d{2}:\d{2}$' then return jsonb_build_object('ok', false, 'message', 'Choose a date and time.'); end if;
  d := p_date::date;
  select * into svc from public.services where salon_id = s.id and id = p_service;
  if svc.id is null then return jsonb_build_object('ok', false, 'message', 'Choose a valid service.'); end if;
  if (select count(*) from public.bookings where salon_id = s.id and lower(email) = lower(p_email) and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.bookings where salon_id = s.id and source = 'Online' and created_at > now() - interval '1 hour') >= 80 then
    return jsonb_build_object('ok', false, 'message', 'Too many bookings just now. Please try again later or call the salon.'); end if;
  perform pg_advisory_xact_lock(hashtext(s.id::text || d::text));
  for st in select id from public.staff where salon_id = s.id and active and id = any(svc.staff_ids) and (coalesce(p_staff,'any') = 'any' or id = p_staff) order by created_at, id loop
    if public.slot_free(s.id, st.id, d, p_time, svc.duration) then picked := st.id; exit; end if;
  end loop;
  if picked is null then return jsonb_build_object('ok', false, 'message', 'That time is no longer available. Please choose another slot.'); end if;
  select id into cust from public.customers where salon_id = s.id and lower(email) = lower(trim(p_email)) limit 1;
  if cust is null then
    cust := 'c_' || substr(gen_random_uuid()::text, 1, 8);
    insert into public.customers(salon_id, id, name, email, phone) values (s.id, cust, trim(p_name), trim(p_email), left(coalesce(p_phone,''), 40));
  end if;
  if coalesce((s.payments->>'enabled')::boolean, false) then dep := least(coalesce((s.payments->>'deposit')::numeric, 0), svc.price); end if;
  bid := 'bk_' || replace(gen_random_uuid()::text, '-', '');
  insert into public.bookings(salon_id, id, service_id, service_name, price, duration, date, time, staff_id, customer_id, name, email, phone, notes, source, status, deposit)
  values (s.id, bid, svc.id, svc.name, svc.price, svc.duration, d, p_time, picked, cust, trim(p_name), trim(p_email), left(coalesce(p_phone,''), 40), left(coalesce(p_notes,''), 500), 'Online', 'confirmed', dep)
  returning * into rec;
  if dep > 0 then
    fee := round((dep * .015 + .2)::numeric, 2);
    insert into public.payments(salon_id, id, booking_id, name, amount, fee, net, method) values (s.id, pid, bid, trim(p_name), dep, fee, round(dep - fee, 2), coalesce(p_method, 'Card'));
  end if;
  perform public.add_mail(s.id, 'confirmed', public.booking_json(rec));
  return jsonb_build_object('ok', true, 'booking', public.booking_json(rec));
end $$;

-- The booking id is a long random value in the customer's link, so it works as their key to manage it.
create function public.get_booking(p_slug text, p_id text) returns jsonb language sql stable security definer set search_path = '' as $$
  select public.booking_json(b) from public.bookings b join public.salons s on s.id = b.salon_id
  where s.slug = lower(trim(p_slug)) and b.id = p_id and length(p_id) >= 30
$$;

create function public.cancel_booking(p_slug text, p_id text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.salons; rec public.bookings;
begin
  select * into s from public.salons where slug = lower(trim(p_slug));
  select * into rec from public.bookings where salon_id = s.id and id = p_id and length(p_id) >= 30;
  if rec.id is null then return jsonb_build_object('ok', false, 'message', 'We couldn’t find that appointment.'); end if;
  if rec.status <> 'confirmed' then return jsonb_build_object('ok', false, 'message', 'This appointment is already cancelled.'); end if;
  update public.bookings set status = 'cancelled' where salon_id = s.id and id = p_id returning * into rec;
  perform public.add_mail(s.id, 'cancelled', public.booking_json(rec));
  return jsonb_build_object('ok', true, 'booking', public.booking_json(rec));
end $$;

create function public.reschedule_booking(p_slug text, p_id text, p_date text, p_time text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.salons; rec public.bookings; d date;
begin
  select * into s from public.salons where slug = lower(trim(p_slug));
  select * into rec from public.bookings where salon_id = s.id and id = p_id and length(p_id) >= 30;
  if rec.id is null then return jsonb_build_object('ok', false, 'message', 'We couldn’t find that appointment.'); end if;
  if rec.status <> 'confirmed' then return jsonb_build_object('ok', false, 'message', 'This appointment is cancelled.'); end if;
  if coalesce(p_date,'') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_time,'') !~ '^\d{2}:\d{2}$' then return jsonb_build_object('ok', false, 'message', 'Choose a free time.'); end if;
  d := p_date::date;
  perform pg_advisory_xact_lock(hashtext(s.id::text || d::text));
  if not public.slot_free(s.id, rec.staff_id, d, p_time, rec.duration, p_id) then return jsonb_build_object('ok', false, 'message', 'Choose a free time.'); end if;
  update public.bookings set date = d, time = p_time where salon_id = s.id and id = p_id returning * into rec;
  perform public.add_mail(s.id, 'rescheduled', public.booking_json(rec));
  return jsonb_build_object('ok', true, 'booking', public.booking_json(rec));
end $$;

revoke all on function public.slot_free(uuid,text,date,text,int,text), public.booking_json(public.bookings), public.add_mail(uuid,text,jsonb), public.public_salon(text),
  public.create_booking(text,text,text,text,text,text,text,text,text,text), public.get_booking(text,text), public.cancel_booking(text,text), public.reschedule_booking(text,text,text,text) from public, anon, authenticated;
grant execute on function public.public_salon(text), public.create_booking(text,text,text,text,text,text,text,text,text,text), public.get_booking(text,text), public.cancel_booking(text,text), public.reschedule_booking(text,text,text,text) to anon, authenticated;

revoke all on function public.my_salon_id(), public.save_salon(text,text,text,text,jsonb,jsonb,jsonb), public.cancel_subscription(), public.resubscribe(), public.clock_mins(text) from public, anon;
grant execute on function public.my_salon_id() to authenticated;
grant execute on function public.save_salon(text,text,text,text,jsonb,jsonb,jsonb), public.cancel_subscription(), public.resubscribe() to authenticated;
