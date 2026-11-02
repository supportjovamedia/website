begin;
alter table public.customer_portal_memberships drop constraint customer_portal_memberships_phone_check;
alter table public.customer_portal_memberships alter column phone set default '';
alter table public.customer_portal_memberships add constraint customer_portal_memberships_phone_check
 check(phone='' or length(trim(phone)) between 7 and 40 and length(phone)<=40);

create or replace function public.customer_portal_register(p_slug text,p_first_name text,p_last_name text,p_phone text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid;verified_email text:=jovabook_private.customer_email();phone_value text:=trim(coalesce(p_phone,''));
begin
 if verified_email is null then raise exception 'Verify your email before opening your bookings.' using errcode='42501';end if;
 select s.id into sid from public.salons s where s.slug=lower(trim(p_slug)) and
 (jovabook_private.billing_open(s.id) or exists(select 1 from public.bookings b where b.salon_id=s.id and lower(trim(b.email))=verified_email));
 if sid is null then raise exception 'This business is unavailable.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 if not exists(select 1 from public.salons s where s.id=sid and (jovabook_private.billing_open(s.id) or exists(select 1 from public.bookings b where b.salon_id=s.id and lower(trim(b.email))=verified_email))) then raise exception 'This business is unavailable.' using errcode='42501';end if;
 if length(trim(coalesce(p_first_name,''))) not between 1 and 60 or length(trim(coalesce(p_last_name,''))) not between 1 and 60 then raise exception 'Enter your first and last name.' using errcode='22023';end if;
 if phone_value<>'' and length(phone_value) not between 7 and 40 then raise exception 'Use a phone number between 7 and 40 characters, or leave it blank.' using errcode='22023';end if;
 insert into public.customer_portal_memberships(salon_id,user_id,first_name,last_name,phone)
 values(sid,auth.uid(),trim(p_first_name),trim(p_last_name),phone_value)
 on conflict(salon_id,user_id) do update set first_name=excluded.first_name,last_name=excluded.last_name,phone=excluded.phone;
 -- Existing business client records are never overwritten by account fields.
 insert into public.customers(salon_id,id,name,email,phone)
 select sid,'cp_'||auth.uid()::text,left(trim(p_first_name)||' '||trim(p_last_name),80),verified_email,phone_value
 where not exists(select 1 from public.customers c where c.salon_id=sid and lower(trim(c.email))=verified_email)
 on conflict(salon_id,id) do nothing;
 return jsonb_build_object('ok',true);
end$$;
revoke all on function public.customer_portal_register(text,text,text,text) from public,anon,authenticated;
grant execute on function public.customer_portal_register(text,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
