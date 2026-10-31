-- JovaBook owner scheduling, additive migration.
-- Apply after schema.sql, migration_diary.sql and migration_diary_tables.sql.
-- No records are removed. Existing calendars above the new plan limit are retained.
begin;

alter table public.salons add column if not exists plan text not null default 'essential';
alter table public.salons add constraint salons_owner_experience_plan check (plan in ('essential','standard','premium'));
-- Plan changes belong to the database owner or trusted billing service, never editable settings.
revoke update(plan) on public.salons from anon, authenticated;

create or replace function public.schedule_day(p_hours jsonb, p_day int)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare h jsonb := coalesce(p_hours,'{}'); d jsonb; a text; z text; shut boolean;
begin
  if p_day not between 0 and 6 then return jsonb_build_object('closed',true,'start','09:00','end','17:00'); end if;
  d := h->'weekly'->p_day::text;
  a := coalesce(d->>'start',h->>'start','09:00'); z := coalesce(d->>'end',h->>'end','17:00');
  shut := case when d is not null then coalesce((d->>'closed')::boolean,false) else not coalesce((h->'days') @> to_jsonb(p_day),false) end;
  return jsonb_build_object('closed',shut or a !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or z !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or a >= z,'start',a,'end',z);
end $$;

create or replace function public.valid_schedule(p_hours jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare d jsonb; a text; z text; n int; value jsonb;
begin
  if p_hours is null or jsonb_typeof(p_hours) <> 'object' then return false; end if;
  if jsonb_typeof(p_hours->'days') is distinct from 'array' then return false; end if;
  for value in select * from jsonb_array_elements(p_hours->'days') loop
    if value::text !~ '^[0-6]$' then return false; end if;
  end loop;
  if p_hours ? 'weekly' and jsonb_typeof(p_hours->'weekly') <> 'object' then return false; end if;
  if exists(select 1 from jsonb_object_keys(coalesce(p_hours->'weekly','{}')) k where k !~ '^[0-6]$') then return false; end if;
  for n in 0..6 loop
    d := p_hours->'weekly'->n::text;
    if d is not null and (jsonb_typeof(d) <> 'object' or jsonb_typeof(d->'closed') is distinct from 'boolean') then return false; end if;
    a := coalesce(d->>'start',p_hours->>'start'); z := coalesce(d->>'end',p_hours->>'end');
    if a is null or z is null or a !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or z !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or a >= z then return false; end if;
  end loop;
  return true;
exception when others then return false;
end $$;

create or replace function public.validate_salon_schedule()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.settings->'hours' is distinct from old.settings->'hours' and not public.valid_schedule(new.settings->'hours') then
    raise exception 'Enter valid opening and closing times for every day.' using errcode='23514';
  end if;
  if new.plan is distinct from old.plan and current_setting('role',true) in ('anon','authenticated') then
    raise exception 'Plan changes require the billing service.' using errcode='42501';
  end if;
  return new;
end $$;
create trigger owner_experience_salon_schedule before update on public.salons for each row execute function public.validate_salon_schedule();

create or replace function public.plan_staff_limit(p_plan text)
returns int language sql immutable set search_path = '' as $$
  select case p_plan when 'premium' then 10 when 'standard' then 5 else 1 end
$$;

create or replace function public.validate_staff_schedule()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cap int; used int; increasing boolean;
begin
  if tg_op='UPDATE' and (new.salon_id is distinct from old.salon_id or new.id is distinct from old.id) then
    raise exception 'A calendar cannot be moved to another account.' using errcode='23514';
  end if;
  if new.hours is not null and (tg_op='INSERT' or new.hours is distinct from old.hours) and not public.valid_schedule(new.hours) then
    raise exception 'Enter valid calendar hours.' using errcode='23514';
  end if;
  -- PostgREST upsert fires INSERT triggers even when the existing row is then updated.
  increasing := not exists(select 1 from public.staff where salon_id=new.salon_id and id=new.id);
  if increasing then
    perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||new.salon_id::text));
    select public.plan_staff_limit(s.plan) into cap from public.salons s where s.id=new.salon_id for update;
    select count(*) into used from public.staff where salon_id=new.salon_id and id<>new.id;
    if used>=cap then raise exception 'Your plan allows % staff member(s), including inactive staff.',cap using errcode='23514'; end if;
  end if;
  return new;
end $$;
create trigger owner_experience_staff_schedule before insert or update on public.staff for each row execute function public.validate_staff_schedule();

create or replace function public.protect_staff_deletion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Parent-account deletion has already removed the salon before its FK cascade runs.
  if not exists(select 1 from public.salons where id=old.salon_id) then return old; end if;
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||old.salon_id::text));
  if (select count(*) from public.staff where salon_id=old.salon_id)<=1 then
    raise exception 'A salon needs at least one staff member.' using errcode='23514';
  end if;
  if exists(select 1 from public.bookings where salon_id=old.salon_id and staff_id=old.id and status='confirmed' and date>=(now() at time zone 'Europe/London')::date) then
    raise exception 'Cancel or move this staff member''s upcoming appointments before deleting them.' using errcode='23514';
  end if;
  return old;
end $$;
create trigger owner_experience_staff_delete before delete on public.staff for each row execute function public.protect_staff_deletion();

-- VOLATILE deliberately takes a fresh database snapshot after the writer lock.
create or replace function public.slot_free(p_salon uuid, p_staff text, p_date date, p_time text, p_duration int, p_ignore text default null)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare cfg jsonb; st public.staff; bh jsonb; sh jsonb; a text; z text; t int; buf int; notice int;
  now_l timestamp := now() at time zone 'Europe/London';
begin
  if p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_duration is null or p_duration not between 5 and 600 or p_date is null then return false; end if;
  select settings into cfg from public.salons where id=p_salon;
  select * into st from public.staff where salon_id=p_salon and id=p_staff;
  if st.id is null or not st.active then return false; end if;
  bh:=public.schedule_day(cfg->'hours',extract(dow from p_date)::int);
  sh:=case when st.hours is null then bh else public.schedule_day(st.hours,extract(dow from p_date)::int) end;
  if (bh->>'closed')::boolean or (sh->>'closed')::boolean then return false; end if;
  a:=greatest(bh->>'start',sh->>'start'); z:=least(bh->>'end',sh->>'end');
  buf:=greatest(0,coalesce((cfg->>'buffer')::int,0)); notice:=greatest(0,coalesce((cfg->>'notice')::int,0));
  t:=public.clock_mins(p_time);
  if a>=z or p_date<now_l::date or t<public.clock_mins(a) or t+p_duration+buf>public.clock_mins(z) or (t-public.clock_mins(a))%30<>0 then return false; end if;
  if p_date=now_l::date and t<=extract(hour from now_l)*60+extract(minute from now_l)+notice then return false; end if;
  return not exists(select 1 from public.bookings b where b.salon_id=p_salon and b.staff_id=p_staff and b.date=p_date
    and b.status<>'cancelled' and (p_ignore is null or b.id<>p_ignore)
    and t<public.clock_mins(b.time)+b.duration+buf and t+p_duration+buf>public.clock_mins(b.time));
end $$;

create or replace function public.validate_booking_schedule()
returns trigger language plpgsql security definer set search_path = '' as $$
declare svc public.services; must_validate boolean; previous public.bookings;
begin
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||new.salon_id::text));
  if tg_op='UPDATE' then previous:=old;
  else select * into previous from public.bookings where salon_id=new.salon_id and id=new.id;
  end if;
  if previous.id is not null then
    if new.salon_id is distinct from previous.salon_id or new.id is distinct from previous.id then
      raise exception 'An appointment cannot be moved to another account.' using errcode='23514';
    end if;
    if new.service_id=previous.service_id and (new.price is distinct from previous.price or new.duration is distinct from previous.duration or new.service_name is distinct from previous.service_name) then
      raise exception 'The saved appointment price and treatment details must be preserved.' using errcode='23514';
    end if;
    must_validate := (new.service_id,new.staff_id,new.date,new.time,new.duration) is distinct from (previous.service_id,previous.staff_id,previous.date,previous.time,previous.duration)
      or (previous.status='cancelled' and new.status<>'cancelled');
    -- Notes, contact updates and completion/cancellation never revalidate historical slots.
    if not must_validate then return new; end if;
  end if;
  select * into svc from public.services where salon_id=new.salon_id and id=new.service_id;
  if svc.id is null then
    raise exception 'This service is no longer available. Contact the salon to change this appointment.' using errcode='23514';
  end if;
  if not (new.staff_id=any(svc.staff_ids)) then
    raise exception 'Choose a service offered by this staff member.' using errcode='23514';
  end if;
  if previous.id is null or new.service_id is distinct from previous.service_id then
    new.service_name:=svc.name; new.price:=svc.price; new.duration:=svc.duration;
  end if;
  if new.status not in ('confirmed','cancelled') and previous.id is null then
    raise exception 'New appointments must be confirmed.' using errcode='23514';
  end if;
  if not public.slot_free(new.salon_id,new.staff_id,new.date,new.time,new.duration,previous.id) then
    raise exception 'That time is unavailable or outside working hours. Choose another time.' using errcode='23514';
  end if;
  return new;
end $$;
create trigger owner_experience_booking_schedule before insert or update on public.bookings for each row execute function public.validate_booking_schedule();

create or replace function public.owner_capabilities()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.salons;
begin
  select * into s from public.salons where owner_id=auth.uid();
  if s.id is null then raise exception 'Sign in as the salon owner.' using errcode='42501'; end if;
  return jsonb_build_object('version',1,'per_day_hours',true,'booking_series',true,'plan',s.plan,'staff_limit',public.plan_staff_limit(s.plan));
end $$;

create or replace function public.owner_booking_series(p_service text,p_staff text,p_dates jsonb,p_time text,p_name text,p_email text,p_phone text default '',p_notes text default '',p_customer text default '',p_salon uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.salons; svc public.services; dates date[]; d date; item jsonb; rec public.bookings; result jsonb:='[]'; cid text; picked text;
begin
  select * into s from public.salons where owner_id=auth.uid();
  if s.id is null then raise exception 'Sign in as the salon owner.' using errcode='42501'; end if;
  if p_salon is not null and p_salon<>s.id then raise exception 'Your salon changed. Open multiple appointments again.' using errcode='42501'; end if;
  if jsonb_typeof(p_dates) is distinct from 'array' or jsonb_array_length(p_dates) not between 1 and 12 then raise exception 'Choose 1 to 12 appointment dates.' using errcode='23514'; end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 80 or coalesce(p_email,'') !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or length(p_email)>254 or length(coalesce(p_phone,''))>40 or length(coalesce(p_notes,''))>1000 then
    raise exception 'Enter a name, valid email and notes within the character limits.' using errcode='23514';
  end if;
  for item in select * from jsonb_array_elements(p_dates) loop
    if jsonb_typeof(item)<>'string' or (item#>>'{}') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Choose valid appointment dates.' using errcode='23514'; end if;
    dates:=array_append(dates,(item#>>'{}')::date);
  end loop;
  if (select count(distinct value) from unnest(dates) value)<>array_length(dates,1) then raise exception 'Each occurrence needs a different date.' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||s.id::text));
  select * into svc from public.services where salon_id=s.id and id=p_service;
  if svc.id is null then raise exception 'Choose an existing service.' using errcode='23514'; end if;
  cid:=nullif(p_customer,'');
  if cid is not null and not exists(select 1 from public.customers where salon_id=s.id and id=cid) then raise exception 'Choose a client from this salon.' using errcode='23514'; end if;
  if cid is null then select id into cid from public.customers where salon_id=s.id and lower(email)=lower(trim(p_email)) order by created_at limit 1; end if;
  if cid is null then
    cid:='c_'||replace(gen_random_uuid()::text,'-','');
    insert into public.customers(salon_id,id,name,email,phone) values(s.id,cid,trim(p_name),trim(p_email),coalesce(p_phone,''));
  end if;
  foreach d in array dates loop
    select st.id into picked from public.staff st where st.salon_id=s.id and st.active and st.id=any(svc.staff_ids)
      and (coalesce(p_staff,'any')='any' or st.id=p_staff) and public.slot_free(s.id,st.id,d,p_time,svc.duration) order by st.created_at,st.id limit 1;
    if picked is null then raise exception 'No free time on %. No appointments were created.',d using errcode='23514'; end if;
    insert into public.bookings(salon_id,id,service_id,service_name,price,duration,date,time,staff_id,customer_id,name,email,phone,notes,source,status,deposit)
      values(s.id,'bk_'||replace(gen_random_uuid()::text,'-',''),svc.id,svc.name,svc.price,svc.duration,d,p_time,picked,cid,trim(p_name),trim(p_email),coalesce(p_phone,''),coalesce(p_notes,''),'Manual','confirmed',0) returning * into rec;
    perform public.add_mail(s.id,'confirmed',public.booking_json(rec));
    result:=result||jsonb_build_array(public.booking_json(rec));
  end loop;
  return jsonb_build_object('ok',true,'bookings',result);
end $$;

revoke all on function public.schedule_day(jsonb,int),public.valid_schedule(jsonb),public.validate_salon_schedule(),public.plan_staff_limit(text),public.validate_staff_schedule(),public.protect_staff_deletion(),public.validate_booking_schedule(),public.owner_capabilities(),public.owner_booking_series(text,text,jsonb,text,text,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.owner_capabilities(),public.owner_booking_series(text,text,jsonb,text,text,text,text,text,text,uuid) to authenticated;
-- Preserve the existing anonymous public booking RPC grants. Helpers stay private.
commit;
