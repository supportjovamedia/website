begin;
-- BEFORE INSERT also runs for ON CONFLICT DO UPDATE. Existing diary rows must
-- reach the UPDATE guard without creating a second financial origin.
do $migration$
declare definition text;needle text;replacement text;begin
 definition:=pg_get_functiondef('jovabook_private.commission_origin_guard()'::regprocedure);
 needle:='if tg_op=''INSERT'' then';
 replacement:=$guard$if tg_op='INSERT' then
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||new.salon_id::text));
  if exists(select 1 from public.bookings b where b.salon_id=new.salon_id and b.id=new.id) then
   new.source:=(select b.source from public.bookings b where b.salon_id=new.salon_id and b.id=new.id);
   return new;
  end if;
  if exists(select 1 from jovabook_private.commission_origins retained_origin where retained_origin.salon_id=new.salon_id and retained_origin.booking_id=new.id) then
   raise exception 'This booking reference has retained financial history. Use a new reference.';
  end if;
$guard$;
 if strpos(definition,needle)=0 then raise exception 'Unexpected booking origin guard foundation.';end if;
 execute replace(definition,needle,replacement);
end$migration$;
commit;

