-- Deploy the compatible application before running this migration.
-- One salon per database. Existing IDs, customers, appointments and Auth users survive.
-- Other demo rows and the complete original schema metadata are archived privately.
begin;
set local lock_timeout = '10s';
set local search_path = public, extensions, pg_temp;

do $$
declare t text; target bigint; r record;
begin
 if to_regclass('public.salon_settings') is not null then
  raise exception 'Single-salon migration already installed';
 end if;
 if to_regnamespace('booking_archive_20261010') is not null then
  raise exception 'Archive already exists; inspect before retrying';
 end if;
 select id into strict target from public.businesses
  where slug=coalesce(nullif(current_setting('booking.salon_slug',true),''),'north-and-co') and active;
 if not exists(select 1 from public.business_members where business_id=target and role='owner') then
  raise exception 'The retained salon must have an owner';
 end if;
 if exists(select 1 from pg_constraint where contype='f'
  and confrelid in (select oid from pg_class where relnamespace='public'::regnamespace
   and relname=any(array['businesses','business_members','staff','services','service_categories','staff_services','working_hours','time_off','clients','bookings']))
  and conrelid not in (select oid from pg_class where relnamespace='public'::regnamespace
   and relname=any(array['businesses','business_members','staff','services','service_categories','staff_services','working_hours','time_off','clients','bookings']))) then
  raise exception 'Unexpected external foreign key; review dependencies first';
 end if;
 lock table public.businesses,public.business_members,public.staff,public.services,
  public.service_categories,public.staff_services,public.working_hours,public.time_off,
  public.clients,public.bookings in access exclusive mode;

 create schema booking_archive_20261010;
 revoke all on schema booking_archive_20261010 from public,anon,authenticated;
 create table booking_archive_20261010.metadata(kind text,object_name text,definition jsonb);
 insert into booking_archive_20261010.metadata
 select 'constraint',conrelid::regclass::text||'.'||conname,to_jsonb(pg_get_constraintdef(oid))
  from pg_constraint where connamespace='public'::regnamespace;
 insert into booking_archive_20261010.metadata
 select 'index',indexname,to_jsonb(indexdef) from pg_indexes where schemaname='public';
 insert into booking_archive_20261010.metadata
 select 'policy',tablename||'.'||policyname,to_jsonb(p) from pg_policies p where schemaname='public';
 insert into booking_archive_20261010.metadata
 select 'function',p.oid::regprocedure::text,to_jsonb(pg_get_functiondef(p.oid))
  from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f';
 insert into booking_archive_20261010.metadata
 select 'column',table_name||'.'||column_name,to_jsonb(c)
  from information_schema.columns c where table_schema='public';
 foreach t in array array['businesses','business_members','staff','services','service_categories','staff_services','working_hours','time_off','clients','bookings'] loop
  execute format('create table booking_archive_20261010.%I as table public.%I',t,t);
 end loop;
 revoke all on all tables in schema booking_archive_20261010 from public,anon,authenticated;

 -- Remove only the obsolete tenancy dependencies. Rebuild relevant relationships below.
 for r in select tablename,policyname from pg_policies where schemaname='public'
  and tablename=any(array['businesses','business_members','staff','services','service_categories','staff_services','working_hours','time_off','clients','bookings']) loop
  execute format('drop policy %I on public.%I',r.policyname,r.tablename);
 end loop;
 for r in select conrelid::regclass as tbl,conname from pg_constraint
  where contype in ('f','x') and conrelid in (select oid from pg_class where relnamespace='public'::regnamespace
   and relname=any(array['businesses','business_members','staff','services','service_categories','staff_services','working_hours','time_off','clients','bookings'])) loop
  execute format('alter table %s drop constraint %I',r.tbl,r.conname);
 end loop;

 -- Disable availability triggers only inside this transaction while moving demo rows.
 alter table public.bookings disable trigger user;
 alter table public.time_off disable trigger user;
 foreach t in array array['bookings','clients','time_off','working_hours','staff_services','services','service_categories','staff','business_members'] loop
  execute format('delete from public.%I where business_id<>$1',t) using target;
 end loop;
 delete from public.businesses where id<>target;
 alter table public.businesses rename to salon_settings;
 alter table public.business_members rename to admin_users;

 foreach t in array array['bookings','clients','time_off','working_hours','staff_services','services','service_categories','staff','admin_users'] loop
  execute format('alter table public.%I drop column business_id',t);
 end loop;
 alter table public.salon_settings drop column slug,drop column active,
  drop column created_at,drop column accent_color;
 alter table public.salon_settings alter column id drop identity;
 execute format('alter table public.salon_settings alter column id set default %s',target);
 alter table public.service_categories drop column created_at;
 execute format('alter table public.salon_settings add constraint salon_settings_singleton check (id=%s)',target);
 alter table public.admin_users add primary key(user_id);
 alter table public.staff_services add primary key(staff_id,service_id);
 alter index public.business_members_username_unique rename to admin_users_username_unique;
 for r in select conname from pg_constraint where conrelid='public.salon_settings'::regclass and conname like 'businesses_%' loop
  execute format('alter table public.salon_settings rename constraint %I to %I',r.conname,replace(r.conname,'businesses_','salon_settings_'));
 end loop;
 for r in select conname from pg_constraint where conrelid='public.admin_users'::regclass and conname like 'business_members_%' loop
  execute format('alter table public.admin_users rename constraint %I to %I',r.conname,replace(r.conname,'business_members_','admin_users_'));
 end loop;
end $$;

alter table public.admin_users add constraint admin_users_user_fk
 foreign key(user_id) references auth.users(id) on delete cascade;
alter table public.clients add constraint clients_user_fk
 foreign key(user_id) references auth.users(id) on delete set null;
alter table public.services add constraint services_category_fk
 foreign key(category_id) references public.service_categories(id);
alter table public.staff_services add constraint staff_services_staff_fk
 foreign key(staff_id) references public.staff(id),
 add constraint staff_services_service_fk foreign key(service_id) references public.services(id);
alter table public.working_hours add constraint working_hours_staff_fk
 foreign key(staff_id) references public.staff(id);
alter table public.time_off add constraint time_off_staff_fk
 foreign key(staff_id) references public.staff(id);
alter table public.bookings add constraint bookings_client_fk foreign key(client_id) references public.clients(id),
 add constraint bookings_staff_fk foreign key(staff_id) references public.staff(id),
 add constraint bookings_service_fk foreign key(service_id) references public.services(id),
 add constraint bookings_request_unique unique(request_id);
create unique index clients_user_unique on public.clients(user_id) where user_id is not null;
create unique index service_categories_name_unique on public.service_categories(lower(trim(name)));
create index services_category_idx on public.services(category_id);
create index staff_services_service_idx on public.staff_services(service_id);
create index bookings_client_idx on public.bookings(client_id);
create index bookings_service_idx on public.bookings(service_id);
create index working_hours_staff_idx on public.working_hours(staff_id,weekday);
create index time_off_staff_idx on public.time_off(staff_id,starts_at,ends_at);

create extension if not exists btree_gist with schema extensions;
alter table public.working_hours add constraint working_hours_no_overlap
 exclude using gist(staff_id with =,weekday with =,
 tsrange(date '2000-01-01'+opens_at,date '2000-01-01'+closes_at,'[)') with &&);
alter table public.bookings add constraint bookings_staff_no_overlap
 exclude using gist(staff_id with =,tstzrange(starts_at,reserved_until,'[)') with &&)
 where(status<>'cancelled');

create or replace function public.validate_booking() returns trigger
 language plpgsql set search_path=public,pg_temp as $$
declare settings public.salon_settings; service public.services; local_start timestamp; local_end timestamp;
begin
 if tg_op='UPDATE' and new.staff_id=old.staff_id and new.service_id=old.service_id
  and new.starts_at=old.starts_at and not(old.status='cancelled' and new.status<>'cancelled') then
  new.ends_at=old.ends_at;new.buffer_minutes=old.buffer_minutes;
  new.reserved_until=old.reserved_until;new.price_pence=old.price_pence;return new;
 end if;
 perform 1 from public.staff where id=new.staff_id and active for update;
 if not found then raise exception 'Staff member unavailable';end if;
 select * into strict settings from public.salon_settings;
 select * into service from public.services where id=new.service_id and active;
 if not found then raise exception 'Service unavailable';end if;
 if not exists(select 1 from public.staff_services where staff_id=new.staff_id and service_id=new.service_id) then
  raise exception 'This team member does not offer the selected service';
 end if;
 if new.starts_at<now()+make_interval(mins=>settings.minimum_notice_minutes)
  or new.starts_at>now()+make_interval(days=>settings.booking_window_days) then raise exception 'Outside booking window';end if;
 new.ends_at=new.starts_at+make_interval(mins=>service.duration_minutes);
 new.buffer_minutes=service.buffer_minutes;
 new.reserved_until=new.ends_at+make_interval(mins=>service.buffer_minutes);new.price_pence=service.price_pence;
 local_start=new.starts_at at time zone settings.timezone;local_end=new.reserved_until at time zone settings.timezone;
 if local_start::date<>local_end::date or not exists(select 1 from public.working_hours w
  where w.staff_id=new.staff_id and w.weekday=extract(dow from local_start)
  and w.opens_at<=local_start::time and w.closes_at>=local_end::time) then raise exception 'Outside working hours';end if;
 if exists(select 1 from public.time_off t where t.staff_id=new.staff_id
  and tstzrange(t.starts_at,t.ends_at,'[)') && tstzrange(new.starts_at,new.reserved_until,'[)')) then
  raise exception 'Staff member is on time off';end if;
 return new;
end $$;

create or replace function public.validate_time_off() returns trigger
 language plpgsql set search_path=public,pg_temp as $$
begin
 perform 1 from public.staff where id=new.staff_id for update;
 if not found then raise exception 'Staff member unavailable';end if;
 if exists(select 1 from public.bookings b where b.staff_id=new.staff_id and b.status<>'cancelled'
  and tstzrange(b.starts_at,b.reserved_until,'[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then
  raise exception 'Move or cancel appointments before blocking this time';end if;
 return new;
end $$;
alter table public.bookings enable trigger user;
alter table public.time_off enable trigger user;

drop function public.create_booking(bigint,bigint,bigint,timestamptz,text,text,text,uuid,bigint);
create function public.create_booking(p_staff bigint,p_service bigint,p_start timestamptz,
 p_name text,p_email text,p_phone text,p_request uuid,p_client bigint default null) returns public.bookings
 language plpgsql security definer set search_path=public,pg_temp as $$
declare client bigint; result public.bookings;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into result from public.bookings where request_id=p_request;
 if found then return result;end if;
 client=p_client;
 if client is null then
  insert into public.clients(name,email,phone) values(p_name,nullif(p_email,''),nullif(p_phone,'')) returning id into client;
 end if;
 insert into public.bookings(staff_id,service_id,client_id,customer_name,customer_email,customer_phone,
  starts_at,ends_at,reserved_until,price_pence,request_id)
 values(p_staff,p_service,client,p_name,nullif(p_email,''),nullif(p_phone,''),p_start,
  p_start+interval '1 minute',p_start+interval '1 minute',0,p_request) returning * into result;
 return result;
end $$;
revoke all on function public.create_booking(bigint,bigint,timestamptz,text,text,text,uuid,bigint) from public,anon,authenticated;
grant execute on function public.create_booking(bigint,bigint,timestamptz,text,text,text,uuid,bigint) to service_role;
revoke all on function public.validate_booking(),public.validate_time_off() from public,anon,authenticated;

-- A customer account is never an administrator merely because it can sign in.
create function public.booking_is_admin(owner_only boolean default false) returns boolean
 language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.admin_users where user_id=(select auth.uid())
  and (not owner_only or role='owner'));
$$;
revoke all on function public.booking_is_admin(boolean) from public,anon;
grant execute on function public.booking_is_admin(boolean) to authenticated,service_role;
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon,authenticated;
grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;
create policy admin_self_read on public.admin_users for select to authenticated using(user_id=(select auth.uid()));

do $$declare t text;begin
 foreach t in array array['salon_settings','staff','services','service_categories','staff_services','working_hours','time_off','clients','bookings'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated,service_role',t);
  execute format('create policy admin_read on public.%I for select to authenticated using(public.booking_is_admin(false))',t);
  if t='salon_settings' then
   execute format('create policy owner_update on public.%I for update to authenticated using(public.booking_is_admin(true)) with check(public.booking_is_admin(true))',t);
  else
   execute format('create policy owner_write on public.%I for all to authenticated using(public.booking_is_admin(true)) with check(public.booking_is_admin(true))',t);
  end if;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
