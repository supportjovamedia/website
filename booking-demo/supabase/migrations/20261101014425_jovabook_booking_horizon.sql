-- This limit applies only to new public online bookings. Owner/manual and
-- multi-session creation retain their existing scheduling rules.
create function jovabook_private.online_booking_window(p_salon uuid,p_now timestamptz default now()) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text;local_today date;begin
 select z.name into zone from public.salons s join pg_catalog.pg_timezone_names z
 on z.name=coalesce(nullif(s.settings->>'timezone',''),'Europe/London') where s.id=p_salon;
 if zone is null then return null;end if;
 local_today:=(p_now at time zone zone)::date;
 return jsonb_build_object('today',local_today,'max_date',local_today+75,'days',75,'timezone',zone,'server_now',p_now);
end$$;
revoke all on function jovabook_private.online_booking_window(uuid,timestamptz) from public,anon,authenticated;

-- Keep the current billing guard and its original implementation in the call
-- chain. The SMS wrapper calls this public function only for new requests;
-- previously committed SMS requests retain their exact idempotent result.
alter function public.create_booking(text,text,text,text,text,text,text,text,text,text) set schema jovabook_private;
alter function jovabook_private.create_booking(text,text,text,text,text,text,text,text,text,text) rename to horizon_original_create_booking;
revoke all on function jovabook_private.horizon_original_create_booking(text,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
create function public.create_booking(p_slug text,p_service text,p_staff text,p_date text,p_time text,p_name text,p_email text,p_phone text,p_notes text,p_method text default 'Card') returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid;bounds jsonb;chosen date;begin
 select id into sid from public.salons where slug=lower(trim(p_slug));
 if sid is null or not jovabook_private.billing_open(sid) then
  return jovabook_private.horizon_original_create_booking(p_slug,p_service,p_staff,p_date,p_time,p_name,p_email,p_phone,p_notes,p_method);
 end if;
 bounds:=jovabook_private.online_booking_window(sid);
 if bounds is null then return jsonb_build_object('ok',false,'code','booking_timezone','message','Online booking dates are unavailable. Contact the business.');end if;
 begin
  if coalesce(p_date,'') !~ '^\d{4}-\d{2}-\d{2}$' then raise invalid_datetime_format;end if;
  chosen:=p_date::date;
 exception when invalid_datetime_format or datetime_field_overflow then
  return jsonb_build_object('ok',false,'code','booking_horizon','message','Choose a valid date from today up to 75 days ahead.');
 end;
 if chosen<(bounds->>'today')::date or chosen>(bounds->>'max_date')::date then
  return jsonb_build_object('ok',false,'code','booking_horizon','message','Online bookings are available from today up to 75 days ahead. Choose another date.');
 end if;
 return jovabook_private.horizon_original_create_booking(p_slug,p_service,p_staff,p_date,p_time,p_name,p_email,p_phone,p_notes,p_method);
end$$;
revoke all on function public.create_booking(text,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_booking(text,text,text,text,text,text,text,text,text,text) to anon,authenticated;

alter function public.public_salon(text) set schema jovabook_private;
alter function jovabook_private.public_salon(text) rename to horizon_original_public_salon;
revoke all on function jovabook_private.horizon_original_public_salon(text) from public,anon,authenticated;
create function public.public_salon(p_slug text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 result:=jovabook_private.horizon_original_public_salon(p_slug);
 if result is null then return null;end if;
 return result||jsonb_build_object('booking_window',jovabook_private.online_booking_window((result->>'id')::uuid));
end$$;
revoke all on function public.public_salon(text) from public,anon,authenticated;
grant execute on function public.public_salon(text) to anon,authenticated;
