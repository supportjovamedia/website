begin;
create function public.owner_refund_activity() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare sid uuid:=public.my_salon_id();items jsonb;begin
 if sid is null or jovabook_private.portal_role() is distinct from 'business' then raise exception 'Log in to your business to view refunds.' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.requested_at desc),'[]'::jsonb) into items from (
  select f.booking_id,f.status,f.requested_at,d.amount amount_minor,b.name customer,b.service_name service,b.date,b.time
  from jovabook_private.customer_refunds f
  join jovabook_private.customer_deposits d on d.salon_id=f.salon_id and d.booking_id=f.booking_id
  join public.bookings b on b.salon_id=f.salon_id and b.id=f.booking_id
  where f.salon_id=sid order by f.requested_at desc limit 20
 ) r;
 return jsonb_build_object('ok',true,'refunds',items);
end$$;
revoke all on function public.owner_refund_activity() from public,anon;
grant execute on function public.owner_refund_activity() to authenticated;
notify pgrst,'reload schema';
commit;
