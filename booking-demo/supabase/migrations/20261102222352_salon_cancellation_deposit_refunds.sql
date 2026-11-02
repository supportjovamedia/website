begin;
-- Only the authenticated business owner can initiate this unrestricted path.
-- Customer cancellation retains its separate server-enforced 24-hour cutoff.
create function jovabook_private.salon_cancellation_refund() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='cancelled' and old.status is distinct from new.status
 and exists(select 1 from public.salons where id=new.salon_id and owner_id=auth.uid()) then
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||new.salon_id::text));
  insert into jovabook_private.customer_cancellations(salon_id,booking_id)
  values(new.salon_id,new.id) on conflict(salon_id,booking_id) do nothing;
  insert into jovabook_private.customer_refunds(salon_id,booking_id)
  select new.salon_id,new.id where exists(select 1 from jovabook_private.customer_deposits where salon_id=new.salon_id and booking_id=new.id)
  on conflict(salon_id,booking_id) do nothing;
 end if;
 return new;
end$$;
revoke all on function jovabook_private.salon_cancellation_refund() from public,anon,authenticated;
create trigger salon_cancellation_refund after update of status on public.bookings
for each row execute function jovabook_private.salon_cancellation_refund();
commit;
