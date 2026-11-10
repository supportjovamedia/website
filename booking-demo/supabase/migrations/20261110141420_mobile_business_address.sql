begin;

-- Signup's private location choice controls address validation, not permissions.
-- Unknown/legacy choices retain the existing physical-business requirement.
create function jovabook_private.business_address_required(p_owner uuid) returns boolean
language sql stable set search_path='' as $$
 select coalesce((select case
  when jsonb_typeof(data->'service_locations')='array' then
   case when jsonb_array_length(data->'service_locations')=0 then true
    when exists(select 1 from jsonb_array_elements(data->'service_locations') v
      where jsonb_typeof(v)<>'string' or v#>>'{}' not in ('physical','mobile','online')) then true
    else data->'service_locations' ? 'physical' end
  when data->>'service_location' in ('physical','mobile','online') then data->>'service_location'='physical'
  else true end
 from jovabook_private.owner_onboarding where user_id=p_owner),true)
$$;
revoke all on function jovabook_private.business_address_required(uuid) from public,anon,authenticated;

-- Keep all outer payment, verified-owner and locale guards intact. Change only
-- the original setup validator at the bottom of that existing call chain.
create or replace function jovabook_private.billing_original_save_setup(p_address text,p_phone text,p_settings jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not signed in';end if;
 if jovabook_private.business_address_required(auth.uid()) and length(trim(coalesce(p_address,'')))<3 then
  raise exception 'Enter your business address.' using errcode='22023';
 end if;
 if length(coalesce(public.norm_phone(p_phone),''))<7 then
  raise exception 'Enter a valid business phone number.' using errcode='22023';
 end if;
 update public.salons set address=trim(coalesce(p_address,'')),phone=trim(p_phone),settings=coalesce(p_settings,'{}'::jsonb)
  where owner_id=auth.uid() and status='setup';
end$$;
revoke all on function jovabook_private.billing_original_save_setup(text,text,jsonb) from public,anon,authenticated;

-- Attach the result to the access response already loaded by the dashboard.
-- This adds no endpoint, polling, or additional browser request.
alter function public.owner_account_access() set schema jovabook_private;
alter function jovabook_private.owner_account_access() rename to owner_access_before_address_requirement;
revoke all on function jovabook_private.owner_access_before_address_requirement() from public,anon,authenticated;
create function public.owner_account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 result:=jovabook_private.owner_access_before_address_requirement();
 return result||jsonb_build_object('address_required',jovabook_private.business_address_required(auth.uid()));
end$$;
revoke all on function public.owner_account_access() from public,anon,authenticated;
grant execute on function public.owner_account_access() to authenticated;
notify pgrst,'reload schema';
commit;
