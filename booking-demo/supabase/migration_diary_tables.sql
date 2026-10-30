-- Replaces the single salon_items table with one real table per kind of data.
-- Every table carries salon_id, and a salon can only reach rows with its own salon_id.
drop function if exists public.create_booking(text,text,text,text,text,text,text,text,text,text);
drop function if exists public.get_booking(text,text);
drop function if exists public.cancel_booking(text,text);
drop function if exists public.reschedule_booking(text,text,text,text);
drop function if exists public.public_salon(text);
drop function if exists public.add_mail(uuid,text,jsonb);
drop function if exists public.slot_free(uuid,text,date,text,int,text);
drop table public.salon_items;

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
