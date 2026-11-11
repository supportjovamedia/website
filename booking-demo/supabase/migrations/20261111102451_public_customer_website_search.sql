begin;

-- These RPCs expose website fields only. Booking schedules, owner details and
-- customer records are deliberately absent from the public website response.
create function jovabook_private.customer_website_searchable(s public.salons)
returns boolean language sql stable set search_path='' as $$
 select coalesce(
   s.status in ('active','trialing')
   and s.settings#>'{workspace,website,showInSearch}' = 'true'::jsonb
   and s.settings#>'{workspace,website,version}' = '1'::jsonb
   and length(trim(s.settings#>>'{workspace,website,headline}')) between 1 and 100
   and (nullif(trim(s.settings#>>'{workspace,website,about}'),'') is not null
     or exists (select 1 from public.services v where v.salon_id=s.id))
   and exists (select 1 from auth.users u where u.id=s.owner_id and u.email_confirmed_at is not null)
   and jovabook_private.billing_open(s.id),
   false)
$$;
revoke all on function jovabook_private.customer_website_searchable(public.salons) from public, anon, authenticated;

create function public.public_customer_website(p_slug text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 s public.salons;
 website jsonb;
 plan text;
begin
 if p_slug is null or length(p_slug) not between 3 and 30 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
  return null;
 end if;
 select * into s from public.salons where slug=p_slug and status in ('active','trialing');
 if s.id is null or not jovabook_private.billing_open(s.id) then return null; end if;
 plan:=jovabook_private.offer_plan(s.id);
 website:=s.settings#>'{workspace,website}';

 return jsonb_build_object(
  'id',s.id,'slug',s.slug,'name',s.name,'email',s.email,'phone',s.phone,
  'address',case when website->'hideAddress' = 'true'::jsonb
    or not jovabook_private.business_address_required(s.owner_id) then '' else s.address end,
  'about',s.settings->>'about','hours',s.settings->'hours','currency',s.settings->>'currency',
  'searchable',jovabook_private.customer_website_searchable(s),
  'brandingRequired',plan<>'premium',
  'workspace',jsonb_build_object('website',jsonb_build_object(
   'template',website->'template','headline',website->'headline','about',website->'about',
   'brandColor',website->'brandColor','headingColor',website->'headingColor',
   'heroImage',website->'heroImage','logoImage',website->'logoImage',
   'homeIntro',case when plan='premium' then website->'homeIntro' end,
   'aboutHeading',case when plan='premium' then website->'aboutHeading' end)),
  'services',(select coalesce(jsonb_agg(jsonb_build_object('name',v.name,'price',v.price)
    order by v.created_at,v.id),'[]'::jsonb) from public.services v where v.salon_id=s.id)
 );
end
$$;
revoke all on function public.public_customer_website(text) from public, anon, authenticated;
grant execute on function public.public_customer_website(text) to anon, authenticated;

create function public.customer_website_sitemap()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(slug order by slug),'[]'::jsonb)
 from (
  select s.slug from public.salons s
  where s.status in ('active','trialing')
    and s.settings#>'{workspace,website,showInSearch}' = 'true'::jsonb
    and jovabook_private.customer_website_searchable(s)
  order by s.slug limit 50000
 ) eligible
$$;
revoke all on function public.customer_website_sitemap() from public, anon, authenticated;
grant execute on function public.customer_website_sitemap() to anon, authenticated;

notify pgrst,'reload schema';
commit;
