begin;
-- Existing trials are retained. Only new businesses require hosted card setup.
alter table jovabook_private.billing_accounts
 add column card_trial_required boolean not null default false,
 add column card_trial_action_id uuid,
 add column trial_payment_method text;
alter table jovabook_private.billing_actions add column trial boolean not null default false;

create function jovabook_private.card_trial_eligible(p_salon uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(a.card_trial_required and not a.ever_paid and a.trial_started_at is null
 and a.subscription_id is null and a.deletion_state is null
 and not exists(select 1 from jovabook_private.trial_ledger l
 where l.email_hash=jovabook_private.trial_fingerprint(u.email)),false)
 from jovabook_private.billing_accounts a join public.salons s on s.id=a.salon_id
 join auth.users u on u.id=s.owner_id and u.email_confirmed_at is not null where a.salon_id=p_salon
$$;
revoke all on function jovabook_private.card_trial_eligible(uuid) from public,anon,authenticated;

create or replace function jovabook_private.billing_new_salon() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=new.owner_id and email_confirmed_at is not null)
 then raise exception 'Verify your email before creating a business.' using errcode='42501';end if;
 insert into jovabook_private.billing_accounts(salon_id,card_trial_required) values(new.id,true);
 update public.salons set status='setup',trial_used=false,trial_ends_at=null where id=new.id;
 return new;
end$$;

create or replace function jovabook_private.billing_access(p_salon uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when a.deletion_state is not null then 'deleting'
 when a.roster_conflict then 'billing_only'
 when a.ever_paid and a.failed_at is null and a.paid_until>now() then 'active'
 when not a.ever_paid and a.trial_ends_at>now() and
 (not a.card_trial_required or (a.trial_payment_method is not null and a.provider_status='trialing')) then 'active'
 else 'billing_only' end from jovabook_private.billing_accounts a where a.salon_id=p_salon
$$;

create function jovabook_private.billing_effective_plan(p_salon uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when a.ever_paid or (a.card_trial_required and a.trial_payment_method is not null
 and a.provider_status='trialing' and a.trial_ends_at>now()) then a.paid_plan else 'essential' end
 from jovabook_private.billing_accounts a where a.salon_id=p_salon
$$;
revoke all on function jovabook_private.billing_effective_plan(uuid) from public,anon,authenticated;

-- Keep existing portal-role checks and add only safe trial presentation fields.
do $$declare src text;begin
 src:=pg_get_functiondef('public.owner_account_access()'::regprocedure);
 execute replace(src,'public.owner_account_access(','jovabook_private.owner_access_before_card_trial(');
 src:=pg_get_functiondef('public.start_trial()'::regprocedure);
 execute replace(src,'public.start_trial(','jovabook_private.start_trial_before_card_trial(');
 src:=pg_get_functiondef('public.save_setup(text,text,jsonb)'::regprocedure);
 execute replace(src,'public.save_setup(','jovabook_private.save_setup_before_card_trial(');
 src:=pg_get_functiondef('public.booking_billing_worker(text,text,jsonb)'::regprocedure);
 execute replace(src,'public.booking_billing_worker(','jovabook_private.billing_worker_before_card_trial(');
end$$;
revoke all on function jovabook_private.owner_access_before_card_trial(),jovabook_private.start_trial_before_card_trial(),
 jovabook_private.save_setup_before_card_trial(text,text,jsonb),jovabook_private.billing_worker_before_card_trial(text,text,jsonb) from public,anon,authenticated;

create or replace function public.owner_account_access() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;a jovabook_private.billing_accounts;p text;begin
 result:=jovabook_private.owner_access_before_card_trial();
 if result->'business'->>'id' is null then return result;end if;
 select * into a from jovabook_private.billing_accounts where salon_id=(result->'business'->>'id')::uuid;
 p:=jovabook_private.billing_effective_plan(a.salon_id);
 return result||jsonb_build_object('business',(result->'business')||jsonb_build_object('plan',p),
 'staff_limit',least(public.plan_staff_limit(p),case when a.pending_target is null then 10 else public.plan_staff_limit(a.pending_target) end),
 'billing',(result->'billing')||jsonb_build_object('card_required',a.card_trial_required and a.trial_started_at is null and not a.ever_paid,
 'trial_eligible',jovabook_private.card_trial_eligible(a.salon_id),'trial_card_collected',a.trial_payment_method is not null,
 'trial_subscription',a.card_trial_required and a.trial_payment_method is not null and a.provider_status='trialing',
 'trial_ends_at',a.trial_ends_at,'commission_bps',case when p='premium' then 0 else 100 end));
end$$;

create or replace function public.trial_check() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a jovabook_private.billing_accounts;begin
 select b.* into a from jovabook_private.billing_accounts b join public.salons s on s.id=b.salon_id
 join auth.users u on u.id=s.owner_id and u.email_confirmed_at is not null where s.owner_id=auth.uid();
 if a.salon_id is null then raise exception 'Log in to continue.' using errcode='42501';end if;
 return jsonb_build_object('eligible',jovabook_private.card_trial_eligible(a.salon_id),
 'card_required',a.card_trial_required,'trial_ends_at',a.trial_ends_at);
end$$;

create or replace function public.start_trial() returns jsonb
language plpgsql security definer set search_path='' as $$
declare a jovabook_private.billing_accounts;begin
 select b.* into a from jovabook_private.billing_accounts b join public.salons s on s.id=b.salon_id where s.owner_id=auth.uid();
 if a.salon_id is null then raise exception 'Log in to continue.' using errcode='42501';end if;
 if not a.card_trial_required then return jovabook_private.start_trial_before_card_trial();end if;
 return jsonb_build_object('eligible',jovabook_private.card_trial_eligible(a.salon_id),'checkout_required',a.trial_payment_method is null,
 'status',case when jovabook_private.billing_open(a.salon_id) then 'trialing' else 'setup' end,
 'trial_ends_at',a.trial_ends_at,'access',jovabook_private.billing_access(a.salon_id));
end$$;

create or replace function public.save_setup(p_address text,p_phone text,p_settings jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform jovabook_private.save_setup_before_card_trial(p_address,p_phone,p_settings);
 update public.salons s set status='trialing' from jovabook_private.billing_accounts a
 where s.owner_id=auth.uid() and a.salon_id=s.id and a.card_trial_required and a.trial_payment_method is not null
 and a.provider_status='trialing' and a.trial_ends_at>now() and s.status='setup';
end$$;

create or replace function public.booking_billing_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare proof jsonb;v_result jsonb;sid uuid;a jovabook_private.billing_accounts;act jovabook_private.billing_actions;
 c jovabook_private.billing_config;started timestamptz;ends timestamptz;fingerprint text;trial_requested boolean;
begin
 if p_action like 'lifecycle_%' or p_action in('event_begin','event_finish') then
  return jovabook_private.billing_worker_before_card_trial(p_token,p_action,p_payload);end if;
 select * into c from jovabook_private.billing_config where singleton;
 if coalesce(p_token,'')!~'^[0-9a-f]{64}$' or c.worker_hash is null or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>c.worker_hash
 then raise exception 'Invalid billing worker credentials.' using errcode='42501';end if;
 if p_payload ? 'customer' and not p_payload ? 'salon' then
  select salon_id into sid from jovabook_private.billing_accounts where customer_id=p_payload->>'customer';
 else sid:=(p_payload->>'salon')::uuid;end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 proof:=jovabook_private.billing_worker_before_card_trial(p_token,'context',p_payload);
 if proof is null then return null;end if;
 select * into a from jovabook_private.billing_accounts where salon_id=sid for update;
 select * into act from jovabook_private.billing_actions where id=a.card_trial_action_id and salon_id=sid and trial;
 if p_action='context' then return proof||jsonb_build_object('card_trial_eligible',jovabook_private.card_trial_eligible(sid),
 'card_trial_action_id',a.card_trial_action_id,'card_trial_policy',case when act.id is not null then '3day-card-v1' end,
 'card_trial_plan',act.target,'card_trial_cadence',act.cadence);end if;
 if p_action='action_begin' then
  trial_requested:=coalesce((p_payload->>'trial')::boolean,false);
  if p_payload ? 'trial' and jsonb_typeof(p_payload->'trial')<>'boolean' then raise exception 'Invalid trial request.';end if;
  if trial_requested then
   select * into act from jovabook_private.billing_actions where salon_id=sid and request_id=(p_payload->>'request')::uuid;
   if act.id is not null and not act.trial then raise exception 'Billing request changed.';end if;
   if p_payload->>'kind'<>'checkout' or p_payload->>'target' not in('essential','standard','premium')
    or coalesce(p_payload->>'cadence','monthly') not in('monthly','annual') or not jovabook_private.card_trial_eligible(sid)
    then raise exception 'This account is not eligible for a new free trial.' using errcode='23514';end if;
  end if;
  v_result:=jovabook_private.billing_worker_before_card_trial(p_token,p_action,p_payload);
  if trial_requested then
   update jovabook_private.billing_actions set trial=true where salon_id=sid and id=(v_result->>'id')::uuid;
   update jovabook_private.billing_accounts set card_trial_action_id=(v_result->>'id')::uuid where salon_id=sid;
   v_result:=v_result||jsonb_build_object('trial',true);
  elsif coalesce((v_result->>'trial')::boolean,false) then raise exception 'Billing request changed.';end if;
  return v_result;
 elsif p_action='sync_apply' and coalesce((p_payload->>'trial_verified')::boolean,false) then
  if a.sync_fence is distinct from (p_payload->>'fence')::uuid then return jsonb_build_object('stale',true);end if;
  if a.customer_id is distinct from p_payload->>'customer' or a.ever_paid or not a.card_trial_required
   or act.id is null or act.id is distinct from (p_payload->>'trial_action_id')::uuid
   or p_payload->>'plan' is distinct from act.target or p_payload->>'cadence' is distinct from act.cadence
   or p_payload->>'status'<>'trialing' or coalesce(p_payload->>'trial_payment_method','')!~'^pm_[A-Za-z0-9]+$'
   or coalesce(p_payload->>'subscription','')!~'^sub_[A-Za-z0-9]+$' or coalesce((p_payload->>'paid_verified')::boolean,false)
   then raise exception 'Card trial could not be verified.' using errcode='23514';end if;
  started:=(p_payload->>'trial_started_at')::timestamptz;ends:=(p_payload->>'trial_ends_at')::timestamptz;
  if started is null or ends is null or ends-started<>interval '72 hours' or ends<=now()
   or started>now()+interval '5 minutes' or started<act.created_at-interval '5 minutes'
   then raise exception 'Trial dates could not be verified.';end if;
  if a.trial_started_at is not null and (a.trial_started_at,a.trial_ends_at,a.subscription_id)
   is distinct from (started,ends,p_payload->>'subscription') then raise exception 'A trial cannot be restarted or extended.';end if;
  select jovabook_private.trial_fingerprint(u.email) into fingerprint from public.salons s join auth.users u on u.id=s.owner_id where s.id=sid;
  perform pg_advisory_xact_lock(hashtext('jovabook-trial'),hashtext(fingerprint));
  if a.trial_started_at is null then
   if exists(select 1 from jovabook_private.trial_ledger where email_hash=fingerprint) then raise exception 'A free trial has already been used.';end if;
   insert into jovabook_private.trial_ledger(email_hash) values(fingerprint);
  end if;
  v_result:=jovabook_private.billing_worker_before_card_trial(p_token,p_action,p_payload);
  if coalesce((v_result->>'stale')::boolean,false) then return v_result;end if;
  update jovabook_private.billing_accounts set trial_started_at=started,trial_ends_at=ends,trial_payment_method=p_payload->>'trial_payment_method',
   paid_plan=act.target,paid_cadence=act.cadence,failed_at=null,roster_conflict=false,
   subscription_anchor=(p_payload->>'subscription_anchor')::timestamptz,subscription_period_start=(p_payload->>'subscription_period_start')::timestamptz where salon_id=sid;
  update public.salons set plan=act.target,trial_used=true,trial_ends_at=ends,
   status=case when status='setup' and nullif(trim(address),'') is null then 'setup' else 'trialing' end where id=sid;
  update jovabook_private.billing_actions set status='complete' where salon_id=sid and id=act.id;
  return v_result||jsonb_build_object('access',jovabook_private.billing_access(sid),'trial_verified',true);
 end if;
 return jovabook_private.billing_worker_before_card_trial(p_token,p_action,p_payload);
end$$;

-- Only provider-verified selected trial plans can unlock team and Premium features.
do $$declare src text;begin
 src:=pg_get_functiondef('jovabook_private.billing_staff_cap()'::regprocedure);
 if position('case when a.ever_paid then a.paid_plan else ''essential'' end' in src)=0 then raise exception 'Review staff cap before migration.';end if;
 execute replace(src,'case when a.ever_paid then a.paid_plan else ''essential'' end','jovabook_private.billing_effective_plan(a.salon_id)');
 src:=pg_get_functiondef('public.validate_salon_schedule()'::regprocedure);
 if position('case when ever_paid then paid_plan else ''essential'' end' in src)=0 then raise exception 'Review plan guard before migration.';end if;
 execute replace(src,'case when ever_paid then paid_plan else ''essential'' end','jovabook_private.billing_effective_plan(salon_id)');
 src:=pg_get_functiondef('jovabook_private.operator_business_record(uuid)'::regprocedure);
 execute replace(src,'case when a.ever_paid then a.paid_plan else ''essential'' end','jovabook_private.billing_effective_plan(a.salon_id)');
end$$;
-- The Premium website wrapper is preserved underneath later public RPC guards.
do $$declare f record;src text;begin
 for f in select p.oid from pg_proc p where p.pronamespace in('public'::regnamespace,'jovabook_private'::regnamespace)
 and p.proname like '%public_salon%' loop
  src:=pg_get_functiondef(f.oid);
  if position('s.plan=''premium'' and a.ever_paid and a.paid_plan=''premium''' in src)>0 then
   execute replace(src,'s.plan=''premium'' and a.ever_paid and a.paid_plan=''premium''',
   's.plan=''premium'' and jovabook_private.billing_effective_plan(a.salon_id)=''premium'' and jovabook_private.billing_open(a.salon_id)');
  end if;
 end loop;
end$$;
revoke all on function public.owner_account_access(),public.start_trial(),public.trial_check(),public.save_setup(text,text,jsonb) from public,anon;
grant execute on function public.owner_account_access(),public.start_trial(),public.trial_check(),public.save_setup(text,text,jsonb) to authenticated;
revoke all on function public.booking_billing_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.booking_billing_worker(text,text,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
