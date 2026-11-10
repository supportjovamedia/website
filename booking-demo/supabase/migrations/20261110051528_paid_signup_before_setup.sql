begin;

-- This private row identifies only registrations started by the new paid-first
-- flow. Existing businesses, paid subscriptions and granted trials are not moved.
create table jovabook_private.owner_signup_payments(
 user_id uuid primary key references auth.users(id) on delete cascade,
 salon_id uuid not null unique references public.salons(id) on delete cascade,
 plan text not null check(plan in('standard','premium')),
 cadence text not null check(cadence in('monthly','annual')),
 seats integer not null check(seats between 1 and 1000),
 terms_version text not null check(terms_version='2026-11-free-v1'),
 terms_accepted_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 check(plan='premium' or seats=1)
);
alter table jovabook_private.owner_signup_payments enable row level security;
revoke all on table jovabook_private.owner_signup_payments from public,anon,authenticated;

create function jovabook_private.signup_payment_amount(p_plan text,p_cadence text,p_seats integer) returns integer
language sql immutable set search_path='' as $$
 select case when p_plan='essential' then 0 when p_plan='standard' then case when p_cadence='annual' then 19200 else 2000 end
 else case when p_cadence='annual' then 24000+5760*(p_seats-1) else 2500+600*(p_seats-1) end end
$$;
create function jovabook_private.signup_payment_summary(p_owner uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare i jovabook_private.owner_signup_payments;o jovabook_private.offer_accounts;sid uuid;complete boolean;paid boolean;
begin
 select id into sid from public.salons where owner_id=p_owner;
 select * into i from jovabook_private.owner_signup_payments where user_id=p_owner and salon_id=sid;
 select * into o from jovabook_private.offer_accounts where salon_id=sid;
 complete:=exists(select 1 from jovabook_private.owner_onboarding where user_id=p_owner and completed_at is not null);
 paid:=i.user_id is not null and o.ever_paid and o.provider_status in('active','canceled') and o.paid_until>now() and o.plan in('standard','premium');
 return jsonb_build_object('ok',true,'business_id',sid,'managed_signup',i.user_id is not null,'existing_account',sid is not null and (i.user_id is null or complete),
  'plan',case when paid then o.plan else coalesce(i.plan,'essential') end,'cadence',case when paid then o.cadence else coalesce(i.cadence,'monthly') end,
  'seats',case when paid then o.seats else coalesce(i.seats,1) end,'currency','GBP',
  'amount_pence',jovabook_private.signup_payment_amount(case when paid then o.plan else coalesce(i.plan,'essential') end,case when paid then o.cadence else coalesce(i.cadence,'monthly') end,case when paid then o.seats else coalesce(i.seats,1) end),
  'legal_version','2026-11-free-v1','legal_accepted',i.terms_accepted_at is not null,'paid_verified',coalesce(paid,false),
  'referral_code',coalesce((select referral_code from jovabook_private.referrals where referred=sid),''),
  'referral_applied',exists(select 1 from jovabook_private.referrals where referred=sid),
  'payment_required',i.user_id is not null and not complete and not coalesce(paid,false),'onboarding_completed',complete);
end$$;
revoke all on function jovabook_private.signup_payment_amount(text,text,integer),jovabook_private.signup_payment_summary(uuid) from public,anon,authenticated;

create function public.owner_signup_payment(p_action text default 'read',p_values jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare identity uuid;sid uuid;selection text;frequency text;qty integer;referral text;summary jsonb;created jsonb;
begin
 identity:=jovabook_private.onboarding_identity();
 if p_action is null or p_action not in('read','prepare') or p_values is null or jsonb_typeof(p_values)<>'object' or pg_column_size(p_values)>4096
  or exists(select 1 from jsonb_object_keys(p_values) k where k not in('plan','cadence','seats','referral_code','legal_accepted','legal_version')) then raise exception 'Invalid signup payment request.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-signup-payment:'||identity::text));
 summary:=jovabook_private.signup_payment_summary(identity);
 -- A browser purchase link never changes a returning owner's subscription.
 if summary->>'existing_account'='true' then return summary;end if;
 if p_action='read' and not(p_values?'plan') or summary->>'managed_signup'='true' and p_action='read' then return summary;end if;
 selection:=p_values->>'plan';frequency:=coalesce(p_values->>'cadence','monthly');
 if jsonb_typeof(p_values->'seats') is distinct from 'number' or (p_values->>'seats')!~'^[0-9]{1,4}$' then raise exception 'Choose a valid number of staff seats.' using errcode='22023';end if;
 qty:=(p_values->>'seats')::integer;
 if selection is null or selection not in('essential','standard','premium') or frequency not in('monthly','annual') or qty not between 1 and 1000 or selection<>'premium' and qty<>1 then raise exception 'Choose a valid subscription.' using errcode='22023';end if;
 if p_action='read' then return summary||jsonb_build_object('plan',selection,'cadence',frequency,'seats',qty,'amount_pence',jovabook_private.signup_payment_amount(selection,frequency,qty));end if;
 if selection='essential' then raise exception 'Free needs no payment. Continue with your account setup.' using errcode='22023';end if;
 if p_values->'legal_accepted' is distinct from 'true'::jsonb or p_values->>'legal_version' is distinct from '2026-11-free-v1' then raise exception 'Agree to the current terms before continuing to payment.' using errcode='22023';end if;
 if summary->>'managed_signup'='true' then
  if summary->>'plan'<>selection or summary->>'cadence'<>frequency or (summary->>'seats')::integer<>qty then raise exception 'Your saved subscription selection has changed. Resume the existing signup.' using errcode='22023';end if;
  return summary;
 end if;
 referral:=upper(trim(coalesce(p_values->>'referral_code','')));
 -- Placeholder is never published. The same salon is renamed after payment;
 -- verified identity, the unique owner constraint and transaction lock prevent duplicates.
 created:=public.create_referred_business('Your business','setup-'||substr(replace(gen_random_uuid()::text,'-',''),1,24),'Business owner',referral);
 if created->>'ok' is distinct from 'true' then return created;end if;
 sid:=(created->>'salon_id')::uuid;
 update public.salons set settings=coalesce(settings,'{}')||'{"hours":{"start":"09:00","end":"18:00","days":[]}}'::jsonb where id=sid and owner_id=identity and status='setup';
 insert into jovabook_private.owner_signup_payments(user_id,salon_id,plan,cadence,seats,terms_version) values(identity,sid,selection,frequency,qty,'2026-11-free-v1');
 insert into jovabook_private.owner_onboarding(user_id,data) values(identity,jsonb_build_object('terms_accepted_at',now(),'terms_version','2026-11-free-v1'))
 on conflict(user_id) do update set data=owner_onboarding.data||excluded.data,updated_at=now();
 return jovabook_private.signup_payment_summary(identity);
end$$;
revoke all on function public.owner_signup_payment(text,jsonb) from public,anon,authenticated;
grant execute on function public.owner_signup_payment(text,jsonb) to authenticated;

alter function public.owner_onboarding_progress(text,jsonb) set schema jovabook_private;
alter function jovabook_private.owner_onboarding_progress(text,jsonb) rename to onboarding_before_paid_signup;
revoke all on function jovabook_private.onboarding_before_paid_signup(text,jsonb) from public,anon,authenticated;
create function public.owner_onboarding_progress(p_step text default 'read',p_values jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare identity uuid;summary jsonb;result jsonb;sid uuid;v_slug text;slug_state text;stored_referral text;had_business boolean;
begin
 identity:=jovabook_private.onboarding_identity();
 perform pg_advisory_xact_lock(hashtext('jovabook-signup-payment:'||identity::text));
 summary:=jovabook_private.signup_payment_summary(identity);
 if summary->>'payment_required'='true' and p_step not in('read','entry','profile') then raise exception 'Complete your subscription payment before setting up your business.' using errcode='42501';end if;
 had_business:=exists(select 1 from jovabook_private.owner_onboarding where user_id=identity and steps?'business');
 result:=jovabook_private.onboarding_before_paid_signup(p_step,p_values);
 if p_step='business' and summary->>'managed_signup'='true' and not coalesce((summary->>'onboarding_completed')::boolean,false) then
  sid:=(summary->>'business_id')::uuid;v_slug:=lower(trim(p_values->>'booking_slug'));
  if not exists(select 1 from public.salons where id=sid and owner_id=identity and status='setup') then raise exception 'Your setup business changed. Refresh your account.' using errcode='42501';end if;
  if not had_business and exists(select 1 from public.salons where id=sid and salons.slug=v_slug) then raise exception 'Choose your business booking address before continuing.' using errcode='22023';end if;
  select referral_code into stored_referral from jovabook_private.referrals where referred=sid;
  if coalesce(p_values->>'referral_code','')<>'' and upper(trim(p_values->>'referral_code')) is distinct from stored_referral then raise exception 'A referral must be applied before payment.' using errcode='22023';end if;
  if not exists(select 1 from public.salons where id=sid and salons.slug=v_slug) then
   slug_state:=public.slug_status(v_slug);if slug_state<>'ok' then raise exception 'That booking address is unavailable. Choose another.' using errcode='22023';end if;
  end if;
  update public.salons set name=trim(p_values->>'business_name'),slug=v_slug,
   owner_name=coalesce(nullif(trim((select (data->>'first_name')||' '||(data->>'last_name') from jovabook_private.owner_onboarding where user_id=identity)),''),owner_name)
   where id=sid and owner_id=identity;
  update jovabook_private.referrals set business_name=trim(p_values->>'business_name') where referred=sid;
  result:=jovabook_private.onboarding_before_paid_signup('read','{}');
 end if;
 return result||jsonb_build_object('signup_payment',jovabook_private.signup_payment_summary(identity));
end$$;
revoke all on function public.owner_onboarding_progress(text,jsonb) from public,anon,authenticated;
grant execute on function public.owner_onboarding_progress(text,jsonb) to authenticated;

alter function public.owner_account_access() set schema jovabook_private;
alter function jovabook_private.owner_account_access() rename to access_before_paid_signup;
revoke all on function jovabook_private.access_before_paid_signup() from public,anon,authenticated;
create function public.owner_account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;summary jsonb;
begin
 result:=jovabook_private.access_before_paid_signup();
 if auth.uid() is null or result->>'access'='wrong_portal' then return result;end if;
 summary:=jovabook_private.signup_payment_summary(auth.uid());
 return result||jsonb_build_object('signup_payment',summary,'onboarding_required',summary->>'managed_signup'='true' and summary->>'onboarding_completed'='false');
end$$;
revoke all on function public.owner_account_access() from public,anon,authenticated;
grant execute on function public.owner_account_access() to authenticated;

-- Payment reconciliation, including an older worker, cannot publish the hidden
-- setup business. The completion RPC records all validated steps atomically
-- before requesting activation in the same transaction.
create function jovabook_private.signup_keep_draft_private() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status in('active','trialing') and exists(select 1 from jovabook_private.owner_signup_payments where salon_id=new.id)
  and not exists(select 1 from jovabook_private.owner_onboarding where user_id=new.owner_id and completed_at is not null)
  and not (exists(select 1 from jovabook_private.owner_onboarding where user_id=new.owner_id
   and steps ?& array['profile','business','category','team','location','source','complete'])
   and jovabook_private.signup_payment_summary(new.owner_id)->>'paid_verified'='true') then new.status:='setup';end if;
 return new;
end$$;
revoke all on function jovabook_private.signup_keep_draft_private() from public,anon,authenticated;
create trigger signup_keep_draft_private before update of status on public.salons for each row execute function jovabook_private.signup_keep_draft_private();

alter function public.save_setup(text,text,jsonb) set schema jovabook_private;
alter function jovabook_private.save_setup(text,text,jsonb) rename to save_setup_before_paid_signup;
revoke all on function jovabook_private.save_setup_before_paid_signup(text,text,jsonb) from public,anon,authenticated;
create function public.save_setup(p_address text,p_phone text,p_settings jsonb) returns void language plpgsql security definer set search_path='' as $$
declare summary jsonb;
begin
 summary:=jovabook_private.signup_payment_summary(auth.uid());
 if summary->>'payment_required'='true' then raise exception 'Complete your subscription payment before setting up your business.' using errcode='42501';end if;
 if summary->>'managed_signup'='true' and summary->>'onboarding_completed'='false' then raise exception 'Complete your account setup before opening your business.' using errcode='42501';end if;
 perform jovabook_private.save_setup_before_paid_signup(p_address,p_phone,p_settings);
end$$;
revoke all on function public.save_setup(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_setup(text,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
