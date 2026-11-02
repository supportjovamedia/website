begin;
-- Setup is a narrow owner operation. It does not open the diary or public site.
do $$declare src text;begin
 src:=pg_get_functiondef('public.owner_account_access()'::regprocedure);
 execute replace(src,'public.owner_account_access(','jovabook_private.owner_access_before_trial_setup(');
 src:=pg_get_functiondef('public.save_setup(text,text,jsonb)'::regprocedure);
 execute replace(src,'public.save_setup(','jovabook_private.save_setup_after_trial_card(');
end$$;
revoke all on function jovabook_private.owner_access_before_trial_setup(),jovabook_private.save_setup_after_trial_card(text,text,jsonb) from public,anon,authenticated;

create or replace function public.owner_account_access() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;s public.salons;a jovabook_private.billing_accounts;begin
 result:=jovabook_private.owner_access_before_trial_setup();
 if result->'business'->>'id' is null then return result;end if;
 select * into s from public.salons where id=(result->'business'->>'id')::uuid and owner_id=auth.uid();
 select * into a from jovabook_private.billing_accounts where salon_id=s.id;
 if a.card_trial_required and not a.ever_paid and a.trial_payment_method is null and a.subscription_id is null
 and a.deletion_state is null and s.status='setup' then
  return result||jsonb_build_object('access','setup','reason','business_setup','setup',jsonb_build_object(
   'address',coalesce(s.address,''),'phone',coalesce(s.phone,''),'hours',s.settings->'hours',
   'color',coalesce(s.settings->>'color','#235789'),'owner',s.owner_name,'email',s.email));
 end if;
 return result;
end$$;

create or replace function public.save_setup(p_address text,p_phone text,p_settings jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare s public.salons;a jovabook_private.billing_accounts;uid uuid:=auth.uid();begin
 if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null)
 then raise exception 'Verify your email and log in to continue.' using errcode='42501';end if;
 select * into s from public.salons where owner_id=uid;
 if s.id is null then raise exception 'Business not found.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||s.id::text));
 select * into a from jovabook_private.billing_accounts where salon_id=s.id for update;
 if not (a.card_trial_required and not a.ever_paid and a.trial_payment_method is null and a.subscription_id is null
 and a.deletion_state is null and s.status='setup') then
  perform jovabook_private.save_setup_after_trial_card(p_address,p_phone,p_settings);return;
 end if;
 if length(trim(coalesce(p_address,''))) not between 3 and 300 or trim(coalesce(p_phone,''))=''
 or not jovabook_private.contact_phone_valid(p_phone) then raise exception 'Enter your business address and a valid phone number.' using errcode='22023';end if;
 if jsonb_typeof(p_settings) is distinct from 'object' then raise exception 'Enter valid business settings.';end if;
 if exists(select 1 from jsonb_object_keys(p_settings) k where k not in('hours','color'))
 or not coalesce(public.valid_schedule(p_settings->'hours'),false)
 or coalesce(p_settings->>'color','')!~'^#[0-9a-fA-F]{6}$' then raise exception 'Enter valid opening hours and colour.' using errcode='22023';end if;
 update public.salons set address=trim(p_address),phone=trim(p_phone),settings=coalesce(settings,'{}'::jsonb)||p_settings where id=s.id and owner_id=uid;
 -- No trial timestamp, plan entitlement or public access is granted here.
end$$;
revoke all on function public.owner_account_access(),public.save_setup(text,text,jsonb) from public,anon;
grant execute on function public.owner_account_access(),public.save_setup(text,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
