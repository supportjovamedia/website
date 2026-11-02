begin;
-- Guard the storage boundary shared by guest RPCs, owner diary writes,
-- customer registration and hosted deposit checkout. Existing snapshots stay intact.
create or replace function jovabook_private.contact_phone_valid(value text) returns boolean
language sql immutable set search_path='' as $$
 select trim(coalesce(value,''))='' or (
 length(trim(value))<=40 and trim(value) ~ '^\+?[0-9 ()-]+$'
 and length(regexp_replace(value,'[^0-9]','','g')) between 7 and 15
 );
$$;
create or replace function jovabook_private.enforce_contact_phone() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.phone is not distinct from old.phone then return new;end if;
 end if;
 if not jovabook_private.contact_phone_valid(new.phone) then
  raise exception 'Enter a phone number with 7 to 15 digits, using only spaces, brackets, hyphens and an optional leading +, or leave it blank.' using errcode='22023';
 end if;
 return new;
end$$;
create trigger contact_phone_validation before insert or update of phone on public.customers for each row execute function jovabook_private.enforce_contact_phone();
create trigger contact_phone_validation before insert or update of phone on public.bookings for each row execute function jovabook_private.enforce_contact_phone();
create trigger contact_phone_validation before insert or update of phone on public.customer_portal_memberships for each row execute function jovabook_private.enforce_contact_phone();
create trigger contact_phone_validation before insert or update of phone on jovabook_private.deposit_checkouts for each row execute function jovabook_private.enforce_contact_phone();
revoke all on function jovabook_private.contact_phone_valid(text) from public,anon,authenticated;
revoke all on function jovabook_private.enforce_contact_phone() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
