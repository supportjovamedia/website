begin;
-- Account closure cascades remove the business before its bookings. Do not
-- create new commission evidence referring to that removed parent.
do $migration$
declare definition text;start_at integer;begin
 definition:=pg_get_functiondef('jovabook_private.commission_origin_guard()'::regprocedure);
 start_at:=strpos(definition,'begin');
 if start_at=0 then raise exception 'Unexpected commission guard body.';end if;
 definition:=overlay(definition placing 'begin
 if tg_op=''DELETE'' then
  if not exists(select 1 from public.salons where id=old.salon_id) then return old;end if;
 end if;' from start_at for 5);
 execute definition;
end$migration$;
commit;
