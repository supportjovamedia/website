-- Billing access is server-authoritative. Provider configuration and deletion stay off.
create schema if not exists jovabook_private;
revoke all on schema jovabook_private from public,anon,authenticated;
create table jovabook_private.billing_config(
 singleton boolean primary key default true check(singleton),enabled boolean not null default false,
 provider_configured boolean not null default false,deletion_enabled boolean not null default false,
 worker_hash text,lifecycle_hash text,
 trial_pepper text not null default (gen_random_uuid()::text||gen_random_uuid()::text));
insert into jovabook_private.billing_config(singleton) values(true);
create table jovabook_private.trial_ledger(email_hash text primary key,used_at timestamptz not null default now());
create table jovabook_private.billing_accounts(
 salon_id uuid primary key references public.salons(id) on delete cascade,
 registered_at timestamptz not null default now(),trial_started_at timestamptz,trial_ends_at timestamptz,ever_paid boolean not null default false,
 paid_plan text not null default 'essential' check(paid_plan in('essential','standard','premium')),
 paid_until timestamptz,current_period_end timestamptz,cancel_at_period_end boolean not null default false,
 failed_at timestamptz,customer_id text unique,subscription_id text unique,
 provider_status text,pending_target text check(pending_target in('essential','standard','premium')),
 schedule_id text,pending_effective_at timestamptz,roster_conflict boolean not null default false,
 sync_fence uuid,last_verified_at timestamptz,
 deletion_lease uuid,deletion_state text,provider_closed_at timestamptz,
 updated_at timestamptz not null default now());
create table jovabook_private.billing_actions(
 id uuid primary key default gen_random_uuid(),salon_id uuid not null references public.salons(id) on delete cascade,
 request_id uuid not null,kind text not null,target text,request_hash text not null,
 status text not null default 'pending',result jsonb,provider_id text,created_at timestamptz not null default now(),unique(salon_id,request_id));
create unique index one_open_billing_action on jovabook_private.billing_actions(salon_id) where status in('pending','unknown','awaiting_provider');
create table jovabook_private.billing_events(id text primary key,received_at timestamptz not null default now(),processed_at timestamptz);
create table jovabook_private.billing_purge_audit(
 id uuid primary key,salon_id uuid not null,owner_id uuid not null,reason text not null,
 deleted_at timestamptz not null default now(),assets jsonb not null default '[]',assets_cleaned boolean not null default false);
do $$declare t text;begin foreach t in array array['billing_config','trial_ledger','billing_accounts','billing_actions','billing_events','billing_purge_audit'] loop
 execute format('alter table jovabook_private.%I enable row level security',t);
 execute format('revoke all on jovabook_private.%I from public,anon,authenticated',t);
end loop;end$$;
create function jovabook_private.trial_fingerprint(p_email text) returns text language sql stable security definer set search_path='' as $$
 select encode(sha256(convert_to(c.trial_pepper||':'||public.norm_email(p_email),'UTF8')),'hex') from jovabook_private.billing_config c where singleton
$$;
insert into jovabook_private.trial_ledger(email_hash,used_at)
select jovabook_private.trial_fingerprint(coalesce(nullif(u.email,''),s.email)),min(s.created_at)
from public.salons s join auth.users u on u.id=s.owner_id group by 1 on conflict do nothing;
insert into jovabook_private.billing_accounts(salon_id,registered_at,trial_started_at,trial_ends_at)
select id,least(created_at,now()),least(created_at,now()),least(coalesce(trial_ends_at,created_at+interval '72 hours'),least(created_at,now())+interval '72 hours') from public.salons;
create function jovabook_private.billing_new_salon() returns trigger language plpgsql security definer set search_path='' as $$
declare fingerprint text;used boolean;begin
 fingerprint:=jovabook_private.trial_fingerprint((select email from auth.users where id=new.owner_id));
 if fingerprint is null then raise exception 'Verified account email is required.';end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-trial'),hashtext(fingerprint));
 used:=exists(select 1 from jovabook_private.trial_ledger where email_hash=fingerprint);
 if not used then insert into jovabook_private.trial_ledger(email_hash,used_at) values(fingerprint,now());end if;
 insert into jovabook_private.billing_accounts(salon_id,trial_started_at,trial_ends_at)
 values(new.id,case when not used then now() end,case when not used then now()+interval '72 hours' end);
 update public.salons set trial_used=true,trial_ends_at=case when not used then now()+interval '72 hours' end where id=new.id;
 return new;end$$;
create trigger billing_new_salon after insert on public.salons for each row execute function jovabook_private.billing_new_salon();
-- An identity retained for another salon's customer membership can register a
-- business again without recreating Auth or claiming somebody else's email.
create function public.create_business_for_existing_user(p_name text,p_slug text,p_owner text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());verified_email text;sid uuid;name text:=trim(coalesce(p_name,''));slug text:=lower(trim(coalesce(p_slug,'')));owner_name text:=trim(coalesce(p_owner,''));slug_state text;
begin
 if uid is null then raise exception 'Log in before creating a business.' using errcode='42501';end if;
 select email into verified_email from auth.users where id=uid and email_confirmed_at is not null for update;
 if verified_email is null then raise exception 'Verify your account email before creating a business.' using errcode='42501';end if;
 if exists(select 1 from public.salons where owner_id=uid) then return jsonb_build_object('ok',false,'field','email','message','You already have a business. Log in to continue.');end if;
 if length(name) not between 1 and 60 then return jsonb_build_object('ok',false,'field','name','message','Enter your business name, up to 60 characters.');end if;
 if length(owner_name) not between 1 and 80 then return jsonb_build_object('ok',false,'field','owner','message','Enter your name, up to 80 characters.');end if;
 slug_state:=public.slug_status(slug);
 if slug_state<>'ok' then return jsonb_build_object('ok',false,'field','slug','message',case when slug_state='format' then 'Use 3 to 30 letters, numbers or hyphens.' when slug_state='reserved' then 'That address is reserved. Choose another.' else 'That address is taken. Choose another.' end);end if;
 if not public.email_available(verified_email) then return jsonb_build_object('ok',false,'field','email','message','A business with this email already exists. Log in instead.');end if;
 insert into public.salons(owner_id,name,slug,owner_name,email,status) values(uid,name,slug,owner_name,verified_email,'setup') returning id into sid;
 return jsonb_build_object('ok',true,'salon_id',sid,'access',public.owner_account_access());
exception when unique_violation then return jsonb_build_object('ok',false,'field','slug','message','That business address or account is already in use. Refresh and try again.');
end$$;
revoke all on function public.create_business_for_existing_user(text,text,text) from public,anon;
grant execute on function public.create_business_for_existing_user(text,text,text) to authenticated;
create function jovabook_private.billing_due(p_salon uuid) returns timestamptz language sql stable security definer set search_path='' as $$
 select case when a.ever_paid and (a.failed_at is not null or a.paid_until<=now()) then ((coalesce(a.failed_at,a.paid_until) at time zone 'UTC')+interval '2 months') at time zone 'UTC'
 when not a.ever_paid then coalesce(a.trial_ends_at,a.registered_at)+interval '48 hours' end
 from jovabook_private.billing_accounts a join public.salons s on s.id=a.salon_id where a.salon_id=p_salon
$$;
create function jovabook_private.billing_access(p_salon uuid) returns text language sql stable security definer set search_path='' as $$
 select case when a.deletion_state is not null then 'deleting'
 when a.roster_conflict then 'billing_only'
 when a.ever_paid and a.failed_at is null and a.paid_until>now() then 'active'
 when not a.ever_paid and a.trial_ends_at>now() then 'active'
 else 'billing_only' end from jovabook_private.billing_accounts a join public.salons s on s.id=a.salon_id where a.salon_id=p_salon
$$;
create function jovabook_private.billing_open(p_salon uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(jovabook_private.billing_access(p_salon)='active',false)
$$;
-- Storage remains managed through its API. This read-only INSERT predicate
-- serializes object creation with exact-prefix purge manifest collection.
create function jovabook_private.billing_image_insert(p_bucket text,p_name text) returns boolean language plpgsql volatile security definer set search_path='' as $$
declare sid uuid;bound uuid;begin
 if p_bucket is distinct from 'jovabook-website-images' then return true;end if;
 if p_name!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$' then return false;end if;
 sid:=split_part(p_name,'/',1)::uuid;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));
 perform 1 from jovabook_private.billing_accounts where salon_id=sid for update;if not found then return false;end if;
 select owner_id into bound from public.salons where id=sid;
 return bound=(select auth.uid()) and jovabook_private.billing_open(sid);
end$$;
revoke all on function jovabook_private.billing_image_insert(text,text) from public,anon;
grant execute on function jovabook_private.billing_image_insert(text,text) to authenticated;
do $$begin if to_regclass('storage.objects') is not null then
 execute 'create policy "billing website image insert boundary" on storage.objects as restrictive for insert to authenticated with check(jovabook_private.billing_image_insert(bucket_id,name))';
end if;end$$;
create function jovabook_private.billing_customer_pending(p_salon uuid) returns boolean language plpgsql volatile security definer set search_path='' as $$
declare pending boolean;begin
 -- Customer portal can be installed later. Its unfinished provider state must
 -- survive SaaS retention, including unknown outcomes and refund recovery.
 if to_regclass('jovabook_private.customer_refunds') is not null then
  execute 'select exists(select 1 from jovabook_private.customer_refunds where salon_id=$1 and status<>''succeeded'')' into pending using p_salon;
  if pending then return true;end if;
 end if;
 if to_regclass('jovabook_private.customer_payment_actions') is not null then
  execute 'select exists(select 1 from jovabook_private.customer_payment_actions where salon_id=$1 and completed_at is null)' into pending using p_salon;
  if pending then return true;end if;
 end if;
 return false;
end$$;
revoke all on function jovabook_private.billing_customer_pending(uuid) from public,anon,authenticated;
create function public.owner_account_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.salons;a jovabook_private.billing_accounts;c jovabook_private.billing_config;access text;reason text;
begin
 select * into s from public.salons where owner_id=(select auth.uid());if s.id is null then
  if not exists(select 1 from auth.users where id=(select auth.uid()) and email_confirmed_at is not null) then raise exception 'Verify your account before continuing.' using errcode='42501';end if;
  return jsonb_build_object('ok',true,'no_business',true,'access','no_business','reason','no_business','business',null,'server_now',now(),'full_until',null,
   'lifecycle',jsonb_build_object('trialEndsAt',null,'purgeAt',null),'billing',jsonb_build_object('connected',false,'canCheckout',false));
 end if;
 select * into a from jovabook_private.billing_accounts where salon_id=s.id;select * into c from jovabook_private.billing_config where singleton;
 access:=jovabook_private.billing_access(s.id);reason:=case when access='deleting' then 'deletion_pending' when a.roster_conflict then 'roster_exceeds_plan' when a.failed_at is not null then 'payment_failed' when access='active' then case when a.ever_paid then 'paid' else 'trial_active' end when a.trial_ends_at is not null then 'trial_expired' else 'payment_required' end;
 return jsonb_build_object('ok',true,'access',access,'reason',reason,'server_now',now(),'full_until',case when access='active' then case when a.ever_paid then a.paid_until else a.trial_ends_at end end,
 'business',jsonb_build_object('id',s.id,'name',s.name,'slug',s.slug,'plan',case when a.ever_paid then a.paid_plan else 'essential' end,'status',s.status),
 'lifecycle',jsonb_build_object('trialEndsAt',a.trial_ends_at,'purgeAt',jovabook_private.billing_due(s.id)),
 'billing',jsonb_build_object('connected',c.enabled and c.provider_configured,'canCheckout',c.enabled and c.provider_configured and access<>'deleting',
 'paid_until',a.paid_until,'current_period_end',a.current_period_end,'pending_plan',a.pending_target,'pending_effective_at',a.pending_effective_at,
 'cancel_at_period_end',a.cancel_at_period_end,'staff_count',(select count(*) from public.staff where salon_id=s.id),
 'commission_bps',case when a.ever_paid and a.paid_plan='premium' then 0 else 100 end),
 'staff_limit',least(public.plan_staff_limit(case when a.ever_paid then a.paid_plan else 'essential' end),case when a.pending_target is null then 10 else public.plan_staff_limit(a.pending_target) end));
end$$;
create or replace function public.trial_check() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.salons;a jovabook_private.billing_accounts;used boolean;begin
 select * into s from public.salons where owner_id=(select auth.uid());if s.id is null then raise exception 'Not signed in.' using errcode='42501';end if;
 select * into a from jovabook_private.billing_accounts where salon_id=s.id;
 used:=a.ever_paid or a.trial_started_at is null or a.trial_ends_at<=now();
 return jsonb_build_object('eligible',not used,'reasons',case when used then jsonb_build_array('already_used') else '[]'::jsonb end);
end$$;
create or replace function public.start_trial() returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.salons;a jovabook_private.billing_accounts;expires timestamptz;begin
 select * into s from public.salons where owner_id=(select auth.uid());if s.id is null then raise exception 'Not signed in.' using errcode='42501';end if;
 select * into a from jovabook_private.billing_accounts where salon_id=s.id for update;
 if a.trial_started_at is not null or a.ever_paid then
  if not a.ever_paid and a.trial_ends_at>now() then update public.salons set status='trialing' where id=s.id;end if;
  return jsonb_build_object('eligible',not a.ever_paid and a.trial_ends_at>now(),'status',case when jovabook_private.billing_open(s.id) then case when a.ever_paid then 'active' else 'trialing' end else 'setup' end,'trial_ends_at',a.trial_ends_at,'access',jovabook_private.billing_access(s.id));end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-trial'),hashtext(jovabook_private.trial_fingerprint(s.email)));
 if s.trial_used or exists(select 1 from jovabook_private.trial_ledger where email_hash=jovabook_private.trial_fingerprint(s.email)) then
  update public.salons set trial_used=true,status='setup' where id=s.id;return jsonb_build_object('eligible',false,'status','setup','access','billing_only','payment_required',true);
 end if;
 -- A missing server registration clock never creates a fresh client-started trial.
 return jsonb_build_object('eligible',false,'status','setup','access','billing_only','payment_required',true);
end$$;
create or replace function public.resubscribe() returns void language plpgsql security definer set search_path='' as $$begin raise exception 'Verified payment is required. Open Subscription.' using errcode='42501';end$$;
create or replace function public.cancel_subscription() returns void language plpgsql security definer set search_path='' as $$begin raise exception 'Use the verified billing cancellation flow.' using errcode='42501';end$$;
create or replace function public.my_salon_id() returns uuid language sql stable security definer set search_path='' as $$
 select id from public.salons where owner_id=(select auth.uid()) and jovabook_private.billing_open(id)
$$;
-- Restrictive policies cannot be bypassed by existing permissive owner policies.
create policy "billing access salon boundary" on public.salons as restrictive for select to authenticated using(jovabook_private.billing_open(id));
do $$declare t text;begin foreach t in array array['categories','staff','services','customers','bookings','email_log','payments'] loop
 execute format('create policy "billing access diary boundary" on public.%I as restrictive for all to authenticated using(jovabook_private.billing_open(salon_id)) with check(jovabook_private.billing_open(salon_id))',t);
end loop;end$$;
create function public.public_booking_status(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('available',coalesce((select jovabook_private.billing_open(id) from public.salons where slug=lower(trim(p_slug))),false))
$$;
-- Move existing definer implementations to private scope. Public guards retain
-- their exact argument names/defaults and signatures, avoiding RPC overloads.
do $$declare f record;args text;call_args text;guard text;result text;owner_mode boolean;begin
 for f in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) identity,pg_get_function_arguments(p.oid) args,pg_get_function_result(p.oid) result,p.pronargs
 from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in('public_salon','create_booking','get_booking','cancel_booking','reschedule_booking','create_booking_with_sms','public_sms_reminder_info','save_salon','owner_booking_series','set_sms_reminders','save_setup') loop
  if (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname=f.proname)<>1 then raise exception 'Review overloaded function % before installing billing guards.',f.proname;end if;
  select string_agg('$'||n,',') into call_args from generate_series(1,f.pronargs) n;
  owner_mode:=f.proname in('save_salon','owner_booking_series','set_sms_reminders','save_setup');
  guard:=case when owner_mode then 'if not coalesce((select jovabook_private.billing_open(id) from public.salons where owner_id=auth.uid()),false) then raise exception ''Subscription payment is required.'' using errcode=''42501'';end if;'
   else 'if not coalesce((select jovabook_private.billing_open(id) from public.salons where slug=lower(trim($1))),false) then return null;end if;' end;
  execute format('alter function public.%I(%s) set schema jovabook_private',f.proname,f.identity);
  execute format('alter function jovabook_private.%I(%s) rename to %I',f.proname,f.identity,'billing_original_'||f.proname);
  execute format('revoke all on function jovabook_private.%I(%s) from public,anon,authenticated','billing_original_'||f.proname,f.identity);
  result:=case when f.result='void' then 'perform' else 'return' end;
  execute format('create function public.%I(%s) returns %s language plpgsql security definer set search_path='''' as $body$begin %s %s jovabook_private.%I(%s);%s end$body$',f.proname,f.args,f.result,guard,result,'billing_original_'||f.proname,call_args,case when f.result='void' then 'return;' else '' end);
  execute format('revoke all on function public.%I(%s) from public,anon,authenticated',f.proname,f.identity);
  execute format('grant execute on function public.%I(%s) to %s',f.proname,f.identity,case when owner_mode then 'authenticated' else 'anon,authenticated' end);
 end loop;
end$$;
-- Pending downgrade caps include inactive staff and serialize with existing
-- staff-insert/deletion locks. No staff or booking is removed automatically.
create function jovabook_private.billing_staff_cap() returns trigger language plpgsql security definer set search_path='' as $$
declare a jovabook_private.billing_accounts;used integer;cap integer;begin
 if exists(select 1 from public.staff where salon_id=new.salon_id and id=new.id) then return new;end if;
 perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||new.salon_id::text));
 select * into a from jovabook_private.billing_accounts where salon_id=new.salon_id for update;
 cap:=least(public.plan_staff_limit(case when a.ever_paid then a.paid_plan else 'essential' end),case when a.pending_target is null then 10 else public.plan_staff_limit(a.pending_target) end);
 select count(*) into used from public.staff where salon_id=new.salon_id;
 if used>=cap then raise exception 'Current or scheduled plan supports % staff, including inactive staff.',cap using errcode='23514';end if;return new;
end$$;
create trigger billing_staff_cap before insert on public.staff for each row execute function jovabook_private.billing_staff_cap();
revoke all on function public.owner_account_access() from public,anon;
grant execute on function public.owner_account_access() to authenticated;
revoke all on function public.public_booking_status(text) from public;
grant execute on function public.public_booking_status(text) to anon,authenticated;
revoke all on function jovabook_private.trial_fingerprint(text),jovabook_private.billing_due(uuid),jovabook_private.billing_access(uuid),jovabook_private.billing_open(uuid),jovabook_private.billing_new_salon(),jovabook_private.billing_staff_cap() from public,anon,authenticated;
-- RLS expressions require execution, not direct private-schema table access.
grant execute on function jovabook_private.billing_open(uuid) to authenticated;

-- A provider sync must first update its private canonical entitlement. Merely
-- changing a browser-editable status/settings field cannot grant a paid plan.
create or replace function public.validate_salon_schedule() returns trigger language plpgsql security definer set search_path='' as $$
declare approved text;begin
 if new.settings->'hours' is distinct from old.settings->'hours' and not public.valid_schedule(new.settings->'hours') then raise exception 'Enter valid opening hours.' using errcode='23514';end if;
 if new.plan is distinct from old.plan then
  select case when ever_paid then paid_plan else 'essential' end into approved from jovabook_private.billing_accounts where salon_id=new.id;
  if new.plan is distinct from approved then raise exception 'Plan changes require verified billing.' using errcode='42501';end if;
 end if;return new;
end$$;
create function public.booking_billing_worker(p_token text,p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare c jovabook_private.billing_config;a jovabook_private.billing_accounts;s public.salons;action jovabook_private.billing_actions;
 sid uuid;owner uuid;fence uuid;target text;roster int;deadline timestamptz;lease uuid;assets jsonb;reason text;result jsonb;external_auth boolean;keep_auth boolean:=false;item record;
begin
 select * into c from jovabook_private.billing_config where singleton;
 if coalesce(p_token,'')!~'^[0-9a-f]{64}$' or (case when p_action like 'lifecycle_%' then c.lifecycle_hash else c.worker_hash end) is null
 or encode(sha256(convert_to(p_token,'UTF8')),'hex')<>(case when p_action like 'lifecycle_%' then c.lifecycle_hash else c.worker_hash end) then raise exception 'Invalid billing worker credentials.' using errcode='42501';end if;
 if p_action='event_begin' then
  insert into jovabook_private.billing_events(id) values(p_payload->>'id') on conflict do nothing;
  return jsonb_build_object('processed',exists(select 1 from jovabook_private.billing_events where id=p_payload->>'id' and processed_at is not null));
 elsif p_action='event_finish' then update jovabook_private.billing_events set processed_at=now() where id=p_payload->>'id';return jsonb_build_object('ok',true);
 elsif p_action='lifecycle_dryrun' then
  return (select coalesce(jsonb_agg(jsonb_build_object('salon_id',x.salon_id,'owner_id',x.owner_id,'reason',x.reason,'deadline',x.deadline,'provider_ready',c.enabled and c.provider_configured,'deletion_enabled',c.deletion_enabled,'customer_finance_pending',jovabook_private.billing_customer_pending(x.salon_id))),'[]') from (
   select ds.id salon_id,ds.owner_id,case when da.ever_paid then 'paid_failure_two_months' when da.trial_ends_at is null then 'repeat_registration_48h' else 'trial_72h_plus_48h' end reason,jovabook_private.billing_due(ds.id) deadline
   from public.salons ds join jovabook_private.billing_accounts da on da.salon_id=ds.id where not jovabook_private.billing_open(ds.id) and jovabook_private.billing_due(ds.id)<=now()) x);
 elsif p_action='lifecycle_cleanup_manifest' then
  return (select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'salon_id',x.salon_id,'assets',x.assets)),'[]') from (select * from jovabook_private.billing_purge_audit where not assets_cleaned order by deleted_at limit 5)x);
 elsif p_action='lifecycle_cleanup_done' then update jovabook_private.billing_purge_audit set assets_cleaned=true where id=(p_payload->>'id')::uuid;return jsonb_build_object('ok',true);
 end if;
 if p_payload ? 'customer' and not p_payload ? 'salon' then select salon_id into sid from jovabook_private.billing_accounts where customer_id=p_payload->>'customer';else sid:=(p_payload->>'salon')::uuid;end if;
 if p_action in('sync_apply','downgrade_hold','lifecycle_purge','action_begin') then perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||sid::text));end if;
 select * into s from public.salons where id=sid;select * into a from jovabook_private.billing_accounts where salon_id=sid for update;
 if s.id is null or a.salon_id is null then return null;end if;
 if p_payload ? 'owner' and (p_payload->>'owner')::uuid<>s.owner_id then raise exception 'Business ownership mismatch.' using errcode='42501';end if;
 if p_action='context' then return jsonb_build_object('salon_id',s.id,'owner_id',s.owner_id,'open_action',(select to_jsonb(ba) from jovabook_private.billing_actions ba where ba.salon_id=s.id and ba.status in('pending','unknown','awaiting_provider') limit 1),'enabled',c.enabled and c.provider_configured,'customer_id',a.customer_id,'subscription_id',a.subscription_id,'paid_plan',a.paid_plan,'paid_until',a.paid_until,'ever_paid',a.ever_paid,'failed_at',a.failed_at,'pending_target',a.pending_target,'schedule_id',a.schedule_id,'deletion_state',a.deletion_state,'staff_count',(select count(*) from public.staff where salon_id=s.id));
 elsif p_action='bind_customer' then
  if a.customer_id is not null and a.customer_id<>p_payload->>'customer' then raise exception 'Customer already bound.';end if;
  update jovabook_private.billing_accounts set customer_id=p_payload->>'customer' where salon_id=s.id;return jsonb_build_object('ok',true);
 elsif p_action='action_lookup' then
  select * into action from jovabook_private.billing_actions where salon_id=s.id and request_id=(p_payload->>'request')::uuid;
  if action.id is null then return null;end if;
  if action.target is distinct from p_payload->>'target' then raise exception 'Billing request changed.';end if;
  return to_jsonb(action);
 elsif p_action='action_begin' then
  if not c.enabled or not c.provider_configured or a.deletion_state is not null then raise exception 'Billing unavailable.';end if;
  select * into action from jovabook_private.billing_actions where salon_id=s.id and request_id=(p_payload->>'request')::uuid;
  if action.id is not null then if action.request_hash<>p_payload->>'hash' then raise exception 'Billing request changed.';end if;return to_jsonb(action);end if;
  if exists(select 1 from jovabook_private.billing_actions where salon_id=s.id and status in('pending','unknown','awaiting_provider')) then raise exception 'A previous billing action needs reconciliation.';end if;
  if p_payload->>'kind'='downgrade' then
   target:=p_payload->>'target';if target not in('essential','standard') or public.plan_staff_limit(target)>=public.plan_staff_limit(a.paid_plan) then raise exception 'Choose a lower plan.';end if;
   select count(*) into roster from public.staff where salon_id=s.id;
   if roster>public.plan_staff_limit(target) then raise exception 'Reduce staff first. Inactive staff count and future bookings remain protected.' using errcode='23514';end if;
   update jovabook_private.billing_accounts set pending_target=target where salon_id=s.id;
  end if;
  insert into jovabook_private.billing_actions(salon_id,request_id,kind,target,request_hash) values(s.id,(p_payload->>'request')::uuid,p_payload->>'kind',p_payload->>'target',p_payload->>'hash') returning * into action;return to_jsonb(action);
 elsif p_action='action_finish' then
  update jovabook_private.billing_actions set status=case when kind in('checkout','upgrade') then 'awaiting_provider' else 'complete' end,result=p_payload->'result',provider_id=p_payload->>'provider_id' where salon_id=s.id and id=(p_payload->>'id')::uuid;return jsonb_build_object('ok',true);
 elsif p_action='sync_begin' then
  fence:=gen_random_uuid();update jovabook_private.billing_accounts set sync_fence=fence where salon_id=s.id;
  return to_jsonb(a)||jsonb_build_object('fence',fence,'owner_id',s.owner_id);
 elsif p_action='sync_apply' then
  if a.sync_fence is distinct from (p_payload->>'fence')::uuid then return jsonb_build_object('stale',true);end if;
  if a.customer_id is distinct from p_payload->>'customer' then raise exception 'Provider customer mismatch.';end if;
  target:=p_payload->>'plan';if target is not null and target not in('essential','standard','premium') then raise exception 'Unknown provider price.';end if;
  update jovabook_private.billing_accounts set subscription_id=coalesce(p_payload->>'subscription',subscription_id),provider_status=p_payload->>'status',
  current_period_end=coalesce((p_payload->>'paid_until')::timestamptz,current_period_end),cancel_at_period_end=coalesce((p_payload->>'cancel_at_period_end')::boolean,false),last_verified_at=now(),updated_at=now() where salon_id=s.id;
  if not a.ever_paid and coalesce((p_payload->>'historical_paid')::boolean,false) then
   if p_payload->>'historical_plan' not in('essential','standard','premium') or p_payload->>'historical_paid_until' is null then raise exception 'Historical payment is unverified.';end if;
   update jovabook_private.billing_accounts set ever_paid=true,paid_plan=p_payload->>'historical_plan',paid_until=(p_payload->>'historical_paid_until')::timestamptz where salon_id=s.id;
   update public.salons set plan=p_payload->>'historical_plan',status='active' where id=s.id;
  end if;
  if coalesce((p_payload->>'paid_verified')::boolean,false) and target is not null and (p_payload->>'paid_until')::timestamptz>now() then
   select count(*) into roster from public.staff where salon_id=s.id;
   update jovabook_private.billing_accounts set ever_paid=true,paid_plan=target,paid_until=(p_payload->>'paid_until')::timestamptz,failed_at=null,roster_conflict=roster>public.plan_staff_limit(target),deletion_state=null,deletion_lease=null,provider_closed_at=null where salon_id=s.id;
   update public.salons set plan=target,status='active' where id=s.id;
   update jovabook_private.billing_actions ba set status='complete' where ba.salon_id=s.id and ba.status='awaiting_provider' and ba.target=p_payload->>'plan';
  elsif (a.ever_paid or coalesce((p_payload->>'historical_paid')::boolean,false)) and
   (coalesce((p_payload->>'recurring_failed')::boolean,false) or (p_payload->>'status' in('past_due','unpaid','incomplete_expired','paused')) or (p_payload->>'status'='canceled' and coalesce(a.paid_until,now())<=now())) then
   update jovabook_private.billing_accounts set failed_at=coalesce(failed_at,least(now(),coalesce((p_payload->>'failed_at')::timestamptz,case when p_payload->>'status'='canceled' then a.paid_until end,now()))) where salon_id=s.id;
  end if;
  return jsonb_build_object('ok',true,'access',jovabook_private.billing_access(s.id));
 elsif p_action='action_resolve' then
  if not coalesce((p_payload->>'closed_verified')::boolean,false) then raise exception 'Hosted action closure is unverified.';end if;
  update jovabook_private.billing_actions set status='complete' where salon_id=s.id and id=(p_payload->>'id')::uuid;return jsonb_build_object('ok',true);
 elsif p_action='downgrade_hold' then
  target:=p_payload->>'target';if target not in('essential','standard','premium') or public.plan_staff_limit(target)>=public.plan_staff_limit(a.paid_plan) then raise exception 'Choose a lower plan.';end if;
  perform pg_advisory_xact_lock(hashtext('jovabook-owner:'||s.id::text));select count(*) into roster from public.staff where salon_id=s.id;
  if roster>public.plan_staff_limit(target) then raise exception 'Reduce staff first. Inactive staff count and future bookings remain protected.' using errcode='23514';end if;
  if a.pending_target is not null and a.pending_target<>target then raise exception 'Cancel the existing scheduled change first.';end if;
  update jovabook_private.billing_accounts set pending_target=target where salon_id=s.id;return jsonb_build_object('ok',true);
 elsif p_action='downgrade_schedule' then
  if a.pending_target is null then raise exception 'No downgrade hold exists.';end if;
  update jovabook_private.billing_accounts set schedule_id=p_payload->>'schedule',pending_effective_at=(p_payload->>'effective_at')::timestamptz where salon_id=s.id;return jsonb_build_object('ok',true);
 elsif p_action='downgrade_release' then
  if not coalesce((p_payload->>'released_verified')::boolean,false) then raise exception 'Provider release is unverified.';end if;
  update jovabook_private.billing_accounts set pending_target=null,pending_effective_at=null,schedule_id=null where salon_id=s.id;return jsonb_build_object('ok',true);
 elsif p_action='lifecycle_claim' then
  if not c.deletion_enabled or not c.enabled or not c.provider_configured then return null;end if;
  if jovabook_private.billing_customer_pending(s.id) then return null;end if;
  if jovabook_private.billing_open(s.id) or jovabook_private.billing_due(s.id)>now() or jovabook_private.billing_due(s.id) is null then return null;end if;
  if exists(select 1 from jovabook_private.billing_actions where salon_id=s.id and status in('pending','unknown','awaiting_provider')) then return null;end if;
  lease:=gen_random_uuid();update jovabook_private.billing_accounts set deletion_state='reconciling',deletion_lease=lease,provider_closed_at=null where salon_id=s.id;
  return to_jsonb(a)||jsonb_build_object('salon_id',s.id,'owner_id',s.owner_id,'lease',lease);
 elsif p_action='lifecycle_provider_closed' then
  if a.deletion_lease is distinct from (p_payload->>'lease')::uuid or not coalesce((p_payload->>'closed_verified')::boolean,false) then return null;end if;
  update jovabook_private.billing_accounts set provider_closed_at=now(),deletion_state='provider_closed' where salon_id=s.id;return jsonb_build_object('ok',true);
 elsif p_action='lifecycle_abort' then
  if a.deletion_lease is not distinct from (p_payload->>'lease')::uuid then
   update jovabook_private.billing_accounts set deletion_lease=null,deletion_state=null,provider_closed_at=null where salon_id=s.id;
  end if;return jsonb_build_object('ok',true);
 elsif p_action='lifecycle_purge' then
  -- This lock serializes verified-payment restoration and irreversible Auth/data deletion.
  if not c.deletion_enabled or not c.enabled or not c.provider_configured or a.deletion_lease is distinct from (p_payload->>'lease')::uuid or a.deletion_state<>'provider_closed'
   or a.provider_closed_at<now()-interval '30 seconds' or a.provider_closed_at is null or a.failed_at is null and a.ever_paid and a.paid_until>now()
   or jovabook_private.billing_due(s.id)>now() or jovabook_private.billing_due(s.id) is null then return null;end if;
  if jovabook_private.billing_customer_pending(s.id) then raise exception 'Unresolved customer payment or refund recovery blocks deletion.';end if;
  -- A competing customer-membership FK insert must wait for this decision.
  perform 1 from auth.users where id=s.owner_id for update;
  keep_auth:=exists(select 1 from public.salons bs where bs.owner_id=s.owner_id and bs.id<>s.id);
  -- Future customer Auth memberships must never be erased with a SaaS account.
  -- Any external Auth FK row outside this exact salon requires review.
  for item in select ns.nspname schema_name,cl.relname table_name,att.attname column_name,
   exists(select 1 from pg_attribute x where x.attrelid=cl.oid and x.attname='salon_id' and not x.attisdropped) has_salon
   from pg_constraint fk join pg_class cl on cl.oid=fk.conrelid join pg_namespace ns on ns.oid=cl.relnamespace
   join pg_attribute att on att.attrelid=cl.oid and att.attnum=fk.conkey[1]
   where fk.contype='f' and fk.confrelid='auth.users'::regclass and ns.nspname<>'auth' and not(ns.nspname='public' and cl.relname='salons') loop
   execute format('select exists(select 1 from %I.%I where %I::text=$1 %s)',item.schema_name,item.table_name,item.column_name,case when item.has_salon then 'and salon_id is distinct from $2' else '' end)
   into external_auth using s.owner_id::text,s.id;
   if external_auth and item.schema_name='storage' then raise exception 'Managed Storage Auth ownership constraint requires review before deletion.';end if;
   if external_auth then keep_auth:=true;end if;
  end loop;
  if to_regclass('storage.objects') is not null then
   if not keep_auth and exists(select 1 from storage.objects o where (o.owner_id=s.owner_id::text or o.owner=s.owner_id) and not (o.bucket_id='jovabook-website-images' and o.name~('^'||s.id::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'))) then raise exception 'Unscoped owned assets require review.';end if;
   if exists(select 1 from storage.objects o where o.bucket_id='jovabook-website-images' and split_part(o.name,'/',1)=s.id::text and (o.owner_id is not null and o.owner_id<>s.owner_id::text or o.owner is not null and o.owner<>s.owner_id)) then raise exception 'Conflicting image ownership requires review.';end if;
   select coalesce(jsonb_agg(jsonb_build_object('bucket',so.bucket_id,'name',so.name)),'[]') into assets from storage.objects so where so.bucket_id='jovabook-website-images' and so.name~('^'||s.id::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$') and (so.owner_id is null or so.owner_id=s.owner_id::text) and (so.owner is null or so.owner=s.owner_id);
  else assets:='[]';end if;
  reason:=case when a.ever_paid then 'paid_failure_two_months' when a.trial_ends_at is null then 'repeat_registration_48h' else 'trial_72h_plus_48h' end;
  -- Do not mutate Storage metadata. If its managed FKs prevent Auth deletion,
  -- the whole transaction rolls back, preserving both data and paid restore.
  insert into jovabook_private.billing_purge_audit(id,salon_id,owner_id,reason,assets,assets_cleaned) values(a.deletion_lease,s.id,s.owner_id,reason,assets,jsonb_array_length(assets)=0);
  if keep_auth then delete from public.salons where id=s.id and owner_id=s.owner_id;
  else delete from auth.users where id=s.owner_id and exists(select 1 from public.salons where id=s.id and owner_id=s.owner_id);end if;
  return jsonb_build_object('purged',true,'auth_retained',keep_auth,'id',a.deletion_lease,'salon_id',s.id,'assets',assets);
 end if;
 raise exception 'Unknown billing worker action.';
end$$;
revoke all on function public.booking_billing_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.booking_billing_worker(text,text,jsonb) to anon,authenticated;
