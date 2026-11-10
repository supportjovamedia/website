begin;
-- Booking instructions continue to use bookings.notes. No duplicate field.
alter table public.services add column description text not null default '' check(length(description)<=1000);
alter function public.public_salon(text) set schema jovabook_private;
alter function jovabook_private.public_salon(text) rename to public_salon_before_service_description;
revoke all on function jovabook_private.public_salon_before_service_description(text) from public,anon,authenticated;
create function public.public_salon(p_slug text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;sid uuid;items jsonb;
begin
 result:=jovabook_private.public_salon_before_service_description(p_slug);
 if result is null then return null;end if;
 sid:=(result->>'id')::uuid;
 select coalesce(jsonb_agg(item||jsonb_build_object('description',coalesce(s.description,'')) order by position),'[]'::jsonb)
 into items from jsonb_array_elements(coalesce(result->'services','[]'::jsonb)) with ordinality as existing(item,position)
 left join public.services s on s.salon_id=sid and s.id=(item->>'id');
 return jsonb_set(result,'{services}',items);
end$$;
revoke all on function public.public_salon(text) from public,anon,authenticated;
grant execute on function public.public_salon(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
