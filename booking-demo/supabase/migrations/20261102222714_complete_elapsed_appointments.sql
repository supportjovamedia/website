begin;
create function jovabook_private.complete_elapsed_appointments() returns integer
language plpgsql security definer set search_path='' as $$
declare sid uuid;changed integer;total integer:=0;begin
 for sid in select distinct b.salon_id from public.bookings b
 where b.status='confirmed' and jovabook_private.sms_start(b)+make_interval(mins=>b.duration)<=clock_timestamp()
 order by b.salon_id limit 100 loop
  -- Match diary mutation lock ordering and never hold up an active owner save.
  if not pg_try_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text)) then continue;end if;
  with due as (select b.id from public.bookings b where b.salon_id=sid and b.status='confirmed'
   and jovabook_private.sms_start(b)+make_interval(mins=>b.duration)<=clock_timestamp()
   order by b.date,b.time,b.id limit 500 for update skip locked)
  update public.bookings b set status='completed' from due where b.salon_id=sid and b.id=due.id and b.status='confirmed';
  get diagnostics changed=row_count;total:=total+changed;
 end loop;
 return total;
end$$;
revoke all on function jovabook_private.complete_elapsed_appointments() from public,anon,authenticated;
commit;
