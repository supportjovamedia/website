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
  if me.trial_used then reasons := reasons || 'already_used'; end if;
  if exists (select 1 from public.salons o where o.id <> me.id and o.trial_used and me.phone_norm is not null and o.phone_norm = me.phone_norm) then reasons := reasons || 'same_phone'; end if;
  if exists (select 1 from public.salons o where o.id <> me.id and o.trial_used and me.address_norm is not null and o.address_norm = me.address_norm) then reasons := reasons || 'same_address'; end if;
  if exists (select 1 from public.salons o where o.id <> me.id and o.trial_used and me.device_id is not null and o.device_id = me.device_id) then reasons := reasons || 'same_device'; end if;
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
