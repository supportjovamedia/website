begin;
-- Only the verified customer and this business's own memberships can read this response.
create or replace function public.customer_portal_bookings(p_slug text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare sid uuid:=jovabook_private.customer_member(p_slug);result jsonb;
begin
 if sid is null then raise exception 'Log in and verify your email to view your bookings.' using errcode='42501';end if;
 select jsonb_build_object('ok',true,'server_now',now(),
 'business',jsonb_build_object('id',s.id,'name',s.name,'slug',s.slug,'phone',s.phone,'email',s.email,'timezone',coalesce(s.settings->>'timezone','Europe/London')),
 'customer',jsonb_build_object('first_name',m.first_name,'last_name',m.last_name,'email',jovabook_private.customer_email(),'phone',m.phone),
 'bookings',coalesce((select jsonb_agg(jovabook_private.customer_booking_json(b)||jsonb_build_object(
   'service_name',b.service_name,'staff_name',coalesce(st.name,''),
   'starts_at',jovabook_private.sms_start(b),
   'ends_at',jovabook_private.sms_start(b)+make_interval(mins=>b.duration)) order by b.date,b.time,b.id)
 from public.bookings b left join public.staff st on st.salon_id=b.salon_id and st.id=b.staff_id
 where b.salon_id=sid and lower(trim(b.email))=jovabook_private.customer_email()),'[]'::jsonb)) into result
 from public.salons s join public.customer_portal_memberships m on m.salon_id=s.id and m.user_id=auth.uid() where s.id=sid;
 return result;
end$$;
revoke all on function public.customer_portal_bookings(text) from public,anon,authenticated;
grant execute on function public.customer_portal_bookings(text) to authenticated;
notify pgrst,'reload schema';
commit;
