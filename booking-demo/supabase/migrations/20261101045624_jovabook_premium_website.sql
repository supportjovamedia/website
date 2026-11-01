-- Add a public website entitlement without changing billing, booking-window,
-- owner settings or image access. The existing RPC remains in the call chain.
alter function public.public_salon(text) set schema jovabook_private;
alter function jovabook_private.public_salon(text) rename to website_original_public_salon;
revoke all on function jovabook_private.website_original_public_salon(text) from public,anon,authenticated;

create function public.public_salon(p_slug text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; website jsonb; entitled boolean;
begin
 result:=jovabook_private.website_original_public_salon(p_slug);
 if result is null then return null;end if;
 -- Both the business row and canonical paid entitlement must agree. Editable
 -- workspace JSON, pending upgrades and scheduled downgrades grant no access.
 select s.plan='premium' and a.ever_paid and a.paid_plan='premium' into entitled
 from public.salons s join jovabook_private.billing_accounts a on a.salon_id=s.id
 where s.id=(result->>'id')::uuid;
 if not coalesce(entitled,false) then
  website:=result#>'{settings,workspace,website}';
  if jsonb_typeof(website)='object' then
   result:=jsonb_set(result,'{settings,workspace,website}',
    website-array['premiumTemplate','homeIntro','aboutHeading','contactIntro'],false);
  end if;
 end if;
 return result||jsonb_build_object('website_entitlement',case when coalesce(entitled,false) then 'premium' else 'one-page' end);
end$$;
revoke all on function public.public_salon(text) from public,anon,authenticated;
grant execute on function public.public_salon(text) to anon,authenticated;
