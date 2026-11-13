begin;
set local lock_timeout = '3s';

alter table public.services
  drop constraint services_duration_check,
  add constraint services_duration_check check (duration between 5 and 1439);

alter table public.bookings
  drop constraint bookings_duration_check,
  add constraint bookings_duration_check check (duration between 5 and 1439);

-- Keep slot, buffer, opening hours and overlap rules in place for longer services.
create or replace function jovabook_private.deposit_original_slot_free(p_salon uuid,p_staff text,p_date date,p_time text,p_duration int,p_ignore text default null) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare cfg jsonb;st public.staff;bh jsonb;sh jsonb;a text;z text;t int;buf int;notice int;zone text;now_l timestamp;starts timestamptz;
begin
 if p_time is null or p_time!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_duration is null or p_duration not between 5 and 1439 or p_date is null then return false;end if;
 select settings into cfg from public.salons where id=p_salon;
 zone:=jovabook_private.sms_timezone(p_salon);if zone is null then return false;end if;
 now_l:=now() at time zone zone;starts:=jovabook_private.business_instant(p_date,p_time,zone);
 if starts is null then return false;end if;
 select * into st from public.staff where salon_id=p_salon and id=p_staff;
 if st.id is null or not st.active then return false;end if;
 bh:=public.schedule_day(cfg->'hours',extract(dow from p_date)::int);
 sh:=case when st.hours is null then bh else public.schedule_day(st.hours,extract(dow from p_date)::int) end;
 if (bh->>'closed')::boolean or (sh->>'closed')::boolean then return false;end if;
 a:=greatest(bh->>'start',sh->>'start');z:=least(bh->>'end',sh->>'end');
 buf:=greatest(0,coalesce((cfg->>'buffer')::int,0));notice:=greatest(0,coalesce((cfg->>'notice')::int,0));t:=public.clock_mins(p_time);
 if a>=z or p_date<now_l::date or t<public.clock_mins(a) or t+p_duration+buf>public.clock_mins(z) or (t-public.clock_mins(a))%30<>0 then return false;end if;
 if starts<=now()+make_interval(mins=>notice) then return false;end if;
 if (starts+make_interval(mins=>p_duration+buf)) at time zone zone<>p_date+p_time::time+make_interval(mins=>p_duration+buf) then return false;end if;
 return not exists(select 1 from public.bookings b where b.salon_id=p_salon and b.staff_id=p_staff and b.date=p_date and b.status<>'cancelled' and (p_ignore is null or b.id<>p_ignore)
  and t<public.clock_mins(b.time)+b.duration+buf and t+p_duration+buf>public.clock_mins(b.time));
end$$;
commit;
