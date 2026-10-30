-- Diary data: every row belongs to one salon (salon_id) and a salon can only reach its own rows.
alter table public.salons
  add column payments jsonb not null default '{}'::jsonb,
  add column usage jsonb not null default '{}'::jsonb;

create table public.salon_items (
  salon_id uuid not null references public.salons(id) on delete cascade,
  kind text not null check (kind in ('category','service','staff','customer','booking','email','sms','txn')),
  id text not null check (length(id) between 1 and 64),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (salon_id, kind, id)
);
create index salon_items_booking_date_idx on public.salon_items (salon_id, (data->>'date')) where kind = 'booking';
create index salon_items_customer_email_idx on public.salon_items (salon_id, lower(data->>'email')) where kind = 'customer';

create function public.touch_item() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger salon_items_touch before update on public.salon_items for each row execute function public.touch_item();

create function public.my_salon_id() returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.salons where owner_id = auth.uid()
$$;

alter table public.salon_items enable row level security;
create policy "owner reads own items" on public.salon_items for select to authenticated using (salon_id = public.my_salon_id());
create policy "owner adds own items" on public.salon_items for insert to authenticated with check (salon_id = public.my_salon_id());
create policy "owner edits own items" on public.salon_items for update to authenticated using (salon_id = public.my_salon_id()) with check (salon_id = public.my_salon_id());
create policy "owner deletes own items" on public.salon_items for delete to authenticated using (salon_id = public.my_salon_id());

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

-- ---------- public booking (customers are not signed in) ----------
create function public.clock_mins(p text) returns int language sql immutable set search_path = '' as $$
  select split_part(p,':',1)::int * 60 + split_part(p,':',2)::int
$$;

-- Is this person free at this time? Same rules the owner's diary uses.
create function public.slot_free(p_salon uuid, p_staff text, p_date date, p_time text, p_duration int, p_ignore text default null)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare cfg jsonb; st jsonb; h jsonb; t int; hs int; he int; buf int; notice int; now_l timestamp := now() at time zone 'Europe/London';
begin
  select settings into cfg from public.salons where id = p_salon;
  select data into st from public.salon_items where salon_id = p_salon and kind = 'staff' and id = p_staff;
  if st is null or (st->>'active') is distinct from 'true' then return false; end if;
  h := case when jsonb_typeof(st->'hours') = 'object' then st->'hours' else cfg->'hours' end;
  if h is null or jsonb_typeof(h) <> 'object' then return false; end if;
  buf := coalesce((cfg->>'buffer')::int, 0); notice := coalesce((cfg->>'notice')::int, 0);
  t := public.clock_mins(p_time); hs := public.clock_mins(h->>'start'); he := public.clock_mins(h->>'end');
  if not ((h->'days') @> to_jsonb(extract(dow from p_date)::int)) then return false; end if;
  if p_date < now_l::date then return false; end if;
  if t < hs or t + p_duration + buf > he or (t - hs) % 30 <> 0 then return false; end if;
  if p_date = now_l::date and t <= extract(hour from now_l) * 60 + extract(minute from now_l) + notice then return false; end if;
  return not exists (
    select 1 from public.salon_items b
    where b.salon_id = p_salon and b.kind = 'booking' and b.data->>'staffId' = p_staff
      and b.data->>'date' = p_date::text and b.data->>'status' <> 'cancelled'
      and (p_ignore is null or b.id <> p_ignore)
      and t < public.clock_mins(b.data->>'time') + (b.data->>'duration')::int + buf
      and t + p_duration + buf > public.clock_mins(b.data->>'time'));
end $$;

create function public.add_mail(p_salon uuid, p_kind text, p_booking jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare s public.salons; title text; eid text := 'email_' || substr(gen_random_uuid()::text, 1, 8);
begin
  select * into s from public.salons where id = p_salon;
  title := case p_kind when 'confirmed' then 'your booking is confirmed' when 'cancelled' then 'your booking has been cancelled' else 'your booking has changed' end;
  insert into public.salon_items(salon_id, kind, id, data) values (p_salon, 'email', eid, jsonb_build_object(
    'id', eid, 'kind', p_kind, 'subject', s.name || ': ' || title, 'to', p_booking->>'email',
    'from', 'Jova Bookings <bookings@jovamedia.com>', 'reply', s.email, 'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'booking', p_booking, 'salonName', s.name, 'address', s.address, 'status', 'Preview saved'));
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
    'categories', coalesce((select jsonb_agg(data order by created_at) from public.salon_items where salon_id = s.id and kind = 'category'), '[]'),
    'services', coalesce((select jsonb_agg(data order by created_at) from public.salon_items where salon_id = s.id and kind = 'service'), '[]'),
    'staff', coalesce((select jsonb_agg(data order by created_at) from public.salon_items where salon_id = s.id and kind = 'staff' and data->>'active' = 'true'), '[]'),
    'busy', coalesce((select jsonb_agg(jsonb_build_object('id', 'busy_' || substr(md5(i.id), 1, 8), 'date', data->>'date', 'time', data->>'time', 'duration', (data->>'duration')::int, 'staffId', data->>'staffId', 'status', data->>'status'))
              from public.salon_items i where salon_id = s.id and kind = 'booking' and data->>'status' <> 'cancelled' and data->>'date' >= to_char(now() at time zone 'Europe/London' - interval '1 day', 'YYYY-MM-DD')), '[]'));
end $$;

create function public.create_booking(p_slug text, p_service text, p_staff text, p_date text, p_time text, p_name text, p_email text, p_phone text, p_notes text, p_method text default 'Card')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.salons; svc jsonb; st record; d date; dur int; price numeric; cust text; bid text; dep numeric := 0; b jsonb; picked text; fee numeric; pid text := 'pay_' || substr(gen_random_uuid()::text, 1, 8);
begin
  select * into s from public.salons where slug = lower(trim(p_slug)) and status in ('trialing','active');
  if s.id is null then return jsonb_build_object('ok', false, 'message', 'This salon is not taking bookings right now.'); end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 80 or coalesce(p_email,'') !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or length(coalesce(p_email,'')) > 254 then
    return jsonb_build_object('ok', false, 'message', 'Add your name and a valid email before confirming.'); end if;
  if coalesce(p_date,'') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_time,'') !~ '^\d{2}:\d{2}$' then return jsonb_build_object('ok', false, 'message', 'Choose a date and time.'); end if;
  d := p_date::date;
  select data into svc from public.salon_items where salon_id = s.id and kind = 'service' and id = p_service;
  if svc is null then return jsonb_build_object('ok', false, 'message', 'Choose a valid service.'); end if;
  dur := (svc->>'duration')::int; price := (svc->>'price')::numeric;
  if (select count(*) from public.salon_items where salon_id = s.id and kind = 'booking' and lower(data->>'email') = lower(p_email) and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.salon_items where salon_id = s.id and kind = 'booking' and data->>'source' = 'Online' and created_at > now() - interval '1 hour') >= 80 then
    return jsonb_build_object('ok', false, 'message', 'Too many bookings just now. Please try again later or call the salon.'); end if;
  perform pg_advisory_xact_lock(hashtext(s.id::text || d::text));
  for st in select id from public.salon_items where salon_id = s.id and kind = 'staff' and data->>'active' = 'true'
              and (svc->'staffIds') @> to_jsonb(id) and (coalesce(p_staff,'any') = 'any' or id = p_staff) order by created_at loop
    if public.slot_free(s.id, st.id, d, p_time, dur) then picked := st.id; exit; end if;
  end loop;
  if picked is null then return jsonb_build_object('ok', false, 'message', 'That time is no longer available. Please choose another slot.'); end if;
  select id into cust from public.salon_items where salon_id = s.id and kind = 'customer' and lower(data->>'email') = lower(trim(p_email)) limit 1;
  if cust is null then
    cust := 'c_' || substr(gen_random_uuid()::text, 1, 8);
    insert into public.salon_items(salon_id, kind, id, data) values (s.id, 'customer', cust, jsonb_build_object('id', cust, 'name', trim(p_name), 'email', trim(p_email), 'phone', coalesce(p_phone,''), 'notes', ''));
  end if;
  if coalesce((s.payments->>'enabled')::boolean, false) then dep := least(coalesce((s.payments->>'deposit')::numeric, 0), price); end if;
  bid := 'bk_' || replace(gen_random_uuid()::text, '-', '');
  b := jsonb_build_object('id', bid, 'serviceId', p_service, 'serviceName', svc->>'name', 'price', price, 'duration', dur, 'date', p_date, 'time', p_time, 'staffId', picked,
        'notes', left(coalesce(p_notes,''), 500), 'customerId', cust, 'name', trim(p_name), 'email', trim(p_email), 'phone', left(coalesce(p_phone,''), 40), 'source', 'Online', 'status', 'confirmed', 'deposit', dep);
  insert into public.salon_items(salon_id, kind, id, data) values (s.id, 'booking', bid, b);
  if dep > 0 then
    fee := round((dep * .015 + .2)::numeric, 2);
    insert into public.salon_items(salon_id, kind, id, data) values (s.id, 'txn', pid, jsonb_build_object('id', pid, 'bookingId', bid, 'name', trim(p_name), 'amount', dep, 'fee', fee, 'net', round(dep - fee, 2), 'method', coalesce(p_method, 'Card')));
  end if;
  perform public.add_mail(s.id, 'confirmed', b);
  return jsonb_build_object('ok', true, 'booking', b);
end $$;

-- The booking id is a long random value in the customer's link, so it works as their key to manage it.
create function public.get_booking(p_slug text, p_id text) returns jsonb language sql stable security definer set search_path = '' as $$
  select i.data from public.salon_items i join public.salons s on s.id = i.salon_id
  where s.slug = lower(trim(p_slug)) and i.kind = 'booking' and i.id = p_id and length(p_id) >= 30
$$;

create function public.cancel_booking(p_slug text, p_id text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.salons; b jsonb;
begin
  select * into s from public.salons where slug = lower(trim(p_slug));
  select data into b from public.salon_items where salon_id = s.id and kind = 'booking' and id = p_id and length(p_id) >= 30;
  if b is null then return jsonb_build_object('ok', false, 'message', 'We couldn’t find that appointment.'); end if;
  if b->>'status' <> 'confirmed' then return jsonb_build_object('ok', false, 'message', 'This appointment is already cancelled.'); end if;
  b := jsonb_set(b, '{status}', '"cancelled"');
  update public.salon_items set data = b where salon_id = s.id and kind = 'booking' and id = p_id;
  perform public.add_mail(s.id, 'cancelled', b);
  return jsonb_build_object('ok', true, 'booking', b);
end $$;

create function public.reschedule_booking(p_slug text, p_id text, p_date text, p_time text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.salons; b jsonb; d date;
begin
  select * into s from public.salons where slug = lower(trim(p_slug));
  select data into b from public.salon_items where salon_id = s.id and kind = 'booking' and id = p_id and length(p_id) >= 30;
  if b is null then return jsonb_build_object('ok', false, 'message', 'We couldn’t find that appointment.'); end if;
  if b->>'status' <> 'confirmed' then return jsonb_build_object('ok', false, 'message', 'This appointment is cancelled.'); end if;
  if coalesce(p_date,'') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_time,'') !~ '^\d{2}:\d{2}$' then return jsonb_build_object('ok', false, 'message', 'Choose a free time.'); end if;
  d := p_date::date;
  perform pg_advisory_xact_lock(hashtext(s.id::text || d::text));
  if not public.slot_free(s.id, b->>'staffId', d, p_time, (b->>'duration')::int, p_id) then
    return jsonb_build_object('ok', false, 'message', 'Choose a free time.'); end if;
  b := jsonb_set(jsonb_set(b, '{date}', to_jsonb(p_date)), '{time}', to_jsonb(p_time));
  update public.salon_items set data = b where salon_id = s.id and kind = 'booking' and id = p_id;
  perform public.add_mail(s.id, 'rescheduled', b);
  return jsonb_build_object('ok', true, 'booking', b);
end $$;

-- Who may call what.
revoke all on function public.touch_item(), public.my_salon_id(), public.save_salon(text,text,text,text,jsonb,jsonb,jsonb), public.cancel_subscription(), public.resubscribe(),
  public.clock_mins(text), public.slot_free(uuid,text,date,text,int,text), public.add_mail(uuid,text,jsonb), public.public_salon(text),
  public.create_booking(text,text,text,text,text,text,text,text,text,text), public.get_booking(text,text), public.cancel_booking(text,text), public.reschedule_booking(text,text,text,text) from public, anon, authenticated;
grant execute on function public.my_salon_id() to authenticated;
grant execute on function public.save_salon(text,text,text,text,jsonb,jsonb,jsonb), public.cancel_subscription(), public.resubscribe() to authenticated;
grant execute on function public.public_salon(text), public.create_booking(text,text,text,text,text,text,text,text,text,text), public.get_booking(text,text), public.cancel_booking(text,text), public.reschedule_booking(text,text,text,text) to anon, authenticated;
