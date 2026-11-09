begin;
-- Account registration is separate from business activation. Private operator access only.
create function public.operator_signup_flow(p_days integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform jovabook_private.require_operator();
 if p_days is null or p_days not in (0,7,30,90) then raise exception 'Choose all time, 7, 30 or 90 days.' using errcode='22023';end if;
 with accounts as (
  select u.id,u.email,u.created_at,u.email_confirmed_at verified_at,
   coalesce(nullif(s.owner_name,''),nullif(u.raw_user_meta_data->>'owner_name',''),'') as name,
   s.id business_id,s.name business_name,s.created_at business_created_at,
   left(u.raw_user_meta_data->>'business_name',60) requested_business_name,left(u.raw_user_meta_data->>'booking_slug',30) requested_booking_slug,u.last_sign_in_at,
   (select min(b.created_at) from public.bookings b where b.salon_id=s.id) first_booking_at
  from auth.users u left join public.salons s on s.owner_id=u.id
  where (p_days=0 or u.created_at>=now()-make_interval(days=>p_days))
   and (s.id is not null or jsonb_typeof(u.raw_user_meta_data->'owner_name')='string' or u.raw_user_meta_data->>'signup_intent'='business')
   and not exists(select 1 from jovabook_private.operators o where o.email=lower(trim(u.email)))
   and not exists(select 1 from jovabook_private.team_logins t where t.user_id=u.id)
   and not exists(select 1 from jovabook_private.portal_roles r where r.user_id=u.id and r.role in ('customer','operator','team'))
 ), staged as (
  select *,case when first_booking_at is not null then 'first_booking' when business_id is not null then 'business_created' when verified_at is not null then 'setup_pending' else 'email_pending' end stage from accounts
 ), recent as (select * from staged order by created_at desc,id limit 100)
 select jsonb_build_object('ok',true,'as_of',now(),'days',p_days,
  'counts',jsonb_build_object('signed_up',count(*),'email_verified',count(*) filter(where verified_at is not null),
    'business_created',count(*) filter(where business_id is not null),'first_booking',count(*) filter(where first_booking_at is not null),
    'setup_pending',count(*) filter(where stage='setup_pending'),'email_pending',count(*) filter(where stage='email_pending')),
  'recent',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'email',email,'created_at',created_at,'verified_at',verified_at,
    'business_id',business_id,'business_name',business_name,'business_created_at',business_created_at,'first_booking_at',first_booking_at,'stage',stage,'requested_business_name',requested_business_name,'requested_booking_slug',requested_booking_slug,'last_sign_in_at',last_sign_in_at)
    order by created_at desc,id),'[]'::jsonb) from recent)) into result from staged;
 insert into jovabook_private.operator_audit(actor_id,action) values(auth.uid(),'signup_flow');
 return result;
end$$;
revoke all on function public.operator_signup_flow(integer) from public,anon,authenticated;
grant execute on function public.operator_signup_flow(integer) to authenticated;
comment on function public.operator_signup_flow(integer) is 'Operator-only business-intent accounts, verification and activation stages. Metadata is a display/cohort signal, never authorization. Counts can include internal/test business accounts.';
commit;
